"""判题模式注册表。"""
from .base import JudgeContext, JudgeMode
from .special import SpecialMode
from .standard import FloatMode, StandardMode

_MODES: dict[str, JudgeMode] = {}


def _register(mode: JudgeMode) -> None:
    _MODES[mode.name] = mode


for _cls in (StandardMode, FloatMode, SpecialMode):
    _register(_cls())


def get_mode(name: str | None) -> JudgeMode:
    key = (name or "standard").lower()
    mode = _MODES.get(key)
    if mode is None:
        raise ValueError(f"不支持的判题模式: {name}")
    return mode


__all__ = ["JudgeMode", "JudgeContext", "get_mode"]
