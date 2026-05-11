"""判题模式抽象基类与公共上下文。"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

import httpx

from ..languages import LanguageRunner
from ..models import AgentJudgeResponse


@dataclass
class JudgeContext:
    """评测一次提交所需的运行时上下文，由 engine 构造后传给 JudgeMode。"""
    client: httpx.Client
    runner: LanguageRunner
    code: str
    artifact_id: str | None
    cases: list[tuple[Path, Path]]
    cpu_limit_ns: int
    memory_limit_bytes: int
    time_limit_ms: int
    float_tolerance: float
    checker_file: str | None = None


class JudgeMode(ABC):
    """每种判题模式（standard / float / special）对应一个 JudgeMode。"""

    name: str = ""
    # 是否要求每个测试点必须有 .out（special 模式下不要求）。
    require_output: bool = True

    @abstractmethod
    def evaluate(self, ctx: JudgeContext, final: AgentJudgeResponse) -> AgentJudgeResponse:
        """逐测试点评测，把结果写入 final 并返回。"""


def truncate(value: str, max_len: int) -> str:
    return value if len(value) <= max_len else value[:max_len] + "..."


def extract_files(result: dict) -> tuple[str, str]:
    files = result.get("files") or {}
    return files.get("stdout", ""), files.get("stderr", "")


def accumulate(final: AgentJudgeResponse, result: dict) -> None:
    """累加耗时和内存（取所有测试点最大值），并把 ns → ms、bytes → MB。"""
    time_ns = int(result.get("time") or 0)
    memory_bytes = int(result.get("memory") or 0)
    final.time = max(final.time, time_ns)
    final.runTime = max(final.runTime, time_ns // 1_000_000)
    final.memory = max(final.memory, memory_bytes // 1_048_576)
