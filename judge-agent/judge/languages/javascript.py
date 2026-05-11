"""JavaScript / Node.js 语言运行器（不需要编译，直接 inline 源码）。"""
from typing import Any

import httpx

from .base import LanguageRunner


class JavaScriptRunner(LanguageRunner):
    name = "javascript"
    aliases = ("node", "nodejs", "js")

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        return self._compile_success(None)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        return {
            "args": ["/usr/bin/node", "main.js"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"main.js": {"content": code}},
            "copyOut": ["stdout", "stderr"],
        }
