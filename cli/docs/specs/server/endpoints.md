---
title: server — endpoints
---

# endpoints

Flat reference of every HTTP endpoint under `/openapi/v1/*` and adjacent surfaces.

Companion: `middleware.md` (auth behavior), `tokens.md` (storage), `device-flow.md` (flow logic), `security.md` (rate limits + audit).

## Regions

| Region | URL prefix | Host | Auth style |
|---|---|---|---|
| Console API (cookie) | `/console/api/*` | API Service (Flask) | Browser console session cookie. No bearer surface |
| OpenAPI (user-scoped programmatic) | `/openapi/v1/*` | API Service (Flask) | User-level bearer (`dfoa_` / `dfoe_`). `dfp_` rejected. Hosts device-flow protocol + approval, identity reads, session management, workspace reads |
| Service API | `/v1/*` | API Service (Flask) | App-scoped key (`app-…`) only. User-level bearers go to `/openapi/v1/*` |
| Enterprise Inner API | Internal Go service | Enterprise Go | Server-to-server only; never called by clients |

The full `/openapi/v1/*` surface lives in `openapi.md`; this file is the flat HTTP reference. Gateway routing (nginx in dify, Caddy in dify-enterprise, dify-helm chart) all proxy `/openapi/*` to the api backend.

## Personal Access Tokens

Not supported. `dfp_` prefix on `/openapi/v1/*` returns 401 `unknown_token_prefix`. No `/console/api/personal-access-tokens` surface, no `personal_access_tokens` table. See `tokens.md §Wire format`.

## OAuth device flow — account branch

Approve / deny live under `/openapi/v1/*` and authenticate with the **console session cookie** (the user clicks Authorize from the dashboard). Same handler classes; only the URL prefix differs from cookie-only console routes.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/oauth/device/lookup` | Public + rate-limit | Validate entered `user_code`. Returns `{ valid, expires_in_remaining, client_id }` |
| POST | `/openapi/v1/oauth/device/approve` | Console session + CSRF | Approve device flow (account branch — mints `dfoa_`). Body: `{ user_code }` |
| POST | `/openapi/v1/oauth/device/deny` | Console session + CSRF | Deny device flow. Body: `{ user_code }` |

OAuth-token management lives under `/openapi/v1/account/sessions` (see §Identity + sessions). Token inventory is bearer-authed via OpenAPI — no `/console/api/oauth/authorizations*` surface.

## OAuth device flow — SSO branch (`@enterprise_only`)

All four endpoints gated by `@enterprise_only` — CE returns 404. The IdP-side ACS callback URL is the canonical `sso-complete` path below; reconfigure each configured IdP to point at this URL.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/oauth/device/sso-initiate` | Unauthenticated | Build IdP auth URL via Enterprise initiate. Query `?user_code=<required>`. 302s to IdP |
| GET | `/openapi/v1/oauth/device/sso-complete` | Signed external-subject assertion (5-min TTL, nonce-consumed) | Consume assertion, set `device_approval_grant` cookie (path-scoped to `/openapi/v1/oauth/device`), 302 → `/device?sso_verified=1` |
| GET | `/openapi/v1/oauth/device/approval-context` | `device_approval_grant` cookie | SPA reads session claims. Returns `{ subject_email, subject_issuer, user_code, csrf_token, expires_at }`. Idempotent — nonce not consumed |
| POST | `/openapi/v1/oauth/device/approve-external` | `device_approval_grant` cookie + `X-CSRF-Token` | Approve device_code as External SSO subject. Body `{ user_code }` must match cookie claim. Mints `dfoe_` |

Decorator order: `@enterprise_only → @rate_limit → handler`.

## OpenAPI — RFC 8628 protocol (unauthenticated / bearer)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/openapi/v1/oauth/device/code` | Public + rate-limit | Device flow: request code. Body `{ client_id, device_label }`. Returns `{ device_code, user_code, verification_uri, expires_in, interval }` |
| POST | `/openapi/v1/oauth/device/token` | Public + rate-limit | Device flow: poll. Body `{ device_code, client_id }`. Per RFC 8628 error codes (`authorization_pending`, `slow_down`, `expired_token`, `access_denied`) |

## OpenAPI — identity + sessions (bearer)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/account` | Bearer (any user-level) | Polymorphic by subject. Used by post-device-flow validation + `auth status -v` refresh |
| GET | `/openapi/v1/account/sessions` | Bearer | List user's active OAuth tokens. Filters `revoked_at IS NULL AND expires_at > NOW() AND token_hash IS NOT NULL`. Used by `auth devices list` |
| DELETE | `/openapi/v1/account/sessions/self` | Bearer | Revoke session backing this request. Used by `auth logout` |
| DELETE | `/openapi/v1/account/sessions/<id>` | Bearer + subject-match | Revoke specific session by id. See `tokens.md §Subject-match on revoke-by-id`. Used by `auth devices revoke` |

### `GET /openapi/v1/account` response

Account subject:

```json
{
  "subject_type":         "account",
  "subject_email":        "user@example.com",
  "account":              { "id": "acc_...", "email": "user@example.com", "name": "..." },
  "workspaces":           [{ "id": "ws_...", "name": "...", "role": "owner" }],
  "default_workspace_id": "ws_..."
}
```

External SSO subject (EE):

```json
{
  "subject_type":         "external_sso",
  "subject_email":        "sso-user@partner.com",
  "subject_issuer":       "https://idp.partner.com",
  "account":              null,
  "workspaces":           [],
  "default_workspace_id": null
}
```

`subject_type` always present. Absent fields are explicit `null` / `[]`, not omitted — strict-schema agents don't fail.

## OpenAPI — workspaces (bearer)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/workspaces` | Bearer | List user's workspaces. External SSO subjects (no account) get `[]` |
| GET | `/openapi/v1/workspaces/<id>` | Bearer + member | Workspace details. Non-member returns 404 (not 403 — avoids cross-tenant id leak) |

## OpenAPI — app (two surfaces, strict subject_type separation)

Bearer auth via `dfoa_` / `dfoe_`. App is in the URL path — no `X-Dify-App-Id` header. Surface gate (`@accept_subjects(...)`) rejects wrong subject_type before scope check.

### dfoa_ surface — `/openapi/v1/apps*` (CE + EE)

| Method | Path | Scope | Deployment | Request / Response |
|---|---|---|---|---|
| GET | `/openapi/v1/apps?workspace_id=<ws>` | `apps:read` | CE + EE | `AppListQuery` → `AppPagination`. Params: `workspace_id` **(required)**, `page, limit, mode, name, tag`. List filtered through `_apply_openapi_gate` + AclStrategy (CE: workspace membership only; EE: access_mode allowlist + inner-API for `internal`) |
| GET | `/openapi/v1/apps/<app_id>/describe?workspace_id=<ws>` | `apps:read` | CE + EE | `AppDescribeQuery` → `AppDescribeResponse`. Canonical "what is this app". Slim subset via `?fields=info`. See §`/describe` shape |
| POST | `/openapi/v1/apps/<app_id>/run` | `apps:run` | CE + EE | `AppRunRequest` → `AppRunResponse` (or SSE). Mode-agnostic — server dispatches on `apps.mode`. See §`/run` shape |

Surface: `dfoa_` only. `dfoe_` → 403 `wrong_surface` before Layer 0. `workspace_id` missing on list/describe → 422 `workspace_id_required`.

### dfoe_ surface — `/openapi/v1/permitted-external-apps*` (EE only)

| Method | Path | Scope | Deployment | Request / Response |
|---|---|---|---|---|
| GET | `/openapi/v1/permitted-external-apps` | `apps:read:permitted-external` | EE only | `AppPermittedListQuery` → `AppPagination`. Params: `page, limit, mode, name`. Strict validator (`extra='forbid'`) — `workspace_id`, `tag` → 422. List filtered through `_apply_openapi_gate` + access-mode allowlist `{public, sso_verified}` |
| GET | `/openapi/v1/permitted-external-apps/<app_id>` | `apps:read:permitted-external` | EE only | Single-app metadata. Same visibility filter as list. 404 if app not in `dfoe_`'s permitted set |
| POST | `/openapi/v1/permitted-external-apps/<app_id>/run` | `apps:run` | EE only | Same `AppRunRequest` shape as `dfoa_`. Tenant resolved from app row. No `workspace_id` in body |

Surface: `dfoe_` only. `dfoa_` → 403 `wrong_surface`. Blueprint registered only when `ENTERPRISE_ENABLED=true`; on CE, routes return 404 (absent — no blueprint).

### Pipeline

Run + describe routes attach via `@OAUTH_BEARER_PIPELINE.guard(scope=...)`. Pipeline: `BearerCheck → ScopeCheck → SurfaceGate → AppResolver → WorkspaceMembershipCheck (dfoa_ only) → AppAuthzCheck → CallerMount`. Per-token rate limit is enforced inside `BearerAuthenticator.authenticate` (called by `BearerCheck`). Server-side dispatch on `apps.mode` happens after `AppResolver`:

```text
mode == chat | agent-chat | advanced-chat → existing chat-messages handler
mode == completion                        → existing completion-messages handler
mode == workflow                          → existing workflows/run handler
```

List routes attach `@validate_bearer + @accept_subjects + @require_scope`. The `_apply_openapi_gate` helper in `api/services/openapi/visibility.py` is the single source for the `enable_api=true` filter — removing it retires the gate. See `middleware.md §Universal openapi gate`.

### Subject capability matrix

| Surface | `dfoa_` | `dfoe_` |
|---|---|---|
| `GET /apps` | ✅ scope + Layer-0 membership; `workspace_id` required | ❌ 403 `wrong_surface` |
| `GET /apps/<id>/describe` | ✅ scope + Layer-0 + Layer-1 ACL | ❌ 403 `wrong_surface` |
| `POST /apps/<id>/run` | ✅ scope + Layer-0 + Layer-1 ACL | ❌ 403 `wrong_surface` |
| `GET /permitted-external-apps` | ❌ 403 `wrong_surface` (even with `full`) | ✅ scope + access-mode filter (EE only) |
| `GET /permitted-external-apps/<id>` | ❌ 403 `wrong_surface` | ✅ scope + access-mode filter (EE only) |
| `POST /permitted-external-apps/<id>/run` | ❌ 403 `wrong_surface` | ✅ scope + Layer-1 binary access-mode gate (EE only) |

### Visibility rules per surface

**dfoa_ list (`GET /apps`):**

```
1. Workspace membership check (caller ∈ tenant_account_joins for workspace_id) — else 403
2. base_query = apps WHERE workspace_id = W
3. _apply_openapi_gate(base_query)               -- enforces enable_api=true
4. on CE: return query                            -- no ACL filter
5. on EE:
     visible      = query WHERE access_mode IN {public, internal_all, sso_verified}
     internal_set = query WHERE access_mode = 'internal'
     permitted    = inner_api.batch_check(caller, internal_set.ids)
     return visible UNION permitted
```

**dfoe_ list (`GET /permitted-external-apps`, EE only):**

```
1. base_query = apps WHERE access_mode IN {public, sso_verified}
2. _apply_openapi_gate(base_query)               -- enforces enable_api=true
3. return query
```

No workspace check, no inner-API. Cross-tenant by design — `dfoe_` is a global SSO identity, not a tenant resident.

### License gate

EE-specific surface (`/permitted-external-apps*`) consults existing console/api license helper at request-handling time. License absent / expired → 402 `license_required`. CE deploys do not register the surface and never emit `license_required`. No new env var; reuses existing `ENTERPRISE_API_URL` + license module.

**`AppRunRequest` shape (mode-agnostic):**

```json
{
  "inputs":               { "key": "value" },
  "query":                "user message (chat / agent-chat / advanced-chat only — workflow rejects)",
  "files":                [ /* optional file refs */ ],
  "response_mode":        "blocking" | "streaming",
  "conversation_id":      "conv_abc (chat-family only)",
  "auto_generate_name":   false,
  "workflow_id":          "wf_abc (workflow mode only)",
  "workspace_id":         "ws_abc (informational; audit + future env routing)"
}
```

Server pops the caller subject from auth context — clients do not send a `user` field. Server validates per-mode constraints: `query` required for chat-family + rejected for workflow; `inputs` required for workflow; `conversation_id` ignored outside chat-family. Invalid mode/field combo → 422.

**`AppRunResponse` shape:** matches the existing per-mode response of the handler the server dispatched to (`ChatMessageResponse` / `CompletionMessageResponse` / `WorkflowRunResponse`). CLI renders per-mode using the `mode` echoed from the response envelope.

**`/describe` shape:**

```json
{
  "info":         { "id", "name", "mode", "description", "tags", "author", "updated_at", "service_api_enabled" },
  "parameters":   { "opening_statement", "suggested_questions", "user_input_form", "file_upload", "system_parameters" },
  "input_schema": { "type": "object", "properties": { ... }, "required": [ ... ] }
}
```

Canonical "what is this app" surface. Consolidates info + parameters + agent-friendly JSON Schema in one round-trip. `parameters` carries Dify-native `user_input_form` (semantic labels, render hints) for human/CLI rendering. `input_schema` is JSON Schema (Draft 2020-12) derived server-side from `user_input_form` + mode-specific top-level fields (`query` for chat-family, `inputs` for workflow), agent-consumed for tool-call payload generation. All sub-objects always present; absent fields are explicit `null` / `[]`.

**`AppDescribeQuery` — query params:**

| Param | Type | Default | Behaviour |
|---|---|---|---|
| `fields` | comma-separated string | omit = all | Allow-list: `info`, `parameters`, `input_schema`. Unknown member → 422. Empty/omitted returns full payload |
| `workspace_id` | UUID | **required on `/apps/<id>/describe`** (dfoa_ surface) | Surface gate enforces dfoa_ subject; Layer 0 needs `workspace_id` for membership check. Missing → 422 `workspace_id_required`. Not accepted on `/permitted-external-apps/<id>` (strict validator rejects) |

Strict validator (`extra='forbid'`). Server skips computation for unrequested blocks: `parameters_payload(app)` runs only if `parameters` or `input_schema` requested; `app_info_payload(app)` only if `info` requested.

**Slim variants:**

| Call | Returns |
|---|---|
| `GET /apps/<id>/describe` | Full `{info, parameters, input_schema}` |
| `GET /apps/<id>/describe?fields=info` | `{info}` only — replaces former `/info` |
| `GET /apps/<id>/describe?fields=info,parameters` | Subset, no `input_schema` derivation |

CLI default fetch is full (single cache entry, 1h TTL — see `apps.md`); slim variant exists for forward-compat external consumers and as a `?fields=info` quick-lookup path.

**Pagination envelope (`/apps`, `/permitted-external-apps`, `/account/sessions`):**

```json
{
  "page":     1,
  "limit":    20,
  "total":    42,
  "has_more": true,
  "data":     [ /* row objects, type-specific */ ]
}
```

`data` is the literal field name on these routes. `GET /openapi/v1/workspaces` is the exception: it returns `{"workspaces": [...]}` — no pagination, no envelope. Clients should treat the workspace list as unpaginated until that route migrates.

**`GET /openapi/v1/apps` data row:**

```json
{
  "id":              "app-abc",
  "name":            "Support Bot",
  "description":     "...",
  "mode":            "chat",
  "tags":            [{ "name": "prod" }],
  "updated_at":      "2026-04-27T10:00:00Z",
  "created_by_name": "gareth@dify.ai",
  "workspace_id":    "ws-xyz",
  "workspace_name":  "Acme Inc."
}
```

`workspace_id` + `workspace_name` populated on `/apps` rows (drives `difyctl get apps -A` cross-workspace fan-out cosmetics). `tag` query param resolved by name within target workspace; no-match = empty `data` (not 400).

**`GET /openapi/v1/permitted-external-apps` — response shape:**

Same `PaginationEnvelope` shape as `/apps`. `tags` always `[]` on `/permitted-external-apps` rows — tags are tenant-scoped and `dfoe_` is cross-tenant. `created_by_name` always null — author identity not part of the externally-visible surface. `workspace_id` / `workspace_name` omitted — `dfoe_` has no workspace concept.

Query params: `page`, `limit`, `mode`, `name`. Strict validator (`extra='forbid'`) — `workspace_id`, `tag`, or any unknown param → 422.

Blueprint registered only when `ENTERPRISE_ENABLED=true`. CE → 404 (route absent). Implementation calls Enterprise inner-API `POST /inner/api/webapp/externally-accessible-apps` (see §Inner APIs); on 5xx the route returns 503 fail-closed. License absent → 402 `license_required`.

**Snapshot semantics.** The `total` count reflects the EE-side cached list at request time. Access-mode mutations between auto-paginated calls can shift `total`; the CLI should treat `has_more=false` as authoritative and not assume `total` is monotonic across pages. EE invalidates its cache on every access-mode write and falls back to a 10-minute TTL safety net.

**Service-API `/v1/parameters` — unchanged.**

The legacy app-key surface at `GET /v1/parameters` (handled by `service_api/app/app.py:ParametersApi`) keeps the existing `Parameters` shape (`opening_statement`, `suggested_questions`, `user_input_form`, `file_upload`, `system_parameters`). User-bearer callers use `/openapi/v1/apps/<id>/describe` instead.

## Service API — run-slice (app-scoped key)

`/v1/*` is now app-scoped-key only. Subject to Service API toggle on `apps.service_api_enabled` (see `middleware.md §Service API toggle`). User-level bearers (`dfoa_` / `dfoe_`) hit `POST /openapi/v1/apps/<id>/run` (see §OpenAPI — app).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/chat-messages` | App key | Chat apps |
| POST | `/v1/completion-messages` | App key | Completion apps |
| POST | `/v1/workflows/run` | App key | Workflow apps |
| Existing | `/v1/files/upload`, `/v1/meta`, `/v1/parameters`, `/v1/info` | App key | Existing app-key surface |

### Request headers (bearer on `/openapi/v1/*` + `/v1/*` app-key)

| Header | Required | Purpose |
|---|---|---|
| `Authorization: Bearer <dfoa_… / dfoe_… / app-…>` | yes | Identifies subject. `app-…` only on `/v1/*`; `dfoa_` / `dfoe_` only on `/openapi/v1/*`. `dfp_` rejected |
| `X-Dify-Env: <env-name>` | reserved | CLI may send; server accepts + ignores |
| `X-Dify-Workspace-Id: <uuid>` | reserved | Accepts + ignores |
| `User-Agent: difyctl/<semver> (<platform>; <arch>; <channel>)` | yes | Attribution in access logs |

**Reserved headers.** `X-Dify-Env` and `X-Dify-Workspace-Id` are accepted (no 400) and ignored. App id travels in the URL path — no `X-Dify-App-Id` header.

## `/console/api/*` bearer

Not supported. `/console/api/*` stays cookie-only. User-scoped programmatic features live under `/openapi/v1/*` — see `openapi.md`.

## Inner APIs

All `/inner/api/*` endpoints authenticate via `Enterprise-Api-Secret-Key` header (= `INNER_API_KEY` env on the receiving end). Failure shape is the simple `{"error": "..."}` form, NOT the user-facing `{ code, message, hint }` envelope — inner APIs are gateway/s2s-internal.

### Hosted by enterprise svc (gateway / api → EE)

| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET | `/inner/api/webapp/permission?appId=<id>&userId=<account_id>` | dify api middleware | Layer-1 ACL check for account subjects on `internal` access mode. Returns `{ result: bool }`. Not called for other modes |
| POST | `/inner/api/webapp/permission/batch` | dify api `/apps` list handler | Batch variant of the above. Body `{ user_id, app_ids: [...] }` → `{ permitted: [app_ids] }`. Used by list-time visibility filter on EE so a workspace scan with many `internal` apps is one round-trip |
| POST | `/inner/api/webapp/externally-accessible-apps` | dify api `/permitted-external-apps` handler | Deployment-wide list of apps with `access_mode` ∈ `{public, sso_verified}`. Body `{ page, limit, mode?, name? }` → `{ data: [{ app_id, tenant_id, mode, name, updated_at }], total, has_more }`. No subject in the request — same result for every caller. EE caches the merged list under a single Redis key with explicit invalidation on every access-mode write + 10-min TTL safety net. Fail-closed: dify-api translates 5xx to 503 `permitted_external_apps_unavailable` |
| POST | `/inner/api/rbac/check-access` | EE gateway (`dify_rbac` Caddy module) | Workspace-role RBAC check. Body `{ account_id, tenant_id, scene, resource_type, resource_id }` → `{ allowed, reason, ... }` |
| POST | `/inner/api/auth/check-access-oauth` | EE gateway (`dify_rbac` Caddy module) | Token resolve for EE gateway. Body `{ token }` → `{ account_id, tenant_id, subject_type, client_id, scope, expires_at[, subject_email, subject_issuer] }`. New endpoint mirroring RBAC check-access pattern. See `gateway.md §Inner API — auth check-access (OAuth)` |

### Hosted by dify api (EE → api)

| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET | `/inner/api/policy/oauth-ttl?tenantId=<id>` | enterprise svc | Return `{ ttl_days: <int> }` for tenant. dify api Redis-caches 60 s |
| POST | `/inner/api/enterprise/apps/batch-metadata` | EE `WebAppUsecase.ListExternallyAccessibleApps` | Hydrate app metadata for a batch of app ids. Body `{ ids: [<= 500] }` → `{ data: [{ id, tenant_id, mode, name, updated_at }] }`. Filters out non-`status=normal` apps server-side. Used to merge EE-side `web_app_settings` rows with api-side `apps` columns before caching |

Fallback when EE unreachable or CE deployment: env var `OAUTH_TTL_DAYS` → hardcoded `14`.

## Request flow summary

See `middleware.md §Request flow` for the full pipeline applied to all `/v1/*` endpoints.
