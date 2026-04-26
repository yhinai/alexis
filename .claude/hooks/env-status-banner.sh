#!/usr/bin/env bash
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
ENV_FILE="$ROOT/.env.local"

mark() {
  local v="$1"
  if [[ -n "$v" ]]; then printf '✓'; else printf '✗'; fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[env] .env.local missing — required keys not set" >&2
  exit 0
fi

set -a; . "$ENV_FILE" 2>/dev/null; set +a

g="${GEMINI_API_KEY:-}"
d="${DAYTONA_API_KEY:-}"
s="${SPATIALREAL_API_KEY:-}"
a="${NEXT_PUBLIC_SPATIALREAL_AVATAR_ID:-}"

printf '[env] GEMINI %s | DAYTONA %s | SPATIALREAL %s | AVATAR_ID %s\n' \
  "$(mark "$g")" "$(mark "$d")" "$(mark "$s")" "$(mark "$a")" >&2

exit 0
