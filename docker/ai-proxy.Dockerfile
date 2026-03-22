FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY ai-proxy/requirements.txt ./

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY ai-proxy/app ./app
COPY ai-proxy/main.py ./

EXPOSE 8000

CMD ["python", "main.py"]
