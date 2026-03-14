"""OJ系统工具集 - 供AI调用查询系统数据（直接访问数据库）"""

import json
import logging
from datetime import datetime
from typing import Any

from app.database import fetch_all, fetch_one

logger = logging.getLogger(__name__)

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "getMyUserId",
            "description": "获取当前用户的ID",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserProfile",
            "description": "查询用户个人信息，包括用户名、邮箱、签名、提交数、通过数等",
            "parameters": {
                "type": "object",
                "properties": {"uid": {"type": "integer", "description": "用户ID"}},
                "required": ["uid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserSolvedProblems",
            "description": "查询用户通过的所有题目列表",
            "parameters": {
                "type": "object",
                "properties": {"uid": {"type": "integer", "description": "用户ID"}},
                "required": ["uid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserProgress",
            "description": "查询用户在各个标签的提交次数和通过次数，用于分析算法水平和做题倾向",
            "parameters": {
                "type": "object",
                "properties": {"uid": {"type": "integer", "description": "用户ID"}},
                "required": ["uid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserCount",
            "description": "获取系统用户总数",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getAllUsers",
            "description": "获取所有用户列表",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserIdByName",
            "description": "根据用户名查询用户ID和基本信息，支持模糊匹配",
            "parameters": {
                "type": "object",
                "properties": {"username": {"type": "string", "description": "用户名"}},
                "required": ["username"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProblemByName",
            "description": "根据题目名称查询题目详情，包括题目描述、输入输出格式、样例等",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string", "description": "题目名称"}},
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProblemById",
            "description": "根据题目ID查询题目详情",
            "parameters": {
                "type": "object",
                "properties": {"pid": {"type": "integer", "description": "题目ID"}},
                "required": ["pid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProblemTags",
            "description": "查询题目的标签列表",
            "parameters": {
                "type": "object",
                "properties": {"pid": {"type": "integer", "description": "题目ID"}},
                "required": ["pid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "searchProblems",
            "description": "搜索题目列表，可根据关键字搜索",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "搜索关键字，可为空"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProblemCount",
            "description": "获取系统题目总数",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getUserSubmissions",
            "description": "查询用户的提交记录列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "uid": {"type": "integer", "description": "用户ID"},
                    "pageNum": {"type": "integer", "description": "页码，从1开始"},
                    "pageSize": {"type": "integer", "description": "每页数量"},
                },
                "required": ["uid", "pageNum", "pageSize"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getSubmissionById",
            "description": "根据提交ID查询提交详情",
            "parameters": {
                "type": "object",
                "properties": {"id": {"type": "integer", "description": "提交记录ID"}},
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getCompetitionList",
            "description": "查询比赛列表",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getCompetitionById",
            "description": "根据比赛ID查询比赛详情",
            "parameters": {
                "type": "object",
                "properties": {"cid": {"type": "integer", "description": "比赛ID"}},
                "required": ["cid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getCompetitionCount",
            "description": "获取系统比赛总数",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getTagList",
            "description": "获取系统所有标签列表",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getSolutionsByProblem",
            "description": "查询某道题目的题解列表",
            "parameters": {
                "type": "object",
                "properties": {"pid": {"type": "integer", "description": "题目ID"}},
                "required": ["pid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getPublicPracticeList",
            "description": "获取公开的练习列表",
            "parameters": {
                "type": "object",
                "properties": {"uid": {"type": "integer", "description": "用户ID"}},
                "required": ["uid"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getPracticeCount",
            "description": "获取练习总数",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _serialize(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="ignore")
    return obj


def _clean_result(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: _clean_result(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_clean_result(item) for item in data]
    return _serialize(data)


async def get_my_user_id(current_user_id: int | None) -> str:
    if current_user_id is not None:
        return json.dumps({"userId": current_user_id})
    return json.dumps({"error": "未获取到当前用户ID"})


async def get_user_profile(uid: int) -> str:
    try:
        logger.info("AI调用工具: getUserProfile, uid=%s", uid)
        user = await fetch_one(
            """SELECT id, name, email, signature, submit_count, pass_count,
                      avatar, identity, penalty_time, last_login_time
               FROM user WHERE id = %s""",
            (uid,),
        )
        if user:
            return json.dumps(_clean_result(user), ensure_ascii=False)
        return json.dumps({"error": f"未找到用户 {uid}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("getUserProfile 失败: %s", e)
        return json.dumps({"error": f"查询用户信息失败: {e}"}, ensure_ascii=False)


async def get_user_solved_problems(uid: int) -> str:
    try:
        logger.info("AI调用工具: getUserSolvedProblems, uid=%s", uid)
        problems = await fetch_all(
            """SELECT DISTINCT s.pid, p.title as problem_name
               FROM submission s
               JOIN problem p ON s.pid = p.id
               WHERE s.uid = %s AND s.status = 'Accepted'
               ORDER BY s.pid""",
            (uid,),
        )
        return json.dumps(_clean_result(problems), ensure_ascii=False)
    except Exception as e:
        logger.error("getUserSolvedProblems 失败: %s", e)
        return json.dumps({"error": f"查询用户通过题目失败: {e}"}, ensure_ascii=False)


async def get_user_progress(uid: int) -> str:
    try:
        logger.info("AI调用工具: getUserProgress, uid=%s", uid)
        progress = await fetch_all(
            """SELECT t.id as tag_id, t.name as tag_name, ut.submit_count, ut.pass_count
               FROM user_tag ut
               JOIN tag t ON ut.tag = t.name
               WHERE ut.uid = %s
               ORDER BY ut.pass_count DESC""",
            (uid,),
        )
        return json.dumps(_clean_result(progress), ensure_ascii=False)
    except Exception as e:
        logger.error("getUserProgress 失败: %s", e)
        return json.dumps({"error": f"查询用户进度失败: {e}"}, ensure_ascii=False)


async def get_user_count() -> str:
    try:
        logger.info("AI调用工具: getUserCount")
        result = await fetch_one("SELECT COUNT(*) as count FROM user")
        return json.dumps({"count": result["count"] if result else 0})
    except Exception as e:
        logger.error("getUserCount 失败: %s", e)
        return json.dumps({"error": f"查询用户数量失败: {e}"}, ensure_ascii=False)


async def get_all_users() -> str:
    try:
        logger.info("AI调用工具: getAllUsers")
        users = await fetch_all(
            """SELECT id, name, submit_count, pass_count, avatar, identity
               FROM user ORDER BY pass_count DESC LIMIT 100"""
        )
        return json.dumps({"total": len(users), "users": _clean_result(users)}, ensure_ascii=False)
    except Exception as e:
        logger.error("getAllUsers 失败: %s", e)
        return json.dumps({"error": f"获取用户列表失败: {e}"}, ensure_ascii=False)


async def get_user_id_by_name(username: str) -> str:
    try:
        logger.info("AI调用工具: getUserIdByName, username=%s", username)
        users = await fetch_all(
            """SELECT id as userId, name, submit_count, pass_count
               FROM user WHERE name LIKE %s LIMIT 20""",
            (f"%{username}%",),
        )
        if not users:
            return json.dumps({"error": f"未找到用户名包含 {username} 的用户"}, ensure_ascii=False)
        return json.dumps({"total": len(users), "users": _clean_result(users)}, ensure_ascii=False)
    except Exception as e:
        logger.error("getUserIdByName 失败: %s", e)
        return json.dumps({"error": f"根据用户名查询用户失败: {e}"}, ensure_ascii=False)


async def get_problem_by_name(name: str) -> str:
    try:
        logger.info("AI调用工具: getProblemByName, name=%s", name)
        problem = await fetch_one(
            """SELECT id, title as name, description, input_format as input_description, output_format as output_description,
                      time_limit, memory_limit, difficulty, submit_count, pass_count
               FROM problem WHERE title LIKE %s AND open = 1 LIMIT 1""",
            (f"%{name}%",),
        )
        if problem:
            return json.dumps(_clean_result(problem), ensure_ascii=False)
        return json.dumps({"error": f"未找到题目 {name}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("getProblemByName 失败: %s", e)
        return json.dumps({"error": f"查询题目失败: {e}"}, ensure_ascii=False)


async def get_problem_by_id(pid: int) -> str:
    try:
        logger.info("AI调用工具: getProblemById, pid=%s", pid)
        problem = await fetch_one(
            """SELECT id, title as name, description, input_format as input_description, output_format as output_description,
                      time_limit, memory_limit, difficulty, submit_count, pass_count
               FROM problem WHERE id = %s""",
            (pid,),
        )
        if problem:
            return json.dumps(_clean_result(problem), ensure_ascii=False)
        return json.dumps({"error": f"未找到题目 {pid}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("getProblemById 失败: %s", e)
        return json.dumps({"error": f"查询题目失败: {e}"}, ensure_ascii=False)


async def get_problem_tags(pid: int) -> str:
    try:
        logger.info("AI调用工具: getProblemTags, pid=%s", pid)
        tags = await fetch_all(
            """SELECT t.id, t.name FROM tag t
               JOIN problem_tag pt ON t.name = pt.tag_name
               WHERE pt.problem_id = %s""",
            (pid,),
        )
        return json.dumps(_clean_result(tags), ensure_ascii=False)
    except Exception as e:
        logger.error("getProblemTags 失败: %s", e)
        return json.dumps({"error": f"查询题目标签失败: {e}"}, ensure_ascii=False)


async def search_problems(keyword: str | None = None) -> str:
    try:
        logger.info("AI调用工具: searchProblems, keyword=%s", keyword)
        if keyword:
            problems = await fetch_all(
                """SELECT id, title as name, difficulty, submit_count, pass_count
                   FROM problem WHERE open = 1
                   AND (title LIKE %s OR id = %s) ORDER BY id LIMIT 50""",
                (f"%{keyword}%", keyword if keyword.isdigit() else -1),
            )
        else:
            problems = await fetch_all(
                """SELECT id, title as name, difficulty, submit_count, pass_count
                   FROM problem WHERE open = 1 ORDER BY id LIMIT 50"""
            )
        return json.dumps({"total": len(problems), "problems": _clean_result(problems)}, ensure_ascii=False)
    except Exception as e:
        logger.error("searchProblems 失败: %s", e)
        return json.dumps({"error": f"搜索题目失败: {e}"}, ensure_ascii=False)


async def get_problem_count() -> str:
    try:
        logger.info("AI调用工具: getProblemCount")
        result = await fetch_one(
            "SELECT COUNT(*) as count FROM problem WHERE open = 1"
        )
        return json.dumps({"count": result["count"] if result else 0})
    except Exception as e:
        logger.error("getProblemCount 失败: %s", e)
        return json.dumps({"error": f"查询题目数量失败: {e}"}, ensure_ascii=False)


async def get_user_submissions(uid: int, page_num: int, page_size: int) -> str:
    try:
        logger.info("AI调用工具: getUserSubmissions, uid=%s, pageNum=%s, pageSize=%s", uid, page_num, page_size)
        offset = (page_num - 1) * page_size
        submissions = await fetch_all(
            """SELECT s.id, s.pid, p.title as problem_name, s.language, s.status,
                      s.time as time_cost, s.memory as memory_cost, s.create_time
               FROM submission s
               LEFT JOIN problem p ON s.pid = p.id
               WHERE s.uid = %s ORDER BY s.create_time DESC LIMIT %s OFFSET %s""",
            (uid, page_size, offset),
        )
        total_result = await fetch_one("SELECT COUNT(*) as count FROM submission WHERE uid = %s", (uid,))
        total = total_result["count"] if total_result else 0
        return json.dumps({"total": total, "submissions": _clean_result(submissions)}, ensure_ascii=False)
    except Exception as e:
        logger.error("getUserSubmissions 失败: %s", e)
        return json.dumps({"error": f"查询提交记录失败: {e}"}, ensure_ascii=False)


async def get_submission_by_id(submission_id: int) -> str:
    try:
        logger.info("AI调用工具: getSubmissionById, id=%s", submission_id)
        submission = await fetch_one(
            """SELECT s.id, s.pid, p.title as problem_name, s.uid, u.name as user_name,
                      s.language, s.status, s.time as time_cost, s.memory as memory_cost, s.create_time
               FROM submission s
               LEFT JOIN problem p ON s.pid = p.id
               LEFT JOIN user u ON s.uid = u.id
               WHERE s.id = %s""",
            (submission_id,),
        )
        if submission:
            return json.dumps(_clean_result(submission), ensure_ascii=False)
        return json.dumps({"error": f"未找到提交记录 {submission_id}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("getSubmissionById 失败: %s", e)
        return json.dumps({"error": f"查询提交详情失败: {e}"}, ensure_ascii=False)


async def get_competition_list() -> str:
    try:
        logger.info("AI调用工具: getCompetitionList")
        competitions = await fetch_all(
            """SELECT id, title, description, begin_time as start_time, end_time, number
               FROM competition ORDER BY begin_time DESC LIMIT 50"""
        )
        return json.dumps(_clean_result(competitions), ensure_ascii=False)
    except Exception as e:
        logger.error("getCompetitionList 失败: %s", e)
        return json.dumps({"error": f"查询比赛列表失败: {e}"}, ensure_ascii=False)


async def get_competition_by_id(cid: int) -> str:
    try:
        logger.info("AI调用工具: getCompetitionById, cid=%s", cid)
        competition = await fetch_one(
            """SELECT id, title, description, begin_time as start_time, end_time, password, need_password, number
               FROM competition WHERE id = %s""",
            (cid,),
        )
        if competition:
            return json.dumps(_clean_result(competition), ensure_ascii=False)
        return json.dumps({"error": f"未找到比赛 {cid}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("getCompetitionById 失败: %s", e)
        return json.dumps({"error": f"查询比赛详情失败: {e}"}, ensure_ascii=False)


async def get_competition_count() -> str:
    try:
        logger.info("AI调用工具: getCompetitionCount")
        result = await fetch_one("SELECT COUNT(*) as count FROM competition")
        return json.dumps({"count": result["count"] if result else 0})
    except Exception as e:
        logger.error("getCompetitionCount 失败: %s", e)
        return json.dumps({"error": f"查询比赛数量失败: {e}"}, ensure_ascii=False)


async def get_tag_list() -> str:
    try:
        logger.info("AI调用工具: getTagList")
        tags = await fetch_all("SELECT id, name FROM tag ORDER BY id")
        return json.dumps(_clean_result(tags), ensure_ascii=False)
    except Exception as e:
        logger.error("getTagList 失败: %s", e)
        return json.dumps({"error": f"查询标签列表失败: {e}"}, ensure_ascii=False)


async def get_solutions_by_problem(pid: int) -> str:
    try:
        logger.info("AI调用工具: getSolutionsByProblem, pid=%s", pid)
        solutions = await fetch_all(
            """SELECT s.id, s.title, s.content, s.uid, u.name as author_name, s.create_time
               FROM solve s
               LEFT JOIN user u ON s.uid = u.id
               WHERE s.pid = %s ORDER BY s.create_time DESC LIMIT 20""",
            (pid,),
        )
        return json.dumps({"total": len(solutions), "solutions": _clean_result(solutions)}, ensure_ascii=False)
    except Exception as e:
        logger.error("getSolutionsByProblem 失败: %s", e)
        return json.dumps({"error": f"查询题解列表失败: {e}"}, ensure_ascii=False)


async def get_public_practice_list(uid: int) -> str:
    try:
        logger.info("AI调用工具: getPublicPracticeList, uid=%s", uid)
        practices = await fetch_all(
            """SELECT p.id, p.title, p.description, p.create_time,
                      COUNT(pp.problem_id) as problem_count
               FROM practice p
               LEFT JOIN practice_problem pp ON p.id = pp.practice_id
               WHERE p.is_public = 1
               GROUP BY p.id, p.title, p.description, p.create_time
               ORDER BY p.create_time DESC LIMIT 50"""
        )
        return json.dumps({"total": len(practices), "practices": _clean_result(practices)}, ensure_ascii=False)
    except Exception as e:
        logger.error("getPublicPracticeList 失败: %s", e)
        return json.dumps({"error": f"获取练习列表失败: {e}"}, ensure_ascii=False)


async def get_practice_count() -> str:
    try:
        logger.info("AI调用工具: getPracticeCount")
        result = await fetch_one("SELECT COUNT(*) as count FROM practice")
        return json.dumps({"count": result["count"] if result else 0})
    except Exception as e:
        logger.error("getPracticeCount 失败: %s", e)
        return json.dumps({"error": f"获取练习数量失败: {e}"}, ensure_ascii=False)


async def execute_tool(tool_name: str, arguments: dict, current_user_id: int | None = None) -> str:
    """执行工具调用"""
    tool_mapping = {
        "getMyUserId": lambda: get_my_user_id(current_user_id),
        "getUserProfile": lambda: get_user_profile(arguments["uid"]),
        "getUserSolvedProblems": lambda: get_user_solved_problems(arguments["uid"]),
        "getUserProgress": lambda: get_user_progress(arguments["uid"]),
        "getUserCount": get_user_count,
        "getAllUsers": get_all_users,
        "getUserIdByName": lambda: get_user_id_by_name(arguments["username"]),
        "getProblemByName": lambda: get_problem_by_name(arguments["name"]),
        "getProblemById": lambda: get_problem_by_id(arguments["pid"]),
        "getProblemTags": lambda: get_problem_tags(arguments["pid"]),
        "searchProblems": lambda: search_problems(arguments.get("keyword")),
        "getProblemCount": get_problem_count,
        "getUserSubmissions": lambda: get_user_submissions(
            arguments["uid"], arguments["pageNum"], arguments["pageSize"]
        ),
        "getSubmissionById": lambda: get_submission_by_id(arguments["id"]),
        "getCompetitionList": get_competition_list,
        "getCompetitionById": lambda: get_competition_by_id(arguments["cid"]),
        "getCompetitionCount": get_competition_count,
        "getTagList": get_tag_list,
        "getSolutionsByProblem": lambda: get_solutions_by_problem(arguments["pid"]),
        "getPublicPracticeList": lambda: get_public_practice_list(arguments["uid"]),
        "getPracticeCount": get_practice_count,
    }

    if tool_name not in tool_mapping:
        return json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)

    try:
        return await tool_mapping[tool_name]()
    except Exception as e:
        logger.error("执行工具 %s 失败: %s", tool_name, e)
        return json.dumps({"error": f"工具执行失败: {e}"}, ensure_ascii=False)
