from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import services.human_input_file_upload_service as service_module
from graphon.nodes.human_input.enums import HumanInputFormStatus
from libs.datetime_utils import naive_utc_now
from models.base import Base
from models.human_input import (
    HumanInputForm,
    HumanInputFormRecipient,
    HumanInputFormUploadFile,
    HumanInputFormUploadToken,
)
from models.model import EndUser
from services.human_input_file_upload_service import (
    HITL_UPLOAD_TOKEN_PREFIX,
    HUMAN_INPUT_END_USER_SESSION_PREFIX,
    HUMAN_INPUT_END_USER_TYPE,
    HumanInputFileUploadService,
)
from services.human_input_service import FormSubmittedError


@pytest.fixture
def session_maker():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            EndUser.__table__,
            HumanInputForm.__table__,
            HumanInputFormRecipient.__table__,
            HumanInputFormUploadToken.__table__,
            HumanInputFormUploadFile.__table__,
        ],
    )
    try:
        yield sessionmaker(bind=engine, expire_on_commit=False)
    finally:
        Base.metadata.drop_all(
            engine,
            tables=[
                HumanInputFormUploadFile.__table__,
                HumanInputFormUploadToken.__table__,
                HumanInputFormRecipient.__table__,
                HumanInputForm.__table__,
                EndUser.__table__,
            ],
        )
        engine.dispose()


def _create_waiting_form(session_maker) -> tuple[str, str]:
    form_id = "00000000-0000-0000-0000-000000000001"
    recipient_id = "00000000-0000-0000-0000-000000000002"
    now = naive_utc_now()
    with session_maker.begin() as session:
        session.add(
            HumanInputForm(
                id=form_id,
                tenant_id="00000000-0000-0000-0000-000000000010",
                app_id="00000000-0000-0000-0000-000000000011",
                workflow_run_id="00000000-0000-0000-0000-000000000012",
                node_id="node-1",
                form_definition="{}",
                rendered_content="content",
                expiration_time=now + timedelta(hours=1),
                created_at=now,
            )
        )
        session.add(
            HumanInputFormRecipient(
                id=recipient_id,
                form_id=form_id,
                delivery_id="00000000-0000-0000-0000-000000000003",
                recipient_type="standalone_web_app",
                recipient_payload='{"TYPE": "standalone_web_app"}',
                access_token="form-token-1",
            )
        )
    return form_id, recipient_id


def test_issue_upload_token_creates_technical_end_user_and_token(
    monkeypatch: pytest.MonkeyPatch,
    session_maker,
) -> None:
    form_id, recipient_id = _create_waiting_form(session_maker)
    monkeypatch.setattr(service_module.secrets, "token_urlsafe", lambda _bytes: "random-value")

    token = HumanInputFileUploadService(session_maker).issue_upload_token("form-token-1")

    assert token.upload_token == f"{HITL_UPLOAD_TOKEN_PREFIX}random-value"
    with session_maker() as session:
        end_user = session.scalar(select(EndUser).where(EndUser.type == HUMAN_INPUT_END_USER_TYPE))
        assert end_user is not None
        assert end_user.session_id == f"{HUMAN_INPUT_END_USER_SESSION_PREFIX}{recipient_id}"

        token_model = session.scalar(select(HumanInputFormUploadToken))
        assert token_model is not None
        assert token_model.form_id == form_id
        assert token_model.recipient_id == recipient_id
        assert token_model.end_user_id == end_user.id
        assert token_model.token == token.upload_token


def test_validate_upload_token_and_record_file(session_maker) -> None:
    form_id, recipient_id = _create_waiting_form(session_maker)
    token = HumanInputFileUploadService(session_maker).issue_upload_token("form-token-1")

    context = HumanInputFileUploadService(session_maker).validate_upload_token(token.upload_token)
    assert context.form_id == form_id
    assert context.recipient_id == recipient_id
    assert context.end_user.type == HUMAN_INPUT_END_USER_TYPE

    HumanInputFileUploadService(session_maker).record_upload_file(
        context=context,
        file_id="00000000-0000-0000-0000-000000000099",
    )

    with session_maker() as session:
        link = session.scalar(select(HumanInputFormUploadFile))
        assert link is not None
        assert link.form_id == form_id
        assert link.upload_token_id == context.upload_token_id
        assert link.end_user_id == context.end_user.id


def test_validate_upload_token_rejects_submitted_form(session_maker) -> None:
    form_id, _recipient_id = _create_waiting_form(session_maker)
    token = HumanInputFileUploadService(session_maker).issue_upload_token("form-token-1")
    with session_maker.begin() as session:
        form = session.get(HumanInputForm, form_id)
        assert form is not None
        form.status = HumanInputFormStatus.SUBMITTED
        form.submitted_at = naive_utc_now()

    with pytest.raises(FormSubmittedError):
        HumanInputFileUploadService(session_maker).validate_upload_token(token.upload_token)
