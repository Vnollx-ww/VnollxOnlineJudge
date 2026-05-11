"""Vnollx Judge Agent FastAPI 入口。

只负责 HTTP 路由分发，所有评测业务逻辑在 ``judge`` 包里：
- ``judge/languages/*``：每种语言一个 LanguageRunner
- ``judge/modes/*``：每种判题模式一个 JudgeMode
- ``judge/engine.py``：编排器，按语言 + 模式调度
"""
from typing import Any

from fastapi import FastAPI

from judge.config import (
    GO_JUDGE_URL,
    JUDGE_DATA_ROOT_STR,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    PRELOAD_ALL_ON_STARTUP,
)
from judge.engine import run_judge, run_sample
from judge.minio_cache import cache_status, ensure_data_cached, preload_all_from_minio
from judge.models import (
    AgentJudgeResponse,
    CacheStatusResponse,
    JudgeRequest,
    PreloadRequest,
    SampleRunRequest,
)

app = FastAPI(title="Vnollx Judge Agent", version="0.2.0")


@app.on_event("startup")
def on_startup() -> None:
    if PRELOAD_ALL_ON_STARTUP:
        preload_all_from_minio()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "goJudgeUrl": GO_JUDGE_URL,
        "dataRoot": JUDGE_DATA_ROOT_STR,
        "minioEndpoint": MINIO_ENDPOINT,
        "minioBucket": MINIO_BUCKET,
        "preloadAllOnStartup": PRELOAD_ALL_ON_STARTUP,
    }


@app.post("/data/preload", response_model=CacheStatusResponse)
def preload(req: PreloadRequest) -> CacheStatusResponse:
    ensure_data_cached(req.problemId, req.dataVersion)
    return cache_status(req.problemId, req.dataVersion)


@app.get("/data/cache-status", response_model=CacheStatusResponse)
def get_cache_status(problemId: int, dataVersion: str = "default") -> CacheStatusResponse:
    return cache_status(problemId, dataVersion)


@app.post("/judge/submit", response_model=AgentJudgeResponse)
def judge(req: JudgeRequest) -> AgentJudgeResponse:
    return run_judge(req)


@app.post("/judge/run-sample", response_model=AgentJudgeResponse)
def judge_sample(req: SampleRunRequest) -> AgentJudgeResponse:
    return run_sample(req)
