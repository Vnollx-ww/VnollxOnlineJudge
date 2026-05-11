"""输出比较：标准 / 浮点容差 / 换行符归一。"""
import math


def normalize_line_endings(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def equals_ignoring_whitespace(expected: str, actual: str) -> bool:
    return normalize_line_endings(expected).strip().split() == normalize_line_endings(actual).strip().split()


def equals_with_float_tolerance(expected: str, actual: str, tolerance: float) -> bool:
    expected_tokens = normalize_line_endings(expected).strip().split()
    actual_tokens = normalize_line_endings(actual).strip().split()
    if len(expected_tokens) != len(actual_tokens):
        return False
    for expected_token, actual_token in zip(expected_tokens, actual_tokens):
        expected_number = _parse_finite_double(expected_token)
        if expected_number is None:
            if expected_token != actual_token:
                return False
            continue
        actual_number = _parse_finite_double(actual_token)
        if actual_number is None:
            return False
        diff = abs(actual_number - expected_number)
        if diff > tolerance and diff > tolerance * abs(expected_number):
            return False
    return True


def _parse_finite_double(token: str) -> float | None:
    try:
        value = float(token)
    except ValueError:
        return None
    return value if math.isfinite(value) else None
