"""Kimi (月之暗面) 通过阿里云百炼 DashScope 兼容接口调用。"""
from typing import Any, AsyncIterator

from app.providers.base import (
    BaseProvider,
    openai_compatible_stream,
    openai_compatible_stream_with_tools,
)
from app.schemas import ChatStreamRequest

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class KimiProvider(BaseProvider):
    provider_name = "kimi"

    async def stream(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        async for chunk in openai_compatible_stream(
            request=request,
            default_base_url=DEFAULT_BASE_URL,
        ):
            yield chunk

    async def stream_with_tools(
        self,
        request: ChatStreamRequest,
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        async for chunk in openai_compatible_stream_with_tools(
            request=request,
            default_base_url=DEFAULT_BASE_URL,
            tools=tools,
        ):
            yield chunk
