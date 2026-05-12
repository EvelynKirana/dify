---
title: server — security
---

# security

Rate limits, secret-scanner prefixes, audit events, anti-framing, CI-enforced invariants, log redaction, migration + coexistence notes.

Companion: `tokens.md`, `middleware.md`, `device-flow.md`, `endpoints.md`.

## Rate limits

| Endpoint                                         | Limit                        | Scope                                                                                                            |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /openapi/v1/oauth/device/code`             | 60 / hr / IP                 | Prevents device-code spam                                                                                        |
| `POST /openapi/v1/oauth/device/token`            | 1 / `interval` / device_code | Per RFC 8628 (`slow_down` on violation)                                                                          |
| `GET /openapi/v1/oauth/device/sso-initiate`      | 60 / hr / IP                 | SSO-initiate flood protection                                                                                    |
| `POST /openapi/v1/oauth/device/approve-external` | 10 / hr / subject_email      | Mirror per-account limit on account-branch approve                                                               |
| `POST /openapi/v1/oauth/device/approve`          | 10 / hr / session            | Account-branch approve                                                                                           |
| `GET /openapi/v1/account`                        | 60 / min / account           | Validation-call spam                                                                                             |
| Bearer-authenticated requests on `/openapi/v1/*` | Per-token bucket             | Default 60 req/min; `OPENAPI_RATE_LIMIT_PER_TOKEN` env. Shared Redis bucket per `sha256(token)` across instances |

## Secret-scanner prefixes

Two distinct prefixes → two patterns. Assign severity per prefix:

- `dfoa_[A-Za-z0-9_-]{43}` — high (full scope, account session)
- `dfoe_[A-Za-z0-9_-]{43}` — medium (`apps:run` + `apps:read:permitted-external`, SSO-only surface)

Coordinate with:

- GitHub Advanced Security (push-protection partner program)
- GitLab
- BitBucket
- TruffleHog

Partner match → Dify endpoint receives leaked-token notification → revoke matching row + email owner.

GitHub partner program approval can take weeks. Initiate early.

## Audit events

| Event                             | Trigger                                                                       | Payload                                                                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oauth.device_flow_approved`      | Device-flow approval success                                                  | `subject_email`, `account_id` nullable, `subject_issuer` (for External SSO), `client_id`, `device_label`, `scopes`, `subject_type` (`account` / `external_sso`), `rotated`, `expires_at`, `token_id` |
| `oauth.device_flow_denied`        | Explicit denial                                                               | `subject_email`, `client_id`, `device_label`                                                                                                                                                         |
| `oauth.device_flow_rejected`      | SSO branch email-collision reject (`sso-complete` or `approve-external`)      | `subject_type`, `subject_email`, `subject_issuer`, `reason`                                                                                                                                          |
| `oauth.token_expired`             | OAuth hard-expired on middleware hit                                          | `token_id`, `subject`, `reason: "ttl"`                                                                                                                                                               |
| `oauth.device_code_cross_ip_poll` | Device-flow poll succeeded from IP different from `/device/code` creation IP  | `token_id`, `subject_email`, `creation_ip`, `poll_ip`                                                                                                                                                |
| `app.run.openapi`                 | `POST /openapi/v1/apps/<id>/run` or `POST /openapi/v1/permitted-external-apps/<id>/run` called | `app_id`, `tenant_id`, `subject` (subject_type + account_id or subject_email+issuer), `surface` (`apps` / `permitted-external-apps`), `source` (`oauth_account` / `oauth_sso`), `token_id`                |
| `openapi.wrong_surface_denied`    | Surface gate rejected request (caller hit the surface for the other subject_type) | `subject_type`, `attempted_path`, `client_id`, `token_id`                                                                                                                                            |

`oauth.token_expired` fires from both Python middleware and EE inner-API resolve; idempotent CAS makes concurrent emit safe. See `tokens.md §Detection + hard-expire`.

## Inner API trust boundary

Enterprise-svc inner endpoints serving the EE gateway:

- `POST /inner/api/rbac/check-access` — workspace-role RBAC check
- `POST /inner/api/auth/check-access-oauth` — token resolve

Both authenticate via `Enterprise-Api-Secret-Key` header (= `INNER_API_KEY` env). Token tables accessed via `Skip: true` ent schemas in `pkg/data/dify/schema/` (read for resolve; write for hard-expire on `expires_at <= NOW()` only).

### Invariants

| #   | Invariant                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Single env (`INNER_API_KEY`) gates every inner-API endpoint. No per-endpoint secrets.                                                                                                                                                                                                                       |
| 2   | `/inner/api/*` MUST NOT be internet-facing. Caddyfiles, nginx, and helm configs MUST NOT proxy this path from the public ingress.                                                                                                                                                                           |
| 3   | Gateway MUST NOT inject resolved-identity headers downstream. Api always re-resolves from the token store.                                                                                                                                                                                                  |
| 4   | Enterprise svc inner-API performs the same hard-expire mutation as dify api Python middleware on `expires_at <= NOW()` (`UPDATE oauth_access_tokens SET revoked_at=NOW(), token_hash=NULL`, idempotent CAS, audit emit, Redis invalidate).                                                                  |
| 5   | EE deploys MUST keep `/openapi/v1/*` reachable only through the gateway.                                                                                                                                                                                                                                    |

CE deployments have no gateway: `/inner/api/auth/check-access-oauth` receives no traffic. Dify api Python middleware does its own resolve.

## Anti-framing

Every response under `/openapi/v1/*` carries:

```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

`/device` (Next.js) also emits the same pair. Without this, an attacker's page can iframe `/device` (SPA post-`sso_verified=1`) and UI-trick a victim with a valid `device_approval_grant` cookie into clicking Approve — functionally equivalent to CSRF, bypasses double-submit. Deny framing outright — no trusted embedder exists.

## Log redaction — device-flow secrets

Flask access logs, request-body capture (debug mode), Sentry breadcrumbs, and any 3rd-party APM (Datadog, New Relic) capture request/response bodies by default. `device_code` and `user_code` travel plaintext on the routes listed below and **must not** land in any long-lived log store.

**Routes carrying plaintext:**

- `POST /openapi/v1/oauth/device/code` (response: `device_code`, `user_code`)
- `POST /openapi/v1/oauth/device/token` (request: `device_code`)
- `GET /openapi/v1/oauth/device/lookup` (query param: `user_code`)
- `POST /openapi/v1/oauth/device/approve` (request: `user_code`)
- `POST /openapi/v1/oauth/device/deny` (request: `user_code`)
- `GET /openapi/v1/oauth/device/sso-initiate` (query: `user_code`)
- `POST /openapi/v1/oauth/device/approve-external` (request: `user_code`)

**Filter.** Register a Flask request/response log hook that redacts `device_code` + `user_code` fields from:

- request body (JSON + form)
- query string
- response body (JSON)
- Sentry breadcrumbs (`before_send` hook — replace values with `[REDACTED]`)
- any structured-log emitter (e.g., `structlog` processors)

Apply by **exact key-name match**, across every route (not route-scoped — cheap belt-and-braces). Same filter redacts `access_token` and `minted_token` keys.

Minted OAuth plaintext (`dfoa_…`, `dfoe_…`) also covered: belt-and-braces, even though they normally travel only in `Authorization` headers.

Rate-limit 503 / 4xx error bodies echo back `device_code` / `user_code` in some error shapes — filter covers those too (key-name match, not status-code scoped).

## Fingerprinting constraints

- Never log full token at any layer.
- Never log token hash to external system (hash is DB lookup key).
- Audit events carry `token_id` (UUID), not hashes.

## Operator env vars

| Var                                     | Default     | Effect                                                                                                                                                |
| --------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_OAUTH_BEARER`                   | `true`      | Kill switch. `false` → `/openapi/v1/*` bearer routes return 503 `bearer_auth_disabled`. Legacy `app-` keys unaffected.                                |
| `OAUTH_TTL_DAYS`                        | `14`        | TTL applied to newly minted OAuth tokens. Range `[1, 365]`.                                                                                           |
| `ENABLE_CLEAN_OAUTH_ACCESS_TOKENS_TASK` | `true`      | Daily 05:00 retention sweep on `oauth_access_tokens`.                                                                                                 |
| `OAUTH_ACCESS_TOKEN_RETENTION_DAYS`     | `30`        | Rows where `revoked_at` OR `expires_at` is older than this are DELETEd by the retention task.                                                         |
| `OPENAPI_KNOWN_CLIENT_IDS`              | `"difyctl"` | Comma-separated allowlist of accepted `client_id` values at `/openapi/v1/oauth/device/code`. Unknown clients rejected.                                |
| `OPENAPI_RATE_LIMIT_PER_TOKEN`          | `60`        | Per-token request budget per minute on bearer-authed `/openapi/v1/*` routes. Shared Redis bucket per `sha256(token)`.                                 |

## Enterprise parity

### External SSO subjects

EE SSO-verified identities mint `dfoe_` via `/device` SSO branch. `subject_email` populated, `account_id = NULL`, scopes `[apps:run, apps:read:permitted-external]`.

Surface routing: `dfoe_` tokens reach only `/openapi/v1/permitted-external-apps*` (and `/openapi/v1/account` for identity readback). Surface gate (`@accept_subjects(USER_EXT_SSO)`) rejects `dfoe_` on the `/apps*` and `/workspaces*` surfaces with 403 `wrong_surface`. See `middleware.md §Surface gate`.

ACL = binary access-mode gate. `app.access_mode ∈ {public, sso_verified}` only. No per-email whitelist, no group evaluation. No tenant concept — `dfoe_` is a global SSO identity; tenant resolved from each app row at request time.

- SSO-only users can run any app with `access_mode` `public` or `sso_verified` (subject to `_apply_openapi_gate` `enable_api=true` filter). `internal` / `internal_all` apps invisible (filtered out of list, 404 on describe).
- Admin restricts via IdP controls (who can authenticate) or access-mode toggles.
- `subject_issuer` persists on `oauth_access_tokens` (surfaces on `auth devices list`, `GET /openapi/v1/account`, revoke-by-id) and travels on audit events. Not persisted on `end_users`.

### License / quota

Bearer traffic attributed by `account_id` (account) or `subject_email` (External SSO), same way app-scoped-key traffic is attributed by tenant.

EE-specific surface (`/permitted-external-apps*`) gated by license module — license absent / expired → 402 `license_required`. CE deploys skip license check (CE blueprint absence is the gate). Follows existing console/api license pattern; no new env var (reuses `ENTERPRISE_API_URL` + license helper).
