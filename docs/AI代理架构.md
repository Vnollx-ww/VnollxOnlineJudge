# AI 代理架构文档

## 概述

VnollxOnlineJudge 采用 **Python 代理 + Java 后端** 的分层架构来处理 AI 对话。Java 后端只负责传递元信息（API Key、模型名称、消息历史等），所有 AI 调用逻辑、Function Calling 和工具执行都由 Python 代理完成。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户请求                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Java 后端 (Spring Boot)                          │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    │
│  │AiController │ -> │  AiServiceImpl  │ -> │ProxyAiStreaming  │    │
│  │             │    │                 │    │    Client        │    │
│  └─────────────┘    └─────────────────┘    └──────────────────┘    │
│                                                     │               │
│  职责：会话管理、历史记录、用户认证                    │               │
└─────────────────────────────────────────────────────│───────────────┘
                                                      │ HTTP/SSE
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python 代理 (FastAPI)                             │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    │
│  │  main.py    │ -> │   Providers     │ -> │   AI 厂商 API    │    │
│  │ /v1/chat/   │    │ (Mistral/Qwen/  │    │                  │    │
│  │ stream/tools│    │  DeepSeek/...)  │    │                  │    │
│  └─────────────┘    └─────────────────┘    └──────────────────┘    │
│         │                                                           │
│         ▼ Function Calling                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      OjTools                                 │   │
│  │  getUserProfile / getProblemById / searchProblems / ...     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      MySQL 数据库                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 组件说明

### Java 后端

| 组件 | 文件 | 职责 |
|------|------|------|
| AiController | `controller/AiController.java` | 处理用户请求，SSE 流式响应 |
| AiServiceImpl | `service/serviceImpl/AiServiceImpl.java` | 会话管理、历史记录、摘要生成 |
| ProxyAiStreamingClient | `service/ai/proxy/ProxyAiStreamingClient.java` | 调用 Python 代理 |

### Python 代理

| 组件 | 文件 | 职责 |
|------|------|------|
| main.py | `main.py` | FastAPI 入口，定义 API 路由 |
| Providers | `app/providers/*.py` | 各 AI 厂商的流式调用实现 |
| OjTools | `app/oj_tools.py` | OJ 系统工具集（21 个函数） |
| Database | `app/database.py` | 异步 MySQL 连接池 |

## API 端点

### Python 代理

#### `POST /v1/chat/stream/tools`

带工具调用的流式聊天端点。

**请求体：**

```json
{
  "model": "mistral-large-latest",
  "api_key": "your-api-key",
  "base_url": "https://api.mistral.ai/v1",  // 可选
  "messages": [
    {"role": "user", "content": "我通过了多少道题？"}
  ],
  "enable_tools": true,
  "current_user_id": 123,
  "temperature": 0.7,
  "max_tokens": 4096,
  "timeout": 300
}
```

**SSE 响应事件：**

| type | 说明 | 示例 |
|------|------|------|
| `meta` | 首条，包含 provider 和 model | `{"type":"meta","provider":"mistral","model":"mistral-large-latest"}` |
| `content` | 文本增量 | `{"type":"content","delta":"你好"}` |
| `thinking` | 思考过程（DeepSeek 等支持） | `{"type":"thinking","delta":"让我查询一下..."}` |
| `error` | 错误信息 | `{"type":"error","message":"API 调用失败"}` |
| `done` | 流结束 | `{"type":"done"}` |

#### `POST /v1/chat/stream`

不带工具调用的简单流式聊天（保持向后兼容）。

## 支持的 AI 厂商

| 厂商 | Provider | 默认 Base URL | 工具调用 |
|------|----------|---------------|----------|
| Mistral | `mistral` | `https://api.mistral.ai/v1` | ✅ |
| 通义千问 | `qwen` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ |
| DeepSeek | `deepseek` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ |
| 智谱 GLM | `zhipu` | `https://open.bigmodel.cn/api/paas/v4` | ✅ |
| Groq | `groq` | `https://api.groq.com/openai/v1` | ✅ |
| Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | ❌ |

模型名称支持前缀格式（如 `mistral:mistral-large-latest`）或自动推断。

## OjTools 工具列表

Python 代理内置了 21 个 OJ 系统工具，直接查询数据库：

### 用户相关
- `getMyUserId` - 获取当前用户 ID
- `getUserProfile` - 查询用户个人信息
- `getUserSolvedProblems` - 查询用户通过的题目
- `getUserProgress` - 查询用户各标签进度
- `getUserCount` - 获取系统用户总数
- `getAllUsers` - 获取所有用户列表
- `getUserIdByName` - 根据用户名查询用户

### 题目相关
- `getProblemByName` - 根据名称查询题目
- `getProblemById` - 根据 ID 查询题目
- `getProblemTags` - 查询题目标签
- `searchProblems` - 搜索题目
- `getProblemCount` - 获取题目总数

### 提交记录
- `getUserSubmissions` - 查询用户提交记录
- `getSubmissionById` - 查询提交详情

### 比赛相关
- `getCompetitionList` - 查询比赛列表
- `getCompetitionById` - 查询比赛详情
- `getCompetitionCount` - 获取比赛总数

### 其他
- `getTagList` - 获取标签列表
- `getSolutionsByProblem` - 查询题解
- `getPublicPracticeList` - 获取练习列表
- `getPracticeCount` - 获取练习总数

## 配置

### Java 后端 (application.yml)

```yaml
ai:
  proxy:
    url: http://localhost:8000  # Python 代理地址
    timeout: 300                # 超时时间（秒）
```

### Python 代理 (.env)

```bash
# 数据库配置
DB_HOST=mysql-master
DB_PORT=3308
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=vnollxonlinejudge
```

## 部署

### Python 代理

```bash
cd VnollxOnlineJudge-Proxy

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker Compose 示例

```yaml
services:
  ai-proxy:
    build: ./VnollxOnlineJudge-Proxy
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=mysql-master
      - DB_PORT=3308
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=vnollxonlinejudge
    depends_on:
      - mysql-master
```

## 数据流

1. 用户发送消息 → Java `AiController`
2. Java 从数据库加载历史消息 → 构建请求
3. `ProxyAiStreamingClient` 调用 Python 代理 `/v1/chat/stream/tools`
4. Python 代理路由到对应 Provider（Mistral/Qwen/...）
5. AI 返回响应，如有 `tool_calls`：
   - Python 执行 OjTools 函数（直接查数据库）
   - 将结果作为 `tool` 消息追加
   - 继续调用 AI 生成最终回复
6. 流式返回给 Java → 返回给用户
7. Java 保存对话记录到数据库

## 优势

1. **简化 Java 代码** - 移除了 LangChain4j、DashScope SDK、智谱 SDK 等复杂依赖
2. **统一调用入口** - 所有 AI 厂商通过 Python 代理统一处理
3. **灵活的工具执行** - Python 直接查数据库，无需额外 API 调用
4. **易于扩展** - 添加新的 AI 厂商只需在 Python 端实现 Provider
5. **支持深度推理** - 原生支持 DeepSeek 等模型的 thinking 输出
