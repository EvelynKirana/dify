---
title: workspaces
---

# workspaces

> Implementation: see [`cli/src/`](../../src/). Build & test: see [`cli/README.md`](../../README.md).

Workspace discovery and context management for account users.

```
difyctl get workspace [flags]
difyctl auth use <workspace-id>
```

Companion: `auth.md §Session model`, `server/endpoints.md §OpenAPI — workspaces`.

---

## Workspace model

An account user belongs to N workspaces (tenants). At login, `default_workspace_id` from `/account` becomes the active workspace, stored in `hosts.yml`. dfoa_-surface commands (`get apps`, `get app`, `describe app`, `run app`) scope to the active workspace unless overridden.

**External SSO users (`dfoe_`)** have no workspace concept. The `get workspace`, `auth use`, and `--workspace` flag are all command-level errors on a dfoe_ session (CLI rejects before any network call). Server-side, `/openapi/v1/workspaces*` returns 403 `wrong_surface` for `dfoe_` (the surface gate rejects).

### Resolution chain (account users)

Every resource command resolves workspace through:

| Priority | Source                                                                                 |
| -------- | -------------------------------------------------------------------------------------- |
| 1        | `--workspace <id>` flag                                                                |
| 2        | `DIFY_WORKSPACE_ID` env var                                                            |
| 3        | `current_workspace_id` in `hosts.yml` (set by `auth use`)                              |
| 4        | `default_workspace_id` from last login response                                        |
| 5        | Error: `error: no workspace selected; run 'difyctl auth use <id>' or pass --workspace` |

**Env precedence is explicit.** `DIFY_WORKSPACE_ID` (priority 2) wins over `hosts.yml` (priority 3 + 4) by design — env vars override on-disk state per `config.md §Precedence`. CLI does not validate ID syntax client-side; malformed IDs (e.g., random-string env value) hit the next resource command and surface server's 404 (`workspace not found`) → exit 1.

---

## `difyctl get workspace` — list

```
$ difyctl get workspace
ID           NAME            ROLE
ws-abc123    Acme Corp       owner
ws-def456    Side Project    member
```

**Flags:**

| Flag                  | Purpose       |
| --------------------- | ------------- |
| `-o json\|yaml\|name` | Output format |

`-o name` → workspace IDs one per line.

**Server:** `GET /openapi/v1/workspaces` — bearer auth, `dfoa_` only. `dfoe_` → 403 `wrong_surface` at the surface gate.

**Active workspace** marked with `*` in the `NAME` column when stored current matches a row.

---

## `difyctl auth use <workspace-id>` — switch active workspace

```
$ difyctl auth use ws-def456
Switched to workspace: Side Project (ws-def456)
```

Writes `current_workspace_id` to `hosts.yml`. Subsequent resource commands resolve to this workspace until changed.

**External SSO subjects:** `error: workspace context unavailable for external SSO sessions`. Exit 2.

**Unknown ID:** does not validate against server at write time (avoids extra RTT). Invalid IDs produce 404 on the next resource command.

**Flags:** none. No `--yes` needed — non-destructive state write.

---

## `--workspace` flag

Every dfoa_-surface resource command (`get apps`, `get app`, `describe app`, `run app`, `get workspace`) accepts `--workspace <id>`. Overrides active workspace for that invocation only; does not persist.

External SSO sessions: flag rejected client-side with `error: --workspace is not supported on external SSO sessions; the permitted-external-apps surface has no workspace concept`. Exit 2.

