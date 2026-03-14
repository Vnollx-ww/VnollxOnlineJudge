import json
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator

import httpx

from app.schemas import ChatStreamRequest


class ProviderError(Exception):
    """统一的供应商调用异常。"""


# 系统提示词：当用户索要代码时，回复后需提醒用户理解代码并可继续提问
SYSTEM_PROMPT_CODE_REMINDER = (
    "如果用户向你要了代码，在回复代码之后，需要提醒用户一定要理解代码，如有不懂可以一直向你发起提问。"
)


def prepend_system_prompt(messages: list[dict[str, Any]], system_text: str) -> list[dict[str, Any]]:
    """在消息列表最前插入一条 system 消息（若已有 system 则合并到第一条）。"""
    if not system_text or not system_text.strip():
        return messages
    new_list = list(messages)
    if new_list and new_list[0].get("role") == "system":
        new_list[0] = {
            **new_list[0],
            "content": (new_list[0].get("content") or "").strip() + "\n\n" + system_text.strip(),
        }
        return new_list
    return [{"role": "system", "content": system_text.strip()}] + new_list


class BaseProvider(ABC):
    provider_name: str

    @abstractmethod
    async def stream(self, request: ChatStreamRequest) -> AsyncIterator[str]:
        """流式返回文本增量。"""

    async def stream_with_tools(
        self, request: ChatStreamRequest, tools: list[dict[str, Any]] | None = None
    ) -> AsyncIterator[dict[str, Any]]:
        """流式返回，支持工具调用。默认实现不支持工具。"""
        async for chunk in self.stream(request):
            yield {"type": "content", "delta": chunk}


def normalize_base_url(base_url: str | None, default_base_url: str) -> str:
    if not base_url:
        return default_base_url
    normalized = base_url.strip()
    if not normalized:
        return default_base_url
    if not normalized.startswith(("http://", "https://")):
        normalized = f"https://{normalized}"
    return normalized


def build_openai_payload(
    request: ChatStreamRequest,
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    messages = []
    for msg in request.messages:
        m = {"role": msg.role, "content": msg.content}
        if msg.tool_call_id:
            m["tool_call_id"] = msg.tool_call_id
        if msg.tool_calls:
            m["tool_calls"] = msg.tool_calls
        messages.append(m)
    messages = prepend_system_prompt(messages, SYSTEM_PROMPT_CODE_REMINDER)

    payload: dict[str, Any] = {
        "model": request.model,
        "messages": messages,
        "stream": True,
    }
    if request.temperature is not None:
        payload["temperature"] = request.temperature
    if request.max_tokens is not None:
        payload["max_tokens"] = request.max_tokens
    if request.top_p is not None:
        payload["top_p"] = request.top_p
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    payload.update(request.extra_body)
    return payload


async def iter_sse_json(response: httpx.Response) -> AsyncIterator[dict[str, Any]]:
    async for line in response.aiter_lines():
        if not line or not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if not data or data == "[DONE]":
            break
        try:
            yield json.loads(data)
        except json.JSONDecodeError as exc:
            raise ProviderError(f"SSE 数据解析失败: {data}") from exc


async def openai_compatible_stream(
    *,
    request: ChatStreamRequest,
    default_base_url: str,
    path: str = "/chat/completions",
    extra_payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> AsyncIterator[str]:
    base_url = normalize_base_url(request.base_url, default_base_url)
    url = f"{base_url.rstrip('/')}{path}"
    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    if extra_headers:
        headers.update(extra_headers)

    payload = build_openai_payload(request)
    if extra_payload:
        payload.update(extra_payload)

    async with httpx.AsyncClient(timeout=request.timeout) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                body = await response.aread()
                raise ProviderError(
                    f"{url} 调用失败，状态码 {response.status_code}: {body.decode('utf-8', errors='ignore')}"
                ) from exc

            async for event in iter_sse_json(response):
                choices = event.get("choices") or []
                if not choices:
                    continue

                delta = choices[0].get("delta") or {}
                reasoning_content = delta.get("reasoning_content")
                if reasoning_content:
                    yield reasoning_content

                content = delta.get("content")
                if content:
                    yield content


async def openai_compatible_stream_with_tools(
    *,
    request: ChatStreamRequest,
    default_base_url: str,
    tools: list[dict[str, Any]] | None = None,
    path: str = "/chat/completions",
    extra_payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """支持工具调用的 OpenAI 兼容流式请求"""
    base_url = normalize_base_url(request.base_url, default_base_url)
    url = f"{base_url.rstrip('/')}{path}"
    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    if extra_headers:
        headers.update(extra_headers)

    payload = build_openai_payload(request, tools)
    if extra_payload:
        payload.update(extra_payload)

    async with httpx.AsyncClient(timeout=request.timeout) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                body = await response.aread()
                raise ProviderError(
                    f"{url} 调用失败，状态码 {response.status_code}: {body.decode('utf-8', errors='ignore')}"
                ) from exc

            async for event in iter_sse_json(response):
                choices = event.get("choices") or []
                if not choices:
                    continue

                delta = choices[0].get("delta") or {}

                reasoning_content = delta.get("reasoning_content")
                if reasoning_content:
                    yield {"type": "reasoning", "delta": reasoning_content}

                content = delta.get("content")
                if content:
                    yield {"type": "content", "delta": content}

                tool_calls = delta.get("tool_calls")
                if tool_calls:
                    for tc in tool_calls:
                        yield {
                            "type": "tool_call",
                            "tool_call": {
                                "index": tc.get("index", 0),
                                "id": tc.get("id"),
                                "function": tc.get("function"),
                            },
                        }
