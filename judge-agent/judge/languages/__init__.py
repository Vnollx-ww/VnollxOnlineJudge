"""语言运行器注册表。"""
from .base import LanguageRunner
from .cpp import CppRunner
from .go_lang import GoRunner
from .java_lang import JavaRunner
from .javascript import JavaScriptRunner
from .python_lang import PythonRunner

_RUNNERS: dict[str, LanguageRunner] = {}


def _register(runner: LanguageRunner) -> None:
    _RUNNERS[runner.name] = runner
    for alias in runner.aliases:
        _RUNNERS[alias] = runner


for _cls in (CppRunner, JavaRunner, PythonRunner, GoRunner, JavaScriptRunner):
    _register(_cls())


def get_runner(language: str) -> LanguageRunner:
    if not language:
        raise ValueError("不支持的语言: ")
    runner = _RUNNERS.get(language.lower())
    if runner is None:
        raise ValueError(f"不支持的语言: {language}")
    return runner


__all__ = ["LanguageRunner", "get_runner"]
