"""状态码、状态翻译、TLE/Signalled 后处理。"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import AgentJudgeResponse

STATUS_ACCEPTED = "答案正确"
STATUS_COMPILE_ERROR = "编译错误"
STATUS_TIME_LIMIT = "时间超出限制"
STATUS_MEMORY_LIMIT = "内存超出限制"
STATUS_WRONG_ANSWER = "答案错误"
STATUS_JUDGE_ERROR = "判题错误"

_TRANSLATIONS = {
    "Accepted": STATUS_ACCEPTED,
    "Time Limit Exceeded": STATUS_TIME_LIMIT,
    "Memory Limit Exceeded": STATUS_MEMORY_LIMIT,
    "Output Limit Exceeded": "输出超出限制",
    "Signalled": "运行时错误",
    "Runtime Error": "运行时错误",
    "Nonzero Exit Status": "运行时错误",
    "Dangerous Syscall": "非法系统调用",
    "File Error": STATUS_JUDGE_ERROR,
    "Internal Error": STATUS_JUDGE_ERROR,
    "Invalid": STATUS_JUDGE_ERROR,
    "Unknown": STATUS_JUDGE_ERROR,
}


def translate_status(status: str) -> str:
    return _TRANSLATIONS.get(status, status or STATUS_JUDGE_ERROR)


def apply_status_post_processing(
    final: "AgentJudgeResponse",
    raw_status: str,
    time_limit_ms: int,
    memory_limit_bytes: int,
) -> None:
    """TLE 时把 time/runTime 对齐到时限；Signalled 时把 memory 对齐到内存上限。"""
    final.status = translate_status(raw_status)
    if raw_status == "Time Limit Exceeded" or final.status == STATUS_TIME_LIMIT:
        final.time = time_limit_ms * 1_000_000
        final.runTime = time_limit_ms
    if raw_status == "Signalled":
        final.memory = max(final.memory, memory_limit_bytes // 1_048_576)
