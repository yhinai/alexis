#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

[[ -f .env.local ]] || { echo "❌ .env.local not found"; exit 1; }
set -a; . .env.local; set +a

KEY="${SPATIALREAL_API_KEY:-}"
APP="${SPATIALREAL_APP_ID:-${NEXT_PUBLIC_SPATIALREAL_APP_ID:-}}"
AVATAR="${NEXT_PUBLIC_SPATIALREAL_AVATAR_ID:-}"
[[ -z "$KEY" ]] && { echo "❌ SPATIALREAL_API_KEY missing"; exit 1; }
[[ -z "$AVATAR" ]] && { echo "❌ NEXT_PUBLIC_SPATIALREAL_AVATAR_ID missing"; exit 1; }

fail=0

echo "1/3 session mint"
EXP=$(($(date +%s) + 3600))
TOKEN=$(curl -fsS -m 15 -X POST \
  "https://console.us-west.spatialwalk.cloud/v1/console/session-tokens" \
  -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d "{\"expireAt\":$EXP,\"modelVersion\":\"\"}" | jq -r '.sessionToken // empty')
if [[ -n "$TOKEN" ]]; then echo "  ✅ token len=${#TOKEN}"; else echo "  ❌ no token"; fail=1; fi

echo "2/3 wasm public url"
WASM_PKG="node_modules/@spatialwalk/avatarkit/dist/avatar_core_wasm-bd762669.wasm"
WASM_PUB="public/spatialreal/avatar_core_wasm-bd762669.wasm"
if [[ ! -f "$WASM_PKG" ]]; then
  echo "  ⚠️  filename in npm package differs — check SpatialRealAvatar.tsx WASM_FILENAME"; fail=1
elif [[ ! -f "$WASM_PUB" ]]; then
  echo "  ❌ public copy missing — run /update-avatar-wasm"; fail=1
elif [[ "$(wc -c < "$WASM_PKG")" != "$(wc -c < "$WASM_PUB")" ]]; then
  echo "  ❌ public copy out of date — run /update-avatar-wasm"; fail=1
else
  http=$(curl -s -o /dev/null -w "%{http_code}|%{content_type}|%{size_download}" -m 5 \
    "http://localhost:3000/spatialreal/avatar_core_wasm-bd762669.wasm" 2>/dev/null || echo "")
  case "$http" in
    200\|application/wasm\|*) echo "  ✅ served $http" ;;
    *) echo "  ⚠️  dev server may not be running ($http)" ;;
  esac
fi

echo "3/3 avatar manifest"
if [[ -n "$TOKEN" ]]; then
  http=$(curl -s -o /dev/null -w "%{http_code}" -m 10 \
    -H "Authorization: Bearer $TOKEN" \
    "https://console.us-west.spatialwalk.cloud/v1/avatars/$AVATAR")
  if [[ "$http" == "200" || "$http" == "404" ]]; then
    [[ "$http" == "200" ]] && echo "  ✅ avatar reachable" || echo "  ⚠️  avatar 404 — check NEXT_PUBLIC_SPATIALREAL_AVATAR_ID"
  else
    echo "  ❌ HTTP $http"; fail=1
  fi
else
  echo "  ⏭  skipped (no token)"
fi

echo
[[ $fail -eq 0 ]] && echo "Avatar pipeline ✅" || { echo "Some checks failed"; exit 1; }
