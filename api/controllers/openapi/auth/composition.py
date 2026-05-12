"""`OAUTH_BEARER_PIPELINE` — the auth scheme for openapi `/run` endpoints.

Endpoints attach via `@OAUTH_BEARER_PIPELINE.guard(scope=…)`. No alternative
paths. Read endpoints (`/apps`, `/info`, `/parameters`, `/describe`) skip
the pipeline and use `validate_bearer + require_scope + require_workspace_member`
inline — they don't need `AppAuthzCheck`/`CallerMount`.
"""

from __future__ import annotations

from controllers.openapi.auth.pipeline import Pipeline
from controllers.openapi.auth.steps import (
    AppAuthzCheck,
    AppResolver,
    BearerCheck,
    CallerMount,
    ScopeCheck,
    SurfaceCheck,
    WorkspaceMembershipCheck,
)
from controllers.openapi.auth.strategies import (
    AccountMounter,
    AclStrategy,
    AppAuthzStrategy,
    EndUserMounter,
    MembershipStrategy,
)
from libs.oauth_bearer import SubjectType
from services.feature_service import FeatureService


def _resolve_app_authz_strategy() -> AppAuthzStrategy:
    if FeatureService.get_system_features().webapp_auth.enabled:
        return AclStrategy()
    return MembershipStrategy()


# Pipeline currently serves only `/openapi/v1/apps/<id>/run` — an account
# (dfoa_) surface route. SurfaceCheck runs right after BearerCheck so
# pipeline-guarded routes get the same wrong_surface 403 + audit emit as
# the inline `@accept_subjects` decorator on read endpoints. When the
# external-surface run route lands, swap in an external-pipeline builder
# that constructs SurfaceCheck(accepted=frozenset({USER_EXT_SSO})).
OAUTH_BEARER_PIPELINE = Pipeline(
    BearerCheck(),
    SurfaceCheck(accepted=frozenset({SubjectType.ACCOUNT})),
    ScopeCheck(),
    AppResolver(),
    WorkspaceMembershipCheck(),
    AppAuthzCheck(_resolve_app_authz_strategy),
    CallerMount(AccountMounter(), EndUserMounter()),
)
