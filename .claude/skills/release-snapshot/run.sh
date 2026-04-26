#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

N="${1:-20}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ working tree is dirty — commit or stash before snapshotting"
  exit 1
fi

DATE_TAG="v$(date +%Y.%m.%d)"
TAG="$DATE_TAG"
i=2
while git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; do
  TAG="${DATE_TAG}-${i}"
  i=$((i+1))
done

PREV=$(git describe --tags --abbrev=0 2>/dev/null || true)
if [[ -n "$PREV" ]]; then
  RANGE="$PREV..HEAD"
  CHANGELOG=$(git log --oneline "$RANGE")
  HEADER="Changes since $PREV:"
else
  CHANGELOG=$(git log --oneline -n "$N")
  HEADER="Last $N commits:"
fi

if [[ -z "$CHANGELOG" ]]; then
  echo "❌ no commits to snapshot"
  exit 1
fi

git tag -a "$TAG" -m "$HEADER

$CHANGELOG"

echo "✅ tagged $TAG"
echo
echo "$HEADER"
echo "$CHANGELOG"
echo

WEBHOOK=$(grep -oE 'https://discord\.com/api/webhooks/[^"]+' "$ROOT/.claude/hooks/git-discord-notify.sh" | head -1)
if [[ -n "$WEBHOOK" ]]; then
  msg=$(printf '📦 release-snapshot **%s**\n```\n%s\n%s\n```' "$TAG" "$HEADER" "$(printf '%s\n' "$CHANGELOG" | head -30)")
  curl -fsS -m 5 -H "Content-Type: application/json" \
    -d "$(jq -nc --arg c "$msg" '{content: $c}')" \
    "$WEBHOOK" >/dev/null 2>&1 && echo "✅ discord pinged" || echo "⚠️  discord ping failed"
fi

echo
echo "Push with: git push origin $TAG"
