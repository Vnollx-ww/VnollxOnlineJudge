"""构造题判题模式（Special Judge）。"""
from typing import Any

import httpx

from ..go_judge import delete_file, post_go_judge
from ..minio_cache import load_checker_source
from ..models import AgentJudgeResponse
from ..status import STATUS_COMPILE_ERROR, STATUS_WRONG_ANSWER, apply_status_post_processing
from .base import JudgeContext, JudgeMode, accumulate, extract_files, truncate

_CHECKER_WA_MESSAGE = "输出的答案未通过检验。"


class SpecialMode(JudgeMode):
    """编译并执行用户提供的 C++ Checker，由 Checker 判定每个测试点是否通过。"""

    name = "special"
    require_output = False

    def evaluate(self, ctx: JudgeContext, final: AgentJudgeResponse) -> AgentJudgeResponse:
        checker_source = load_checker_source(ctx.checker_file)
        compile_result = self._compile_checker(ctx.client, checker_source)
        if not compile_result["ok"]:
            final.status = STATUS_COMPILE_ERROR
            final.files.stderr = compile_result["stderr"]
            return final

        checker_id: str | None = compile_result["artifactId"]
        try:
            for index, (input_path, _) in enumerate(ctx.cases, start=1):
                input_text = input_path.read_text(encoding="utf-8", errors="replace")
                run_result = ctx.runner.run(
                    ctx.client, ctx.code, ctx.artifact_id, input_text, ctx.cpu_limit_ns, ctx.memory_limit_bytes
                )
                accumulate(final, run_result)

                raw_status = run_result.get("status", "")
                if raw_status != "Accepted":
                    apply_status_post_processing(final, raw_status, ctx.time_limit_ms, ctx.memory_limit_bytes)
                    stdout, stderr = extract_files(run_result)
                    final.files.stdout = stdout
                    final.files.stderr = stderr
                    final.caseInput = truncate(input_text, 200)
                    return final

                participant_output = (run_result.get("files") or {}).get("stdout", "")
                checker_result = self._run_checker(ctx.client, checker_id, input_text, participant_output)
                if checker_result.get("status") != "Accepted" or int(checker_result.get("exitStatus") or 0) != 0:
                    final.status = STATUS_WRONG_ANSWER
                    final.files.stdout = participant_output
                    final.files.stderr = _CHECKER_WA_MESSAGE
                    final.caseInput = truncate(input_text, 200)
                    return final

                final.passCount = index
            return final
        finally:
            if checker_id:
                delete_file(ctx.client, checker_id)

    # ----- 内部辅助 -----

    @staticmethod
    def _compile_checker(client: httpx.Client, code: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["/usr/bin/g++", "checker.cc", "-o", "a"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""}, {"name": "stdout", "max": 10485760}, {"name": "stderr", "max": 10485760}],
            "cpuLimit": 10000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {"checker.cc": {"content": code}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["a"],
        }]}
        result = post_go_judge(client, payload)[0]
        if result.get("status") == "Accepted":
            checker_id = (result.get("fileIds") or {}).get("a")
            if checker_id:
                return {"ok": True, "artifactId": checker_id}
        return {"ok": False, "stderr": (result.get("files") or {}).get("stderr", "Checker 编译错误")}

    @staticmethod
    def _run_checker(client: httpx.Client, checker_id: str, input_text: str, participant_output: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["a", "input.txt", "answer.txt", "output.txt"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""}, {"name": "stdout", "max": 1048576}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": 10000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {
                "a": {"fileId": checker_id},
                "input.txt": {"content": input_text},
                "answer.txt": {"content": ""},
                "output.txt": {"content": participant_output},
            },
            "copyOut": ["stdout", "stderr"],
        }]}
        return post_go_judge(client, payload)[0]


