# 1️⃣ 构建阶段
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2️⃣ 部署阶段（nginx）
FROM nginx:alpine

# 清空默认静态目录
RUN rm -rf /usr/share/nginx/html/*

# 复制你的 nginx 配置（放在这里最合理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 把构建产物复制进去
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
