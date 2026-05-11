FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# 时区对齐评测结果时间显示
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

COPY judge-agent/requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY judge-agent/main.py ./
COPY judge-agent/judge ./judge

# 测试数据本地缓存目录（容器内默认路径，可通过环境变量覆盖）
RUN mkdir -p /data/judge-cache
ENV JUDGE_DATA_ROOT=/data/judge-cache

EXPOSE 8090

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
