"""C++ 语言运行器。"""
from typing import Any

import httpx

from ..go_judge import post_go_judge
from .base import LanguageRunner


class CppRunner(LanguageRunner):
    name = "cpp"
    aliases = ("c++",)

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["/usr/bin/g++", "a.cc", "-o", "a"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""}, {"name": "stdout", "max": 10485760}, {"name": "stderr", "max": 10485760}],
            "cpuLimit": 10000000000,
            "memoryLimit": 536870912,
            "procLimit": 50,
            "copyIn": {"a.cc": {"content": code}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["a"],
        }]}
        result = post_go_judge(client, payload)[0]
        if result.get("status") == "Accepted":
            artifact = (result.get("fileIds") or {}).get("a")
            if artifact:
                return self._compile_success(artifact)
        return self._compile_failure(result)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        return {
            "args": ["a"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "stackLimit": memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"a": {"fileId": artifact_id}},
            "copyOut": ["stdout", "stderr"],
        }
