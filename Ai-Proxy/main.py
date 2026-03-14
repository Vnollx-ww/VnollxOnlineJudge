import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from app.database import close_db_pool, init_db_pool
from app.oj_tools import TOOL_DEFINITIONS, execute_tool
from app.provider_registry import ProviderNotFoundError, get_provider, normalize_model_name
from app.providers.base import ProviderError
from app.schemas import ChatMessage, ChatStreamRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    yield
    await close_db_pool()


app = FastAPI(
    title="Vnollx Online Judge Proxy",
    version="0.2.0",
    description="按模型名路由到不同厂商的大模型流式代理服务，支持 OJ 工具调用。",
    lifespan=lifespan,
)

SYSTEM_PROMPT = """你是VnollxOnlineJudge在线判题系统的智能助手，名字叫小V，你是由Vnollx(吴恩宇)开发的。

你可以帮助用户：
1. 查询个人信息、提交记录、通过的题目等
2. 查询题目信息、搜索题目
3. 查询比赛信息
4. 查询通知消息
5. 分析用户的算法学习进度
6. 解答编程相关问题

**重要规则：**
1. 当用户询问"我的xxx"时，先调用getMyUserId获取当前用户ID，再用该ID查询相关信息
2. 回复要简洁友好，使用可爱活泼的语气
3. 可以适当使用表情符号 😊✨🌟📚💻
4. 对用户的进步要给予鼓励
5. 不要在回复中暴露工具调用的细节
6. 如果查询失败，友好地告知用户

**语气示例：**
- "你已经通过了42道题啦！真棒！继续加油哦～ 🌟"
- "让我帮你查一下... 你的用户名是Vnollx呢！😊"
- "这道题的难度是中等，相信你一定能搞定！💪"
"""


def sse_event(payload: dict) -> bytes:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")


@app.get("/")
async def root() -> dict:
    return {"message": "proxy server is running"}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/chat/stream")
async def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    try:
        provider = get_provider(request.model)
        actual_model = normalize_model_name(request.model)
    except ProviderNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    normalized_request = request.model_copy(update={"model": actual_model})

    async def event_stream() -> AsyncIterator[bytes]:
        yield sse_event(
            {
                "type": "meta",
                "provider": provider.provider_name,
                "model": actual_model,
            }
        )

        try:
            async for chunk in provider.stream(normalized_request):
                if chunk:
                    yield sse_event({"type": "content", "delta": chunk})
        except ProviderError as exc:
            yield sse_event({"type": "error", "message": str(exc)})
            return
        except Exception as exc:
            yield sse_event({"type": "error", "message": f"代理调用失败: {exc}"})
            return

        yield sse_event({"type": "done"})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=headers,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


@app.post("/v1/chat/stream/tools")
async def chat_stream_with_tools(request: ChatStreamRequest) -> StreamingResponse:
    """带 OJ 工具调用的流式聊天端点"""
    try:
        provider = get_provider(request.model)
        actual_model = normalize_model_name(request.model)
    except ProviderNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    messages = list(request.messages)
    if not any(m.role == "system" for m in messages):
        messages.insert(0, ChatMessage(role="system", content=SYSTEM_PROMPT))

    async def event_stream() -> AsyncIterator[bytes]:
        yield sse_event(
            {
                "type": "meta",
                "provider": provider.provider_name,
                "model": actual_model,
            }
        )

        current_messages = messages.copy()
        max_tool_rounds = 5

        for round_num in range(max_tool_rounds + 1):
            current_request = request.model_copy(
                update={"model": actual_model, "messages": current_messages}
            )

            try:
                tool_calls_buffer = {}
                full_content = ""
                has_tool_calls = False

                async for chunk in provider.stream_with_tools(
                    current_request, TOOL_DEFINITIONS if request.enable_tools else None
                ):
                    if chunk.get("type") == "content":
                        delta = chunk.get("delta", "")
                        if delta:
                            full_content += delta
                            yield sse_event({"type": "content", "delta": delta})
                    elif chunk.get("type") == "reasoning":
                        delta = chunk.get("delta", "")
                        if delta:
                            yield sse_event({"type": "thinking", "delta": delta})
                    elif chunk.get("type") == "tool_call":
                        has_tool_calls = True
                        tc = chunk.get("tool_call", {})
                        idx = tc.get("index", 0)
                        if idx not in tool_calls_buffer:
                            tool_calls_buffer[idx] = {
                                "id": tc.get("id", ""),
                                "type": "function",
                                "function": {"name": "", "arguments": ""},
                            }
                        if tc.get("id"):
                            tool_calls_buffer[idx]["id"] = tc["id"]
                        if tc.get("function", {}).get("name"):
                            tool_calls_buffer[idx]["function"]["name"] = tc["function"]["name"]
                        if tc.get("function", {}).get("arguments"):
                            tool_calls_buffer[idx]["function"]["arguments"] += tc["function"][
                                "arguments"
                            ]

                if not has_tool_calls or round_num >= max_tool_rounds:
                    break

                tool_calls_list = [tool_calls_buffer[i] for i in sorted(tool_calls_buffer.keys())]
                logger.info("工具调用: %s", tool_calls_list)

                current_messages.append(
                    ChatMessage(role="assistant", content=full_content, tool_calls=tool_calls_list)
                )

                for tc in tool_calls_list:
                    func_name = tc["function"]["name"]
                    try:
                        func_args = json.loads(tc["function"]["arguments"])
                    except json.JSONDecodeError:
                        func_args = {}

                    tool_result = await execute_tool(
                        func_name, func_args, request.current_user_id
                    )
                    logger.info("工具 %s 返回: %s", func_name, tool_result[:200])

                    current_messages.append(
                        ChatMessage(role="tool", content=tool_result, tool_call_id=tc["id"])
                    )

            except ProviderError as exc:
                yield sse_event({"type": "error", "message": str(exc)})
                return
            except Exception as exc:
                logger.exception("代理调用失败")
                yield sse_event({"type": "error", "message": f"代理调用失败: {exc}"})
                return

        yield sse_event({"type": "done"})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=headers,
    )
