---
title: guide
---

# guide

> Implementation: see [`cli/src/`](../../src/). Build & test: see [`cli/README.md`](../../README.md).

Agent onboarding quickstart. Three subcommands under the `help` topic — one per bearer token type plus `help environment`:

```
difyctl help account
difyctl help external
difyctl help environment
```

Root `difyctl --help` directs agents here:

```
For AI agents: run 'difyctl help account' (dfoa_ token) or
'difyctl help external' (dfoe_ token).
```

---

## `difyctl help account`

For `dfoa_` (OAuth account) bearers. Workspace-scoped access: discovery, workspace management, invocation.

Output (stdout, static text):

```
difyctl Agent Guide — Account Token (dfoa_)

Surface: /openapi/v1/apps* (workspace-scoped).

Discovery:
  difyctl get apps                     # list apps in current workspace
  difyctl get apps --mode chat         # filter by mode
  difyctl get apps --name "keyword"    # filter by name
  difyctl get apps --tag "prod"        # filter by tag
  difyctl get apps -A                  # fan out across all member workspaces
  difyctl get app <id>                 # single app slim metadata
  difyctl describe app <id>            # parameters + input schema

Workspace:
  difyctl get workspace                # list your workspaces
  difyctl auth use <workspace-id>      # switch active workspace

Invocation:
  difyctl run app <id> "message"       # chat or completion
  difyctl run app <id> --input k=v     # workflow inputs (repeatable)
  difyctl run app <id> -o json         # structured output

Cross-surface:
  'permitted-external-apps' commands are for external SSO sessions only.
  Running them on a dfoa_ session errors with exit 2.

Error handling:
  All errors emit JSON to stderr when -o json is active.
  Branch on the 'code' field. Exit codes:
    0 = success
    1 = server or network error
    2 = usage / bad input
    4 = auth error (re-run 'difyctl auth login')
```

---

## `difyctl help external`

For `dfoe_` (External SSO) bearers. EE-only. No workspace concept. Surface: `/openapi/v1/permitted-external-apps*`.

Output (stdout, static text):

```
difyctl Agent Guide — External SSO Token (dfoe_)

Surface: /openapi/v1/permitted-external-apps* (no workspace).
Scopes: apps:run + apps:read:permitted-external.
Visibility: apps where access_mode is 'public' or 'sso_verified'.

Discovery:
  difyctl get permitted-external-apps                 # list permitted apps
  difyctl get permitted-external-apps --mode chat     # filter by mode
  difyctl get permitted-external-apps --name "kw"     # filter by name
  difyctl get permitted-external-app <id>             # single permitted-external-app metadata
  difyctl describe permitted-external-app <id>        # parameters + input schema

Invocation:
  difyctl run permitted-external-app <id> "message"   # chat or completion
  difyctl run permitted-external-app <id> --input k=v # workflow inputs
  difyctl run permitted-external-app <id> -o json     # structured output

Cross-surface:
  'apps' and workspace commands are for account sessions only.
  Running them on a dfoe_ session errors with exit 2.

Error handling:
  All errors emit JSON to stderr when -o json is active.
  Branch on the 'code' field. Exit codes:
    0 = success
    1 = server or network error
    2 = usage / bad input
    4 = auth error (re-run 'difyctl auth login')
```

---

No auth gate — onboarding runs even when not logged in. Text is static, not generated from server state.
