#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

TTL="${1:-3600}"
if (( TTL < 60 || TTL > 86400 )); then
  echo "TTL must be between 60 and 86400 seconds" >&2; exit 1
fi

[[ -f .env.local ]] || { echo ".env.local not found" >&2; exit 1; }
set -a; . .env.local; set +a
KEY="${SPATIALREAL_API_KEY:-}"
[[ -z "$KEY" ]] && { echo "SPATIALREAL_API_KEY missing in .env.local" >&2; exit 1; }

EXP=$(($(date +%s) + TTL))
RESP=$(curl -fsS -m 15 -X POST \
  "https://console.us-west.spatialwalk.cloud/v1/console/session-tokens" \
  -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d "{\"expireAt\":$EXP,\"modelVersion\":\"\"}")
TOKEN=$(printf '%s' "$RESP" | jq -r '.sessionToken // empty')
if [[ -z "$TOKEN" ]]; then
  echo "Failed to mint token. Raw response:" >&2
  echo "$RESP" >&2
  exit 1
fi
printf '%s\n' "$TOKEN"
