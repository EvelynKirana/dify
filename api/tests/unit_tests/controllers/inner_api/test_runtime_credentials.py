"""Unit tests for runtime credential inner API."""

import inspect
from unittest.mock import MagicMock, patch

from flask import Flask

from controllers.inner_api.runtime_credentials import (
    EnterpriseRuntimeModelCredentialsResolve,
    InnerRuntimeModelCredentialsResolvePayload,
)


def test_runtime_model_credentials_payload_accepts_items():
    payload = InnerRuntimeModelCredentialsResolvePayload.model_validate(
        {
            "tenant_id": "tenant-1",
            "credentials": [
                {
                    "credential_id": "credential-1",
                    "provider": "langgenius/openai/openai",
                    "vendor": "openai",
                }
            ],
        }
    )

    assert payload.tenant_id == "tenant-1"
    assert payload.credentials[0].provider == "langgenius/openai/openai"


@patch("controllers.inner_api.runtime_credentials.encrypter.decrypt_token")
@patch("controllers.inner_api.runtime_credentials.db")
@patch("controllers.inner_api.runtime_credentials.Session")
@patch("controllers.inner_api.runtime_credentials.create_plugin_provider_manager")
def test_runtime_model_credentials_resolve_returns_decrypted_values(
    mock_provider_manager_factory,
    mock_session_cls,
    mock_db,
    mock_decrypt_token,
    app: Flask,
):
    provider_configuration = MagicMock()
    provider_configuration.provider.provider_credential_schema.credential_form_schemas = []
    provider_configuration.extract_secret_variables.return_value = ["openai_api_key"]
    provider_configuration._get_provider_names.return_value = ["langgenius/openai/openai", "openai"]

    provider_configurations = MagicMock()
    provider_configurations.get.return_value = provider_configuration
    provider_manager = MagicMock()
    provider_manager.get_configurations.return_value = provider_configurations
    mock_provider_manager_factory.return_value = provider_manager

    credential = MagicMock()
    credential.encrypted_config = '{"openai_api_key":"encrypted","api_base":"https://api.openai.com/v1"}'
    session = MagicMock()
    session.__enter__.return_value = session
    session.__exit__.return_value = False
    session.execute.return_value.scalar_one_or_none.return_value = credential
    mock_session_cls.return_value = session
    mock_db.engine = MagicMock()
    mock_decrypt_token.return_value = "sk-test"

    handler = EnterpriseRuntimeModelCredentialsResolve()
    unwrapped = inspect.unwrap(handler.post)
    with app.test_request_context():
        with patch("controllers.inner_api.runtime_credentials.inner_api_ns") as mock_ns:
            mock_ns.payload = {
                "tenant_id": "tenant-1",
                "credentials": [
                    {
                        "credential_id": "credential-1",
                        "provider": "langgenius/openai/openai",
                        "vendor": "openai",
                    }
                ],
            }
            body, status_code = unwrapped(handler)

    assert status_code == 200
    assert body["model_credentials"][0]["values"]["openai_api_key"] == "sk-test"
    assert body["model_credentials"][0]["values"]["api_base"] == "https://api.openai.com/v1"
    mock_decrypt_token.assert_called_once_with(tenant_id="tenant-1", token="encrypted")


@patch("controllers.inner_api.runtime_credentials.create_plugin_provider_manager")
def test_runtime_model_credentials_resolve_rejects_unknown_provider(mock_provider_manager_factory, app: Flask):
    provider_configurations = MagicMock()
    provider_configurations.get.return_value = None
    provider_manager = MagicMock()
    provider_manager.get_configurations.return_value = provider_configurations
    mock_provider_manager_factory.return_value = provider_manager

    handler = EnterpriseRuntimeModelCredentialsResolve()
    unwrapped = inspect.unwrap(handler.post)
    with app.test_request_context():
        with patch("controllers.inner_api.runtime_credentials.inner_api_ns") as mock_ns:
            mock_ns.payload = {
                "tenant_id": "tenant-1",
                "credentials": [{"credential_id": "credential-1", "provider": "missing"}],
            }
            body, status_code = unwrapped(handler)

    assert status_code == 404
    assert "provider" in body["message"]
