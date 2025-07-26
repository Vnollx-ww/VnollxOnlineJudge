# 阶段1：构建环境
FROM eclipse-temurin:21-jdk-jammy AS builder

# 配置APT使用阿里云源（国内加速）
RUN sed -i 's/archive.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y maven && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 配置工作目录
WORKDIR /build
COPY pom.xml .
COPY src ./src

# 构建项目
RUN mvn package -DskipTests

# 阶段2：运行环境
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080

# 设置容器时区（可选）
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

ENTRYPOINT ["java", "-jar", "app.jar"]