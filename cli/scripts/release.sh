#!/usr/bin/env bash
# scripts/release.sh — local-developer release build.
#
# Reads cli/package.json, validates, exports DIFYCTL_* env, runs pnpm build +
# oclif pack tarballs. cli-release.yml does NOT call this; the workflow inlines
# the same env contract.

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

require pnpm 'install with `corepack enable && corepack prepare pnpm@latest --activate`'
require node

cd "$(cli::root)"

scripts/release-validate-manifest.sh

PKG_VERSION=$(node -p "require('./package.json').version")
CHANNEL=$(node -p "require('./package.json').difyctl.channel")
MIN_DIFY=$(node -p "require('./package.json').difyctl.compat.minDify")
MAX_DIFY=$(node -p "require('./package.json').difyctl.compat.maxDify")

export DIFYCTL_VERSION="${PKG_VERSION}"
export DIFYCTL_CHANNEL="${CHANNEL}"
export DIFYCTL_MIN_DIFY="${MIN_DIFY}"
export DIFYCTL_MAX_DIFY="${MAX_DIFY}"
export DIFYCTL_COMMIT="$(git rev-parse HEAD)"
export DIFYCTL_BUILD_DATE="$(git log -1 --format=%cI HEAD)"

log::info "release ${DIFYCTL_VERSION} (channel=${DIFYCTL_CHANNEL}, compat=${MIN_DIFY}..${MAX_DIFY})"
pnpm build
pnpm pack:tarballs

log::info "artifacts in dist/"
ls -lh dist/ 2>/dev/null | tail -n +2 >&2 || true
