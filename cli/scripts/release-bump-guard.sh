#!/usr/bin/env bash
# scripts/release-bump-guard.sh — auto-path only. Refuse if version+compat
# both unchanged vs. the channel-matching npm dist-tag.
#
# Required env: NEW_VERSION, NEW_MIN_DIFY, NEW_MAX_DIFY.

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

require node
require jq
require npm

cd "$(cli::root)"

: "${NEW_VERSION:?NEW_VERSION is required}"
: "${NEW_MIN_DIFY:?NEW_MIN_DIFY is required}"
: "${NEW_MAX_DIFY:?NEW_MAX_DIFY is required}"

channel=$(node -p "require('./package.json').difyctl.channel")
case "$channel" in
    stable) dist_tag=latest ;;
    rc)     dist_tag=next ;;
    *)      die "unsupported channel for publish: ${channel}" ;;
esac

dist_tags_json=$(npm view @langgenius/difyctl dist-tags --json 2>/dev/null || echo '{}')
prev_version=$(echo "$dist_tags_json" | jq -r --arg t "$dist_tag" '.[$t] // ""')

if [[ -z "$prev_version" ]]; then
    log::info "no prior release on dist-tag '${dist_tag}'; skipping bump guard"
    exit 0
fi

if [[ "$prev_version" == "$NEW_VERSION" ]]; then
    echo "::warning title=cli version not bumped::package.json version ${NEW_VERSION} is already published on dist-tag '${dist_tag}'. If this is a deliberate re-run (dify release re-cut, retry after failure), ignore. If you intended to ship new cli bytes, bump cli/package.json#version and re-run."
    log::info "same version as npm dist-tag '${dist_tag}' (${prev_version}); skipping bump guard"
    exit 0
fi

prev_meta=$(npm view "@langgenius/difyctl@${prev_version}" --json)
prev_min=$(echo "$prev_meta" | jq -r '.difyctl.compat.minDify')
prev_max=$(echo "$prev_meta" | jq -r '.difyctl.compat.maxDify')

[[ "$NEW_VERSION" != "$prev_version" ]] \
    || die "version unchanged from npm dist-tag '${dist_tag}' (${prev_version}); bump cli/package.json"

[[ "$NEW_MIN_DIFY" != "$prev_min" || "$NEW_MAX_DIFY" != "$prev_max" ]] \
    || die "compat unchanged from npm @${prev_version} on dist-tag '${dist_tag}' (${prev_min}..${prev_max}); bump in cli/package.json"

log::info "bump guard passed: ${prev_version} → ${NEW_VERSION}, compat ${prev_min}..${prev_max} → ${NEW_MIN_DIFY}..${NEW_MAX_DIFY}"
