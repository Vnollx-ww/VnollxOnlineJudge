# Vnollx 在线评测系统
<div style="text-align:center;">

  <p>
    <img src="https://cdn.simpleicons.org/springboot/6DB33F/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/mysql/4479A1/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/redis/DC382D/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/react/61DAFB/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/vite/646CFF/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/nodedotjs/339933/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/docker/2496ED/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/nginx/009639/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/rabbitmq/FF6600/ffffff" width="60" style="border-radius:50%" />
    <img src="https://cdn.simpleicons.org/minio/C72E49/ffffff" width="60" style="border-radius:50%" />


  </p>

<h3><b>一个功能完整的在线算法评测平台，支持多语言编程，实时评测，竞赛管理</b></h3>

  <p>
    <a href="https://www.vnollx.cloud">在线体验</a> • 
    <a href="#功能特性">功能特性</a> • 
    <a href="#快速开始">快速开始</a> • 
    <a href="#技术架构">技术架构</a>
  </p>

</div>


## 📖 项目简介

Vnollx 在线评测系统是一个创新的在线平台，为程序员提供了一个全面的环境来练习和提高他们的编码能力。系统配备了高性能的评测引擎，可以快速准确地评估代码提交，支持多种编程语言，提供丰富的算法题目和竞赛功能。

### 🎯 核心特性

- **🚀 实时评测系统** - 高效的在线评测引擎，支持 C++、Python、Java 等多种编程语言
- **📚 丰富的题目资源** - 1000+道精选算法题，覆盖基础到进阶难度
- **🏆 竞赛与排名** - 定期举办算法竞赛，实时排行榜，激发学习动力
- **👥 社区交流** - 活跃的用户社区，支持题解分享和讨论
- **⚡ 高性能架构** - 支持高并发访问
- **🔒 安全可靠** - 完善的用户认证和权限管理系统

## 🛠️ 技术栈

### 后端技术
- **框架**: Spring Boot 3.2.5
- **语言**: Java 21
- **数据库**: MySQL 8.0 (主从复制)
- **缓存**: Redis
- **消息队列**: RabbitMQ
- **对象存储**: MinIO
- **ORM**: MyBatis-Plus
- **连接池**: Druid
- **安全**: JWT

### 前端技术
- React 19
- Vite 7
- Ant Design 5
- React Router 6
- Axios
- Monaco Editor
- Marked.js + Highlight.js

### 评测引擎
- **GoJudge** - 高性能代码评测引擎
- **Docker** - 容器化评测环境
- **多语言支持** - C++、Python、Java

### 部署运维
- **容器化**: Docker + Docker Compose
- **监控**: Spring Boot Actuator + Prometheus
- **日志**: SLF4J + Logback

## 🏗️ 系统架构

```
# 整体系统架构（带注释）

             ┌─────────────────┐                     # 前端：界面层
             │   FrontEnd      │                     # 负责 UI、路由、交互
             │   React         │◄──►                 # 调用后端 REST API
             │   Vite          │                     #
             └─────────────────┘

                     │
                     │  REST API 通信
                     ▼

             ┌─────────────────┐                     # 后端：业务逻辑层
             │   BackEnd       │                     # 用户、题目、比赛、提交等
             │   Spring Boot   │◄──►                 # 核心服务
             │   REST API      │                     # 鉴权 
             └─────────────────┘

                     │
                     │  判题任务（同步/异步）
                     ▼

             ┌─────────────────┐                     # 判题机：执行代码的独立环境
             │   Judge         │                     # Go/Judge + Docker 隔离执行
             │   GoJudge       │                     # 编译/运行/获取结果
             │   Docker        │                     
             └─────────────────┘


# -------------------- 数据与缓存层 --------------------

                     │
                     ▼

             ┌─────────────────┐                     # 数据库主从结构
             │   MySQL master  │                     # 写入主库
             │   MySQL slave   │◄──►                 # 查询从库
             │ Data persistence│                     # 题目/用户/记录数据
             └─────────────────┘


                     │
                     │  缓存 + 分布式能力
                     ▼

             ┌─────────────────┐                     # 提升性能组件
             │   Redis Cache   │                     # 缓存题目、会话、排行榜
             │ Distributed Lock│                     # 防止重复提交/并发冲突
             │   Session       │                     
             └─────────────────┘


                     │
                     │  提交任务分发
                     ▼

             ┌─────────────────┐                     # 异步判题队列
             │   RabbitMQ      │                     # 将提交送入判题机
             │   MQ Queue      │                     # 高并发时削峰
             │   Async Judge   │                     
             └─────────────────┘


# -------------------- 文件存储层 --------------------

                     │
                     ▼

             ┌─────────────────┐                     # 文件存储
             │   MinIO         │                     # 类阿里云 OSS
             │   Oss Storage   │                     # 存代码文件 / 输入输出
             │   Code File     │                     
             └─────────────────┘

```

## 🚀 快速开始

### 环境要求

- **Java**: 21+
- **Maven**: 3.6+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+（建议 18 LTS 或 20 LTS）
- **npm**: 9+（随 Node 安装）
- **Vite**: 5+（由前端项目依赖自动安装）

### 一键启动

1. **克隆项目**
```bash
git clone https://github.com/your-username/VnollxOnlineJudge.git
cd VnollxOnlineJudge
```

2. **启动服务**
```bash
# 使用 Docker Compose 一键启动所有服务
docker-compose up -d
```

3. **访问系统**
- 前端地址: http://localhost:3000
- 管理后台: http://localhost:3000/admin
- API文档: http://localhost:3000/actuator

### 手动部署

1. **配置数据库**
```sql
-- 创建数据库
CREATE DATABASE vnollxonlinejudge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 导入数据库结构
mysql -u root -p vnollxonlinejudge < src/main/resources/vnollxonlinejudge.sql
```

2. **配置环境变量**
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/vnollxonlinejudge
    username: your_username
    password: your_password
  redis:
    host: localhost
    port: 6379
  rabbitmq:
    host: localhost
    port: 5672
    username: admin
    password: admin
```

3. **启动后端应用**
```bash
mvn clean package
java -jar target/VnollxOnlineJudge-0.0.1-SNAPSHOT.jar
```

4. **启动前端应用**
```bash
cd web
npm install
npm run dev
```


访问localhost:3000即可看见主页
## 📋 功能模块

### 👤 用户管理
- **用户注册/登录** - 邮箱验证，密码加密
- **个人信息管理** - 头像、昵称、邮箱修改
- **密码管理** - 修改密码，忘记密码重置
- **权限控制** - 普通用户、管理员权限分离

### 📝 题目管理
- **题目发布** - 支持 Markdown 格式题目描述
- **测试用例** - 批量上传测试数据
- **标签分类** - 算法标签，难度分级
- **题目统计** - 提交次数，通过率统计

### ⚡ 评测系统
- **多语言支持** - C++、Python、Java
- **实时评测** - 异步评测，实时反馈
- **性能监控** - 时间限制，内存限制
- **结果展示** - 详细评测结果，错误信息

### 🏆 竞赛功能
- **竞赛创建** - 公开/私有竞赛
- **实时排名** - 实时排行榜更新
- **题目管理** - 竞赛题目配置
- **成绩统计** - 竞赛成绩分析

### 💬 社区功能
- **评论系统** - 题目讨论，题解分享
- **通知公告** - 系统通知，竞赛公告
- **排行榜** - 用户排名，解题统计

## 🔧 配置说明

### 数据库配置
```yaml
spring:
  datasource:
    dynamic:
      primary: master
      datasource:
        master:
          url: jdbc:mysql://mysql-master:3308/vnollxonlinejudge
          username: root
          password: rootpassword
        slave:
          url: jdbc:mysql://mysql-slave:3309/vnollxonlinejudge
          username: root
          password: rootpassword
```

### Redis 配置
```yaml
spring:
  data:
    redis:
      host: redis
      port: 6379
      timeout: 2000
      jedis:
        pool:
          max-active: 100
          max-idle: 10
          min-idle: 5
```

### RabbitMQ 配置
```yaml
spring:
  rabbitmq:
    host: rabbitmq
    port: 5672
    username: admin
    password: admin
    listener:
      simple:
        concurrency: 5
        max-concurrency: 10
        prefetch: 1
```

## 📊 性能优化

### 数据库优化
- **主从复制** - 读写分离，提高查询性能
- **连接池** - Druid 连接池，优化数据库连接
- **索引优化** - 关键字段建立索引

### 缓存策略
- **Redis 缓存** - 热点数据缓存
- **分布式锁** - 防止重复提交
- **会话存储** - 用户会话管理

### 异步处理
- **消息队列** - RabbitMQ 异步评测
- **线程池** - 虚拟线程优化
- **批量处理** - 批量数据库操作

## 🔒 安全特性

- **JWT 认证** - 无状态用户认证
- **密码加密** - BCrypt 密码哈希
- **权限控制** - 基于角色的访问控制
- **输入验证** - 防止 SQL 注入，XSS 攻击
- **限流控制** - 防止恶意提交

## 📈 监控运维

### 应用监控
- **健康检查** - Spring Boot Actuator
- **指标监控** - Prometheus + Micrometer
- **日志管理** - 结构化日志输出

### 性能监控
- **数据库监控** - 连接池状态，慢查询
- **缓存监控** - Redis 性能指标
- **消息队列监控** - RabbitMQ 队列状态

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献方式
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范
- 遵循 Java 编码规范
- 添加必要的注释和文档
- 编写单元测试
- 确保代码质量

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目的支持：
- [Spring Boot](https://spring.io/projects/spring-boot)
- [MyBatis-Plus](https://baomidou.com/)
- [GoJudge](https://github.com/criyle/go-judge)
- [Bootstrap](https://getbootstrap.com/)
- [CodeMirror](https://codemirror.net/)
- [React](https://zh-hans.react.dev/learn)

## 📞 联系我们

- **项目主页**: https://github.com/Vnollx-ww/VnollxOnlineJudge
- **问题反馈**: https://github.com/Vnollx-ww/VnollxOnlineJudge/issues
- **邮箱**: 2720741614@qq.com

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by Vnollx Team

</div>
