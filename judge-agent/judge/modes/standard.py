"""标准判题模式与浮点判题模式。

通过注入 comparator 函数复用同一套测试点循环骨架。
"""
from collections.abc import Callable

from ..compare import equals_ignoring_whitespace, equals_with_float_tolerance, normalize_line_endings
from ..models import AgentJudgeResponse
from ..status import STATUS_WRONG_ANSWER, apply_status_post_processing
from .base import JudgeContext, JudgeMode, accumulate, extract_files, truncate

# comparator: (expected, actual, tolerance) -> bool
Comparator = Callable[[str, str, float], bool]


class _OutputCompareMode(JudgeMode):
    """common 父类：对每个测试点读 .in 跑用户程序，再用 comparator 比 stdout。"""

    require_output = True
    comparator: Comparator = staticmethod(lambda e, a, t: False)

    def evaluate(self, ctx: JudgeContext, final: AgentJudgeResponse) -> AgentJudgeResponse:
        for index, (input_path, output_path) in enumerate(ctx.cases, start=1):
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
                final.caseExpected = truncate(
                    normalize_line_endings(output_path.read_text(encoding="utf-8", errors="replace")), 400
                )
                return final

            expected = normalize_line_endings(output_path.read_text(encoding="utf-8", errors="replace"))
            actual = normalize_line_endings((run_result.get("files") or {}).get("stdout", ""))
            if not self.comparator(expected, actual, ctx.float_tolerance):
                final.status = STATUS_WRONG_ANSWER
                final.files.stdout = actual
                final.caseInput = truncate(input_text, 200)
                final.caseExpected = truncate(expected, 400)
                return final

            final.passCount = index
        return final


class StandardMode(_OutputCompareMode):
    name = "standard"

    @staticmethod
    def comparator(expected: str, actual: str, tolerance: float) -> bool:
        return equals_ignoring_whitespace(expected, actual)


class FloatMode(_OutputCompareMode):
    name = "float"

    @staticmethod
    def comparator(expected: str, actual: str, tolerance: float) -> bool:
        return equals_with_float_tolerance(expected, actual, tolerance)
