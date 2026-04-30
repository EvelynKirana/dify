from __future__ import annotations

from typing import TYPE_CHECKING

from core.plugin.impl.model import PluginModelClient
from graphon.model_runtime.entities.model_entities import ModelType
from graphon.model_runtime.model_providers.base.ai_model import AIModel
from graphon.model_runtime.model_providers.base.large_language_model import LargeLanguageModel
from graphon.model_runtime.model_providers.base.moderation_model import ModerationModel
from graphon.model_runtime.model_providers.base.rerank_model import RerankModel
from graphon.model_runtime.model_providers.base.speech2text_model import Speech2TextModel
from graphon.model_runtime.model_providers.base.text_embedding_model import TextEmbeddingModel
from graphon.model_runtime.model_providers.base.tts_model import TTSModel
from graphon.model_runtime.model_providers.model_provider_factory import ModelProviderFactory

if TYPE_CHECKING:
    from core.model_manager import ModelManager
    from core.plugin.impl.model_runtime import PluginModelRuntime
    from core.provider_manager import ProviderManager

_MODEL_TYPE_CLASS_MAP: dict[ModelType, type[AIModel]] = {
    ModelType.LLM: LargeLanguageModel,
    ModelType.TEXT_EMBEDDING: TextEmbeddingModel,
    ModelType.RERANK: RerankModel,
    ModelType.SPEECH2TEXT: Speech2TextModel,
    ModelType.MODERATION: ModerationModel,
    ModelType.TTS: TTSModel,
}


class PluginModelAssembly:
    """Compose request-scoped model views on top of a single plugin runtime."""

    tenant_id: str
    user_id: str | None
    _model_runtime: PluginModelRuntime | None
    _model_provider_factory: ModelProviderFactory | None
    _provider_manager: ProviderManager | None
    _model_manager: ModelManager | None

    def __init__(self, *, tenant_id: str, user_id: str | None = None) -> None:
        self.tenant_id = tenant_id
        self.user_id = user_id
        self._model_runtime = None
        self._model_provider_factory = None
        self._provider_manager = None
        self._model_manager = None

    @property
    def model_runtime(self) -> PluginModelRuntime:
        if self._model_runtime is None:
            self._model_runtime = create_plugin_model_runtime(tenant_id=self.tenant_id, user_id=self.user_id)
        return self._model_runtime

    @property
    def model_provider_factory(self) -> ModelProviderFactory:
        if self._model_provider_factory is None:
            self._model_provider_factory = ModelProviderFactory(runtime=self.model_runtime)
        return self._model_provider_factory

    @property
    def provider_manager(self) -> ProviderManager:
        if self._provider_manager is None:
            from core.provider_manager import ProviderManager

            self._provider_manager = ProviderManager(model_runtime=self.model_runtime)
        return self._provider_manager

    @property
    def model_manager(self) -> ModelManager:
        if self._model_manager is None:
            from core.model_manager import ModelManager

            self._model_manager = ModelManager(provider_manager=self.provider_manager)
        return self._model_manager


def create_plugin_model_assembly(*, tenant_id: str, user_id: str | None = None) -> PluginModelAssembly:
    """Create a request-scoped assembly that shares one plugin runtime across model views."""
    return PluginModelAssembly(tenant_id=tenant_id, user_id=user_id)


def create_plugin_model_runtime(*, tenant_id: str, user_id: str | None = None) -> PluginModelRuntime:
    """Create a plugin runtime with its client dependency fully composed."""
    from core.plugin.impl.model_runtime import PluginModelRuntime

    return PluginModelRuntime(
        tenant_id=tenant_id,
        user_id=user_id,
        client=PluginModelClient(),
    )


def create_plugin_model_provider_factory(*, tenant_id: str, user_id: str | None = None) -> ModelProviderFactory:
    """Create a tenant-bound model provider factory for service flows."""
    return create_plugin_model_assembly(tenant_id=tenant_id, user_id=user_id).model_provider_factory


def create_plugin_provider_manager(*, tenant_id: str, user_id: str | None = None) -> ProviderManager:
    """Create a tenant-bound provider manager for service flows."""
    return create_plugin_model_assembly(tenant_id=tenant_id, user_id=user_id).provider_manager


def create_plugin_model_manager(*, tenant_id: str, user_id: str | None = None) -> ModelManager:
    """Create a tenant-bound model manager for service flows."""
    return create_plugin_model_assembly(tenant_id=tenant_id, user_id=user_id).model_manager


def create_model_type_instance(
    factory: ModelProviderFactory,
    provider: str,
    model_type: ModelType,
) -> AIModel:
    """Instantiate the AIModel subclass for *model_type* backed by *factory*'s runtime.

    This replaces ``ModelProviderFactory.get_model_type_instance`` which was
    removed in graphon 0.3.0.  The mapping from ModelType to concrete AIModel
    subclass is maintained here so that callers do not need to know the
    subclass constructors.

    :param factory: factory whose ``runtime`` and provider resolution are used.
    :param provider: provider identifier (canonical or short name).
    :param model_type: the model type to instantiate.
    :returns: an AIModel subclass instance wired to the factory's runtime.
    :raises ValueError: if *model_type* is not supported.
    """
    model_class = _MODEL_TYPE_CLASS_MAP.get(model_type)
    if model_class is None:
        msg = f"Unsupported model type: {model_type}"
        raise ValueError(msg)

    provider_entity = factory.get_model_provider(provider)
    return model_class(provider_schema=provider_entity, model_runtime=factory.runtime)
