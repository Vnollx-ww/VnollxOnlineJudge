"""请求 / 响应 Pydantic 模型。"""
from typing import Literal

from pydantic import BaseModel, Field


class PreloadRequest(BaseModel):
    problemId: int
    dataVersion: str = "default"


class JudgeRequest(BaseModel):
    submissionId: int | None = None
    problemId: int
    dataVersion: str = "default"
    language: str
    code: str
    timeLimit: int = Field(..., description="Time limit in ms")
    memoryLimit: int = Field(..., description="Memory limit in MB")
    judgeMode: Literal["standard", "float", "special"] | None = "standard"
    floatTolerance: float | None = None
    checkerFile: str | None = None


class SampleRunRequest(BaseModel):
    language: str
    code: str
    inputExample: str
    outputExample: str | None = None
    timeLimit: int = Field(..., description="Time limit in ms")
    memoryLimit: int = Field(..., description="Memory limit in MB")
    judgeMode: Literal["standard", "float"] | None = "standard"
    floatTolerance: float | None = None


class RunFiles(BaseModel):
    stdout: str = ""
    stderr: str = ""


class AgentJudgeResponse(BaseModel):
    status: str
    time: int = 0
    runTime: int = 0
    memory: int = 0
    passCount: int = 0
    testCount: int = 0
    files: RunFiles = Field(default_factory=RunFiles)
    caseInput: str | None = None
    caseExpected: str | None = None


class CacheStatusResponse(BaseModel):
    cached: bool
    problemId: int
    dataVersion: str
    caseCount: int = 0
    path: str
