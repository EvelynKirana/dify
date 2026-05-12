---
title: server — tokens
---

# tokens

Server-side primitives for user-level bearer tokens: two Postgres tables, three wire prefixes, Redis caches, TTL policy, revocation paths.

Companion: `middleware.md` (request flow + authz), `device-flow.md` (mint paths), `endpoints.md` (HTTP surfaces).

## Token surface

Prefix-dispatched alongside existing app-scoped keys:

| Prefix             | Subject                                         | App context source              |
| ------------------ | ----------------------------------------------- | ------------------------------- |
| `app-…` (existing) | App                                             | Fixed by key row → `apps.tenant_id` |
| `dfoa_` (new)      | Dify account (OAuth)                            | URL path `<string:app_id>`      |
| `dfoe_` (new)      | SSO-verified email, no Dify account (EE, OAuth) | URL path `<string:app_id>`      |

**Prefix carries subject type.** Middleware short-circuits scope dispatch at prefix check — no DB/Redis read needed to know "is this caller External SSO?"

`dfp_` (PAT) is not supported — 401 `unknown_token_prefix`. No model, service, controller, or migration for PAT ships.

**Tenant never carried by token.** Always looked up from `apps` row at request time.

**`X-Dify-Env`** is accepted and ignored.

## Token types

One kind (OAuth) × two subject variants. Scope derived from prefix, not stored.

| Kind                 | Prefix  | Subject                             | Scope          | Created by                  | Storage                                                                 | UI                                            |
| -------------------- | ------- | ----------------------------------- | -------------- | --------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| OAuth (account)      | `dfoa_` | Dify account                        | `[full]`       | Device flow, account branch | `oauth_access_tokens` (`account_id` populated)                          | CLI `auth devices list/revoke`                |
| OAuth (External SSO) | `dfoe_` | SSO-verified email, no account (EE) | `[apps:run, apps:read:permitted-external]` | Device flow, SSO branch     | `oauth_access_tokens` (`account_id = NULL`, `subject_issuer` populated) | CLI `auth devices list/revoke`                |

### OAuth access token

- Created via OAuth Device Flow (`difyctl auth login`). Details: `device-flow.md`.
- Subject determined at approval:
  - Account → email matches Dify account → `account_id` populated → scope `[full]`
  - External SSO → SSO-verified, no Dify account → `account_id = NULL`, `subject_issuer` populated → scope `[apps:run, apps:read:permitted-external]`
- Auto-derived `device_label` = `"difyctl on <hostname>"` (client-supplied, server-stored).
- `client_id` allowlist controlled by `OPENAPI_KNOWN_CLIENT_IDS` env (default `"difyctl"`). Unknown clients rejected at `/device/code`.
- Plaintext never rendered in UI or printed to terminal — flows directly from Redis → CLI poll response → OS keychain.

### Mint policy (hard-enforced at device-flow approve)

- `dfoa_` mint: `[full]` (v1.0 default). Future PAT may narrow to subsets like `[apps:read, apps:run]`.
- `dfoe_` mint: always `[apps:run, apps:read:permitted-external]`. No alternatives.
- Cross-subject scope minting → 400 `mint_policy_violation`. Device-flow approve handler validates `(subject_type, requested_scope)` pairs against this table before INSERT/UPDATE.
- CE deploys reject `dfoe_` minting entirely (the SSO branch endpoints are `@enterprise_only`).
- Surface gate at request time is independent of scope check (see `middleware.md §Surface gate`) — `full` does **not** umbrella `apps:read:permitted-external` across surfaces.

### Wire format

```
dfoa_<43 base64url chars>     # OAuth account            (5 + 43)
dfoe_<43 base64url chars>     # OAuth External SSO       (5 + 43)

regex: ^(dfoa|dfoe)_[A-Za-z0-9_-]{43}$
```

Server rejects any `dfp_` bearer with 401 `unknown_token_prefix`.

~256 bits entropy after prefix. Base64url alphabet — safe in URLs, shell vars, YAML.

### Hashing

SHA-256 at creation. Only hash stored; `token_hash varchar(64)` uniquely indexed.

OAuth plaintext is never rendered. Lives in Redis for seconds during approve → poll, travels CLI poll response, written directly to OS keychain. If keychain unavailable, CLI falls back to `hosts.yml` at `0600` with a prominent stderr warning.

## Storage

One table: `oauth_access_tokens`.

### `oauth_access_tokens`

Identified primarily by email. `account_id` populated when email matches Dify account; NULL for SSO-only (EE).

```sql
CREATE TABLE oauth_access_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject
  subject_email   TEXT NOT NULL,                                   -- primary identity
  subject_issuer  TEXT,                                            -- NULL for account; IdP entity_id / OIDC issuer URL for SSO-only
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL, -- NULL for SSO-only

  -- Client
  client_id       VARCHAR(64) NOT NULL,                            -- allowlisted via OPENAPI_KNOWN_CLIENT_IDS
  device_label    TEXT NOT NULL,                                   -- 'difyctl on gareth-mbp'

  -- Credential
  prefix          VARCHAR(8) NOT NULL,                             -- 'dfoa_' (account) | 'dfoe_' (ExtSSO)
  token_hash      VARCHAR(64) NULL UNIQUE,                         -- NULL after hard-expire

  -- Lifecycle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,                            -- mandatory. Set to NOW() + oauth_ttl_days at mint/rotate
  revoked_at      TIMESTAMPTZ
);

-- No `scopes` column. Middleware derives from (prefix, account_id IS NULL).

CREATE INDEX idx_oauth_subject_email ON oauth_access_tokens (subject_email) WHERE revoked_at IS NULL;
CREATE INDEX idx_oauth_account       ON oauth_access_tokens (account_id)    WHERE revoked_at IS NULL AND account_id IS NOT NULL;
CREATE INDEX idx_oauth_client        ON oauth_access_tokens (subject_email, client_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_oauth_token_hash    ON oauth_access_tokens (token_hash)    WHERE revoked_at IS NULL;

-- Rotate-in-place per (subject, client, device).
-- Re-login from same device rotates the row. Re-login after hard-expire takes the INSERT branch
-- (expired row has revoked_at IS NOT NULL, so not a candidate for ON CONFLICT).
-- subject_issuer participates so two IdPs asserting same email land in different rows.
-- Account branch writes a sentinel issuer ('dify:account') instead of NULL — application
-- normalizes at mint time. With no NULLs in the indexed column, the standard partial unique
-- index enforces "one active row per (email, issuer, client, device)" without needing a
-- COALESCE expression index or PG15 NULLS NOT DISTINCT.
CREATE UNIQUE INDEX uq_oauth_active_per_device
  ON oauth_access_tokens (subject_email, subject_issuer, client_id, device_label)
  WHERE revoked_at IS NULL;
```

**`ACCOUNT_ISSUER_SENTINEL = 'dify:account'`.** Constant lives in api token service. Mint path normalizes account-branch issuer to this sentinel before every INSERT/UPDATE; SSO branch passes the IdP issuer URL verbatim. Resolve / hard-expire / revoke read the sentinel as opaque — no special-case branching in middleware. Sentinel chosen to be a non-URL (URI scheme reserved for Dify-internal use, no IdP can match) so cannot collide with a real IdP issuer.

**Multi-device semantics.** `device_label` = per-device identifier. Unique index permits exactly one active row per `(subject_email, subject_issuer, client_id, device_label)`. Different devices = independent rows. Soft-deleted rows excluded from uniqueness.

## Redis cache

Middleware hits every request; Postgres on every call = wasteful. Two caches.

### Token-context cache

```
auth:token:{sha256_of_token}   →   JSON AuthContext
  {
    "email":         "user@example.com",
    "account_id":    "acc_..." | null,
    "subject_type":  "account" | "external_sso",
    "scopes":        ["full"] | ["apps:run", "apps:read:permitted-external"],
    "token_id":      "oat_...",
    "source":        "oauth",
    "expires_at":    "...iso..." | null
  }
```

- **Positive TTL:** 60 s. Short enough that revokes propagate fast; long enough to deflect hot-token load.
- **Negative TTL:** 10 s. Invalid / revoked / expired tokens cached as `"invalid"` — prevents 401-storm from a broken CI thrashing Postgres.
- **Invalidation on revoke:** every revoke path must `UPDATE revoked_at` AND `DEL auth:token:{hash}`. RPC returns only after both succeed.
- **Expiry:** cached entry carries `expires_at`; middleware double-checks on cache hit. Triggers hard-expire path if TTL tripped mid-cache.
- **Memory:** ~200 bytes/entry. Negligible.

No `tenant_id` in cache — always looked up per request from the `apps` row.

### ACL cache

Layer-2 authorization result (see `middleware.md §Authorization`).

```
acl:webapp:{subject}:{app_id}   →   "allow" | "deny"   (60 s allow / 10 s deny)
```

`{subject}` = `account_id` for account bearer, `sha256(subject_email)` for External SSO. No env dimension.

Invalidation: TTL-only (no active push). ACL edits propagate within 60 s worst-case.

## `last_used_at`

Currently NULL on new mints. Middleware does not update `last_used_at` on request — sync per-request UPDATE would double the DB write rate and cancel the middleware cache win. `auth devices list` renders blank in the LAST USED column.

## TTL policy (OAuth)

All OAuth tokens carry mandatory `expires_at`:

```
ttl_days   = Policy.OAuthTTLDays()
expires_at = NOW() + ttl_days * 86400s
```

| Scope                              | Source                                                                        | Default | Range      |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------- | ---------- |
| Enterprise tenant                  | EE Inner API `GET /inner/api/policy/oauth-ttl?tenantId=X` (Redis-cached 60 s) | 14 days | `[1, 365]` |
| CE (no EE) / Inner API unreachable | env var `OAUTH_TTL_DAYS`, falls through to hardcoded `14`                     | 14 days | `[1, 365]` |

Applies to every `oauth_access_tokens` row at mint and rotate.

**Policy change semantics:** new TTL applies to new mints/rotates only. Existing rows keep their originally-written `expires_at`. Tightening 30→7 → effect on next rotate / natural expiry. No background sweep.

### Detection + hard-expire on middleware hit

Middleware reads the row **without** `expires_at` filter. Behavior on resolve:

1. `row.expires_at > NOW()` or `NULL` → valid; cache `AuthContext` 60 s.
2. `row.expires_at <= NOW()` → atomic CAS revoke (`UPDATE oauth_access_tokens SET revoked_at = NOW(), token_hash = NULL WHERE id = :id AND revoked_at IS NULL`), `DEL auth:token:{hash}`, emit `oauth.token_expired` audit (only when CAS hit a row, `rows_affected == 1`), write 10 s `"invalid"` negative cache, return 401 `token_expired`.

**Hard-expire fires from both paths.** The api Python middleware and the Enterprise inner API (`/inner/api/auth/check-access-oauth`, see `gateway.md §Inner API — auth check-access (OAuth)`) perform the same revoke + invalidate + audit on `expires_at <= NOW()`. Idempotent CAS (`WHERE id = :id AND revoked_at IS NULL`) makes concurrent hits safe.

`token_hash = NULL` releases the column UNIQUE so same-device re-login can issue a fresh hash without conflict. Row retained for audit (90-day sweep).

**Re-login lifecycle after hard-expire.** The hard-expired row has `revoked_at IS NOT NULL`; partial unique index `uq_oauth_active_per_device` excludes it. Re-login therefore takes the INSERT branch — new row, new `id`. Consequence: `auth devices list` and `GET /openapi/v1/account/sessions` must filter `(revoked_at IS NULL AND expires_at > NOW() AND token_hash IS NOT NULL)` or dead rows surface as phantom devices.

**Edge case — token never presented after expiry:** row stays alive with `revoked_at IS NULL` + `expires_at < NOW()`. A scheduled retention task (`schedule/clean_oauth_access_tokens_task.py`, daily 05:00 via Celery beat) DELETEs rows past `OAUTH_ACCESS_TOKEN_RETENTION_DAYS` (default 30) under either:

```sql
revoked_at < NOW() - INTERVAL 'N days'
  OR (revoked_at IS NULL AND expires_at < NOW() - INTERVAL 'N days')
```

Kill switch: `ENABLE_CLEAN_OAUTH_ACCESS_TOKENS_TASK=false`. Live unexpired rows are never touched.

## Revocation paths

All paths: soft-delete Postgres (`revoked_at = NOW()`) **AND** `DEL auth:token:{hash}`. Return success only after both succeed.

| Trigger                            | Endpoint                                   | Auth                   |
| ---------------------------------- | ------------------------------------------ | ---------------------- |
| `difyctl auth logout` (OAuth)      | `DELETE /openapi/v1/account/sessions/self` | Bearer being revoked   |
| `difyctl auth devices revoke <id>` | `DELETE /openapi/v1/account/sessions/<id>` | Bearer + subject-match |

**Subject-match on revoke-by-id:**

```
if requester is AccountContext:
    require target.account_id IS NOT NULL AND target.account_id == requester.account_id
elif requester is SSOIdentityContext:
    require target.account_id IS NULL
       AND target.subject_email == requester.subject_email
       AND target.subject_issuer == requester.subject_issuer
else:
    403
```

Two identities sharing an email (account + SSO for `foo@x.com`) do **not** cross-revoke.

## CLI ingestion contract

OAuth tokens (`dfoa_` / `dfoe_`) arrive only via device-flow response and are written directly to keychain. CLI never accepts a raw bearer through stdin / flag. `app-` and `dfp_` are rejected at every ingestion point. Details: `../auth.md §Bearer token kinds`.

## Secret scanner

Two distinct prefixes → two patterns for GitHub Advanced Security / GitLab / TruffleHog. Severity by prefix:

- `dfoa_` = full scope, account session → high severity
- `dfoe_` = `apps:run` + `apps:read:permitted-external`, SSO-only → medium severity

See `security.md §Secret-scanner prefixes` for enrollment detail.
