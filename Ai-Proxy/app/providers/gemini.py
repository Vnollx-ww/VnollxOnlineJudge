from typing import Any, AsyncIterator

from openai import AsyncOpenAI

from app.providers.base import BaseProvider, ProviderError, SYSTEM_PROMPT_CODE_REMINDER, prepend_system_prompt
from app.schemas import ChatStreamRequest

DEFAULT_GEMINI_BASE_URL = "https://hiapi.online/v1"


def build_gemini_messages(request: ChatStreamRequest) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for message in request.messages:
        payload: dict[str, Any] = {"role": message.role, "content": message.content}
        if message.tool_call_id:
            payload["tool_call_id"] = message.tool_call_id
        if message.tool_calls:
            payload["tool_calls"] = message.tool_calls
        messages.append(payload)
    return prepend_system_prompt(messages, SYSTEM_PROMPT_CODE_REMINDER)


def build_gemini_create_kwargs(
    request: ChatStreamRequest,
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "model": request.model,
        "messages": build_gemini_messages(request),
        "stream": True,
    }
    if request.temperature is not None:
        kwargs["temperature"] = request.temperature
    if request.max_tokens is not None:
        kwargs["max_tokens"] = request.max_tokens
    if request.top_p is not None:
        kwargs["top_p"] = request.top_p
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"
    if request.extra_body:
        kwargs["extra_body"] = request.extra_body
    return kwargs


async def iter_gemini_stream(
    request: ChatStreamRequest,
    tools: list[dict[str, Any]] | None = None,
) -> AsyncIterator[Any]:
    base_url = (request.base_url or DEFAULT_GEMINI_BASE_URL).strip() or DEFAULT_GEMINI_BASE_URL
    client = AsyncOpenAI(
        api_key=request.api_key,
        base_url=base_url,
        timeout=request.timeout,
    )
    try:
        stream = await client.chat.completions.create(
            **build_gemini_create_kwargs(request, tools)
        )
        async for chunk in stream:
            yield chunk
    except Exception as exc:
        raise ProviderError(f"{base_url} 调用失败: {exc}") from exc
    finally:
        await client.close()


class GeminiProvider(BaseProvider):
    provider_name = "gemini"

    async def stream(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        async for chunk in iter_gemini_stream(request):
            for choice in chunk.choices or []:
                delta = choice.delta
                if not delta:
                    continue
                content = getattr(delta, "content", None)
                if content:
                    yield content

    async def stream_with_tools(
        self, request: ChatStreamRequest, tools: list[dict[str, Any]] | None = None
    ) -> AsyncIterator[dict[str, Any]]:
        async for chunk in iter_gemini_stream(request, tools):
            for choice in chunk.choices or []:
                delta = choice.delta
                if not delta:
                    continue

                reasoning_content = getattr(delta, "reasoning_content", None)
                if reasoning_content:
                    yield {"type": "reasoning", "delta": reasoning_content}

                content = getattr(delta, "content", None)
                if content:
                    yield {"type": "content", "delta": content}

                for tool_call in getattr(delta, "tool_calls", None) or []:
                    function = getattr(tool_call, "function", None)
                    yield {
                        "type": "tool_call",
                        "tool_call": {
                            "index": getattr(tool_call, "index", 0) or 0,
                            "id": getattr(tool_call, "id", None),
                            "function": {
                                "name": getattr(function, "name", None),
                                "arguments": getattr(function, "arguments", None),
                            },
                        },
                    }
