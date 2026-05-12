---
title: apps (get / describe / run)
---

# apps

> Implementation: see [`cli/src/`](../../src/). Build & test: see [`cli/README.md`](../../README.md).

App-resource commands. Split into two CLI surfaces matching server subject_type separation:

| Subject | CLI surface | Server surface |
|---|---|---|
| `dfoa_` (account) | `get apps`, `get app`, `run app` | `/openapi/v1/apps*` |
| `dfoe_` (external SSO, EE only) | `get permitted-external-apps`, `get permitted-external-app`, `run permitted-external-app` | `/openapi/v1/permitted-external-apps*` |

CLI dispatches client-side based on the cached `subject_type` from `hosts.yml` (written at `auth login` from `GET /openapi/v1/account`). Cross-surface invocation errors before any network call:

- `dfoa_` token + `get permitted-*` → `error: 'permitted-external-apps' commands are for external SSO sessions; use 'get apps' instead`. Exit 2.
- `dfoe_` token + `get app*` / `run app` → `error: 'apps' commands are for account sessions; use 'get permitted-external-apps' instead`. Exit 2.

Companion: `auth.md §HTTP contract`, `server/endpoints.md §OpenAPI — app (two surfaces, strict subject_type separation)`. Agent onboarding text (`help account` / `help external`) in `guide.md`.

## Command surface

### dfoa_ surface (account sessions; CE + EE)

| Command | Verb | Purpose |
|---|---|---|
| `difyctl get apps` | get | List apps in target workspace |
| `difyctl get app <id>` | get | Single-app metadata fetch (slim) |
| `difyctl describe app <id>` | describe | Rich detail: info + parameter schema + JSON Schema |
| `difyctl run app <id> [message]` | run | Invoke app; server dispatches by `apps.mode` |

### dfoe_ surface (external SSO; EE only)

| Command | Verb | Purpose |
|---|---|---|
| `difyctl get permitted-external-apps` | get | List apps the SSO subject can access (no workspace) |
| `difyctl get permitted-external-app <id>` | get | Single permitted-external-app metadata fetch |
| `difyctl describe permitted-external-app <id>` | describe | Rich detail for a permitted app |
| `difyctl run permitted-external-app <id> [message]` | run | Invoke a permitted app |

## `get apps` (dfoa_)

```
difyctl get apps [-w <ws>] [-A] [--mode <m>] [--name <s>] [--tag <t>...] [--limit N] [-o <fmt>]
```

Pagination is hidden by default — auto-paginates internally. Users specify `--limit` (total rows wanted); the client issues as many server pages as needed and stops at `--limit` or when `has_more=false`. No user-facing `--page` flag; see §Pagination below.

### Flow

1. Read active session from `hosts.yml` (bearer + subject_type + current workspace).
2. Pre-flight: `subject_type == "account"`? Else → cross-surface error (exit 2).
3. Resolve `workspace_id`: `-w/--workspace` flag → `DIFY_WORKSPACE_ID` env → `hosts.yml.workspace.id`. Unresolved → exit 2 `workspace_required`.
4. `GET /openapi/v1/apps?workspace_id=<ws>&page=N&limit=N&mode=...&name=...&tag=...`. Bearer auth, scope `apps:read`.
5. If `-A/--all-workspaces`: fan out across `available_workspaces`, max 4 concurrent. Concatenate.
6. Render per `-o`.

### `get app <id>` (dfoa_, single)

```
difyctl get app <id> [-w <ws>] [-o <fmt>]
```

1. Pre-flight: `subject_type == "account"`. Else cross-surface error.
2. Resolve `workspace_id` (required by server on this surface).
3. `GET /openapi/v1/apps/<id>/describe?fields=info&workspace_id=<ws>`. Bearer auth, scope `apps:read`. Slim variant — `parameters` + `input_schema` skipped server-side.
4. Render per `-o`.

### Flags

| Flag | Default | Notes |
|---|---|---|
| `-w, --workspace` | resolved per chain | Override current workspace. Required for `get app <id>` |
| `-A, --all-workspaces` | false | Client-side fan-out across all member workspaces. Visits each workspace with same auth, applies same scope + ACL filter |
| `--mode` | (all) | `chat` / `completion` / `workflow` / `agent-chat` / `advanced-chat` |
| `--name` | — | Substring match |
| `--tag` (repeatable) | — | Tag name (not UUID); server resolves within workspace |
| `--limit` | `defaults.limit` (50) | Total rows across auto-paged calls. Max 10000 |
| `-o, --output` | `defaults.format` (table) | `table` / `json` / `yaml` / `wide` / `name` |

## `get permitted-external-apps` (dfoe_, EE only)

```
difyctl get permitted-external-apps [--mode <m>] [--name <s>] [--limit N] [-o <fmt>]
```

No workspace concept. No `-w` flag. No `-A` (single deployment-wide query). No `--tag` (tags are tenant-scoped; dfoe_ is cross-tenant).

### Flow

1. Pre-flight: `subject_type == "external_sso"`. Else cross-surface error.
2. `GET /openapi/v1/permitted-external-apps?page=N&limit=N&mode=...&name=...`. Bearer auth, scope `apps:read:permitted-external`. Strict server validator — extra params → 422.
3. Auto-paginate until `--limit` or `has_more=false`.
4. Render per `-o`.

### `get permitted-external-app <id>` (dfoe_, single)

```
difyctl get permitted-external-app <id> [-o <fmt>]
```

1. Pre-flight: `subject_type == "external_sso"`.
2. `GET /openapi/v1/permitted-external-apps/<id>`. Slim metadata. 404 if app not in permitted set.

### Flags (dfoe_ list)

| Flag | Default | Notes |
|---|---|---|
| `--mode` | (all) | Same enum as dfoa_ surface |
| `--name` | — | Substring match |
| `--limit` | 50 | Total rows. Max 10000 |
| `-o, --output` | table | `table` / `json` / `yaml` / `name` (no `wide` — no workspace columns to show) |

### Pagination

Pagination is implementation detail, not user vocabulary. The flag is `--limit N` (total rows wanted). The client loops the server's `{page, limit, total, has_more, data}` envelope until either `--limit` rows have been collected or the server reports `has_more=false`.

Server-side: each `/openapi/v1/apps` call is capped at `MAX_PAGE_LIMIT` (200) rows per page. The CLI computes per-call `limit` as `min(remaining, MAX_PAGE_LIMIT)` and increments `page` until done.

Behavior summary:

- `--limit 10` → 1 server call, `?page=1&limit=10`. Returns ≤10 rows.
- `--limit 50` (default) → 1 server call, `?page=1&limit=50`. Returns ≤50 rows.
- `--limit 200` → 1 server call, `?page=1&limit=200`.
- `--limit 500` → up to 3 server calls (`page=1&limit=200`, `page=2&limit=200`, `page=3&limit=100`); short-circuits if any page returns `has_more=false`.
- `--limit 0` → reserved (rejected with `config_invalid_value`); use a positive integer or omit for the default.

Single-page raw fetch is not exposed. Agents that need page-by-page parsing should consume the JSON envelope from the server directly (`-o json` always returns the assembled `data: [...]` after auto-paging — no `page`/`has_more` keys leak into the CLI's stdout).

Output format implications:

- `table` / `wide` / `name`: rows stream to stdout as each server page arrives, with one final summary line on stderr (`fetched 312 of 312 rows`) when the loop ends.
- `json` / `yaml`: assembled into a single payload at end-of-loop and emitted once. The wire-level `{page, limit, total, has_more}` keys do not appear in CLI output; only the merged `data: [...]` array.

Errors mid-loop:

- 429 from server: respect `Retry-After` header, sleep, retry up to 3 times. After exhaustion → exit 1 with the rows already collected printed (`-o table`/`wide`/`name`) or a partial-payload error envelope (`-o json`/`yaml`).
- 5xx mid-loop: same treatment as 429 (exponential backoff, retry).
- 4xx mid-loop (other than 429): abort, surface error to stderr, exit per `auth.md §Error handling`.

### Output — list

Default text/table:

```
ID        MODE      NAME           DESCRIPTION
app_a1b2  chat      Customer FAQ   Answers product FAQ from KB...
app_c3d4  workflow  Daily Report   Generates daily ops summary...
```

Description column truncates to fit terminal width (terminal width minus other column widths). Trailing ellipsis. Sort: `updated_at DESC`.

| Format            | Columns / payload                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `table` (default) | `ID MODE NAME DESCRIPTION` (description truncated)                                                |
| `wide`            | `ID MODE NAME DESCRIPTION TAGS UPDATED AUTHOR` (no truncation)                                    |
| `name`            | IDs only, one per line. Pipeable: `difyctl get app -o name \| xargs -I{} difyctl describe app {}` |
| `json`            | Full server payload, indented                                                                     |
| `yaml`            | Full server payload                                                                               |

With `-A`: prepend `WORKSPACE` column to table/wide; JSON/YAML wrap each row with `{workspace_id, ...row}`.

### Output — single

Same shape as list except `data` is a one-element array. `name` format emits the single ID.

### Error handling

| Server code              | CLI behavior                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| 403 `wrong_surface` | `error: this surface accepts only account sessions; you're signed in as <subject_type>.` Exit 1. Should be caught client-side; surfacing it means subject_type cache is stale — CLI clears and prompts re-login. |
| 403 `insufficient_scope` | `error: token lacks scope for this operation (required=apps:read).` Exit 1 |
| 402 `license_required` (dfoe_ surface only) | `error: this deployment's enterprise license does not cover external SSO apps surface.` Exit 1 |
| 401                      | Per `auth.md §No token refresh` — clear creds, exit 4                                                    |
| 404 (single fetch)       | `error: app not found (app_id=<id>).` Exit 1                                                             |

## `describe app` (dfoa_) / `describe permitted-external-app` (dfoe_)

```
difyctl describe app <id> [-w <ws>] [-o <fmt>]              # dfoa_
difyctl describe permitted-external-app <id> [-o <fmt>]               # dfoe_
```

Surface-specific. Cross-surface invocation errors client-side (exit 2).

### Flow — `describe app` (dfoa_)

1. Pre-flight: `subject_type == "account"`. Else cross-surface error.
2. Resolve `workspace_id` (required by server on this surface).
3. `GET /openapi/v1/apps/<id>/describe?workspace_id=<ws>`. Bearer auth, scope `apps:read`.
4. Render per `-o`.

### Flow — `describe permitted-external-app` (dfoe_, EE only)

1. Pre-flight: `subject_type == "external_sso"`. Else cross-surface error.
2. `GET /openapi/v1/permitted-external-apps/<id>`. Bearer auth, scope `apps:read:permitted-external`.
3. Render per `-o`. EE returns the same `{info, parameters, input_schema}` shape; tenant resolved from app row.

### Default text output (kubectl-describe style)

```
ID:          app_a1b2c3
Mode:        chat
Name:        Customer FAQ
Description: Answers product FAQ from knowledge base.
Author:      alice@example.com
Tags:        [prod, customer-facing]

Inputs:
  industry  (string, required)
    Options: retail | finance | health
  context   (paragraph, optional)
    Max length: 4000

File upload:
  Image:    enabled (max 5, ≤10MB)
  Document: disabled

Conversation features:
  Opening statement:    "Hi! I can help you with product questions."
  Suggested questions:  3 items
```

### Output formats

| Format            | Payload                                          |
| ----------------- | ------------------------------------------------ |
| `table` (default) | Sectioned indented label:value text              |
| `json`            | Server `/describe` response, indented            |
| `yaml`            | Same, YAML                                       |

`wide` and `name` not applicable to describe (single resource); return `NoCompatiblePrinterError`.

**Server endpoint:** `GET /openapi/v1/apps/<id>/describe` — canonical "what is this app" surface. Returns `{info, parameters, input_schema}`; the openapi-namespace has no `/info` or `/parameters` routes (callers requiring slim subsets use `?fields=...`). `input_schema` is JSON Schema (Draft 2020-12) derived server-side from `user_input_form`, intended for agent tool-call payload generation. Single-request failure mode: no partial-state handling needed.

## `run app` (dfoa_) / `run permitted-external-app` (dfoe_)

```
difyctl run app <app-id> [message] [-w <ws>] [--input <k=v>]... [--conversation <id>] [--stream] [-o text|json|yaml]
difyctl run permitted-external-app <app-id> [message] [--input <k=v>]... [--conversation <id>] [--stream] [-o text|json|yaml]
```

Two commands, one runner under the hood. Surface routing identical to read paths — `run app` hits `/apps/<id>/run`, `run permitted-external-app` hits `/permitted-external-apps/<id>/run`. Cross-surface invocation errors client-side (exit 2).

### Flow — `run app` (dfoa_)

1. Pre-flight: `subject_type == "account"`. Else cross-surface error.
2. Resolve bearer + metadata from `hosts.yml`. Bearer absent → `not_logged_in`, exit 4.
3. Resolve `workspace_id` (`-w` → env → ctx). Sent in `AppRunRequest` body (informational).
4. `POST /openapi/v1/apps/<id>/run`. Bearer auth, scope `apps:run`.
5. Render response.

### Flow — `run permitted-external-app` (dfoe_, EE only)

1. Pre-flight: `subject_type == "external_sso"`.
2. Resolve bearer. Bearer absent → exit 4.
3. `POST /openapi/v1/permitted-external-apps/<id>/run`. Bearer auth, scope `apps:run`. No `workspace_id` in body — server resolves tenant from app row.
4. Render response.

CLI does NOT pre-fetch to dispatch by mode — server owns mode dispatch. CLI's job: build `AppRunRequest` from `<message>` + `--input` + `--conversation` + `--stream`; render `AppRunResponse` per mode shape returned. The `app_meta` cache (full describe blob) is consulted opportunistically for client-side input validation; cache miss non-fatal — server validates authoritatively and returns 422 with required-input names if anything is wrong.

### Universal `enable_api` gate

Both surfaces filter through `_apply_openapi_gate` (`api/services/openapi/visibility.py`). App where `enable_api = false` → 404 on both surfaces (no existence leak). See `server/middleware.md §Universal openapi gate`. No console escape hatch.

### Headers

| Header          | Value            |
| --------------- | ---------------- |
| `Authorization` | `Bearer <token>` |

Server resolves tenant from `apps.tenant_id`. App id is in URL path (no `X-Dify-App-Id` header here).

### Input

- Positional `<message>` — for chat / agent-chat / advanced-chat modes, the user message. Workflow mode rejects positional message; use `--input`.
- `--input <key>=<value>` (repeatable) — app inputs (variables configured in the app). For workflow runs, these are the workflow inputs.
- `--conversation <id>` — chat-mode only; resume an existing conversation. Stderr-printed conversation hint after first chat invocation: `--conversation <new-id>`.
- `--stream` — request SSE streaming. `agent-chat` always streams (the upstream agent step requires it); for other modes, blocking when omitted. Text output streams deltas as they arrive; `-o json` / `-o yaml` aggregate into the blocking-shape envelope at end-of-stream.

### Output

Format selected by `-o|--output`. Default `text` (human-readable).

| Format           | Behavior                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` (default) | Per-mode rendering — chat / agent-chat / advanced-chat: assistant reply to stdout, conversation hint to stderr; completion: assistant reply to stdout; workflow: `data.outputs` JSON to stdout |
| `json`           | Raw server response to stdout, indented JSON                                                                                                                                                   |
| `yaml`           | Raw server response to stdout, YAML                                                                                                                                                            |

`wide` and `name` reserved for collection commands; return `NoCompatiblePrinterError` on `run app`.

**Not supported:** `--jq`, mermaid output, table output for run results, live progress display, usage metrics breakdown.

### Error handling

| Server code                | CLI behavior                                                                      |
| -------------------------- | --------------------------------------------------------------------------------- |
| 403 `wrong_surface`        | Subject_type mismatch (should be caught client-side). Clear subject_type cache, prompt re-login. Exit 1 |
| 403 app ACL deny           | `error: you do not have access to this app (app_id=<id>).` Exit 1                 |
| 403 `insufficient_scope`   | `error: token lacks scope for this operation (required=apps:run).` Exit 1         |
| 402 `license_required` (dfoe_ surface only) | `error: this deployment's enterprise license does not cover external SSO apps surface.` Exit 1 |
| 404 app not found          | `error: app not found (app_id=<id>).` Exit 1                                      |
| 422 validation             | Print server's validation message; surface required-input names as hints. Exit 1  |
| 401                        | Per `auth.md §No token refresh` — clear creds, exit 4                             |

## App-info cache

Single 1h-TTL store holds the full `{info, parameters, input_schema}` blob keyed by `(host, app_id)`. Slim `?fields=info` calls populate / read the same key — partial blob is upgraded on the next full fetch. Shared by `get app <id>`, `describe app`, and `run app` (no per-command duplicate caches).

Default sort: `updated_at DESC`. Tag-name match (`--tag prod`) hits every tag with that name; `-o json` disambiguates via tag IDs. `get apps -A` caps parallel workspace fan-out at 4 concurrent calls to stay under per-token rate limits. CLI renderer keys on `parameters.user_input_form` (not `input_schema`).
