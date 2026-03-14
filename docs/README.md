# Vnollx Online Judge 文档中心

<div align="center">

**📚 完整的技术文档与开发指南**

</div>

---

## 📖 文档导航

| 文档 | 说明 | 适用人群 |
|:-----|:-----|:---------|
| 📋 [需求文档](./需求文档.md) | 产品需求规格、功能列表、角色权限、非功能需求 | 产品、测试、全员 |
| 📐 [系统架构](./系统架构.md) | 整体架构、技术栈、分层设计、数据流、安全与扩展 | 架构师、技术负责人 |
| 🤖 [AI 代理架构](./AI代理架构.md) | Java + Python AI 分层、工具调用、SSE 协议、OjTools | 后端/AI 开发者 |
| 🚀 [部署文档](./部署文档.md) | 环境要求、Docker 一键部署、手动部署、Nginx、AI 代理、监控与排错 | 运维、DevOps |
| ⚙️ [后端开发](./后端开发.md) | Spring Boot 开发指南、代码规范、服务层设计 | 后端开发者（待补充） |
| 🎨 [前端开发](./前端开发.md) | React/TypeScript 开发、组件设计、样式规范 | 前端开发者（待补充） |
| 📦 [功能模块](./功能模块.md) | 功能模块详解、数据模型、业务流程 | 产品、全栈（待补充） |
| 🔌 [接口文档](./接口文档.md) | RESTful API 规范、请求响应示例、WebSocket | 前后端（待补充） |
| 🔐 [权限系统](./PERMISSION_SYSTEM.md) | RBAC 权限模型、注解使用、缓存策略 | 后端（待补充） |

---

## 🛠️ 技术栈

### 后端技术

| 技术 | 版本 | 说明 |
|:-----|:-----|:-----|
| Java | 21 | 支持虚拟线程 |
| Spring Boot | 3.2.5 | 核心框架 |
| MyBatis-Plus | 3.5.5 | ORM增强 |
| MySQL | 8.0 | 主从复制 |
| Redis | Latest | 缓存/会话 |
| RabbitMQ | Latest | 消息队列 |
| MinIO | Latest | 对象存储 |
| Go-Judge | Latest | 代码评测沙箱 |
| LangChain4j | 0.31.0 | AI集成 |

### 前端技术

| 技术 | 版本 | 说明 |
|:-----|:-----|:-----|
| React | 19.2.0 | UI框架 |
| TypeScript | 5.9.3 | 类型安全 |
| Vite | 7.2.4 | 构建工具 |
| Ant Design | 5.21.0 | UI组件库 |
| TailwindCSS | 3.4.17 | CSS框架 |
| Monaco Editor | 0.55.1 | 代码编辑器 |

---

## 🚀 快速开始

### 环境要求

```
Java 21+  |  Maven 3.8+  |  Node.js 18+  |  Docker 20.10+
```

### Docker 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/Vnollx-ww/VnollxOnlineJudge.git
cd VnollxOnlineJudge

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 访问系统
# 前端: http://localhost:3000
# 后端: http://localhost:8080
```

### 本地开发

```bash
# 后端
mvn spring-boot:run

# 前端
cd frontend && npm install && npm run dev
```

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端 (浏览器)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    前端 (React + TypeScript)                     │
│              Vite + Ant Design + TailwindCSS                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   后端 (Spring Boot 3.2)                         │
│     Controller → Service → Mapper → Entity                      │
│     TokenFilter → PermissionAspect → AOP                        │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│   MySQL   │  │   Redis   │  │ RabbitMQ  │  │   MinIO   │
│  主从复制  │  │ 缓存/会话  │  │  消息队列  │  │  对象存储  │
└───────────┘  └───────────┘  └─────┬─────┘  └───────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │   Go-Judge    │
                            │   代码评测沙箱  │
                            └───────────────┘
```

---

## ✨ 核心功能

| 模块 | 功能 | 状态 |
|:-----|:-----|:----:|
| 👤 用户系统 | 注册登录、个人资料、密码管理 | ✅ |
| 📝 题目管理 | 题目CRUD、标签分类、难度分级 | ✅ |
| ⚡ 代码评测 | 多语言支持、沙箱评测、实时结果 | ✅ |
| 🏆 比赛系统 | 创建比赛、实时排名、ACM赛制 | ✅ |
| 📚 练习系统 | 练习集管理、进度追踪 | ✅ |
| 💡 题解分享 | Markdown编辑、评论点赞 | ✅ |
| 👥 社交功能 | 好友系统、私信功能 | ✅ |
| 🔔 通知系统 | 系统通知、消息推送 | ✅ |
| 🤖 AI助手 | 智能对话、代码分析 | ✅ |
| 🔐 权限管理 | RBAC模型、细粒度控制 | ✅ |

---

## 🔧 技术亮点

- **🔄 主从分离** - MySQL主从复制，读写分离，动态数据源切换
- **📨 异步评测** - RabbitMQ消息队列，异步处理，削峰填谷
- **📡 实时推送** - WebSocket实时通知评测结果
- **💾 权限缓存** - Redis缓存权限数据，30分钟过期
- **🧵 虚拟线程** - Java 21虚拟线程，高并发支持
- **🤖 AI集成** - 多模型支持（Gemini、Kimi、MiniMax、Mistral、DeepSeek、通义千问、智谱）
- **🔒 安全认证** - JWT无状态认证，BCrypt密码加密
- **📊 监控运维** - Actuator + Prometheus 指标监控

---

## 📂 项目结构

```
VnollxOnlineJudge/
├── src/main/java/          # 后端源码
│   └── com/example/vnollxonlinejudge/
│       ├── controller/     # 控制器层
│       ├── service/        # 服务层
│       ├── mapper/         # 数据访问层
│       ├── model/          # 数据模型
│       ├── config/         # 配置类
│       ├── filter/         # 过滤器
│       ├── aspect/         # AOP切面
│       └── utils/          # 工具类
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   └── package.json
├── docs/                   # 项目文档
├── docker-compose.yml      # Docker编排
└── pom.xml                 # Maven配置
```

---

## 📞 联系我们

- **🌐 项目主页**: [https://github.com/Vnollx-ww/VnollxOnlineJudge](https://github.com/Vnollx-ww/VnollxOnlineJudge)
- **🐛 问题反馈**: [GitHub Issues](https://github.com/Vnollx-ww/VnollxOnlineJudge/issues)
- **📧 邮箱**: 2720741614@qq.com
- **🌍 在线体验**: [https://www.vnollx.cloud](https://www.vnollx.cloud)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by Vnollx Team

*最后更新: 2026年1月27日*

</div>
