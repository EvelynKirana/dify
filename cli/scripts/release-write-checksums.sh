#!/usr/bin/env bash
# scripts/release-write-checksums.sh — write sha256 manifest for tarballs.
#
# Required env: CLI_VERSION (e.g. 0.1.0-rc.1). Output:
#   cli/dist/difyctl-v<CLI_VERSION>-checksums.txt

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

: "${CLI_VERSION:?CLI_VERSION is required}"

cd "$(cli::root)/dist"

manifest="difyctl-v${CLI_VERSION}-checksums.txt"
> "$manifest"

if command -v sha256sum >/dev/null 2>&1; then
    hash_cmd="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
    hash_cmd="shasum -a 256"
else
    die "no sha256 hasher found (need sha256sum or shasum)"
fi

found=0
for tar in difyctl-v"${CLI_VERSION}"-*.tar.xz; do
    [[ -f "$tar" ]] || continue
    $hash_cmd "$tar" >> "$manifest"
    found=$((found + 1))
done

[[ "$found" -gt 0 ]] || die "no tarballs matching difyctl-v${CLI_VERSION}-*.tar.xz in dist/"

log::info "wrote ${manifest} (${found} entries)"
