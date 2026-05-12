---
title: config
---

# config

> Implementation: see [`cli/src/`](../../src/). Build & test: see [`cli/README.md`](../../README.md).

Owns `config.yml`, `difyctl config` commands, env-var registry, `--env` / `X-Dify-Env` plumbing.

Identity (`hosts.yml`) lives in `auth.md §Credential storage`.

## Commands

| Command | Purpose |
|---|---|
| `difyctl config view [--json]` | Print full `config.yml` |
| `difyctl config get <key> [--json]` | Print one value; dotted path |
| `difyctl config set <key> <value>` | Set known key to validated value; atomic write |
| `difyctl config unset <key>` | Remove key → revert to built-in default; idempotent |
| `difyctl config path` | Print absolute path of `config.yml` |
| `difyctl env list [--json]` | Enumerate all env vars |
| `difyctl help environment` | Topic page — narrative over the env registry |

## File layout

```
~/.config/difyctl/
├── hosts.yml     identity + tokens (owned by auth.md)
└── config.yml    preferences + state (this doc)
```

Path resolution (matches `gh`):

1. `DIFY_CONFIG_DIR` env — verbatim override.
2. Per-OS default:

| OS | Default |
|---|---|
| Linux | `$XDG_CONFIG_HOME/difyctl` else `~/.config/difyctl` |
| macOS | `~/.config/difyctl` (not `~/Library/…`) |
| Windows | `%AppData%\difyctl` |

Single resolver lives in `cli/src/config/dir.ts`; `auth.md` reads `hosts.yml` from the same dir. Dir `0700`, files `0600`.

## `config.yml` schema (v1)

```yaml
version: 1
defaults:
  format: table    # table | json | yaml
  limit: 50        # pagination default
state:
  current_app: null  # reserved; not yet written by any command
```

### Field ownership

| Field | Owner | Notes |
|---|---|---|
| `version` | config | Schema migration |
| `defaults.format` | config writes, output layer reads | `table` / `json` / `yaml` |
| `defaults.limit` | config writes, list commands read | Int 1–200 |
| `state.current_app` | reserved; not yet written by any command | |

**No `default_host` / `default_workspace` in config.yml.** Both live in `hosts.yml` (identity state). Workspace switching via `difyctl auth use` — see `workspaces.md`.

### First run

Missing `config.yml` → treat as empty, return built-in defaults. File materializes only on first `config set` / `app use`. Zero-install still works.

## Precedence

Every setting resolves through the same chain. Higher wins.

1. Command-line flag (`--format json`, `--limit 50`, `--host …`)
2. Env var (`DIFY_FORMAT`, `DIFY_LIMIT`, `DIFY_HOST`, …)
3. `config.yml` defaults
4. `hosts.yml` session identity (read-only from this module)
5. Built-in default

**No duplication rule.** Anything in `hosts.yml` (host, workspace, account) invalid in `config.yml`. `config set default_host …` rejected.

**Per-call, not global.** Flags don't mutate files. File writes = explicit `config set` / `unset` / `app use`.

## Command details

### `config view`

```
$ difyctl config view
version: 1
defaults:
  format: table
  limit: 50
state:
  current_app: null
```

`--json` → same structure as JSON. File absent → built-in defaults + stderr note.

### `config get <key>`

```
$ difyctl config get defaults.format
table
```

Dotted path, single scalar. Unknown key → exit 2 `config_invalid_key`. Null/unset → blank line + exit 0 (scripts branch on exit). `--json` → `{"key": "...", "value": ...}`.

### `config set <key> <value>`

Flow: resolve key → validate value → atomic temp-file+rename → one-line confirm. Unknown key → `config_invalid_key`. Invalid value → `config_invalid_value`. Both exit 2.

### `config unset <key>`

Remove key → revert on next resolution. Unknown → exit 2. Not set → exit 0 (idempotent).

### `config path`

Bare absolute path. Honors `DIFY_CONFIG_DIR`. Prints even if file missing. Useful: `$EDITOR "$(difyctl config path)"`.

### Known-keys registry

| Key | Type | Allowed | Default |
|---|---|---|---|
| `defaults.format` | string | `table` \| `json` \| `yaml` | `table` |
| `defaults.limit` | int | 1–200 | `50` |
| `state.current_app` | string | app id (written only by R1) | `null` |

**Limit out-of-range = error, not silent clamp.** `defaults.limit` and `--limit` outside `[1, 200]` → exit 2 with `config_invalid_value` (`config set`) or `usage_invalid_flag` (`--limit` flag). Same rule for `DIFY_LIMIT` env at command resolution. CLI never silently truncates user intent.

Registry compiled into the bundle.

## Env-var registry

Compiled into the bundle. Runtime export via `difyctl env list`; narrative via `difyctl help environment`.

| Variable | Owner | Overrides | Meaning |
|---|---|---|---|
| `DIFY_CONFIG_DIR` | auth | Per-OS default | Config dir override for both files |
| `DIFY_HOST` | auth | `--host` / `hosts.yml.current_host` | Single-invocation host |
| `DIFY_WORKSPACE_ID` | auth | `--workspace` / `hosts.yml.workspace.id` | Single-invocation workspace |
| `DIFY_CREDENTIAL_STORAGE` | auth | Auto-detected backend | `file` forces file-mode |
| `DIFY_TOKEN` | auth | Stored bearer | Env escape hatch (see `auth.md §Env escape hatch`) — undocumented in `--help`. Accepts `dfoa_` / `dfoe_` only |
| `DIFY_FORMAT` | config | `defaults.format` | `table` \| `json` \| `yaml` |
| `DIFY_LIMIT` | config | `defaults.limit` | Pagination default |
| `NO_COLOR` | output | Auto color | Standard — disables all color |
| `CLICOLOR_FORCE` | output | Auto color | Force color in non-TTY |
| `DIFY_NO_PROGRESS` | output | Auto progress | Suppress spinners |
| `DIFY_PLAIN` | output | Display mode | Force plain mode |
| `DIFY_NO_VERSION_CHECK` | version | Version probe | `1` skips version check |

No `DIFY_NO_REFRESH`, `DIFY_ACCESS_TOKEN`, `DIFY_REFRESH_TOKEN`, `DIFY_CSRF_TOKEN` — refresh doesn't exist (bearer auth).

### `difyctl env list`

Human → table matching the registry above. `--json`:

```json
[{"name":"DIFY_HOST","owner":"auth","default":"...","description":"..."}]
```

### `difyctl help environment`

Topic page grouped by owner + narrative, reusing the registry data.

## Validation + schema versioning

### Strict keys

`config set` fails on:

- Unknown key → `config_invalid_key`, exit 2
- Wrong type → `config_invalid_value`, exit 2
- Known key owned by `hosts.yml` (e.g. `default_host`) → `config_invalid_key`

### Strict values

Enums checked. Ints parsed + range-checked. Unrecognized YAML fields (hand-edit path) → ignored with stderr warning:

```
warning: unknown config field 'defaults.color'; ignored
```

### Schema versioning

Every `config.yml` carries `version: <int>` at root.

| Stored | CLI supports | Behavior |
|---|---|---|
| equal | v1 = v1 | Read as-is |
| older | v1 → v2 | Step-by-step migrator on read, write back on next mutation, log `info: migrated config.yml from v1 to v2` once |
| newer | v2 > v1 | Refuse. Exit 6, `config_schema_unsupported`, stderr: `error: config.yml was written by a newer difyctl (version 2); upgrade this CLI or edit the file manually` |

Migrator framework ships as no-op until a v2 schema lands. Silent truncation = worse than a clear error.

## Concurrent writes

No file lock on `config.yml`. Mutations are user-interactive (`config set` / `app use`); the race window is tiny. Accept: two simultaneous `config set` can lose one write; later `config view` makes it obvious.

`hosts.yml` keeps `flock` as cheap insurance for any future write contention; this doesn't apply to `config.yml`.

## Error model

Exit codes follow `auth.md §Error model`. This module adds:

| Code | Exit | Trigger |
|---|---|---|
| `config_invalid_key` | 2 | `config set/get/unset` on unknown key |
| `config_invalid_value` | 2 | `config set` value outside enum/range |
| `config_schema_unsupported` | 6 | `config.yml version` > CLI supports |
