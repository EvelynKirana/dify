---
title: server — gateway
---

# gateway

EE gateway integration for `/openapi/v1/*` user-level bearers. RBAC enforcement, token resolve via inner-API, path filter, error envelope translation.

Active on EE deployments only. CE (`ENTERPRISE_ENABLED=false` in dify api) has no gateway — `/openapi/v1/*` reaches dify api directly; api middleware does Layer 0 workspace-membership in its place. EE (`ENTERPRISE_ENABLED=true`) routes through gateway → api; api middleware skips Layer 0.

Companion: `middleware.md §Authorization` (api authz pipeline, including CE-only Layer 0), `tokens.md` (storage + cache), `security.md §Inner API trust boundary` (invariants), `endpoints.md §Inner APIs` (HTTP surface).

## Scope

| Deployment | Gateway | RBAC | Token resolve |
|---|---|---|---|
| CE | absent | — (api Layer 0 covers workspace membership only) | api middleware direct |
| EE | dify-enterprise gateway (Caddy + `dify_rbac` module) | gateway interceptor | gateway → enterprise svc inner-API + api middleware re-resolve |

External SSO `dfoe_` subjects: gateway skips RBAC. Bounded by L2 token scopes (`apps:run`, `apps:read:permitted-external`) + L1 ACL `sso_verified` access-mode gate.

## Request flow

```
CLI ─Authorization: Bearer dfoa_xxxxx──→ Gateway (Caddy + dify_rbac patched)
                                          │
                                          ├─ filter chain (audit-style):
                                          │   skip /openapi/v1/oauth/device/*
                                          │
                                          ├─ POST /inner/api/auth/check-access-oauth
                                          │   header: Enterprise-Api-Secret-Key
                                          │   ←── enterprise svc
                                          │       (Go: sha256 → Redis auth:token:{hash} → dify_db read view)
                                          │   on 5xx/timeout → 503 fail-closed
                                          │
                                          ├─ POST /inner/api/rbac/check-access
                                          │   ←── enterprise svc (existing rbac branch)
                                          │   on 5xx/timeout → 503 fail-closed
                                          │
                                          ├─ on 401/403: translate {error} → {code,message,hint}
                                          │
                                          └─ forward request UNCHANGED → dify api
                                                                          │
                                                                          ├─ middleware step 3a-e
                                                                          │   sha256 → Redis auth:token:{hash} → dify_db
                                                                          │
                                                                          ├─ Layer 0 (CE only): workspace membership
                                                                          ├─ Layer 1: Resource ACL
                                                                          └─ Layer 2: Token scope → handler
```

The gateway does NOT inject identity headers. Api always re-resolves from the token store on the request hot path. The two resolves (gateway-side via inner-API, api-side direct) are independent — both Redis-cached against the shared `auth:token:{hash}` key.

## Path filter

Mirrors the existing `dify_audit` filter pattern (`pkg/gateway/audit/filter.go` — `Chain` of `Filter`s, all-must-pass). The `dify_rbac` module exposes a hardcoded `DefaultChain` with a single `PrefixFilter` whitelist. Whitelist miss → no RBAC, forward to api as-is.

**Whitelist (RBAC enforced):**

```
/openapi/v1/account
/openapi/v1/workspaces
/openapi/v1/apps
/openapi/v1/runs
```

**Implicit skip (whitelist miss → no RBAC):**

| Path | Why skipped |
|---|---|
| `/openapi/v1/oauth/device/code` | Bearer-less — device-flow start |
| `/openapi/v1/oauth/device/token` | Bearer-less — device-flow poll |
| `/openapi/v1/oauth/device/sso-complete` | Browser-side SSO continuation |
| `/openapi/v1/oauth/device/approval-context` | Cookie-authed self-action |
| `/openapi/v1/oauth/device/approve` | Cookie-authed self-action |
| `/openapi/v1/oauth/device/approve-external` | Cookie-authed self-action |
| `/openapi/v1/oauth/device/deny` | Cookie-authed self-action |

Whitelist lives in module source, not Caddyfile — paths are dify-specific, no operator config needed.

Caddyfile stays single-block:

```caddyfile
handle /openapi/v1/* {
  dify_rbac <action>
  reverse_proxy http://api:5001
}
```

## Inner API — auth check-access (OAuth)

Gateway → enterprise svc. Plain `http.Handler`, `Enterprise-Api-Secret-Key` header for caller auth, snake_case JSON, `{"error": "..."}` failure shape.

```
POST /inner/api/auth/check-access-oauth
Headers:
  Enterprise-Api-Secret-Key: <INNER_API_KEY>
  Content-Type: application/json
Body:
  { "token": "dfoa_xxxxxxxxxxxxxxxxxx" }
```

Success body (200):

```json
{
  "account_id":     "<uuid>",
  "tenant_id":      "<uuid>",
  "subject_type":   "account",
  "client_id":      "difyctl",
  "scope":          ["full"],
  "expires_at":     1750000000,
  "subject_email":  "<sso-only>",
  "subject_issuer": "<sso-only>"
}
```

`account_id`, `subject_email`, `subject_issuer` are `omitempty`. SSO subjects emit `account_id=""` + populated `subject_email` / `subject_issuer`; account subjects emit `account_id` populated + empty SSO fields.

### Resolve logic

Same as api-side middleware step 4:

1. `sha256(token)` for lookup key.
2. Redis cache: `GET auth:token:{hash}`. Hit → return cached struct.
3. DB read of `oauth_access_tokens` on cache miss (`Skip: true` ent schema).
4. Cache result on hit (`SETEX auth:token:{hash} 60 <json>`); cache `"invalid"` (10 s TTL) on miss / expired / revoked.

### Hard-expire

On `expires_at <= NOW()`, enterprise svc inner-API performs the same hard-expire as dify api Python middleware (CAS `UPDATE oauth_access_tokens SET revoked_at = NOW(), token_hash = NULL WHERE id = :id AND revoked_at IS NULL`, `DEL auth:token:{hash}`, `SETEX auth:token:{hash} 10 "invalid"`, audit emit `oauth.token_expired`, return 401 `token_expired`). Same flow as `tokens.md §Detection + hard-expire on middleware hit`. Idempotent CAS makes concurrent hits safe.

### Failure responses

| HTTP | Body | Cause |
|---|---|---|
| 405 | `{"error": "method not allowed"}` | Non-POST request |
| 401 | `{"error": "invalid inner api key"}` | `Enterprise-Api-Secret-Key` missing or mismatched |
| 400 | `{"error": "invalid request body: ..."}` | JSON decode failed |
| 401 | `{"error": "invalid_token"}` | Hash miss in token store |
| 401 | `{"error": "token_expired"}` | Row `expires_at` past (mutation performed — see Hard-expire) |
| 401 | `{"error": "token_revoked"}` | Row `revoked_at IS NOT NULL` |
| 500 | `{"error": "inner api secret key not configured"}` | Server `INNER_API_KEY` env empty |

Gateway side translates these to the user-facing `{code, message, hint}` envelope before responding to CLI — see §Error envelope.

## Cache

| Layer | Key | TTL | Purpose |
|---|---|---|---|
| Api-side AuthContext cache | `auth:token:{hash}` | 60 s | Hot path on every request — gateway forwards do not bypass it |

Cache key `auth:token:{hash}` shared across dify api and enterprise svc on the same Redis instance.

## Failure modes

Both inner-API calls (token resolve + RBAC check) are fail-closed: any 5xx, network error, or timeout from `/inner/api/auth/check-access-oauth` or `RBAC_INNER_CHECK_URL` → 503 to the client. Matches existing `dify_rbac` behavior in `pkg/gateway/rbac/rbac.go` (`writeRBACError(w, http.StatusServiceUnavailable, ...)` on checker error).

| Failure | Gateway response |
|---|---|
| Resolve inner-API timeout / 5xx | 503 `{"error": "auth resolve unavailable"}` |
| RBAC inner-API timeout / 5xx | 503 `{"error": "rbac check unavailable"}` (existing) |
| Resolve returns 401 (token invalid / expired / revoked) | 401 — see §Inner API failure table |
| RBAC returns `allowed: false` | 403 `{"error": "<reason>"}` (existing) |

Stale-cache fallback deferred. Operators rely on health monitoring and redundancy rather than gateway-side fault tolerance. CLI surfaces 503 as a transient error and retries with backoff (see `auth.md §HTTP error handling`).

## Error envelope

Gateway translates inner-API `{"error": "..."}` responses into the user-facing `{ code, message, hint }` envelope (see `endpoints.md`) before responding to CLI clients on `/openapi/v1/*`. CLI error handling stays uniform regardless of which layer denied the request.

Translation lives in the `dify_rbac` module's `ServeHTTP` exit path — same place as the existing `writeRBACError`, but keyed on the inner-API source.

| Source | HTTP | Inner-API `error` | CLI `code` | CLI `message` | CLI `hint` |
|---|---|---|---|---|---|
| resolve | 401 | `invalid_token` | `invalid_token` | Bearer token not recognized. | Run `difyctl auth login` to mint a fresh token. |
| resolve | 401 | `token_expired` | `token_expired` | Bearer token has expired. | Run `difyctl auth login` to mint a fresh token. |
| resolve | 401 | `token_revoked` | `token_revoked` | Bearer token was revoked. | The owner revoked this token. Re-authenticate. |
| RBAC | 403 | `<reason>` | `rbac_denied` | `<reason>` (echoed) | Ask your workspace admin to grant your role permission for this action. |

Transient 5xx not translated. `auth resolve unavailable` and `rbac check unavailable` keep the existing `{"error": "..."}` shape — matches `dify_rbac` today and lets CLI treat them as transient and retry with backoff (see `auth.md §HTTP error handling`).

Inner-API auth failures (`invalid inner api key`) are operator-facing, not user-facing — gateway logs and returns 503 `auth resolve unavailable` to the client. Never leaks the inner-key state.

## Deployment invariants

See `security.md §Inner API trust boundary` for the canonical invariants table. Two load-bearing for the gateway:

- EE deploys MUST keep `/openapi/v1/*` reachable only through the gateway.
- `/inner/api/*` MUST NOT be exposed on public ingress in any deploy.
