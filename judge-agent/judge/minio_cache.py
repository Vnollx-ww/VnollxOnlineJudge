"""本机 MinIO 拉取与本地测试数据缓存。"""
from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import boto3
from fastapi import HTTPException

from .config import (
    DATA_ROOT,
    MINIO_ACCESS_KEY,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_PREFIX,
    MINIO_SECRET_KEY,
)
from .models import CacheStatusResponse


def minio_client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
    )


def minio_object_name_for_problem(problem_id: int) -> str:
    return f"{MINIO_PREFIX}{problem_id}.zip"


def data_dir_for(problem_id: int, data_version: str) -> Path:
    safe_version = hashlib.sha256(data_version.encode("utf-8")).hexdigest()[:16]
    return DATA_ROOT / str(problem_id) / safe_version


def ensure_data_cached(problem_id: int, data_version: str) -> Path:
    """缓存命中直接返回；未命中则从本机 MinIO 下载并解压。"""
    data_dir = data_dir_for(problem_id, data_version)
    marker = data_dir / ".ready"
    if marker.exists():
        return data_dir

    object_name = minio_object_name_for_problem(problem_id)
    data_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="judge-data-") as temp_name:
        temp_dir = Path(temp_name)
        zip_path = temp_dir / "data.zip"
        minio_client().download_file(MINIO_BUCKET, object_name, str(zip_path))

        extract_dir = temp_dir / "extract"
        extract_dir.mkdir()
        _safe_extract_zip(zip_path, extract_dir)

        if data_dir.exists():
            shutil.rmtree(data_dir)
        shutil.move(str(extract_dir), str(data_dir))
        marker.write_text(
            json.dumps({"source": "minio", "bucket": MINIO_BUCKET, "objectName": object_name}, ensure_ascii=False),
            encoding="utf-8",
        )
    return data_dir


def preload_all_from_minio() -> None:
    """启动时扫描本机 MinIO bucket 下所有 .zip，按对象名推断 problem_id 并预热。"""
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    client = minio_client()
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=MINIO_BUCKET, Prefix=MINIO_PREFIX):
        for item in page.get("Contents", []):
            object_name = item["Key"]
            if object_name.endswith("/") or not object_name.lower().endswith(".zip"):
                continue
            problem_id = _infer_problem_id(object_name)
            if problem_id is None:
                continue
            ensure_data_cached(problem_id, "1")


def list_cases(data_dir: Path, require_output: bool) -> list[tuple[Path, Path]]:
    cases: list[tuple[Path, Path]] = []
    index = 1
    while True:
        input_path = data_dir / f"{index}.in"
        output_path = data_dir / f"{index}.out"
        if not input_path.exists():
            break
        if require_output and not output_path.exists():
            break
        cases.append((input_path, output_path))
        index += 1
    return cases


def cache_status(problem_id: int, data_version: str) -> CacheStatusResponse:
    data_dir = data_dir_for(problem_id, data_version)
    return CacheStatusResponse(
        cached=(data_dir / ".ready").exists(),
        problemId=problem_id,
        dataVersion=data_version,
        caseCount=len(list_cases(data_dir, require_output=False)) if data_dir.exists() else 0,
        path=str(data_dir),
    )


def load_checker_source(checker_file: str | None) -> str:
    if not checker_file:
        raise HTTPException(status_code=400, detail="special judge requires checkerFile")
    response = minio_client().get_object(Bucket=MINIO_BUCKET, Key=checker_file)
    try:
        return response["Body"].read().decode("utf-8")
    finally:
        response["Body"].close()


def _safe_extract_zip(zip_path: Path, target_dir: Path) -> None:
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            member_path = (target_dir / member.filename).resolve()
            if not str(member_path).startswith(str(target_dir.resolve())):
                raise ValueError("unsafe zip entry")
            archive.extract(member, target_dir)


def _infer_problem_id(object_name: str) -> int | None:
    stem = Path(object_name).stem
    if stem.isdigit():
        return int(stem)
    digits = "".join(ch for ch in stem if ch.isdigit())
    return int(digits) if digits else None
