from app.providers.base import BaseProvider
from app.providers.deepseek import DeepSeekProvider
from app.providers.gemini import GeminiProvider
from app.providers.groq import GroqProvider
from app.providers.kimi import KimiProvider
from app.providers.minimax import MiniMaxProvider
from app.providers.mistral import MistralProvider
from app.providers.qwen import QwenProvider
from app.providers.zhipu import ZhipuProvider


class ProviderNotFoundError(ValueError):
    """找不到可用的模型提供方。"""


PROVIDER_FACTORIES: dict[str, type[BaseProvider]] = {
    "mistral": MistralProvider,
    "gemini": GeminiProvider,
    "glm": ZhipuProvider,
    "zhipu": ZhipuProvider,
    "qwen": QwenProvider,
    "deepseek": DeepSeekProvider,
    "groq": GroqProvider,
    "kimi": KimiProvider,
    "minimax": MiniMaxProvider,
}

PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "mistral": "mistral-large-latest",
    "gemini": "gemini-3-flash",
    "glm": "glm-4.7",
    "zhipu": "glm-4.7",
    "qwen": "qwen-plus",
    "deepseek": "deepseek-v3.1",
    "groq": "llama-3.3-70b-versatile",
    "kimi": "kimi-k2.5",
    "minimax": "MiniMax-M2.5",
}

MODEL_ALIASES: dict[str, tuple[str, str]] = {
    "mistral": ("mistral", "mistral-large-latest"),
    "mistral large": ("mistral", "mistral-large-latest"),
    "mistral-large": ("mistral", "mistral-large-latest"),
    "gemini": ("gemini", "gemini-2.5-pro"),
    "glm": ("glm", "glm-4.7"),
    "zhipu": ("zhipu", "glm-4.7"),
    "智谱": ("zhipu", "glm-4.7"),
    "智谱glm": ("zhipu", "glm-4.7"),
    "glm-4.7": ("glm", "glm-4.7"),
    "qwen": ("qwen", "qwen-plus"),
    "通义千问": ("qwen", "qwen-plus"),
    "qwen plus": ("qwen", "qwen-plus"),
    "qwen-plus": ("qwen", "qwen-plus"),
    "deepseek": ("deepseek", "deepseek-v3.1"),
    "deepseek v3.1": ("deepseek", "deepseek-v3.1"),
    "deepseek-v3.1": ("deepseek", "deepseek-v3.1"),
    "groq": ("groq", "llama-3.3-70b-versatile"),
    "grok": ("groq", "llama-3.3-70b-versatile"),
    "llama-3.3-70b-versatile": ("groq", "llama-3.3-70b-versatile"),
    "kimi": ("kimi", "kimi-k2.5"),
    "kimi-k2.5": ("kimi", "kimi-k2.5"),
    "minimax": ("minimax", "MiniMax-M2.5"),
    "minimax-m2.5": ("minimax", "MiniMax-M2.5"),
}


def split_vendor_prefix(model: str) -> tuple[str | None, str]:
    for separator in (":", "/"):
        if separator in model:
            prefix, rest = model.split(separator, 1)
            return prefix.strip().lower(), rest.strip()
    return None, model.strip()


def infer_provider_key(model: str) -> str:
    explicit_vendor, model_name = split_vendor_prefix(model)
    if explicit_vendor in PROVIDER_FACTORIES:
        return explicit_vendor

    normalized = model_name.lower()
    alias = MODEL_ALIASES.get(normalized)
    if alias:
        return alias[0]

    if normalized.startswith("mistral") or normalized.startswith("ministral") or normalized.startswith("pixtral"):
        return "mistral"
    if normalized.startswith("gemini"):
        return "gemini"
    if normalized.startswith("glm"):
        return "glm"
    if normalized.startswith("qwen"):
        return "qwen"
    if normalized.startswith("deepseek"):
        return "deepseek"
    if normalized.startswith("groq"):
        return "groq"
    if normalized.startswith("llama"):
        return "groq"
    if normalized.startswith("kimi"):
        return "kimi"
    if normalized.startswith("minimax"):
        return "minimax"

    raise ProviderNotFoundError(
        "无法根据模型名匹配提供方，请使用 `mistral:`、`gemini:`、`glm:`、`qwen:`、`deepseek:`、`groq:`、`kimi:`、`minimax:` 前缀。"
    )


def get_provider(model: str) -> BaseProvider:
    provider_key = infer_provider_key(model)
    return PROVIDER_FACTORIES[provider_key]()


def normalize_model_name(model: str) -> str:
    explicit_vendor, model_name = split_vendor_prefix(model)
    if explicit_vendor in PROVIDER_FACTORIES and model_name:
        if model_name:
            alias = MODEL_ALIASES.get(model_name.lower())
            if alias and alias[0] == explicit_vendor:
                return alias[1]
            return model_name
        return PROVIDER_DEFAULT_MODELS[explicit_vendor]

    alias = MODEL_ALIASES.get(model.strip().lower())
    if alias:
        return alias[1]

    provider_key = infer_provider_key(model)
    normalized = model.strip()
    if normalized.lower() == provider_key:
        return PROVIDER_DEFAULT_MODELS[provider_key]

    if normalized:
        return model_name
    return PROVIDER_DEFAULT_MODELS[provider_key]
