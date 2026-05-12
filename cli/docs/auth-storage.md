# difyctl — token storage backends

How `difyctl` decides where to store the OAuth bearer it acquires from the Dify API service. Two backends, OS-aware probe, deterministic fallback.

> Spec authority for the auth model itself: [`docs/specs/auth.md`]. This file documents the **storage layer** only — what backend is selected, when, and how to override it.

## Backends

| Backend        | Module                       | When selected                            | What's stored                             |
| -------------- | ---------------------------- | ---------------------------------------- | ----------------------------------------- |
| OS keychain    | `@napi-rs/keyring`           | Probe succeeds (default)                 | Bearer + refresh blob, opaque to disk     |
| Encrypted file | `cli/src/auth/file-store.ts` | Probe fails or `DIFY_TOKEN_STORAGE=file` | `0600` JSON at `<config-dir>/tokens.json` |

The file backend is **not** plaintext: token bytes are sealed via a key derived from the OS user's HOME path and a process-stable salt. It exists so that `difyctl` works on minimal Linux containers without a Secret Service / keyctl, and on macOS hosts where Keychain access is administratively blocked.

## Selection algorithm

```
1. read DIFY_TOKEN_STORAGE — values: keychain | file | auto (default)
2. if value == file:        use file backend, exit
3. if value == keychain:    probe; on failure exit 4 (auth_expired) + hint
4. if value == auto/unset:
     a. probe keychain
     b. if probe ok:        use keychain
     c. if probe ENOTSUP:   fall back to file (silent)
     d. if probe ESERVICE:  fall back to file + stderr warning
```

The probe is a no-op write of a sentinel record under the `difyctl` service name, followed by read-back and delete. It runs once per process; the result is cached on the bundle so command bodies do not re-probe.

## Per-OS expectations

| Platform                        | Backend                        | Notes                                                              |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| macOS 12+                       | Keychain via Keychain Services | One entry per `(host, subject_id)` under service `difyctl`         |
| Linux + GNOME / KDE / KeePassXC | Secret Service via `libsecret` | Falls back to file in headless containers                          |
| Linux + keyctl-only kernels     | File                           | `@napi-rs/keyring` does not bind keyctl; no probe attempted        |
| Windows 10/11                   | Credential Manager             | Service: `difyctl/<host>`                                          |
| WSL                             | Same as Linux                  | The probe inherits whatever Secret Service the WSL distro provides |

## Prebuild matrix

`@napi-rs/keyring` ships native binaries for the targets the CLI distribution covers. The CI matrix below mirrors the oclif tarball matrix:

| os/arch           | binary                         | source      |
| ----------------- | ------------------------------ | ----------- |
| `darwin-arm64`    | `keyring.darwin-arm64.node`    | npm package |
| `darwin-x64`      | `keyring.darwin-x64.node`      | npm package |
| `linux-x64-gnu`   | `keyring.linux-x64-gnu.node`   | npm package |
| `linux-arm64-gnu` | `keyring.linux-arm64-gnu.node` | npm package |
| `win32-x64`       | `keyring.win32-x64-msvc.node`  | npm package |

If a platform / arch lacks a prebuild and `@napi-rs/keyring` cannot install at runtime, the file backend takes over without user intervention.

## Manual override

Operators force a backend via env var:

```sh
DIFY_TOKEN_STORAGE=keychain difyctl auth login   # require keychain (fail loud)
DIFY_TOKEN_STORAGE=file     difyctl auth login   # force file backend
```

Use the `file` form on shared CI runners where the Secret Service is unavailable but you still want a per-runner token. Use `keychain` on developer machines to fail fast if the keychain is locked or denied.

## Failure modes

| Symptom                                                       | Cause                                                                                  | Recovery                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `auth login` succeeds but `auth status` says "no credentials" | Keychain wrote, file path probed at read time                                          | Set `DIFY_TOKEN_STORAGE=file` to pin one backend                |
| `keychain probe failed (errno -2)`                            | Linux container without `libsecret`, no fallback because `DIFY_TOKEN_STORAGE=keychain` | Unset the env var or set `=file`                                |
| Multiple `difyctl/<host>` entries in Keychain                 | Hosts changed but old entries not pruned                                               | `auth logout --all-hosts` (post-v1.0); for v1.0, prune manually |
| Tokens disappear on macOS after every reboot                  | Keychain locked or in iCloud-only mode                                                 | Either unlock the login keychain or fall back to file           |

## Source pointers

- Backend selection: `cli/src/auth/storage.ts`
- Keychain wrapper: `cli/src/auth/keychain.ts` (uses `@napi-rs/keyring`)
- File backend: `cli/src/auth/file-store.ts`
- Probe gate: `cli/src/auth/probe.ts`

[`docs/specs/auth.md`]: specs/auth.md
