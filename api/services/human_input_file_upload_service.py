from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from configs import dify_config
from graphon.nodes.human_input.enums import HumanInputFormStatus
from libs.datetime_utils import ensure_naive_utc, naive_utc_now
from models.human_input import (
    HumanInputForm,
    HumanInputFormRecipient,
    HumanInputFormUploadFile,
    HumanInputFormUploadToken,
)
from models.model import EndUser
from services.human_input_service import FormExpiredError, FormNotFoundError, FormSubmittedError

HITL_UPLOAD_TOKEN_PREFIX = "hitl_upload_"
HUMAN_INPUT_END_USER_TYPE = "human-input"
HUMAN_INPUT_END_USER_SESSION_PREFIX = "hitl:recipient:"
_TOKEN_RANDOM_BYTES = 32
_TOKEN_GENERATION_ATTEMPTS = 10


@dataclass(frozen=True)
class HumanInputUploadToken:
    upload_token: str
    expires_at: datetime


@dataclass(frozen=True)
class HumanInputUploadContext:
    tenant_id: str
    app_id: str
    form_id: str
    recipient_id: str
    upload_token_id: str
    end_user: EndUser


class InvalidUploadTokenError(Exception):
    pass


class HumanInputFileUploadService:
    """Coordinates HITL upload tokens, technical EndUsers, and form-file links."""

    _session_maker: sessionmaker[Session]

    def __init__(self, session_factory: sessionmaker[Session] | Engine):
        if isinstance(session_factory, Engine):
            session_factory = sessionmaker(bind=session_factory)
        self._session_maker = session_factory

    def issue_upload_token(self, form_token: str) -> HumanInputUploadToken:
        """Create an upload token for an active human input recipient token."""

        with self._session_maker(expire_on_commit=False) as session, session.begin():
            recipient_model = session.scalar(
                select(HumanInputFormRecipient)
                .options(selectinload(HumanInputFormRecipient.form))
                .where(HumanInputFormRecipient.access_token == form_token)
                .limit(1)
            )
            if recipient_model is None or recipient_model.form is None:
                raise FormNotFoundError()

            form = recipient_model.form
            self._ensure_form_model_active(form)
            end_user = self._get_or_create_human_input_end_user(
                session=session,
                tenant_id=form.tenant_id,
                app_id=form.app_id,
                recipient_id=recipient_model.id,
            )
            upload_token = self._generate_unique_upload_token(session)
            token_model = HumanInputFormUploadToken(
                tenant_id=form.tenant_id,
                app_id=form.app_id,
                form_id=form.id,
                recipient_id=recipient_model.id,
                end_user_id=end_user.id,
                token=upload_token,
            )
            session.add(token_model)

        return HumanInputUploadToken(upload_token=upload_token, expires_at=form.expiration_time)

    def validate_upload_token(self, upload_token: str) -> HumanInputUploadContext:
        """Resolve an upload token and ensure the bound form is still active."""

        query = (
            select(HumanInputFormUploadToken)
            .options(selectinload(HumanInputFormUploadToken.form))
            .where(HumanInputFormUploadToken.token == upload_token)
            .limit(1)
        )
        with self._session_maker(expire_on_commit=False) as session:
            token_model = session.scalars(query).first()
            if token_model is None:
                raise InvalidUploadTokenError()

            form_model = token_model.form
            if form_model is None:
                raise InvalidUploadTokenError()
            self._ensure_form_model_active(form_model)

            end_user = session.scalar(
                select(EndUser)
                .where(
                    EndUser.id == token_model.end_user_id,
                    EndUser.tenant_id == token_model.tenant_id,
                    EndUser.app_id == token_model.app_id,
                    EndUser.type == HUMAN_INPUT_END_USER_TYPE,
                )
                .limit(1)
            )
            if end_user is None:
                raise InvalidUploadTokenError()

            return HumanInputUploadContext(
                tenant_id=token_model.tenant_id,
                app_id=token_model.app_id,
                form_id=token_model.form_id,
                recipient_id=token_model.recipient_id,
                upload_token_id=token_model.id,
                end_user=end_user,
            )

    def record_upload_file(self, *, context: HumanInputUploadContext, file_id: str) -> None:
        """Record that a file was uploaded through a specific form upload token."""

        with self._session_maker(expire_on_commit=False) as session, session.begin():
            session.add(
                HumanInputFormUploadFile(
                    tenant_id=context.tenant_id,
                    form_id=context.form_id,
                    upload_file_id=file_id,
                    upload_token_id=context.upload_token_id,
                    end_user_id=context.end_user.id,
                )
            )

    def _generate_unique_upload_token(self, session: Session) -> str:
        return f"{HITL_UPLOAD_TOKEN_PREFIX}{secrets.token_urlsafe(_TOKEN_RANDOM_BYTES)}"

    @staticmethod
    def _get_or_create_human_input_end_user(
        *,
        session: Session,
        tenant_id: str,
        app_id: str,
        recipient_id: str,
    ) -> EndUser:
        session_id = f"{HUMAN_INPUT_END_USER_SESSION_PREFIX}{recipient_id}"
        end_user = session.scalar(
            select(EndUser)
            .where(
                EndUser.tenant_id == tenant_id,
                EndUser.app_id == app_id,
                EndUser.session_id == session_id,
                EndUser.type == HUMAN_INPUT_END_USER_TYPE,
            )
            .limit(1)
        )
        if end_user is not None:
            return end_user

        end_user = EndUser(
            tenant_id=tenant_id,
            app_id=app_id,
            type=HUMAN_INPUT_END_USER_TYPE,
            is_anonymous=True,
            session_id=session_id,
            external_user_id=session_id,
        )
        session.add(end_user)
        session.flush()
        return end_user

    @staticmethod
    def _ensure_form_model_active(form: HumanInputForm) -> None:
        if form.submitted_at is not None or form.status == HumanInputFormStatus.SUBMITTED:
            raise FormSubmittedError(form.id)
        if form.status in {HumanInputFormStatus.TIMEOUT, HumanInputFormStatus.EXPIRED}:
            raise FormExpiredError(form.id)

        now = naive_utc_now()
        if ensure_naive_utc(form.expiration_time) <= now:
            raise FormExpiredError(form.id)

        global_timeout_seconds = dify_config.HUMAN_INPUT_GLOBAL_TIMEOUT_SECONDS
        if global_timeout_seconds <= 0 or form.workflow_run_id is None:
            return
        global_deadline = ensure_naive_utc(form.created_at) + timedelta(seconds=global_timeout_seconds)
        if global_deadline <= now:
            raise FormExpiredError(form.id)
