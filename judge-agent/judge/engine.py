"""评测编排：根据语言和判题模式调度对应策略。"""
import httpx
from fastapi import HTTPException

from .compare import equals_ignoring_whitespace, equals_with_float_tolerance, normalize_line_endings
from .config import DEFAULT_FLOAT_TOLERANCE, HTTP_TIMEOUT_SECONDS
from .go_judge import delete_file
from .languages import get_runner
from .minio_cache import data_dir_for, ensure_data_cached, list_cases
from .models import AgentJudgeResponse, JudgeRequest, RunFiles, SampleRunRequest
from .modes import JudgeContext, get_mode
from .modes.base import accumulate, extract_files, truncate
from .status import (
    STATUS_ACCEPTED,
    STATUS_JUDGE_ERROR,
    STATUS_WRONG_ANSWER,
    apply_status_post_processing,
)


def run_judge(req: JudgeRequest) -> AgentJudgeResponse:
    """提交评测：从本机 MinIO 拉测试数据，选 language + mode，逐测试点本机调 Go-Judge。"""
    mode = get_mode(req.judgeMode)

    data_dir = data_dir_for(req.problemId, req.dataVersion)
    if not (data_dir / ".ready").exists():
        data_dir = ensure_data_cached(req.problemId, req.dataVersion)

    cases = list_cases(data_dir, require_output=mode.require_output)
    if not cases:
        raise HTTPException(status_code=400, detail="no test cases found")

    client = httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)
    artifact_id: str | None = None
    try:
        try:
            runner = get_runner(req.language)
        except ValueError as exc:
            return AgentJudgeResponse(status=STATUS_JUDGE_ERROR, files=RunFiles(stderr=str(exc)))

        compile_result = runner.compile(client, req.code)
        if not compile_result["ok"]:
            return AgentJudgeResponse(
                status=compile_result["status"],
                files=RunFiles(stderr=compile_result["stderr"]),
            )
        artifact_id = compile_result.get("artifactId")

        final = AgentJudgeResponse(status=STATUS_ACCEPTED, testCount=len(cases))
        ctx = JudgeContext(
            client=client,
            runner=runner,
            code=req.code,
            artifact_id=artifact_id,
            cases=cases,
            cpu_limit_ns=req.timeLimit * 1_000_000,
            memory_limit_bytes=req.memoryLimit * 1024 * 1024,
            time_limit_ms=req.timeLimit,
            float_tolerance=req.floatTolerance if req.floatTolerance is not None else DEFAULT_FLOAT_TOLERANCE,
            checker_file=req.checkerFile,
        )
        return mode.evaluate(ctx, final)
    except HTTPException:
        raise
    except Exception as exc:
        return AgentJudgeResponse(status=STATUS_JUDGE_ERROR, files=RunFiles(stderr=str(exc)))
    finally:
        if artifact_id:
            delete_file(client, artifact_id)
        client.close()


def run_sample(req: SampleRunRequest) -> AgentJudgeResponse:
    """样例运行 / 自定义输入运行：单测试点，可选与 outputExample 比较。"""
    client = httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)
    artifact_id: str | None = None
    try:
        try:
            runner = get_runner(req.language)
        except ValueError as exc:
            return AgentJudgeResponse(status=STATUS_JUDGE_ERROR, files=RunFiles(stderr=str(exc)))

        compile_result = runner.compile(client, req.code)
        if not compile_result["ok"]:
            return AgentJudgeResponse(
                status=compile_result["status"],
                files=RunFiles(stderr=compile_result["stderr"]),
            )
        artifact_id = compile_result.get("artifactId")

        final = AgentJudgeResponse(status=STATUS_ACCEPTED, testCount=1)
        cpu_limit_ns = req.timeLimit * 1_000_000
        memory_limit_bytes = req.memoryLimit * 1024 * 1024

        input_text = normalize_line_endings(req.inputExample)
        run_result = runner.run(client, req.code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes)
        accumulate(final, run_result)

        raw_status = run_result.get("status", "")
        if raw_status != "Accepted":
            apply_status_post_processing(final, raw_status, req.timeLimit, memory_limit_bytes)
            stdout, stderr = extract_files(run_result)
            final.files.stdout = stdout
            final.files.stderr = stderr
            final.caseInput = truncate(input_text, 200)
            if req.outputExample is not None:
                final.caseExpected = truncate(normalize_line_endings(req.outputExample), 400)
            return final

        actual = normalize_line_endings((run_result.get("files") or {}).get("stdout", ""))
        final.files.stdout = actual
        final.caseInput = truncate(input_text, 200)

        if req.outputExample is None or req.outputExample == "":
            final.passCount = 1
            return final

        expected = normalize_line_endings(req.outputExample)
        final.caseExpected = truncate(expected, 400)
        tolerance = req.floatTolerance if req.floatTolerance is not None else DEFAULT_FLOAT_TOLERANCE
        mode_name = (req.judgeMode or "standard").lower()
        if mode_name == "float":
            matched = equals_with_float_tolerance(expected, actual, tolerance)
        else:
            matched = equals_ignoring_whitespace(expected, actual)
        if not matched:
            final.status = STATUS_WRONG_ANSWER
            return final
        final.passCount = 1
        return final
    except Exception as exc:
        return AgentJudgeResponse(status=STATUS_JUDGE_ERROR, files=RunFiles(stderr=str(exc)))
    finally:
        if artifact_id:
            delete_file(client, artifact_id)
        client.close()
