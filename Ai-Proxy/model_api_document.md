# 模型 API 对接文档

本文档记录当前项目需要兼容的模型厂商、对应依赖，以及官方示例代码。  
项目约定是：根据传入的模型名，路由到对应的 `py` 文件，再由该文件调用对应厂商 SDK 或 API，并将流式结果返回给上游服务。

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
