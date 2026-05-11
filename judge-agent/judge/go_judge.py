"""Go-Judge HTTP 客户端。"""
from typing import Any

import httpx

from .config import GO_JUDGE_URL


def post_go_judge(client: httpx.Client, payload: dict[str, Any]) -> list[dict[str, Any]]:
    response = client.post(f"{GO_JUDGE_URL}/run", json=payload)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list) or not data:
        raise ValueError("invalid go-judge response")
    return data


def delete_file(client: httpx.Client, file_id: str) -> None:
    if not file_id:
        return
    try:
        client.delete(f"{GO_JUDGE_URL}/file/{file_id}")
    except Exception:
        pass
