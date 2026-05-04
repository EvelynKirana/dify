"""Inner API endpoints for runtime credential resolution.

Called by Enterprise while resolving AppRunner runtime artifacts. The endpoint
returns decrypted model credentials for in-memory runtime use only.
"""

import json
import logging
from json import JSONDecodeError
from typing import Any

from flask_restx import Resource
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from controllers.common.schema import register_schema_model
from controllers.console.wraps import setup_required
from controllers.inner_api import inner_api_ns
from controllers.inner_api.wraps import enterprise_inner_api_only
from core.helper import encrypter
from core.plugin.impl.model_runtime_factory import create_plugin_provider_manager
from extensions.ext_database import db
from models.provider import ProviderCredential

logger = logging.getLogger(__name__)


class InnerRuntimeModelCredentialResolveItem(BaseModel):
    credential_id: str = Field(description="Provider credential id")
    provider: str = Field(description="Runtime provider identifier, for example langgenius/openai/openai")
    vendor: str | None = Field(default=None, description="Model vendor, for example openai")
    plugin_unique_identifier: str | None = Field(default=None, description="Runtime plugin identifier")


class InnerRuntimeModelCredentialsResolvePayload(BaseModel):
    tenant_id: str = Field(description="Workspace id")
    credentials: list[InnerRuntimeModelCredentialResolveItem] = Field(default_factory=list)


register_schema_model(inner_api_ns, InnerRuntimeModelCredentialsResolvePayload)


@inner_api_ns.route("/enterprise/runtime/model-credentials:resolve")
class EnterpriseRuntimeModelCredentialsResolve(Resource):
    @setup_required
    @enterprise_inner_api_only
    @inner_api_ns.doc(
        "enterprise_runtime_model_credentials_resolve",
        responses={
            200: "Credentials resolved",
            400: "Invalid request or credential config",
            404: "Provider or credential not found",
        },
    )
    @inner_api_ns.expect(inner_api_ns.models[InnerRuntimeModelCredentialsResolvePayload.__name__])
    def post(self):
        args = InnerRuntimeModelCredentialsResolvePayload.model_validate(inner_api_ns.payload or {})
        if not args.credentials:
            return {"model_credentials": []}, 200

        provider_manager = create_plugin_provider_manager(tenant_id=args.tenant_id)
        provider_configurations = provider_manager.get_configurations(args.tenant_id)

        resolved: list[dict[str, Any]] = []
        for item in args.credentials:
            provider_configuration = provider_configurations.get(item.provider)
            if provider_configuration is None:
                return {"message": f"provider '{item.provider}' not found"}, 404

            provider_schema = provider_configuration.provider.provider_credential_schema
            secret_variables = provider_configuration.extract_secret_variables(
                provider_schema.credential_form_schemas if provider_schema else []
            )

            with Session(db.engine) as session:
                stmt = select(ProviderCredential).where(
                    ProviderCredential.id == item.credential_id,
                    ProviderCredential.tenant_id == args.tenant_id,
                    ProviderCredential.provider_name.in_(provider_configuration._get_provider_names()),
                )
                credential = session.execute(stmt).scalar_one_or_none()

            if credential is None or not credential.encrypted_config:
                return {"message": f"credential '{item.credential_id}' not found"}, 404

            try:
                values = json.loads(credential.encrypted_config)
            except JSONDecodeError:
                return {"message": f"credential '{item.credential_id}' has invalid config"}, 400
            if not isinstance(values, dict):
                return {"message": f"credential '{item.credential_id}' has invalid config"}, 400

            for key in secret_variables:
                value = values.get(key)
                if value is None:
                    continue
                try:
                    values[key] = encrypter.decrypt_token(tenant_id=args.tenant_id, token=value)
                except Exception as exc:
                    logger.warning(
                        "failed to resolve runtime model credential",
                        extra={
                            "credential_id": item.credential_id,
                            "provider": item.provider,
                            "tenant_id": args.tenant_id,
                            "error": type(exc).__name__,
                        },
                    )
                    return {"message": f"credential '{item.credential_id}' decrypt failed"}, 400

            resolved.append(
                {
                    "credential_id": item.credential_id,
                    "provider": item.provider,
                    "vendor": item.vendor or _vendor_from_provider(item.provider),
                    "plugin_unique_identifier": item.plugin_unique_identifier,
                    "values": values,
                }
            )

        return {"model_credentials": resolved}, 200


def _vendor_from_provider(provider: str) -> str:
    provider = provider.strip("/")
    if not provider:
        return ""
    return provider.rsplit("/", 1)[-1]
