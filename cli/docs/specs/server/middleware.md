---
title: server — middleware
---

# middleware

Bearer middleware for user-level tokens. Prefix dispatch, three-layer authorization pipeline.

Runs against a registered prefix allowlist — it never touches `/console/api/*`.

Companion: `tokens.md` (storage + cache), `endpoints.md` (HTTP surfaces), `device-flow.md` (mint paths).

## Allowlist

Middleware enters only on:

- `/openapi/v1/*` — user-scoped programmatic API (bearer, never cookie)
- `/v1/*` — Service API (app-scoped key only)

`/console/api/*` stays cookie-only.

## Request flow

The `/openapi/v1/*` blueprint exposes auth as a composable pipeline (`api/controllers/openapi/auth/`). Run + describe endpoints (`/apps/<id>/run`, `/apps/<id>/describe`, `/permitted-external-apps/<id>`, `/permitted-external-apps/<id>/run`) attach the full pipeline; list + identity endpoints attach `validate_bearer + require_scope + require_workspace_member` as inline decorators that compose to the same effective gate.

1. **Parse `Authorization` header.** Missing / malformed → 401 `missing_bearer_token`.
2. **Prefix dispatch.**
   - `app-` on `/v1/*` → existing app-scoped key path (see §Coexistence).
   - `app-` on `/openapi/v1/*` → 401 `invalid_prefix`.
   - `dfoa_` / `dfoe_` on `/openapi/v1/*` → continue.
   - `dfp_` → 401 `unknown_token_prefix` (PAT not supported).
   - Else → 401.
3. **Feature gate.** `ENABLE_OAUTH_BEARER=false` or authenticator singleton unbound → 503 `bearer_auth_disabled`.
4. **Bearer authenticate.**
   - Hash = `sha256(token)`.
   - Redis `GET auth:token:{hash}` — `"invalid"` → 401; cached `AuthContext` → skip DB.
   - DB fallback (cache miss) reads `oauth_access_tokens` filtered on `token_hash + revoked_at IS NULL` (no `expires_at` filter). Live row → build `AuthContext` + `SETEX auth:token:{hash} 60 <json>`. Past-expiry row → atomic hard-expire (`UPDATE … SET revoked_at=NOW(), token_hash=NULL`), `DEL` Redis entry, emit `oauth.token_expired`, write 10 s `"invalid"` negative cache, return 401 `token_expired`. Missing row → 10 s `"invalid"` negative cache, 401 `invalid_token`.
5. **Subject + scope.** Prefix → subject + scope, computed not stored:
   - `dfoa_` → `AccountContext`, scopes = `[full]`.
   - `dfoe_` → `SSOIdentityContext`, scopes = `[apps:run, apps:read:permitted-external]`.
   - Sanity: `row.account_id IS NULL` ↔ `dfoe_`. Mismatch → 500 `internal_state_invariant` + audit. Scope check derives from prefix on every request; mint endpoints do not accept a `scopes` field.
6. **Surface gate.** Each `/openapi/v1/*` route declares accepted subject types. Wrong subject_type → 403 `wrong_surface` (e.g., `dfoa_` on `/permitted-external-apps`, `dfoe_` on `/apps`). Gate runs before workspace check.
7. **Workspace membership (Layer 0; CE only, dfoa_ surface only).** See §Authorization Layer 0.
8. **App resolution** (describe + run endpoints).
   - Read `app_id` from URL path (`<string:app_id>` view arg). No `X-Dify-App-Id` header.
   - Load app row. Absent → 404.
   - Universal openapi gate: `_apply_openapi_gate` helper enforces `apps.enable_api = true`. Gate-fail → 404 (no existence leak). See §Universal openapi gate.
   - Attach `AppContext`.
9. **App ACL (Layer 1).** See §Authorization Layer 1. Two-step: subject-vs-access-mode rule table; inner-API call only when mode = `internal` for an account subject.
10. **Scope enforce (Layer 2).** `required_scope ⊆ context.scopes` with `full` umbrella (`full` ⊇ every narrower scope).
11. **Handler.** Receives `AuthContext` (+ optional `AppContext`).

`X-Dify-Env` is accepted and ignored — env-aware ACL is not wired. See `endpoints.md §Request headers`.

**Subject-type gate:** two layers. (a) Surface gate at step 6 rejects wrong-subject-type before anything else runs. (b) Scope is authoritative within accepted surface. External subjects are mint-policy-locked to `[apps:run, apps:read:permitted-external]` → cannot reach `@require_scope(full)` endpoints even if they bypass step 6 by some bug. Defense in depth.

## Coexistence with app-scoped keys

Each surface accepts only its own token kinds:

| Surface | Accepted prefix | Rejected |
|---|---|---|
| `/v1/*` | `app-` | `dfoa_`, `dfoe_`, `dfp_` |
| `/openapi/v1/apps*` | `dfoa_` only | `dfoe_` → 403 `wrong_surface`, `app-` → 401 `invalid_prefix`, `dfp_` → 401 `unknown_token_prefix` |
| `/openapi/v1/permitted-external-apps*` (EE only) | `dfoe_` only | `dfoa_` → 403 `wrong_surface`, others same as above |
| `/openapi/v1/{account,workspaces,oauth/*}` | `dfoa_` (+ public for device-flow protocol) | `dfoe_` accepted on `/account` for identity readback only |

Shared service-layer code (use-cases) accepts whichever context, operates on resolved app/tenant. `/v1/api-keys` management surface untouched.

## Service API toggle (legacy)

On `/v1/*` (app-key surface), when `apps.enable_api = false`, every request for that app is rejected with `service_api_disabled`. No token-type bypasses the toggle. No console escape hatch — admin must flip the toggle.

For `/openapi/v1/*` (user-bearer surface), the same column is consulted via §Universal openapi gate — not as a separate service-API toggle, just as one of the filter conditions in `_apply_openapi_gate`.

## Universal openapi gate

Every `/openapi/v1/*` visibility path applies `enable_api` through one helper. No inline filters scattered across handlers.

```python
# api/services/openapi/visibility.py

def _apply_openapi_gate(query):
    """Universal gate for /openapi/v1/* surface. Filter to apps reachable
    through the user-bearer surface. Remove this filter to retire the gate."""
    return query.filter(App.enable_api.is_(True))


def visible_apps_for_subject(subject, **constraints):
    q = base_app_query(**constraints)
    q = _apply_openapi_gate(q)
    return AclStrategy.for_subject(subject).filter(q, subject)
```

Entry points routed through this helper:

- `GET /apps`, `GET /apps/<id>/describe`, `POST /apps/<id>/run` (dfoa_ surface)
- `GET /permitted-external-apps`, `GET /permitted-external-apps/<id>`, `POST /permitted-external-apps/<id>/run` (dfoe_ surface)

To remove the `enable_api` filter in the future: delete the helper body / make it a no-op. One file, one function. No grep across handlers needed.

## CSRF — credential-based, not path-based

CSRF is required for requests authenticated by **ambient cookies** (console session, `device_approval_grant`). Bearer-authenticated requests are CSRF-exempt — no ambient credentials, attacker can't cause the browser to attach a bearer via `Authorization`.

| Surface | Credential | CSRF |
|---|---|---|
| `/v1/*` with `app-` key | none ambient | exempt |
| `/openapi/v1/*` with bearer (`dfoa_` / `dfoe_`) | none ambient | exempt |
| `/openapi/v1/oauth/device/{approve,deny}` | console session cookie | required (existing console CSRF token) |
| `/openapi/v1/oauth/device/approve-external` | `device_approval_grant` cookie | required (per-flow CSRF baked into approval-context) |
| `/console/api/*` with cookie session | cookie | required (existing) |

Rule is credential-based — surface alone doesn't determine CSRF posture; what matters is whether the browser attaches a credential the user didn't explicitly send.

## Authorization

Every user-level bearer request passes orthogonal layers in api middleware, coarsest-to-narrowest. AND semantics — all must pass. Deny at any layer → 403.

```
S. Surface gate          (subject_type allowed on this URL?)           enforced for all bearer routes
0. Workspace membership  (account active in tenant?)                   dfoa_ surface only (CE always; EE for the dfoa_ surface)
1. Resource ACL          (subject ∈ access_mode-permitted set?)        enforced for list + describe + run
2. Token scope           (bearer's scope ⊇ required_scope?)            enforced
```

RBAC (workspace role → action allowed?) is NOT in the api auth pipeline. RBAC is enforced upstream at the EE gateway. See `gateway.md`. The `internal` access-mode inner-API call below is *not* RBAC — it's an EE-specific app-ACL check.

### Surface gate (Layer S)

First gate. Each `/openapi/v1/*` route declares accepted subject types via decorator (`@accept_subjects(USER_ACCOUNT)` or `@accept_subjects(USER_EXT_SSO)`). Wrong subject_type → 403 `wrong_surface`.

Routes:

| Path prefix | Accepted | Rejected |
|---|---|---|
| `/openapi/v1/apps*` | `dfoa_` | `dfoe_` → 403 `wrong_surface` |
| `/openapi/v1/permitted-external-apps*` (EE only) | `dfoe_` | `dfoa_` → 403 `wrong_surface` |
| `/openapi/v1/workspaces*` | `dfoa_` | `dfoe_` → 403 `wrong_surface` (no workspace concept) |
| `/openapi/v1/account` | both | — (identity readback) |

CE-only deploys never register `/permitted-external-apps*` blueprints — `dfoe_` minting is disabled at the device-flow mint endpoint when `ENTERPRISE_ENABLED=false`.

### Layer 0 — Workspace membership (dfoa_ surface only)

Only the `/apps*` and `/workspaces*` surface runs Layer 0. The `/permitted-external-apps*` surface has no workspace concept — Layer 0 skipped entirely.

For account-subject bearers (`dfoa_`), the layer verifies (a) an active `tenant_account_joins` row exists for `(account_id, tenant_id)` (tenant resolved from `?workspace_id=` query or `app.tenant_id`) and (b) `accounts.status = 'active'`. Either fails → 403 `workspace_membership_revoked`.

On EE deploys, gateway RBAC interceptor enforces stricter semantics in addition.

Cache: same Redis `auth:token:{hash}` AuthContext entry stores membership on a `verified_tenants: { tenant_id: bool }` map (60 s TTL).

### Layer 1 — Resource ACL

Applied to list + describe + run on both surfaces. Strategy evaluates two steps in order, gated on `(subject_type, deploy, web_app_settings.access_mode)`.

**Step 1 — subject vs access-mode rule table.** Pure dispatch, no IO. EE-specific behavior surfaces here; CE has no ACL (app `access_mode` column has no `internal` / `internal_all` / `sso_verified` values on CE, no inner-API to consult).

| `access_mode` | dfoa_ on CE | dfoa_ on EE | dfoe_ on EE (CE has no dfoe_) |
|---|---|---|---|
| `public` | allow | allow | allow |
| `internal_all` | (n/a) | allow | deny |
| `sso_verified` | (n/a) | allow | allow |
| `internal` | (n/a) | **call inner API** (Step 2) | deny |

Visibility for list endpoints applies the same rule table to filter rows. Describe/run reject the request after row-load.

**Step 2 — inner-API permission check** (only for dfoa_ + `internal` mode on EE):

```
GET /inner/api/webapp/permission?appId=<id>&userId=<account_id>
→ { result: bool }
```

For list endpoints, the handler issues a batch variant (`POST /inner/api/webapp/permission/batch` with `[app_ids]`) so a workspace-scan over many `internal` apps is one round-trip.

Failure (network error / 5xx / timeout) → 503 to client. No fallback to "allow", no stale-cache reuse. Mirrors gateway-side `dify_rbac` behavior (see `gateway.md §Failure modes`). Modes that never reach Step 2 are immune to inner-API outage.

`X-Dify-Env` is accepted and ignored — the inner API takes `app_id + user_id` only; no env dimension exists.

**App API keys (`app-` prefix)** bypass Layer 1 entirely — key was created by the app owner who vouches for its callers.

### Layer 2 — Token scope

Narrowest layer; ceiling on what the bearer can attempt.

Endpoints declare required scope at registration; the scope check enforces `required_scope ⊆ context.scopes`. `full` is the umbrella — it satisfies every check. Endpoints without explicit scope declaration implicitly require `full`. Tokens without the required scope → 403 `insufficient_scope`.

**Prefix-derived scopes (no per-token storage):**

| Token | Subject | Scopes |
|---|---|---|
| `dfoa_` | account | `[full]` |
| `dfoe_` | External SSO | `[apps:run, apps:read:permitted-external]` |

Derivation happens at request-flow step 5 — prefix → scopes directly, no row inspection. Wire format is `colon:lower`; SCREAMING_CASE is enum-implementation detail.

**Mint policy.** Hard rejection of cross-subject scopes at device-flow mint:

- `apps:read:permitted-external` → minted only on EE, only for `dfoe_`. Cross-mint → 400 `mint_policy_violation`.
- `dfoa_` mint default: `[full]`. Future PAT may narrow.
- `dfoe_` mint default: `[apps:run, apps:read:permitted-external]`. No alternatives.

### Concrete results

For `POST /openapi/v1/apps/<id>/run` (dfoa_):

| Subject | Surface | L0 | L1 ACL | L2 Scope |
|---|---|---|---|---|
| dfoa_ on CE | accept | workspace member required | n/a (no ACL on CE) | `full` ⊇ `apps:run` → allow |
| dfoa_ on EE | accept | workspace member required | rule table; inner API only for `internal` | `full` ⊇ `apps:run` → allow |
| dfoe_ | 403 `wrong_surface` | — | — | — |

For `POST /openapi/v1/permitted-external-apps/<id>/run` (dfoe_, EE only):

| Subject | Surface | L0 | L1 ACL | L2 Scope |
|---|---|---|---|---|
| dfoa_ | 403 `wrong_surface` | — | — | — |
| dfoe_ on EE | accept | skipped (no workspace) | binary gate (`public` / `sso_verified` only) | `apps:run` ⊇ `apps:run` → allow |

## Rate limit

Bearer-authenticated `/openapi/v1/*` requests gate through a per-token bucket — default **60 req/min**, configurable via `OPENAPI_RATE_LIMIT_PER_TOKEN` env. Bucket is a **shared Redis counter** keyed on `sha256(token)`, applied across all api instances (multi-replica deploys share the limit, not multiply it). Exceed → 429 with `Retry-After` header. Per-IP limits on unauthenticated device-flow endpoints unchanged — see `security.md §Rate limits`.

## OAuth `client_id`

`dfoa_` / `dfoe_` tokens carry `client_id` (always `"difyctl"` until an admin-registered client allowlist exists; controlled by `OPENAPI_KNOWN_CLIENT_IDS` env, default `"difyctl"`). Used for:

- **Scope-policy dispatch at middleware** (rules key on `client_id + subject_type`).
- **CLI grouping** in `auth devices list`.
- **Audit attribution** — every `oauth.*` event carries `client_id`.

Server does not bind inbound requests to a specific client identifier:

- Bearer tokens cannot reach `/console/api/*` — surfaces are disjoint.
- Account OAuth scope = `full`; extracting and using from curl is functionally identical to the user's authenticated console session.
- External SSO OAuth = `apps:run` + `apps:read:permitted-external` + SSO access gate — misuse from curl bounded to what the subject is already permitted.

CLI-side defense (no raw-bearer export command, keychain storage, same-device rotate-in-place) remains. Details: `../auth.md §Bearer token kinds`.

## X-Dify-Workspace-Id

Reserved header. Accepted and ignored by resource endpoints.
