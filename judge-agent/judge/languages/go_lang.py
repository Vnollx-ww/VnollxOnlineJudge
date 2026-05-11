"""Go 语言运行器。"""
from typing import Any

import httpx

from ..go_judge import post_go_judge
from .base import LanguageRunner


class GoRunner(LanguageRunner):
    name = "go"
    aliases = ("golang",)

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["/usr/bin/go", "build", "-o", "main", "main.go"],
            "env": ["PATH=/usr/local/go/bin:/usr/bin:/bin", "GOCACHE=/tmp/gocache", "HOME=/tmp"],
            "files": [{"content": ""}, {"name": "stdout", "max": 10485760}, {"name": "stderr", "max": 10485760}],
            "cpuLimit": 30000000000,
            "memoryLimit": 536870912,
            "procLimit": 80,
            "copyIn": {"main.go": {"content": code}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["main"],
        }]}
        result = post_go_judge(client, payload)[0]
        if result.get("status") == "Accepted":
            artifact = (result.get("fileIds") or {}).get("main")
            if artifact:
                return self._compile_success(artifact)
        return self._compile_failure(result)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        return {
            "args": ["main"],
            "env": ["PATH=/usr/local/go/bin:/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "procLimit": 80,
            "copyIn": {"main": {"fileId": artifact_id}},
            "copyOut": ["stdout", "stderr"],
        }
