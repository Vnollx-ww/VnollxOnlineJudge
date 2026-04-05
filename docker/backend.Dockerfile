# 官方 Maven 镜像已含 JDK 21，避免 apt + 第三方 Ubuntu 源（易 502 / 缺包）
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /build
COPY pom.xml .
COPY src ./src

RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

ENTRYPOINT ["java", "-jar", "app.jar"]
