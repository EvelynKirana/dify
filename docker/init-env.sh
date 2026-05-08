#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_EXAMPLE_FILE=".env.example"
ENV_FILE=".env"

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

generate_secret_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 42
    return
  fi

  if command -v dd >/dev/null 2>&1 && command -v base64 >/dev/null 2>&1; then
    dd if=/dev/urandom bs=42 count=1 2>/dev/null | base64 | tr -d '\n'
    printf '\n'
    return
  fi

  return 1
}

env_value() {
  local key="$1"
  awk -F= -v target="$key" '
    /^[[:space:]]*#/ || !/=/{ next }
    {
      key = $1
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
      if (key == target) {
        value = substr($0, index($0, "=") + 1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
        if ((value ~ /^".*"$/) || (value ~ /^'\''.*'\''$/)) {
          value = substr(value, 2, length(value) - 2)
        }
        result = value
      }
    }
    END { print result }
  ' "$ENV_FILE"
}

set_env_value() {
  local key="$1"
  local value="$2"
  local temp_file

  temp_file="$(mktemp "${TMPDIR:-/tmp}/dify-env.XXXXXX")"
  if awk -F= -v target="$key" -v replacement="$key=$value" '
    BEGIN { replaced = 0 }
    /^[[:space:]]*#/ || !/=/{ print; next }
    {
      key = $1
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
      if (key == target) {
        if (!replaced) {
          print replacement
          replaced = 1
        }
        next
      }
      print
    }
    END {
      if (!replaced) {
        print replacement
      }
    }
  ' "$ENV_FILE" >"$temp_file"; then
    mv "$temp_file" "$ENV_FILE"
  else
    rm -f "$temp_file"
    return 1
  fi
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    log "Using existing $ENV_FILE."
    return
  fi

  [[ -f "$ENV_EXAMPLE_FILE" ]] || die "$ENV_EXAMPLE_FILE is missing."
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  log "Created $ENV_FILE from $ENV_EXAMPLE_FILE."
}

ensure_secret_key() {
  local current_secret_key
  local secret_key

  current_secret_key="$(env_value SECRET_KEY)"
  if [[ -n "$current_secret_key" ]]; then
    log "SECRET_KEY already exists in $ENV_FILE."
    return
  fi

  secret_key="$(generate_secret_key)" || die "Unable to generate SECRET_KEY. Install openssl or set SECRET_KEY in $ENV_FILE."
  set_env_value SECRET_KEY "$secret_key"
  log "Generated SECRET_KEY in $ENV_FILE."
}

ensure_env_file
ensure_secret_key
log "Environment is ready. Run docker compose up -d to start Dify."
