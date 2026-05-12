# difyctl — build

How to build, package, and ship `difyctl` from the dify monorepo.

> Spec authority for distribution: [`docs/specs/README.md`]. This file documents the **mechanics** — commands, define knobs, tarball production.

## Toolchain

| Tool             | Version     | Source                                       |
| ---------------- | ----------- | -------------------------------------------- |
| Node             | `^22.22.1`  | `package.json#engines`                       |
| pnpm             | `10.33.0`   | `package.json#packageManager`                |
| TypeScript       | catalog pin | `pnpm catalog`                               |
| vite-plus (`vp`) | catalog pin | `pnpm catalog` — wraps Vite for tests + pack |
| oclif            | catalog pin | command discovery, manifest, tarball builder |

Versions above are what the build pipeline targets. Install Node + pnpm via whatever method works for your environment.

## Quick start

```sh
# inside dify/ monorepo root
pnpm install
pnpm --filter @langgenius/difyctl build
```

This produces:

- `cli/dist/` — TypeScript output (commands, source map, .d.ts)
- `cli/oclif.manifest.json` — oclif command index (used at runtime to skip filesystem scan)

## Scripts

| Script                                            | What it does                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm --filter @langgenius/difyctl build`         | `vp pack && oclif manifest` — production bundle + manifest refresh  |
| `pnpm --filter @langgenius/difyctl dev`           | `tsx bin/dev.js` — runs CLI from TS source, no build step           |
| `pnpm --filter @langgenius/difyctl test`          | `vp test` — vitest suite (40+ files, ~400+ behavior tests)          |
| `pnpm --filter @langgenius/difyctl lint`          | eslint — antfu config + perfectionist sort + unicorn rules          |
| `pnpm --filter @langgenius/difyctl type-check`    | `tsc` — strict mode, `noUncheckedIndexedAccess`                     |
| `pnpm --filter @langgenius/difyctl manifest`      | `oclif manifest` — refresh `oclif.manifest.json` only               |
| `pnpm --filter @langgenius/difyctl readme`        | `oclif readme` — regenerate command reference in `cli/README.md`    |
| `pnpm --filter @langgenius/difyctl pack:tarballs` | `oclif pack tarballs --xz --parallel` — multi-target tarball matrix |

## Build-time defines (vite-plus)

`vite.config.ts` injects a small set of constants at pack time. These replace what the Go port did via `-ldflags -X`:

| Define                   | Source                                                                        | Read from                 |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------- |
| `__DIFYCTL_VERSION__`    | `DIFYCTL_VERSION` env var (else `package.json#version`)                       | `cli/src/version/info.ts` |
| `__DIFYCTL_COMMIT__`     | `DIFYCTL_COMMIT` env var (else `git rev-parse HEAD`)                          | `cli/src/version/info.ts` |
| `__DIFYCTL_BUILD_DATE__` | `DIFYCTL_BUILD_DATE` env var (else `new Date().toISOString()`)                | `cli/src/version/info.ts` |
| `__DIFYCTL_CHANNEL__`    | `DIFYCTL_CHANNEL` env var (default `stable`; values: `stable`, `beta`, `dev`) | `cli/src/version/info.ts` |

In dev (`bin/dev.js`), `globalThis.__DIFYCTL_*__` are set from the same env vars at startup, so `difyctl version` reflects the local checkout without a rebuild.

## Tarball production

```sh
# default — every supported (os, arch) target
pnpm --filter @langgenius/difyctl pack:tarballs

# subset — single target
pnpm --filter @langgenius/difyctl exec \
  oclif pack tarballs --xz --targets=darwin-arm64
```

Outputs land in `cli/dist/`. Each tarball bundles the Node binary for that target (oclif fetches from `nodejs.org`), the compiled JS, and the prebuild for `@napi-rs/keyring` matching that target.

Supported targets (matches `auth-storage.md` matrix):

- `darwin-arm64`
- `darwin-x64`
- `linux-x64-gnu`
- `linux-arm64-gnu`
- `win32-x64`

## Container image

```sh
docker build \
  --build-arg VERSION=$(node -p "require('./cli/package.json').version") \
  -f cli/Dockerfile \
  -t ghcr.io/langgenius/difyctl:dev cli/
```

The Dockerfile uses `node:22-alpine` and `npm install -g @langgenius/difyctl@${VERSION}` so the CI release pipeline does not need to ship multi-arch tarballs separately for container users — it just publishes to npm and rebuilds the image.

## Release flow

The dify release workflow ships a `release-cli` job that fans out from the dify version tag:

1. `pnpm --filter @langgenius/difyctl build`
1. `oclif manifest` (already part of build)
1. `oclif pack tarballs --xz --parallel`
1. `pnpm publish --access public --tag latest` (requires `NPM_TOKEN`)
1. `softprops/action-gh-release` attaches tarballs + install scripts to the GitHub release
1. `docker buildx build --push` for the container image

CLI version equals dify version; parity enforced at tag time.

## Local install for smoke testing

```sh
# from a fresh clone — verify the build works end to end
pnpm install
pnpm --filter @langgenius/difyctl build
pnpm --filter @langgenius/difyctl exec oclif pack tarballs --targets=$(uname -s | tr 'A-Z' 'a-z')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
ls cli/dist/*.tar.xz
```

The resulting tarball is a self-contained Node + difyctl bundle — extract anywhere, point `$PATH` at `bin/`, and `difyctl --version` works without the host having Node installed.

[`docs/specs/README.md`]: specs/README.md
