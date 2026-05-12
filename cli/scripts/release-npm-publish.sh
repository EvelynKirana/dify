#!/usr/bin/env bash
# scripts/release-npm-publish.sh — channel-aware npm publish with
# EPUBLISHCONFLICT no-op trap.
#
# Required env: CHANNEL (stable | rc), NEW_VERSION.

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

require npm
require node

cd "$(cli::root)"

: "${CHANNEL:?CHANNEL is required}"
: "${NEW_VERSION:?NEW_VERSION is required}"

case "$CHANNEL" in
    stable) dist_tag=latest ;;
    rc)     dist_tag=next ;;
    *)      die "unsupported channel for publish: ${CHANNEL}" ;;
esac

pkg_version=$(node -p "require('./package.json').version")
[[ "$pkg_version" == "$NEW_VERSION" ]] \
    || die "package.json version (${pkg_version}) != NEW_VERSION (${NEW_VERSION})"

set +e
output=$(npm publish --access public --provenance --tag "$dist_tag" 2>&1)
status=$?
set -e

if [[ $status -eq 0 ]]; then
    log::info "PUBLISHED @langgenius/difyctl@${NEW_VERSION} --tag ${dist_tag}"
    printf '%s\n' "$output"
    exit 0
fi

if printf '%s' "$output" | grep -qE 'EPUBLISHCONFLICT|cannot publish over the previously published versions'; then
    log::warn "NO-OP: @langgenius/difyctl@${NEW_VERSION} already on registry (idempotent re-run)"
    exit 0
fi

printf '%s\n' "$output" >&2
die "npm publish failed (exit ${status}); see output above"
