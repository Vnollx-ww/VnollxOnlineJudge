from typing import Any, AsyncIterator

from app.providers.base import (
    BaseProvider,
    openai_compatible_stream,
    openai_compatible_stream_with_tools,
)
from app.schemas import ChatStreamRequest


class QwenProvider(BaseProvider):
    provider_name = "qwen"

    async def stream(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        async for chunk in openai_compatible_stream(
            request=request,
            default_base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        ):
            yield chunk

    async def stream_with_tools(
        self, request: ChatStreamRequest, tools: list[dict[str, Any]] | None = None
    ) -> AsyncIterator[dict[str, Any]]:
        async for chunk in openai_compatible_stream_with_tools(
            request=request,
            default_base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            tools=tools,
        ):
            yield chunk
