# 模型 API 对接文档

本服务为 Java 后端与各家大模型之间的**纯转发代理**，**不再根据模型名猜测厂商**。
调用方（Java 后端）需要在请求体里同时指定：

- `provider`：适配器类型，目前支持 `openai_compatible` / `gemini`
- `model`：真实厂商模型名，原样透传给上游 SDK
- `base_url`：上游 API base URL（`openai_compatible` 必填）
- `api_key`：上游 API Key

`(provider, model)` 由 Java 端 `ai_model` 表的 `(provider, model_code)` 唯一组合管理；
新增模型一般不需要改本服务的 Python 代码，只需在 `ai_model` 表里加一行配置。

## 请求示例

```http
POST /v1/chat/stream
Content-Type: application/json

{
  "provider": "openai_compatible",
  "model": "mistral-large-latest",
  "base_url": "https://api.mistral.ai/v1",
  "api_key": "sk-xxx",
  "messages": [{"role": "user", "content": "你好"}],
  "temperature": 0.7
}
```

## Provider 适配器

### `openai_compatible`
通用 OpenAI 协议适配器，靠 `base_url` 区分接入点。覆盖：

| 厂商 | base_url |
|---|---|
| Mistral | https://api.mistral.ai/v1 |
| 智谱 GLM | https://open.bigmodel.cn/api/paas/v4 |
| 阿里云百炼 (Qwen / DeepSeek / Kimi / MiniMax 等) | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| Groq | https://api.groq.com/openai/v1 |
| OpenAI 官方 / 其他 OpenAI 兼容服务 | 自行配置 |

厂商专属参数（如 DeepSeek 的 `enable_thinking: false`）通过请求体 `extra_body` 透传；
Java 端可在 `ai_model.extra_config` JSON 中维护，调用时拼到 `extra_body` 即可。

### `gemini`
保留位，目前仍走 OpenAI 协议（适配 hiapi.online 等中转）。
`base_url` **可选**，未填则用默认中转地址 `https://hiapi.online/v1`，与重构前行为一致。
将来若需要切换到官方 `google-genai` SDK 在此实现里替换即可。

## 历史厂商示例（已不再单独列适配器，仅作模型/SDK 参考）

## 依赖总览

```bash
pip install mistralai google-genai zai-sdk dashscope groq
```

## 1. Mistral

依赖：

```bash
pip install mistralai
```

示例：

```python
from mistralai.client import Mistral
import os

with Mistral(
    api_key=os.getenv("MISTRAL_API_KEY", ""),
) as mistral:
    res = mistral.chat.complete(
        model="mistral-large-latest",
        messages=[
            {
                "role": "user",
                "content": "Who is the best French painter? Answer in one short sentence.",
            },
        ],
        stream=False,
        response_format={
            "type": "text",
        },
    )

    print(res)
```

## 2. Gemini

依赖：

```bash
pip install -U google-genai
```

示例：

```python
from google import genai

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Explain how AI works in a few words",
)
print(response.text)
```

## 3. 智谱 GLM

依赖：

```bash
pip install zai-sdk
```

或指定版本：

```bash
pip install zai-sdk==0.2.2
```

示例：

```python
from zai import ZhipuAiClient

client = ZhipuAiClient(api_key="your-api-key")

response = client.chat.completions.create(
    model="glm-4.7",
    messages=[
        {"role": "user", "content": "作为一名营销专家，请为我的产品创作一个吸引人的口号"},
        {"role": "assistant", "content": "当然，要创作一个吸引人的口号，请告诉我一些关于您产品的信息"},
        {"role": "user", "content": "智谱AI开放平台"},
    ],
    thinking={
        "type": "enabled",
    },
    stream=True,
    max_tokens=65536,
    temperature=1.0,
)

for chunk in response:
    if chunk.choices[0].delta.reasoning_content:
        print(chunk.choices[0].delta.reasoning_content, end="", flush=True)

    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

## 4. Qwen

依赖：

```bash
pip install dashscope
```

示例：

```python
import os
import dashscope

messages = [
    {"role": "system", "content": "you are a helpful assistant"},
    {"role": "user", "content": "你是谁？"},
]

responses = dashscope.Generation.call(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    model="qwen-plus",
    messages=messages,
    result_format="message",
    stream=True,
    incremental_output=True,
)

for response in responses:
    print(response)
```

## 5. DeepSeek

依赖：

```bash
pip install dashscope
```

示例：

```python
import os
from dashscope import Generation

messages = [{"role": "user", "content": "你是谁？"}]

completion = Generation.call(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    model="deepseek-v3.2",
    messages=messages,
    result_format="message",
    enable_thinking=True,
    stream=True,
    incremental_output=True,
)

reasoning_content = ""
answer_content = ""
is_answering = False

print("\n" + "=" * 20 + "思考过程" + "=" * 20 + "\n")

for chunk in completion:
    message = chunk.output.choices[0].message

    if "reasoning_content" in message:
        if not is_answering:
            print(message.reasoning_content, end="", flush=True)
        reasoning_content += message.reasoning_content

    if message.content:
        if not is_answering:
            print("\n" + "=" * 20 + "完整回复" + "=" * 20 + "\n")
            is_answering = True
        print(message.content, end="", flush=True)
        answer_content += message.content

print("\n" + "=" * 20 + "Token 消耗" + "=" * 20 + "\n")
print(chunk.usage)
```

## 6. Groq

依赖：

```bash
pip install groq
```

示例：

```python
from groq import Groq

client = Groq()

stream = client.chat.completions.create(
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant.",
        },
        {
            "role": "user",
            "content": "Explain the importance of fast language models",
        },
    ],
    model="llama-3.3-70b-versatile",
    temperature=0.5,
    max_completion_tokens=1024,
    top_p=1,
    stop=None,
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content, end="")
```
