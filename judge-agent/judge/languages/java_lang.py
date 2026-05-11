"""Java 语言运行器。"""
from typing import Any

import httpx

from ..go_judge import post_go_judge
from .base import LanguageRunner


class JavaRunner(LanguageRunner):
    name = "java"

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["/usr/bin/javac", "Main.java"],
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
        return {
            "args": ["/usr/bin/java", "-Djava.security.policy=", "Main"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"Main.class": {"fileId": artifact_id}},
            "copyOut": ["stdout", "stderr"],
        }
