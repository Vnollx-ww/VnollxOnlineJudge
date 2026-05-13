"""Provider 路由表。

请求体显式指定 provider 字段，本模块仅做字典查表，没有任何模型名猜测/前缀解析逻辑。
要新增一个适配器：实现一个 BaseProvider 子类，在 PROVIDER_FACTORIES 里注册。
要新增一个模型：直接在 Java 端 ai_model 表里加一行 (provider, model_code, base_url, api_key) 即可，无需改本模块。
"""
from app.providers.base import BaseProvider
from app.providers.gemini import GeminiProvider
from app.providers.openai_compatible import OpenAICompatibleProvider


class ProviderNotFoundError(ValueError):
    """找不到可用的 provider。"""


PROVIDER_FACTORIES: dict[str, type[BaseProvider]] = {
    "openai_compatible": OpenAICompatibleProvider,
    "gemini": GeminiProvider,
}


def get_provider(provider: str) -> BaseProvider:
    if not provider:
        raise ProviderNotFoundError("请求缺少 provider 字段")
    key = provider.strip().lower()
    factory = PROVIDER_FACTORIES.get(key)
    if factory is None:
        supported = ", ".join(sorted(PROVIDER_FACTORIES.keys()))
        raise ProviderNotFoundError(
            f"未注册的 provider：{provider!r}，目前支持：{supported}"
        )
    return factory()
