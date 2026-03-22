FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY Ai-Proxy/requirements.txt ./

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY Ai-Proxy/app ./app
COPY Ai-Proxy/main.py ./

EXPOSE 8000

CMD ["python", "main.py"]
