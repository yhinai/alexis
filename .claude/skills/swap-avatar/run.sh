#!/usr/bin/env bash
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

NEW="${1:-}"
[[ -z "$NEW" ]] && { echo "Usage: $0 <avatar-id>"; exit 1; }
[[ "$NEW" =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]] \
  || { echo "❌ '$NEW' doesn't look like a UUID"; exit 1; }

ENV=".env.local"
[[ -f "$ENV" ]] || touch "$ENV"

if grep -q '^NEXT_PUBLIC_SPATIALREAL_AVATAR_ID=' "$ENV"; then
  node - "$ENV" "$NEW" <<'NODE'
const fs = require('fs');
const [, , file, val] = process.argv;
const s = fs.readFileSync(file, 'utf8')
  .replace(/^NEXT_PUBLIC_SPATIALREAL_AVATAR_ID=.*$/m, `NEXT_PUBLIC_SPATIALREAL_AVATAR_ID=${val}`);
fs.writeFileSync(file, s);
NODE
else
  printf '\nNEXT_PUBLIC_SPATIALREAL_AVATAR_ID=%s\n' "$NEW" >> "$ENV"
fi
echo "✅ .env.local set NEXT_PUBLIC_SPATIALREAL_AVATAR_ID=$NEW"

set -a; . "$ENV"; set +a
KEY="${SPATIALREAL_API_KEY:-}"
[[ -z "$KEY" ]] && { echo "⚠️  SPATIALREAL_API_KEY missing — skipping reachability check"; exit 0; }

EXP=$(($(date +%s) + 600))
TOKEN=$(curl -fsS -m 15 -X POST \
  "https://console.us-west.spatialwalk.cloud/v1/console/session-tokens" \
  -H "X-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d "{\"expireAt\":$EXP,\"modelVersion\":\"\"}" | jq -r '.sessionToken // empty')

if [[ -n "$TOKEN" ]]; then
  http=$(curl -s -o /dev/null -w "%{http_code}" -m 10 \
    -H "Authorization: Bearer $TOKEN" \
    "https://console.us-west.spatialwalk.cloud/v1/avatars/$NEW")
  case "$http" in
    200) echo "✅ avatar reachable" ;;
    404) echo "❌ avatar $NEW not found for this app — pick another" ;;
    *)   echo "⚠️  unexpected HTTP $http" ;;
  esac
fi

echo
echo "Restart 'npm run dev' for the bundle to pick up the new ID."
