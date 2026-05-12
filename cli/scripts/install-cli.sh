#!/bin/sh
# install-cli.sh — one-line difyctl installer for Linux and macOS.
#
# usage:
#   curl -fsSL https://raw.githubusercontent.com/langgenius/dify/main/cli/scripts/install-cli.sh | sh
#
# env: DIFYCTL_VERSION (default latest), DIFYCTL_PREFIX (default $HOME/.local),
#      DIFYCTL_REPO (default langgenius/dify).
# requires: curl, tar (xz), uname, jq, sha256sum or shasum.

set -eu

REPO="${DIFYCTL_REPO:-langgenius/dify}"
VERSION="${DIFYCTL_VERSION:-latest}"
PREFIX="${DIFYCTL_PREFIX:-${HOME}/.local}"

err() { printf '%s\n' "install-cli: $*" >&2; }
die() { err "$*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }

need curl
need tar
need uname
need jq

if command -v sha256sum >/dev/null 2>&1; then
    HASH="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
    HASH="shasum -a 256"
else
    die "need sha256sum or shasum"
fi

case "$(uname -s)" in
    Linux*)  os=linux ;;
    Darwin*) os=darwin ;;
    *)       die "unsupported OS: $(uname -s)" ;;
esac

case "$(uname -m)" in
    x86_64|amd64)  arch=x64 ;;
    arm64|aarch64) arch=arm64 ;;
    *)             die "unsupported arch: $(uname -m)" ;;
esac

target="${os}-${arch}"

if [ "$VERSION" = "latest" ]; then
    api="https://api.github.com/repos/${REPO}/releases/latest"
else
    api="https://api.github.com/repos/${REPO}/releases/tags/${VERSION}"
fi

release=$(curl -fsSL "$api") || die "could not fetch release metadata from ${api}"
tag=$(printf '%s' "$release" | jq -r '.tag_name')
[ -n "$tag" ] && [ "$tag" != "null" ] || die "release has no tag_name"

matches=$(printf '%s' "$release" \
    | jq -r --arg t "$target" '.assets[].name | select(test("^difyctl-v[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?-\($t)\\.tar\\.xz$"))')
count=$(printf '%s' "$matches" | grep -c . || true)
case "$count" in
    0) die "no difyctl asset for ${target} on ${tag}" ;;
    1) asset="$matches" ;;
    *) die "expected exactly 1 difyctl asset for ${target} on ${tag}, found ${count}: ${matches}" ;;
esac

no_target="${asset%-${target}.tar.xz}"
cli_v="${no_target#difyctl-}"
checksums="difyctl-${cli_v}-checksums.txt"

printf '%s' "$release" | jq -e --arg c "$checksums" '.assets[] | select(.name == $c)' >/dev/null \
    || die "checksum file ${checksums} missing on ${tag}; refusing to install unverified binary"

url="https://github.com/${REPO}/releases/download/${tag}/${asset}"
sums_url="https://github.com/${REPO}/releases/download/${tag}/${checksums}"

tmp=$(mktemp -d 2>/dev/null || mktemp -d -t difyctl-install)
trap 'rm -rf "$tmp"' EXIT INT TERM

printf 'downloading %s\n  from %s\n' "$asset" "$url"
curl -fsSL --retry 3 "$url"      -o "${tmp}/${asset}"
curl -fsSL --retry 3 "$sums_url" -o "${tmp}/${checksums}"

(
    cd "$tmp"
    grep " ${asset}\$" "$checksums" | $HASH -c -
) || die "checksum mismatch for ${asset}"

if command -v cosign >/dev/null 2>&1; then
    sig_url="${url}.sig"
    pem_url="${url}.pem"
    curl -fsSL --retry 3 "$sig_url" -o "${tmp}/${asset}.sig" \
        || die "tarball signature missing on ${tag}; refusing to install (cosign present)"
    curl -fsSL --retry 3 "$pem_url" -o "${tmp}/${asset}.pem" \
        || die "tarball cert missing on ${tag}; refusing to install (cosign present)"
    COSIGN_EXPERIMENTAL=1 cosign verify-blob \
        --certificate "${tmp}/${asset}.pem" \
        --signature   "${tmp}/${asset}.sig" \
        --certificate-identity-regexp '^https://github.com/langgenius/dify/' \
        --certificate-oidc-issuer     'https://token.actions.githubusercontent.com' \
        "${tmp}/${asset}" \
        || die "cosign verification failed for ${asset}"
    printf 'cosign: verified %s\n' "$asset"
else
    printf 'note: cosign not installed; skipping signature verification (sha256 still enforced)\n' >&2
fi

share_dir="${PREFIX}/share/difyctl"
bin_dir="${PREFIX}/bin"
mkdir -p "$share_dir" "$bin_dir"

printf 'extracting to %s\n' "$share_dir"
tar -xJf "${tmp}/${asset}" -C "$share_dir" --strip-components=1

target_bin="${share_dir}/bin/difyctl"
[ -x "$target_bin" ] || die "expected binary at ${target_bin} after extract"

ln -sf "$target_bin" "${bin_dir}/difyctl"

printf '\ndifyctl %s installed: %s/difyctl\n' "$cli_v" "$bin_dir"

case ":${PATH}:" in
    *":${bin_dir}:"*)
        "${bin_dir}/difyctl" version >/dev/null 2>&1 \
            && printf 'verify: run "difyctl version"\n' \
            || err "binary present but failed to execute; check ${bin_dir}/difyctl"
        ;;
    *)
        printf '\n%s is not on your PATH. Add this to your shell profile:\n' "$bin_dir"
        printf '  export PATH="%s:$PATH"\n' "$bin_dir"
        ;;
esac
