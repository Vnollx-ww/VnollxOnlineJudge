from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str = ""
    tool_call_id: str | None = None
    tool_calls: list[dict] | None = None


class ChatStreamRequest(BaseModel):
    model: str = Field(min_length=1)
    api_key: str = Field(min_length=1)
    base_url: str | None = None
    messages: list[ChatMessage] = Field(min_length=1)
    temperature: float | None = None
    max_tokens: int | None = Field(default=None, gt=0)
    top_p: float | None = None
    timeout: float = Field(default=300.0, gt=0)
    extra_body: dict[str, Any] = Field(default_factory=dict)
    enable_tools: bool = Field(default=False, description="是否启用 OJ 工具调用")
    current_user_id: int | None = Field(default=None, description="当前用户ID，用于 getMyUserId")
