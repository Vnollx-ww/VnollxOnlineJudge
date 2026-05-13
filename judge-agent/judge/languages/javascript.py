"""JavaScript / Node.js 语言运行器（不需要编译，直接 inline 源码）。"""
from typing import Any

import httpx

from .base import LanguageRunner

NODE_MIN_MEMORY_LIMIT_BYTES = 256 * 1024 * 1024
NODE_MEMORY_OVERHEAD_MB = 96


class JavaScriptRunner(LanguageRunner):
    name = "javascript"
    aliases = ("node", "nodejs", "js")

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        return self._compile_success(None)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        effective_memory_limit_bytes = max(memory_limit_bytes, NODE_MIN_MEMORY_LIMIT_BYTES)
        old_space_mb = max(16, effective_memory_limit_bytes // 1024 // 1024 - NODE_MEMORY_OVERHEAD_MB)
        return {
            "args": ["/usr/bin/node", f"--max-old-space-size={old_space_mb}", "main.js"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text}, {"name": "stdout", "max": 67108864}, {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": effective_memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"main.js": {"content": code}},
            "copyOut": ["stdout", "stderr"],
        }
