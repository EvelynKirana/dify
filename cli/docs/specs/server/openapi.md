---
title: server — openapi
---

# openapi

The `/openapi/v1/*` endpoint group: user-scoped, bearer-authed, programmatic-API surface. Hosts everything difyctl, third-party scripts, and integrations talk to.

Companion: `endpoints.md` (flat HTTP reference), `tokens.md` (storage + prefixes), `device-flow.md` (RFC 8628 logic), `middleware.md` (request pipeline).

## Surface boundaries

| Group | Auth | Role |
|---|---|---|
| `/openapi/v1/*` | Bearer (`dfoa_` / `dfoe_`) | User-scoped programmatic surface — identity, sessions, device flow, workspaces, apps |
| `/v1/*` | App-scoped key (`app-`) | Service API, app-key-only |
| `/console/api/*` | Browser cookie | Dashboard — no bearer surface |
| `/inner/api/*` | `Enterprise-Api-Secret-Key` header | Server-to-server only |

## URL prefix

```
/openapi/v1/...
```

Distinct from `/v1/` (service_api per-app keys), `/console/api/` (browser cookie), `/inner/api/` (s2s).

Versioned at the prefix level — `/openapi/v2/` is the future major-version path. No mid-version breakage.

## Auth model

**Bearer only.** `Authorization: Bearer <token>`.

Accepted token prefixes:

| Prefix | Subject | Status |
|---|---|---|
| `dfoa_` | Dify account (device-flow approved from console) | accepted |
| `dfoe_` | External SSO account (EE, IdP-approved) | accepted (EE-gated routes) |
| `dfp_` | Personal Access Token | rejected — 401 `unknown_token_prefix` |
| `app-…` | App-scoped service_api key | rejected — `/openapi/v1/*` routes to `/v1/*` |

## Scope model

`AuthContext.scopes` (frozenset on `g.auth_ctx`) gates routes:

| Token kind | Scopes |
|---|---|
| `dfoa_` | `[full]` |
| `dfoe_` | `[apps:run, apps:read:permitted-external]` |

Scopes derive from prefix on every request; mint endpoints do not accept a `scopes` field. Endpoints declare required scope at registration; the check returns 403 `insufficient_scope` with the missing scope name in the body. `full` is the umbrella — it satisfies every check within accepted surface.

Scope catalog (wire format, `colon:lower`):

| Scope | Holders | Grants |
|---|---|---|
| `full` | `dfoa_` only | Superuser within the dfoa_ surface |
| `apps:read` | `dfoa_` only | List + describe via `/openapi/v1/apps*` |
| `apps:run` | both | Run via the surface matching the holder's subject_type |
| `apps:read:permitted-external` | `dfoe_` only (EE) | List + describe via `/openapi/v1/permitted-external-apps*` |

**Mint policy.** Hard rejection at device-flow mint endpoint:

- `dfoa_` may receive `[full]`, `[apps:read]`, `[apps:run]`, or combinations.
- `dfoe_` may receive only `[apps:run, apps:read:permitted-external]`.
- Cross-subject scope minting → 400 `mint_policy_violation`. CE deploys reject `dfoe_` mint entirely.

`full` does **not** umbrella `apps:read:permitted-external` across surface — even a `full`-bearing `dfoa_` hitting `/permitted-external-apps*` is rejected with 403 `wrong_surface` at the surface gate, before scope check runs. Surface gate is independent of scope semantics.

## Endpoint surface

### Identity + sessions

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/account` | Bearer | Polymorphic by subject. Replaces `/v1/me` |
| GET | `/openapi/v1/account/sessions` | Bearer | **New** — list user's active OAuth tokens (no current `/v1/` equivalent). See §Sessions list shape |
| DELETE | `/openapi/v1/account/sessions/self` | Bearer | Revoke session backing this request. Replaces `/v1/oauth/authorizations/self` |
| DELETE | `/openapi/v1/account/sessions/<id>` | Bearer + subject-match | **New** — revoke specific session |

`GET /openapi/v1/account` shape:

```json
{
  "subject_type":         "account" | "external_sso",
  "subject_email":        "...",
  "subject_issuer":       null | "https://idp.partner.com",
  "account":              null | { "id", "email", "name" },
  "workspaces":           [{ "id", "name", "role" }],
  "default_workspace_id": null | "ws_..."
}
```

`subject_type` always present. Absent fields are explicit `null` / `[]`.

### Sessions list shape

`GET /openapi/v1/account/sessions` filters `revoked_at IS NULL AND expires_at > NOW() AND token_hash IS NOT NULL` — hard-expired rows must not surface as phantom devices.

Returns the canonical pagination envelope (see `endpoints.md §`/openapi/v1/apps` — list shape`); session row shape:

```json
{
  "id":            "tok_...",
  "prefix":        "dfoa_ab2f",
  "client_id":     "difyctl",
  "device_label":  "difyctl on alice-mbp",
  "created_at":    "2026-04-20T10:00:00Z",
  "last_used_at":  "2026-04-26T08:30:00Z",
  "expires_at":    "2026-05-04T10:00:00Z"
}
```

### Device flow (RFC 8628 protocol)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/openapi/v1/oauth/device/code` | Public + rate-limit | Request device + user code |
| POST | `/openapi/v1/oauth/device/token` | Public + rate-limit | Poll for token |
| GET | `/openapi/v1/oauth/device/lookup` | Public + rate-limit | Validate `user_code` from /device page |

These three are RFC 8628 protocol endpoints — intentionally unauthenticated. Rate-limits stay at current per-IP / per-`device_code` levels (see `security.md`).

### Device flow (user approval)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/openapi/v1/oauth/device/approve` | Browser cookie + CSRF | Approve device flow (account branch — mints `dfoa_`) |
| POST | `/openapi/v1/oauth/device/deny` | Browser cookie + CSRF | Deny device flow |

Cookie-authed because the user is approving from the dashboard.

### Device flow (SSO branch, EE-only)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/openapi/v1/oauth/device/sso-initiate` | Public, `@enterprise_only` | Build IdP auth URL, 302 to IdP |
| GET | `/openapi/v1/oauth/device/sso-complete` | Signed assertion (5-min TTL, nonce-consumed) | Set `device_approval_grant` cookie (path-scoped to `/openapi/v1/oauth/device`), 302 → `/device?sso_verified=1`. **IdP-side ACS callback URL must point here.** |
| GET | `/openapi/v1/oauth/device/approval-context` | `device_approval_grant` cookie | SPA reads claims (idempotent — nonce not consumed) |
| POST | `/openapi/v1/oauth/device/approve-external` | `device_approval_grant` cookie + CSRF | Mint `dfoe_` for External SSO subject |

CE: `@enterprise_only` returns 404. EE: gated by entitlement.

### Workspaces (dfoa_ surface)

| Method | Path | Auth |
|---|---|---|
| GET | `/openapi/v1/workspaces` | Bearer (`dfoa_` only — `dfoe_` 403 `wrong_surface`) |
| GET | `/openapi/v1/workspaces/<id>` | Bearer + member |

### Apps — dfoa_ surface (CE + EE)

`workspace_id` required on every request. List/describe/run subject to Layer 0 (workspace membership) + Layer 1 ACL.

| Method | Path | Auth |
|---|---|---|
| GET | `/openapi/v1/apps?workspace_id=<ws>` | Bearer + `apps:read` |
| GET | `/openapi/v1/apps/<id>/describe?workspace_id=<ws>` | Bearer + `apps:read` — canonical "what is this app". Supports `?fields=info,parameters,input_schema` |
| POST | `/openapi/v1/apps/<id>/run` | Bearer + `apps:run` — server dispatches by `apps.mode`. See `endpoints.md §OpenAPI — app` |

### Permitted apps — dfoe_ surface (EE only)

No workspace concept — `dfoe_` has no `tenant_account_joins` row. Tenant resolved from app. Layer 0 skipped. Layer 1 enforced (binary access-mode gate).

| Method | Path | Auth |
|---|---|---|
| GET | `/openapi/v1/permitted-external-apps` | Bearer + `apps:read:permitted-external` |
| GET | `/openapi/v1/permitted-external-apps/<id>` | Bearer + `apps:read:permitted-external` |
| POST | `/openapi/v1/permitted-external-apps/<id>/run` | Bearer + `apps:run` |

Blueprint registered only when `ENTERPRISE_ENABLED=true`. CE deploys return 404 (route absent, not 403).

## Error model

Inherits the `apierrors.Typed` shape used by other groups:

```json
{
  "code": "snake_case_code",
  "message": "human-readable",
  "hint": "optional next-action"
}
```

| HTTP | Code (sample) | When |
|---|---|---|
| 400 | `invalid_request` | Malformed body / missing required field |
| 401 | `bearer_missing` / `bearer_invalid` / `bearer_expired` | Auth failures |
| 403 | `wrong_surface` | Subject_type hit a surface reserved for the other subject_type (`dfoa_` → `/permitted-external-apps*`, `dfoe_` → `/apps*` or `/workspaces*`). Surface gate at request-flow step 6 |
| 403 | `insufficient_scope` (with `required_scope`) | Scope gate failed within accepted surface |
| 403 | `license_required` | EE surface (`/permitted-external-apps*`, `internal`-mode `internal-API`) reached but EE license absent or expired. CE deploys never emit this |
| 404 | `not_found` | Resource not found OR route doesn't exist on this group (e.g. `/permitted-external-apps*` on CE) |
| 429 | `rate_limited` (with `retry_after_ms`) | Per-IP / per-token throttle |
| 503 | `bearer_auth_disabled` | `ENABLE_OAUTH_BEARER=false` |

## CORS posture

Distinct from service_api (which is permissive for embedded use). `/openapi/v1/*` allows:

- `Authorization`, `Content-Type`, `X-CSRF-Token` request headers
- `GET POST PATCH DELETE OPTIONS` methods
- `*` origin **only when** `ENABLE_OAUTH_BEARER=true` AND `OPENAPI_CORS_ALLOW_ORIGINS=*`; otherwise an explicit allowlist
- `Access-Control-Max-Age: 600`

Cookie-authed routes within the group (approve / deny / approve-external) require same-origin and reject cross-origin OPTIONS.

## Rate limit posture

- Public device-flow endpoints: per-IP token bucket (existing settings preserved)
- Bearer-authed routes: per-token bucket, default 60 req/min, configurable via `OPENAPI_RATE_LIMIT_PER_TOKEN`. Shared Redis bucket per `sha256(token)` across all api instances. Details: `middleware.md §Rate limit`
- 429 response includes `Retry-After` header + `retry_after_ms` in body

## Relationship to other groups

| Group | State |
|---|---|
| `service_api/` (`/v1/*`) | App-scoped keys only. `service_api/oauth.py` deleted — `/v1/me`, `/v1/oauth/...` retired |
| `console/api/*` | Cookie-authed dashboard only. `console/auth/oauth_device.py` deleted |
| `inner_api/` | Unchanged — internal s2s |
| `controllers/oauth_device_sso.py` (root file) | Deleted — content lives in `controllers/openapi/oauth_device_sso.py` |
| `controllers/fastopenapi.py` | Unrelated — exports the `fastopenapi` library's `FlaskRouter` for console-side schema generation. Naming collision is cosmetic; file stays. |

## Gateway routing

Every gateway in front of `api:5001` must route `/openapi/*` to it; without a rule, requests fall through to the web frontend and 404.

| Deployment | File | Rule |
|---|---|---|
| dify docker-compose | `docker/nginx/conf.d/default.conf.template` | `location /openapi { proxy_pass http://api:5001; include proxy.conf; }` |
| dify-enterprise gateway | `server/hack/configs/gateway/Caddyfile` | `handle /openapi/* { reverse_proxy http://api:5001 }` inside `console.dify.local` only — cookie-authed routes are scoped to that host |
| dify-helm chart | `charts/dify/templates/gateway/caddy-config.yaml` | Same Caddy `handle /openapi/* { reverse_proxy {{ $apiSvc }} }` inside both `consoleApiDomain` blocks (the chart has two variants depending on whether console-api and console-web share a domain) |

`/openapi/*` is intentionally absent from `enterprise.dify.local`, `app.dify.local`, `serviceApiDomain`, and `api.dify.local`: cookie-authed routes (approve / deny / approval-context / sso-complete) only work on the host that mints the console session cookie, and the IdP-side ACS callback pins a single hostname.

## Out of scope

- Admin / billing / setup / init endpoints — owner-only, browser ctx, stay in console
- Plugin marketplace, tool providers — extension management
- Webhook triggers — already separate blueprint
- App-key features (`/v1/chat-messages` etc.) — stay in service_api
