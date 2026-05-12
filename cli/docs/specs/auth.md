---
title: auth
---

# auth

> Implementation: see [`cli/src/`](../../src/). Build & test: see [`cli/README.md`](../../README.md).

CLI auth: login, logout, status, whoami, devices. Credential storage. Bearer HTTP contract. Error model.

Companion: `server/tokens.md` (storage + prefixes), `server/device-flow.md` (server flow), `server/endpoints.md` (API contracts).

## Commands

| Command | Purpose | Output |
|---|---|---|
| `difyctl auth login` | Interactive device flow | Prompts → `Logged in as …` |
| `difyctl auth logout` | Server revoke + local clear | One-line confirm |
| `difyctl auth status [-v] [--json]` | Identity dashboard | Multi-line human or JSON |
| `difyctl auth whoami [--json]` | Account identity only | One line or JSON |
| `difyctl auth use <workspace-id>` | Switch active workspace (account only) | One-line confirm |
| `difyctl auth devices list [--json]` | OAuth sessions across devices | Table or JSON |
| `difyctl auth devices revoke <device-label\|id> [--all] [--yes]` | Revoke one or all OAuth sessions | One-line confirm |

Interactive device flow only. No `--with-token` / `DIFY_PAT` / `--token` — PAT not supported.

## Session model

**Single active host.** `auth login` replaces prior session. `--host` on individual commands reaches non-active hosts without changing the active one. Credential store shape allows future migration to a per-host map if multi-host becomes real.

**Workspace.** Server returns the user's workspaces on login + marks default. CLI stores `default_workspace_id` in `hosts.yml` as the active workspace. Every resource command accepts `--workspace <id>` override. `difyctl auth use <workspace-id>` switches active workspace (writes `current_workspace_id` to `hosts.yml`). See `workspaces.md §Resolution chain`.

**Account switch on same host.** Re-login with a different account → drop all prior metadata (workspace, account, available_workspaces), adopt new account's server default. Sequence:

1. New device flow completes.
2. Compare returned `account.id` vs stored.
3. Different → clear all metadata + bearer.
4. Best-effort revoke old bearer: `DELETE /openapi/v1/account/sessions/self`. Fire-and-forget.
5. Write new bundle, stderr `note: previous account signed out`.


## Login

Interactive device flow.

### Interactive

```
$ difyctl auth login
? Dify host: https://dify.internal
! Copy this one-time code: ABCD-1234
Press Enter to open dify.internal/device in your browser...

Waiting for authorization... done
Logged in as gareth@dify.ai (Gareth Chen)
Workspace: Acme Corp
```

**Flow:**

1. **Host.** Skipped if `--host` given. Else prior host shown as default. CLI normalizes scheme to `https://`, strips trailing slash. Non-HTTPS rejected unless `--insecure`.
2. **Device flow.** `POST /openapi/v1/oauth/device/code` with `client_id=difyctl` + `device_label`. Server returns `{device_code, user_code, verification_uri, expires_in, interval}`.
3. **Show code + URL on stderr** (always — stays visible for manual recovery).
4. **Browser open decision** (see below). Auto-open prompts `Press Enter to open …` → `open` / `xdg-open` / `cmd /c start`. Launch failure → `note: couldn't open browser; open the URL above manually`.
5. **Poll** `POST /openapi/v1/oauth/device/token` every `interval` sec. Spinner + countdown (interactive); silent (plain/structured). Handle `authorization_pending` / `slow_down` / `expired_token` / `access_denied`.
6. **Workspace resolution.** Server-returned default becomes active. No prompt.

**Flags:**

| Flag | Effect |
|---|---|
| `--host <url>` | Skip host prompt |
| `--no-browser` | Force skip-open even when auto-open qualifies |
| `--insecure` | Allow `http://`. Stderr warns. For `auth login` specifically, warns that `device_code` + `user_code` travel plaintext — any on-path MITM can intercept, poll the token endpoint, and race the legitimate user's approval. Local-dev / loopback only |

**Error states:**

| Server code | CLI behavior |
|---|---|
| `authorization_pending` | Keep polling at current interval. No stderr noise. |
| `slow_down` | Double current interval (`new = min(prev * 2, 60s)`), keep polling. Stderr at debug level only. Per RFC 8628 §3.5. |
| `expired_token` | `error: code expired before authorization; run 'difyctl auth login' to try again`. Exit 4 |
| `access_denied` | `error: authorization denied`. Exit 4 |
| any other / unknown error code | `error: unexpected device-flow error: <code>`. Exit 1. Treat as transient bug, do not retry. |
| transport 5xx / network timeout on poll | Retry up to 5× with exponential backoff (1s → 16s, capped). Exhaust → `error: device-flow poll unavailable`. Exit 1. |

### Browser-open decision

Skip auto-open if any condition matches:

| Condition | Check |
|---|---|
| User opted out | `--no-browser` set |
| SSH | `$SSH_CONNECTION` or `$SSH_TTY` set |
| Headless Linux | Linux + both `$DISPLAY` and `$WAYLAND_DISPLAY` unset |
| Non-interactive | stdout or stderr not a TTY |

Else attempt auto-open. Failure non-fatal — code + URL already on stderr. Windows-over-SSH (OpenSSH / WSL) sets `$SSH_CONNECTION` same as POSIX.

SSH example:

```
$ difyctl auth login --host https://dify.internal
! Detected SSH session — opening the browser on this machine is skipped.
! Open this URL on any device with a browser:
!   https://dify.internal/device
! When prompted, enter this one-time code (expires in 15 minutes):
!   ABCD-1234

Waiting for authorization... done
Logged in as gareth@dify.ai (Gareth Chen)
Workspace: Acme Corp
```

### Re-login / host switch

`auth login` while logged in replaces session. Different host → stderr note:

```
note: switching from <old-host> to <new-host>; previous session will be cleared
```

Old session cleared only on new-login success. Failed re-login preserves old.

### First-run

No prior host → prompt first. No magic discovery (users know their Dify URL — it's how they reach the web console). Cloud users may see `https://cloud.dify.ai` as the default suggestion — exact copy at implementation.

## Logout

Revoke server-side + clear local. Best-effort; never blocks on network.

1. Read bearer.
2. `DELETE /openapi/v1/account/sessions/self`. Bearer in `Authorization` header.
3. Non-200 → stderr: `warning: server revoke failed (<status> <reason>); local credentials cleared anyway`.
4. Delete keychain entry + rewrite `hosts.yml` without bearer.
5. `Logged out of <host>` to stdout. Exit 0 even on step-2 failure.

## Status + identity output

`auth status` default = minimal identity. `-v` = extra metadata. **Never print token details** — expiry, refresh timing, raw token. That's the middleware's concern, not the user's.

**Compact (default):**

```
Logged in to dify.internal as gareth@dify.ai (Gareth Chen)
  Workspace: Acme Corp
  Session:   Dify account — full access
```

**Verbose (`-v`):**

```
dify.internal
  Account:    gareth@dify.ai (Gareth Chen, acc_6c8a1f)
  Workspace:  Acme Corp (ws_abc123, role: owner)
  Available:  2 workspaces
  Session:    Dify account — full access (scope: full)
  Surface:    apps (dfoa_)
  Storage:    keychain
```

**Session tier line** — one-line summary of what the user can do. Shown on compact + verbose. `Surface:` line names the server surface the session targets (`apps` for `dfoa_`, `permitted-external-apps` for `dfoe_`).

| Subject | Line |
|---|---|
| Account (`dfoa_`, scope `full`) | `Session: Dify account — full access` |
| External SSO (`dfoe_`, scopes `apps:run` + `apps:read:permitted-external`) | `Session: External SSO — can run permitted apps and discover them, cannot access workspace surface` |

**Logged out:** `Not logged in. Run 'difyctl auth login' to sign in.` Exit 4.

**JSON (`--json`):**

```json
{
  "host": "dify.internal",
  "logged_in": true,
  "account": { "id": "acc_6c8a1f", "email": "gareth@dify.ai", "name": "Gareth Chen" },
  "workspace": { "id": "ws_abc123", "name": "Acme Corp", "role": "owner" },
  "available_workspaces_count": 2,
  "storage": "keychain"
}
```

Logged-out JSON: `{"host": null, "logged_in": false}`.

**`auth whoami`:**
- Human: `gareth@dify.ai (Gareth Chen)`
- JSON: `{"id": "acc_6c8a1f", "email": "gareth@dify.ai", "name": "Gareth Chen"}`

### External SSO rendering

`dfoe_` token (`subject_email + subject_issuer` populated, `account_id = NULL`) → no workspace lines (subject isn't a workspace member; no workspace concept):

```
Logged in to dify.internal as sso-user@partner.com (via https://idp.partner.com)
  Surface: permitted-external-apps (external SSO)
  Scopes:  apps:run, apps:read:permitted-external
```

`auth whoami`:
- Human: `sso-user@partner.com (external SSO, issuer: https://idp.partner.com)`
- JSON: `{"subject_type": "external_sso", "email": "sso-user@partner.com", "issuer": "https://idp.partner.com"}`

## Devices (multi-device management)

Users sign in from multiple machines simultaneously. Server stores one row per `(subject_email, subject_issuer, client_id, device_label)` via partial unique index; same-device re-login rotates in place. `device_label` auto-derived from hostname (`"difyctl on gareth-mbp"`).

### `auth devices list`

```
$ difyctl auth devices list
DEVICE                          CREATED        LAST USED      CURRENT
difyctl on gareth-mbp           2026-03-15     5m ago         *
difyctl on ci-runner-01         2026-02-01     17h ago
difyctl on old-thinkpad         2025-11-02     98d ago
```

- `GET /openapi/v1/account/sessions` with current bearer.
- `CURRENT` flags the row where `id == local token_id`.
- `--json` → raw array.

### `auth devices revoke <device-label|id>`

```
$ difyctl auth devices revoke "difyctl on old-thinkpad"
Revoked: difyctl on old-thinkpad
```

- Resolution: exact `device_label` → UUID → unique substring. Ambiguous → exit 2 with disambiguation hint.
- `DELETE /openapi/v1/account/sessions/<id>`. Server enforces subject-match → 403 otherwise. Cross-user revoke is admin-only and out of scope here.
- **Self-revoke shortcut.** If the resolved id matches current session's `token_id`, behave like `auth logout` — server revoke + local clear.
- **`--all`** revokes every OAuth token for this user *except* current device. Confirm prompt unless `--yes`.

## Credential storage

Bearer in OS keychain (preferred). Metadata in YAML. Keychain unavailable → YAML also holds bearer at `0600`. Same model as `gh`.

### File path

| OS | Default |
|---|---|
| Linux | `$XDG_CONFIG_HOME/difyctl/hosts.yml` else `~/.config/difyctl/hosts.yml` |
| macOS | `~/.config/difyctl/hosts.yml` (not `~/Library/…` — matches `gh`/`docker`/`kubectl`/`git`) |
| Windows | `%AppData%\difyctl\hosts.yml` |

`DIFY_CONFIG_DIR` overrides. Dir `0700`, files `0600` POSIX; Windows ACL user-only. Unexpected mode on read → stderr warning.

### `hosts.yml` schema

```yaml
current_host: dify.internal
subject_type: account          # OR "external_sso" — drives CLI command dispatch
account:
  id: acc_6c8a...
  email: gareth@dify.ai
  name: Gareth Chen
workspace:                     # only present when subject_type == "account"
  id: ws_abc123
  name: Acme Corp
  role: owner
available_workspaces:          # empty list when subject_type == "external_sso"
  - id: ws_abc123
    name: Acme Corp
    role: owner
  - id: ws_def456
    name: Side Project
    role: member
external_sso:                  # only present when subject_type == "external_sso"
  email: sso-user@partner.com
  issuer: https://idp.partner.com
token_storage: keychain        # OR "file" when keychain unavailable
token_id: oat_abc123...        # for revocation DELETE
token_expires_at: null         # usually null (gh-shape)
# token kind (OAuth account / OAuth ExtSSO) discriminated by prefix:
# dfoa_ / dfoe_. subject_type field is the authoritative dispatch key.
# Only present when token_storage == "file":
tokens:
  bearer: "dfoa_..."           # OR "dfoe_..."
```

CLI dispatch reads `subject_type` to decide which commands are valid for this session — `dfoa_` allows `get apps` / `get app` / `run app`; `dfoe_` allows `get permitted-external-apps` / `get permitted-external-app` / `run permitted-external-app`. Cross-surface invocation errors client-side before any network call. Surface field on the token itself is implicit from prefix; `subject_type` is the canonical field.

### Keychain entry

When `token_storage: keychain`:

- Service: `difyctl`
- Account: `<host>` (e.g. `dify.internal`)
- Password: JSON blob:

```json
{
  "bearer": "dfoa_ab2f...",
  "source": "oauth",
  "token_id": "oat_abc...",
  "expires_at": null
}
```

### Storage-mode detection

1. First login: probe keychain via Set → Get → Delete sentinel (`difyctl-probe:<host>`).
2. Probe OK → `token_storage: keychain`. Probe fail → `token_storage: file` + stderr: `info: OS keychain unavailable; token will be stored in ~/.config/difyctl/hosts.yml (0600).`
3. Mode persisted in `hosts.yml`; respected subsequently.
4. Force file: `DIFY_CREDENTIAL_STORAGE=file`.

### Source of truth

- Metadata → `hosts.yml` authoritative. Keychain bearer without matching config → treated as logged out.
- Bearer in keychain mode → keychain authoritative. Config says keychain but missing keychain entry → logged out.
- Manual edits to `tokens:` under `token_storage: keychain` are ignored.

### Env escape hatch

`DIFY_TOKEN` + `DIFY_HOST` + `DIFY_WORKSPACE_ID` all present → skip storage reads; bearer env-driven, never persisted. Undocumented in `--help`. Emergencies only.

**All-or-none.** Partial set (e.g., `DIFY_TOKEN` alone) → exit 2 with `error: env escape hatch requires all of DIFY_TOKEN, DIFY_HOST, DIFY_WORKSPACE_ID; missing: <list>`. CLI does not silently fall back to storage when one var is set.

`DIFY_TOKEN` accepts `dfoa_` / `dfoe_` only. `app-` and `dfp_` rejected with the same prefix-validation error as device-flow ingestion.

### File-mode security

Plain-text bearer in `~/.config/difyctl/hosts.yml` (`0600`) = as secure as an SSH key on the same disk. Backups, fs attackers, misconfigured ACLs leak it. First file-mode write emits stderr notice making the trade-off explicit.

## HTTP contract

### Bearer

Every authenticated request:

```
Authorization: Bearer <token>
```

`<token>` = `dfoa_…` / `dfoe_…`. No cookies, no `X-CSRF-Token`, no jar. CLI never mints or accepts `dfp_`.

**Single surface.** All bearer traffic targets the service API — CLI base URL = `<host>/v1`. Bearer tokens never reach `/console/api/*`. Details: `server/middleware.md §Coexistence`.

### App-context headers

Commands acting on a specific app:

| Header | Required | Purpose |
|---|---|---|
| `X-Dify-App-Id: <uuid>` | yes | Target app. Server resolves tenant from `app.tenant_id` |
| `X-Dify-Env` | no | Static CLI traffic identifier; sent by CLI to distinguish CLI-originated requests. Not user-configurable. |

App-scoped `app-` keys ignore both (app is in the key). Identity calls (`auth login/whoami/status`) hitting `GET /openapi/v1/account` send neither.

### Identification headers

Every request — authenticated + device flow:

| Header | Value |
|---|---|
| `User-Agent` | `difyctl/<semver> (<platform>; <arch>; <channel>)` — e.g. `difyctl/1.0.0 (darwin; arm64; stable)` |

Admins filter CLI traffic via User-Agent regex.

**No `X-Dify-Client`** — redundant with User-Agent parse, and client-controlled inputs without server enforcement are noise.

**No `X-CSRF-Token`** — bearer requests bypass CSRF server-side.

**Not included:** CLI request-id (server-side IDs suffice), fingerprint, telemetry opt-in.

### No token refresh

Bearer tokens are long-lived. They live until the user revokes or a user-set `expires_at` is reached. CLI never rotates.

**On 401:**

1. Don't retry.
2. Clear local creds (token + metadata).
3. Typed error: `error: session expired or revoked; run 'difyctl auth login' to sign in again.`
4. Exit 4.

No mutex, no storage-reload dance, no cross-process race.

### Middleware chain

`RequestLogger → UserAgent → BearerAuth → ErrorParser`. `BearerAuth` injects `Authorization: Bearer <token>`. Streaming handlers don't handle mid-stream refresh (it doesn't exist).

`/console/api/refresh-token` is not called by difyctl. Web console uses it unchanged.

## Bearer token kinds

Two subject variants. Full storage + scope details in `server/tokens.md`.

| Token | Prefix | Minted by | Subject | Scope | Surface |
|---|---|---|---|---|---|
| OAuth account | `dfoa_…` | Device flow, account branch | Dify account | `[full]` | `/openapi/v1/apps*` |
| OAuth External SSO | `dfoe_…` | Device flow, SSO branch (EE only) | SSO-verified email, no account | `[apps:run, apps:read:permitted-external]` | `/openapi/v1/permitted-external-apps*` |

Surface is bound by subject_type. Cross-surface requests → 403 `wrong_surface`. CLI caches `subject_type` in `hosts.yml` at login and dispatches commands client-side; cross-surface command invocation errors before any network call.

Wire format identical: `Authorization: Bearer <token>`. CLI stores kind + subject locally so logout + `auth status` render correctly.

CLI rejects `dfp_` at every ingestion point.

**CLI-side OAuth plaintext defense:**

1. No raw-bearer export command.
2. Device-flow response consumed directly by CLI, written to keychain. User never sees OAuth plaintext at login.
3. Same-device re-login rotates in place → prior exfiltrated plaintext invalid.
4. `app-` and `dfp_` rejected at every CLI ingestion point (`DIFY_TOKEN` env, credential-store load).

## Login-time behavior

### Device flow

1. `POST /openapi/v1/oauth/device/code` with `client_id=difyctl` + `device_label`.
2. Prompt user with URL + user_code.
3. Poll `POST /openapi/v1/oauth/device/token` until success.
4. Response:
   - Account branch: `{token: "dfoa_...", account, workspaces, default_workspace_id, expires_at}`
   - External SSO branch: `{token: "dfoe_...", subject_type: "external_sso", subject_email, subject_issuer, account: null, workspaces: []}`
   Prefix encodes subject type.
5. Write bearer → keychain (or file). Write metadata → `hosts.yml`.
6. Print `Logged in as …`.

Server-side endpoint details: `server/endpoints.md §OpenAPI — identity + sessions`.

## Error model + exit codes

gh's 5-bucket model. Errors also emit structured JSON when `--json` / `--jq` is active — agents branch on `code` string independently of exit int.

### Exit codes

| Code | Meaning | Triggers |
|---|---|---|
| `0` | Success | — |
| `1` | Generic / unexpected | Network failures, server 5xx, uncaught exceptions, unparseable responses |
| `2` | Usage error | Unknown flag, invalid arg, missing required input, conflicting flags |
| `4` | Auth error | Not logged in, session expired, PAT rejected, server-revoked |
| `6` | Version / compat | Server version outside `SupportedRange`, unsupported endpoint, schema break |

No `127` shell-style (overloaded). No per-HTTP-status exit codes — 403/404/409 all → 1; agents read `http_status` from JSON body.

### JSON error envelope

Single-line JSON to stderr + mapped exit code:

```json
{"error":{"code":"auth_expired","message":"session expired","hint":"run 'difyctl auth login'","http_status":401}}
```

### Stable `code` strings

| Code | Exit |
|---|---|
| `not_logged_in`, `auth_expired`, `token_expired` | 4 |
| `version_skew`, `unsupported_endpoint` | 6 |
| `usage_invalid_flag`, `usage_missing_arg`, `config_invalid_key`, `config_invalid_value` | 2 |
| `config_schema_unsupported` | 6 |
| `network_timeout`, `network_dns`, `server_5xx`, `server_4xx_other` | 1 |
| `unknown` | 1 |

### Human output

Non-JSON mode → stderr, up to two lines:

```
error: <message>
hint: <suggested next action>
```

Hint optional.

