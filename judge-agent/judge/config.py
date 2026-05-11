"""Judge Agent 运行时配置（从环境变量读取）。"""
import os
from pathlib import Path

GO_JUDGE_URL = os.getenv("GO_JUDGE_URL", "http://go-judge:5050")
DATA_ROOT = Path(os.getenv("JUDGE_DATA_ROOT", "./judge-data")).resolve()
JUDGE_DATA_ROOT_STR = str(DATA_ROOT)
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "60"))

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "vnollxvnollx")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "vnollxvnollxvnollx")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "problem")
MINIO_PREFIX = os.getenv("MINIO_PREFIX", "")

PRELOAD_ALL_ON_STARTUP = os.getenv("PRELOAD_ALL_ON_STARTUP", "true").lower() == "true"

DEFAULT_FLOAT_TOLERANCE = 1e-4
