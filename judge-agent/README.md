# Vnollx Judge Agent

Judge Agent 是部署在 **每台评测机** 上的轻量服务。每台评测机同时部署：

- **MinIO**：保存该评测机本地可读取的题目测试数据 zip 和 checker 源码。
- **Judge Agent**：本仓库这个服务。承担全部评测业务逻辑。
- **go-judge**：沙箱编译运行。

Java 后端只跨公网调用 Agent；测试点 input/output 不再跨公网传输，Agent 内部走本机网络读 MinIO + 调 go-judge。

---

## 1. 项目结构

```text
judge-agent/
├── main.py                   # FastAPI 入口（只做路由分发）
├── requirements.txt
├── README.md
└── judge/
    ├── config.py             # 环境变量
    ├── status.py             # 状态翻译 + TLE/Signalled 后处理
    ├── compare.py            # 输出比较（standard / float / 换行符归一）
    ├── go_judge.py           # go-judge HTTP 客户端
    ├── minio_cache.py        # 本机 MinIO 拉取 + 本地测试数据缓存
    ├── models.py             # Pydantic 请求 / 响应
    ├── engine.py             # 编排器：选语言策略 + 模式策略
    ├── languages/
    │   ├── base.py           # LanguageRunner 抽象基类
    │   ├── cpp.py            # CppRunner
    │   ├── java_lang.py      # JavaRunner
    │   ├── python_lang.py    # PythonRunner
    │   ├── go_lang.py        # GoRunner
    │   ├── javascript.py     # JavaScriptRunner
    │   └── __init__.py       # 注册表 + get_runner(language)
    └── modes/
        ├── base.py           # JudgeMode 抽象类 + JudgeContext
        ├── standard.py       # StandardMode / FloatMode
        ├── special.py        # SpecialMode（Special Judge）
        └── __init__.py       # 注册表 + get_mode(name)
```

设计理念：

- **语言** 与 **判题模式** 各自独立策略类。
- 新语言只加一个文件 + 注册一次。
- 新判题模式只加一个文件 + 注册一次。
- **不需要动 `engine.py` 也不需要动 `main.py`。**

---

## 2. 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GO_JUDGE_URL` | `http://127.0.0.1:5050` | 本机 go-judge 地址 |
| `JUDGE_DATA_ROOT` | `./judge-data` | 测试数据缓存目录 |
| `HTTP_TIMEOUT_SECONDS` | `60` | 调用 go-judge / 下载数据的超时（秒） |
| `MINIO_ENDPOINT` | `http://127.0.0.1:9000` | 本机 MinIO 地址 |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO Access Key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO Secret Key |
| `MINIO_BUCKET` | `problem` | 题目数据 zip / checker 所在 bucket |
| `MINIO_PREFIX` | 空 | zip 对象名前缀（可选） |
| `PRELOAD_ALL_ON_STARTUP` | `true` | 启动时是否扫描本机 MinIO 并全量预热 |

---

## 3. 启动方式

### 3.1 本地 Python

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8090
```

### 3.2 Docker（推荐）

项目根 `docker/judge-agent.Dockerfile` 已经写好。

```bash
docker build -f docker/judge-agent.Dockerfile -t vnollx-judge-agent:latest .
docker run -d --name judge-agent -p 8090:8090 \
  -e GO_JUDGE_URL=http://host.docker.internal:5050 \
  -e MINIO_ENDPOINT=http://host.docker.internal:9000 \
  -e MINIO_ACCESS_KEY=xxx \
  -e MINIO_SECRET_KEY=yyy \
  -e MINIO_BUCKET=problem \
  -e PRELOAD_ALL_ON_STARTUP=true \
  -v judge-cache:/data/judge-cache \
  vnollx-judge-agent:latest
```

### 3.3 docker-compose

仓库根 `docker-compose.yml` 已经包含 `judge-agent` 服务。直接：

```bash
docker compose up -d judge-agent
```

---

## 4. 对外接口

所有数据来源固定走本机 MinIO，请求体里**不出现任何 URL / IP / port**。

### 4.1 健康检查

```http
GET /health
```

### 4.2 预热单题数据

```http
POST /data/preload
Content-Type: application/json
```

```json
{ "problemId": 1001, "dataVersion": "1" }
```

Agent 从本机 MinIO `{MINIO_PREFIX}{problemId}.zip` 拉取并解压。

### 4.3 查询缓存状态

```http
GET /data/cache-status?problemId=1001&dataVersion=1
```

### 4.4 样例运行 / 自定义输入运行

```http
POST /judge/run-sample
```

```json
{
  "language": "cpp",
  "code": "...",
  "inputExample": "1 2\n",
  "outputExample": "3\n",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "judgeMode": "standard"
}
```

- `outputExample` 为空或省略：只返回程序输出，不判 AC / WA。
- 否则按 `judgeMode` 比较。

### 4.5 提交评测

```http
POST /judge/submit
```

标准题：

```json
{
  "submissionId": 123,
  "problemId": 1001,
  "dataVersion": "1",
  "language": "cpp",
  "code": "...",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "judgeMode": "standard"
}
```

构造题：

```json
{
  "submissionId": 124,
  "problemId": 1002,
  "dataVersion": "1",
  "language": "cpp",
  "code": "...",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "judgeMode": "special",
  "checkerFile": "1002_checker.cpp"
}
```

`checkerFile` 是 MinIO 中的对象相对名。

统一返回：

```json
{
  "status": "答案正确",
  "time": 12000000,
  "runTime": 12,
  "memory": 4,
  "passCount": 10,
  "testCount": 10,
  "files": { "stdout": "", "stderr": "" },
  "caseInput": null,
  "caseExpected": null
}
```

`caseInput` / `caseExpected` 仅在失败时非 null，最长 200 / 400 字符。

---

## 5. 当前支持范围

| 类型 | 支持 |
|---|---|
| 语言 | C++, Java, Python, Go, JavaScript |
| 判题模式 | standard, float, special |
| 测试数据 | 本机 MinIO 全量预热 + 按题懒加载 |
| 失败定位 | TLE / Signalled / WA / RE / MLE / OLE 等翻译 + 后处理 |
| 失败上下文 | caseInput / caseExpected |
| 资源清理 | 编译产物 + Checker 产物自动回收 |

暂未实现：OI / IOI 计分、Agent 鉴权、分布式缓存上报。

---

## 6. 扩展新语言

新增一个语言，只需要 3 步。下面以 **Rust** 为例。

### 6.1 新建 `judge/languages/rust.py`

```python
"""Rust 语言运行器。"""
from typing import Any

import httpx

from ..go_judge import post_go_judge
from .base import LanguageRunner


class RustRunner(LanguageRunner):
    name = "rust"
    aliases = ()  # 如需别名，例如 ("rs",)

    def compile(self, client: httpx.Client, code: str) -> dict[str, Any]:
        payload = {"cmd": [{
            "args": ["/usr/bin/rustc", "main.rs", "-O", "-o", "main"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": ""},
                      {"name": "stdout", "max": 10485760},
                      {"name": "stderr", "max": 10485760}],
            "cpuLimit": 30000000000,
            "memoryLimit": 536870912,
            "procLimit": 80,
            "copyIn": {"main.rs": {"content": code}},
            "copyOut": ["stdout", "stderr"],
            "copyOutCached": ["main"],
        }]}
        result = post_go_judge(client, payload)[0]
        if result.get("status") == "Accepted":
            artifact = (result.get("fileIds") or {}).get("main")
            if artifact:
                return self._compile_success(artifact)
        return self._compile_failure(result)

    def build_run_cmd(self, code, artifact_id, input_text, cpu_limit_ns, memory_limit_bytes):
        return {
            "args": ["main"],
            "env": ["PATH=/usr/bin:/bin"],
            "files": [{"content": input_text},
                      {"name": "stdout", "max": 67108864},
                      {"name": "stderr", "max": 1048576}],
            "cpuLimit": cpu_limit_ns,
            "memoryLimit": memory_limit_bytes,
            "procLimit": 50,
            "copyIn": {"main": {"fileId": artifact_id}},
            "copyOut": ["stdout", "stderr"],
        }
```

要点：

- `name`：Java 后端 `language` 字段（小写）。
- `aliases`：可选别名，会被注册到同一 runner。
- `compile`：失败统一调 `self._compile_failure(result)`；成功调 `self._compile_success(artifact_id)`。脚本语言直接 `return self._compile_success(None)`。
- `build_run_cmd`：构造单个测试点的 go-judge `cmd`。

### 6.2 在 `judge/languages/__init__.py` 注册

```python
from .rust import RustRunner

for _cls in (CppRunner, JavaRunner, PythonRunner, GoRunner, JavaScriptRunner, RustRunner):
    _register(_cls())
```

### 6.3 确保 go-judge 镜像里有编译器

go-judge 的 sandbox 默认只有几个语言的工具链。新增语言需要在 go-judge 镜像里装编译器（或自己 build 一个含 `rustc` 的 go-judge 镜像）。

完成后 Agent 重启即可识别 `language: "rust"`。

---

## 7. 扩展新判题模式

新增一种判题模式（例如 **OI 部分分**），3 步。

### 7.1 新建 `judge/modes/oi.py`

```python
"""OI 部分分判题模式：错也不停，按测试点累加得分。"""
from ..compare import equals_ignoring_whitespace, normalize_line_endings
from ..models import AgentJudgeResponse
from ..status import STATUS_ACCEPTED, STATUS_WRONG_ANSWER, apply_status_post_processing
from .base import JudgeContext, JudgeMode, accumulate, extract_files, truncate


class OiMode(JudgeMode):
    name = "oi"
    require_output = True

    def evaluate(self, ctx: JudgeContext, final: AgentJudgeResponse) -> AgentJudgeResponse:
        first_fail_input: str | None = None
        first_fail_expected: str | None = None
        for index, (input_path, output_path) in enumerate(ctx.cases, start=1):
            input_text = input_path.read_text(encoding="utf-8", errors="replace")
            run_result = ctx.runner.run(
                ctx.client, ctx.code, ctx.artifact_id, input_text,
                ctx.cpu_limit_ns, ctx.memory_limit_bytes,
            )
            accumulate(final, run_result)

            raw_status = run_result.get("status", "")
            if raw_status != "Accepted":
                # 与 standard 不同：不立刻 return，继续跑下一个测试点
                if first_fail_input is None:
                    apply_status_post_processing(final, raw_status, ctx.time_limit_ms, ctx.memory_limit_bytes)
                    first_fail_input = truncate(input_text, 200)
                    first_fail_expected = truncate(
                        normalize_line_endings(output_path.read_text(encoding="utf-8", errors="replace")), 400
                    )
                continue

            expected = normalize_line_endings(output_path.read_text(encoding="utf-8", errors="replace"))
            actual = normalize_line_endings((run_result.get("files") or {}).get("stdout", ""))
            if equals_ignoring_whitespace(expected, actual):
                final.passCount += 1
            elif first_fail_input is None:
                final.status = STATUS_WRONG_ANSWER
                first_fail_input = truncate(input_text, 200)
                first_fail_expected = truncate(expected, 400)

        if final.passCount == final.testCount:
            final.status = STATUS_ACCEPTED
        else:
            final.caseInput = first_fail_input
            final.caseExpected = first_fail_expected
        return final
```

要点：

- 继承 `JudgeMode`，实现 `evaluate(ctx, final)`。
- `ctx` 提供 `runner` / `code` / `cases` / 限制等所有依赖。
- `accumulate(final, run_result)` 帮你累计耗时和内存。
- `apply_status_post_processing(...)` 自动处理 TLE / Signalled 的字段对齐。
- `require_output`：是否要求 `.out` 必须存在（special 是 `False`）。

### 7.2 在 `judge/modes/__init__.py` 注册

```python
from .oi import OiMode

for _cls in (StandardMode, FloatMode, SpecialMode, OiMode):
    _register(_cls())
```

### 7.3 Java 后端：

- 把 `Problem.judgeMode` 允许的取值加上 `"oi"`。
- `AgentSubmitRequest.judgeMode` 自动传过去（已经是字符串）。

完成后 Agent 重启识别 `judgeMode: "oi"`。

---

## 8. 后端接入约定

Java 端只发以下字段：

| 字段 | 必填 | 来源 |
|---|---|---|
| `submissionId` | 否 | `Submission.snowflakeId` |
| `problemId` | 是 | 提交对应的 problem id |
| `dataVersion` | 是 | `String.valueOf(problem.version)`；管理员更新数据 zip 时递增 |
| `language` | 是 | `Submission.language` |
| `code` | 是 | 用户代码 |
| `timeLimit` / `memoryLimit` | 是 | 来自题目 |
| `judgeMode` | 是 | `problem.judgeMode` |
| `floatTolerance` | float 模式必填 | `problem.floatTolerance` |
| `checkerFile` | special 模式必填 | `problem.checkerFile`（MinIO 对象相对名） |

后端**不要传任何 URL / IP / port**。

---

## 9. 注意事项

- **数据版本一致性**：必须由 Java 后端递增 `problem.version`。Agent 用 `sha256(dataVersion)` 作为缓存目录后缀，版本变即缓存失效。
- **Checker 不缓存**：每次 special judge 都从 MinIO 读 checker 源码再编译，确保管理员更新即时生效。
- **Agent 不应直接暴露公网**：用 docker network 或限定后端来源 IP；后续可加 token 鉴权。
- **新增语言需 go-judge 镜像支持**：go-judge sandbox 内得有该语言的工具链。
