"""语言运行器抽象基类。"""
from abc import ABC, abstractmethod
from typing import Any

import httpx

from ..go_judge import post_go_judge
from ..status import STATUS_COMPILE_ERROR, STATUS_MEMORY_LIMIT


class LanguageRunner(ABC):
    """每种语言对应一个 LanguageRunner，封装编译命令、运行命令和产物名。"""

    name: str = ""
    aliases: tuple[str, ...] = ()

    @abstractmethod
    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        """
        编译用户代码。

        返回:
            {"ok": True, "artifactId": str | None} 编译成功（脚本语言 artifactId=None）
            {"ok": False, "status": str, "stderr": str} 编译失败
        """

    @abstractmethod
    def build_run_cmd(
        self,
        code: str,
        artifact_id: str | None,
        input_text: str,
        cpu_limit_ns: int,
        memory_limit_bytes: int,
    ) -> dict[str, Any]:
        """构造单测试点的 go-judge 运行 cmd。"""

    def run(
        self,
        client: httpx.Client,
        code: str,
        artifact_id: str | None,
        input_text: str,
        cpu_limit_ns: int,
        memory_limit_bytes: int,
    ) -> dict[str, Any]:
        payload = {"cmd": [self.build_run_cmd(code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes)]}
        return post_go_judge(client, payload)[0]

    # 子类可复用的小工具

    @staticmethod
    def _compile_failure(result: dict[str, Any]) -> dict[str, Any]:
        status = result.get("status", "")
        translated_status = STATUS_MEMORY_LIMIT if status == "Memory Limit Exceeded" else STATUS_COMPILE_ERROR
        stderr = (result.get("files") or {}).get("stderr", STATUS_COMPILE_ERROR)
        return {"ok": False, "status": translated_status, "stderr": stderr}

    @staticmethod
    def _compile_success(artifact_id: str | None) -> dict[str, Any]:
        return {"ok": True, "artifactId": artifact_id}
