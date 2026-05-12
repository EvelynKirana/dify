"""SSO-branch device-flow endpoints under /openapi/v1/oauth/device/."""

import builtins
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from flask.views import MethodView

from controllers.openapi import bp as openapi_bp
from controllers.openapi.oauth_device_sso import (
    _email_belongs_to_dify_account,
    approval_context,
    approve_external,
    sso_complete,
    sso_initiate,
)

if not hasattr(builtins, "MethodView"):
    builtins.MethodView = MethodView  # type: ignore[attr-defined]


@pytest.fixture
def openapi_app() -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(openapi_bp)
    return app


def _rule(app: Flask, path: str):
    return next(r for r in app.url_map.iter_rules() if r.rule == path)


def test_sso_initiate_registered(openapi_app: Flask):
    rules = {r.rule for r in openapi_app.url_map.iter_rules()}
    assert "/openapi/v1/oauth/device/sso-initiate" in rules


def test_sso_complete_registered(openapi_app: Flask):
    rules = {r.rule for r in openapi_app.url_map.iter_rules()}
    assert "/openapi/v1/oauth/device/sso-complete" in rules


def test_approval_context_registered(openapi_app: Flask):
    rules = {r.rule for r in openapi_app.url_map.iter_rules()}
    assert "/openapi/v1/oauth/device/approval-context" in rules


def test_approve_external_registered(openapi_app: Flask):
    rules = {r.rule for r in openapi_app.url_map.iter_rules()}
    assert "/openapi/v1/oauth/device/approve-external" in rules


def test_sso_initiate_dispatches_to_function(openapi_app: Flask):
    rule = _rule(openapi_app, "/openapi/v1/oauth/device/sso-initiate")
    assert openapi_app.view_functions[rule.endpoint] is sso_initiate


def test_sso_complete_dispatches_to_function(openapi_app: Flask):
    rule = _rule(openapi_app, "/openapi/v1/oauth/device/sso-complete")
    assert openapi_app.view_functions[rule.endpoint] is sso_complete


def test_approval_context_dispatches_to_function(openapi_app: Flask):
    rule = _rule(openapi_app, "/openapi/v1/oauth/device/approval-context")
    assert openapi_app.view_functions[rule.endpoint] is approval_context


def test_approve_external_dispatches_to_function(openapi_app: Flask):
    rule = _rule(openapi_app, "/openapi/v1/oauth/device/approve-external")
    assert openapi_app.view_functions[rule.endpoint] is approve_external


def test_sso_complete_idp_callback_url_uses_canonical_path():
    """sso_initiate hardcodes the IdP callback URL — must point at the
    canonical /openapi/v1/ path so IdP-side ACS configuration matches.
    """
    from controllers.openapi import oauth_device_sso

    assert oauth_device_sso._SSO_COMPLETE_PATH == "/openapi/v1/oauth/device/sso-complete"


@pytest.mark.parametrize(
    ("email", "row", "expected"),
    [
        ("alice@example.com", "acc1", True),
        ("alice@example.com", None, False),
        ("Alice@Example.COM", "acc1", True),  # case-insensitive lookup
        ("  alice@example.com  ", "acc1", True),  # surrounding whitespace stripped
        ("", "acc1", False),
        ("   ", "acc1", False),
        ("", None, False),
    ],
)
@patch("controllers.openapi.oauth_device_sso.db")
def test_email_belongs_to_dify_account(db_mock, email, row, expected):
    exec_result = MagicMock()
    exec_result.scalar_one_or_none.return_value = row
    db_mock.session.execute.return_value = exec_result
    assert _email_belongs_to_dify_account(email) is expected
    if email.strip():
        db_mock.session.execute.assert_called_once()
    else:
        db_mock.session.execute.assert_not_called()
