"""通用 OpenAI 兼容 provider：靠请求体的 base_url 区分接入点。

适用于：
- Mistral (https://api.mistral.ai/v1)
- 智谱 GLM (https://open.bigmodel.cn/api/paas/v4)
- 阿里云百炼/DashScope OpenAI 兼容 (https://dashscope.aliyuncs.com/compatible-mode/v1)
  覆盖 Qwen / DeepSeek / Kimi / MiniMax 等同入口的模型
- Groq (https://api.groq.com/openai/v1)
- OpenAI 官方及任何 OpenAI 协议兼容服务

base_url 必填；模型差异化参数（如 DeepSeek 的 enable_thinking）通过请求体 extra_body 传入。
"""
from typing import Any, AsyncIterator

from app.providers.base import (
    BaseProvider,
    ProviderError,
    openai_compatible_stream,
    openai_compatible_stream_with_tools,
)
from app.schemas import ChatStreamRequest


class OpenAICompatibleProvider(BaseProvider):
    provider_name = "openai_compatible"

    @staticmethod
    def _require_base_url(request: ChatStreamRequest) -> str:
        base_url = (request.base_url or "").strip()
        if not base_url:
            raise ProviderError("openai_compatible 适配器需要传 base_url")
        return base_url

    async def stream(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        base_url = self._require_base_url(request)
        async for chunk in openai_compatible_stream(
            request=request,
            default_base_url=base_url,
        ):
            yield chunk

    async def stream_with_tools(
        self, request: ChatStreamRequest, tools: list[dict[str, Any]] | None = None
    ) -> AsyncIterator[dict[str, Any]]:
        base_url = self._require_base_url(request)
        async for chunk in openai_compatible_stream_with_tools(
            request=request,
            default_base_url=base_url,
            tools=tools,
        ):
            yield chunk
