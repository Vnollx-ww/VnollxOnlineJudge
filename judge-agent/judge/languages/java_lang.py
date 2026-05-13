"""Java 语言运行器。"""
from __future__ import annotations

from typing import Any

import httpx

from ..go_judge import post_go_judge
from .base import LanguageRunner

_MIN_HEAP_BYTES = 8 * 1024 * 1024
# 题面 Java 内存上限不超过 256MB（与题库配置一致）
_MAX_PROBLEM_BYTES = 256 * 1024 * 1024
_COMPILE_JVM_MAX_HEAP_MB = 320


def _effective_memory_limit_bytes(memory_limit_bytes: int) -> int:
    if memory_limit_bytes <= 0:
        return _MAX_PROBLEM_BYTES
    return min(memory_limit_bytes, _MAX_PROBLEM_BYTES)


def _java_heap_max_bytes(memory_limit_bytes: int) -> int:
    """
    在 go-judge 的 cgroup 内存上限内，为堆外（元空间、代码缓存、线程栈、GC 等）预留空间，
    避免默认 JVM 启发式在受限 cgroup 下仍申请过大堆导致 os::commit_memory 失败。

    在题面最大 256MB 时预留约 64MB，堆约 192MB，兼顾稳定性与可用堆。
    """
    limit = _effective_memory_limit_bytes(memory_limit_bytes)
    # 预留 40–64MB：256MB 题约 64MB 堆外 → -Xmx≈192m
    reserve = max(
        40 * 1024 * 1024,
        min(64 * 1024 * 1024, limit // 4 + 28 * 1024 * 1024),
    )
    reserve = min(reserve, limit - _MIN_HEAP_BYTES)
    return max(_MIN_HEAP_BYTES, limit - reserve)


def _java_run_jvm_args(memory_limit_bytes: int) -> list[str]:
    heap = _java_heap_max_bytes(memory_limit_bytes)
    limit = _effective_memory_limit_bytes(memory_limit_bytes)
    limit_mb = max(1, limit // (1024 * 1024))
    # 256MB 以内题库：元空间 16–48MB 足够 Main + 标准库
    meta_mb = max(16, min(48, 12 + limit_mb // 4))
    return [
        f"-Xms{_MIN_HEAP_BYTES // (1024 * 1024)}m",
        f"-Xmx{heap // (1024 * 1024)}m",
        f"-XX:MaxMetaspaceSize={meta_mb}m",
        "-XX:+UseSerialGC",
    ]


class JavaRunner(LanguageRunner):
    name = "java"

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        compile_jvm = [
            f"-J-Xmx{_COMPILE_JVM_MAX_HEAP_MB}m",
            "-J-Xms8m",
            "-J-XX:+UseSerialGC",
        ]
        payload = {"cmd": [{
            "args": ["/usr/bin/javac", *compile_jvm, "Main.java"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""}, {"name": "stdout", "max": 10485760}, {"name": "stderr", "max": 10485760}],
            "cpuLimit": 30000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {"Main.java": {"content": code}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["Main.class"],
        }]}
        result = post_go_judge(client, payload)[0]
        if result.get("status") == "Accepted":
            artifact = (result.get("fileIds") or {}).get("Main.class")
            if artifact:
                return self._compile_success(artifact)
        return self._compile_failure(result)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        jvm = _java_run_jvm_args(memory_limit_bytes)
        return {
            "args": ["/usr/bin/java", *jvm, "-Djava.security.policy=", "Main"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"Main.class": {"fileId": artifact_id}},
            "copyOut": ["stdout", "stderr"],
        }
