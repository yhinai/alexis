#!/usr/bin/env bash
# Reads DISCORD_WEBHOOK_URL from env or .env.local. No-op if unset, so the
# script is safe to commit; the secret stays in the developer's local env.
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [[ -z "${DISCORD_WEBHOOK_URL:-}" && -f "$ROOT/.env.local" ]]; then
  set -a; . "$ROOT/.env.local"; set +a
fi
WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
[[ -z "$WEBHOOK" ]] && exit 0

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[[ -z "$cmd" ]] && exit 0

if ! printf '%s' "$cmd" | grep -qE 'git[[:space:]]+(commit|push)'; then
  exit 0
fi

exit_code=$(printf '%s' "$input" | jq -r '.tool_response.exit_code // empty')
status="✅"
[[ -n "$exit_code" && "$exit_code" != "0" ]] && status="❌"

op="commit"
printf '%s' "$cmd" | grep -q 'git[[:space:]]\+push' && op="push"

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
repo=$(basename "$repo_root")
branch=$(git -C "$repo_root" branch --show-current 2>/dev/null || echo "?")
sha=$(git -C "$repo_root" log -1 --format='%h %s' 2>/dev/null || echo "")

msg=$(printf '%s `git %s` on `%s:%s`\n```\n%s\n```' "$status" "$op" "$repo" "$branch" "${sha:0:200}")

curl -fsS -m 5 -H "Content-Type: application/json" \
  -d "$(jq -nc --arg c "$msg" '{content: $c}')" \
  "$WEBHOOK" >/dev/null 2>&1 || true

exit 0
