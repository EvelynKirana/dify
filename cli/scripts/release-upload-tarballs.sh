#!/usr/bin/env bash
# scripts/release-upload-tarballs.sh — idempotent gh release upload of
# tarballs + checksum file (sha256-strict; skip on match, fail on mismatch)
# and cosign .sig/.pem signatures (overwrite-allowed; bytes vary per run).
#
# Required env: DIFY_TAG, CLI_VERSION, GH_TOKEN.

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

require gh
require jq

: "${DIFY_TAG:?DIFY_TAG is required}"
: "${CLI_VERSION:?CLI_VERSION is required}"

cd "$(cli::root)"

REPO_FLAG=(--repo langgenius/dify)

if command -v sha256sum >/dev/null 2>&1; then
    hash_cmd() { sha256sum "$1" | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
    hash_cmd() { shasum -a 256 "$1" | awk '{print $1}'; }
else
    die "no sha256 hasher found (need sha256sum or shasum)"
fi

remote_json=$(gh release view "$DIFY_TAG" "${REPO_FLAG[@]}" --json assets -q '.assets')

upload_one() {
    local file="$1"
    local mode="${2:-strict}"   # strict | clobber
    local name
    name=$(basename "$file")
    local local_sha
    local_sha=$(hash_cmd "$file")
    local remote_entry
    remote_entry=$(printf '%s' "$remote_json" | jq -c --arg n "$name" '.[] | select(.name == $n)')

    if [[ -z "$remote_entry" ]]; then
        log::info "uploading ${name}"
        gh release upload "$DIFY_TAG" "$file" "${REPO_FLAG[@]}"
        return
    fi

    if [[ "$mode" == "clobber" ]]; then
        log::info "overwriting ${name} (clobber mode — cosign sig/cert)"
        gh release upload "$DIFY_TAG" "$file" "${REPO_FLAG[@]}" --clobber
        return
    fi

    local remote_digest remote_sha=""
    remote_digest=$(printf '%s' "$remote_entry" | jq -r '.digest // ""')
    if [[ "$remote_digest" == sha256:* ]]; then
        remote_sha="${remote_digest#sha256:}"
    else
        local tmp download_url
        tmp=$(mktemp)
        download_url=$(printf '%s' "$remote_entry" | jq -r '.url')
        gh api -H 'Accept: application/octet-stream' "$download_url" > "$tmp"
        remote_sha=$(hash_cmd "$tmp")
        rm -f "$tmp"
    fi

    if [[ "$local_sha" == "$remote_sha" ]]; then
        log::info "skip ${name} (sha256 matches)"
        return
    fi

    die "asset ${name} already on ${DIFY_TAG} with different sha256 (local=${local_sha}, remote=${remote_sha}); refusing to overwrite"
}

shopt -s nullglob
tars=(dist/difyctl-v"${CLI_VERSION}"-*.tar.xz)
checksum_file="dist/difyctl-v${CLI_VERSION}-checksums.txt"
sigs=(dist/difyctl-v"${CLI_VERSION}"-*.sig dist/difyctl-v"${CLI_VERSION}"-checksums.txt.sig)
pems=(dist/difyctl-v"${CLI_VERSION}"-*.pem dist/difyctl-v"${CLI_VERSION}"-checksums.txt.pem)
shopt -u nullglob

[[ ${#tars[@]} -gt 0 ]] || die "no tarballs in dist/ matching difyctl-v${CLI_VERSION}-*.tar.xz"
[[ -f "$checksum_file" ]] || die "checksum file missing: ${checksum_file}"

for f in "${tars[@]}" "$checksum_file"; do
    upload_one "$f" strict
done

# Cosign signatures + certs are keyless and re-generated per run with fresh
# timestamps; their bytes change each run but verify the same blob. Allow
# overwrite via --clobber so re-runs converge cleanly.
for f in "${sigs[@]}" "${pems[@]}"; do
    [[ -f "$f" ]] || continue
    upload_one "$f" clobber
done

log::info "uploaded ${#tars[@]} tarballs + checksums.txt + signatures to dify release ${DIFY_TAG}"
