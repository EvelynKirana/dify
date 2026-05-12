#!/usr/bin/env bash
# scripts/release-cosign-sign.sh — keyless cosign sign of tarballs + checksum
# manifest using GitHub Actions OIDC (Sigstore Fulcio cert + Rekor log entry).
#
# Required env: CLI_VERSION. Workflow must export id-token: write and set
# COSIGN_EXPERIMENTAL=1 (cli-release.yml does both).

set -euo pipefail

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_dir}/lib/common.sh"

require cosign

: "${CLI_VERSION:?CLI_VERSION is required}"

cd "$(cli::root)/dist"

shopt -s nullglob
targets=(difyctl-v"${CLI_VERSION}"-*.tar.xz "difyctl-v${CLI_VERSION}-checksums.txt")
shopt -u nullglob

[[ ${#targets[@]} -gt 0 ]] || die "no files to sign in dist/ for CLI_VERSION=${CLI_VERSION}"

for f in "${targets[@]}"; do
    [[ -f "$f" ]] || continue
    cosign sign-blob --yes \
        --output-signature "${f}.sig" \
        --output-certificate "${f}.pem" \
        "$f"
    log::info "signed ${f} → ${f}.sig + ${f}.pem"
done
