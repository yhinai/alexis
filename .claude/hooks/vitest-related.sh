#!/usr/bin/env bash
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[[ -z "$file" ]] && exit 0
[[ ! "$file" =~ ^.*src/.*\.(ts|tsx)$ ]] && exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

if ! find src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) 2>/dev/null | grep -q .; then
  exit 0
fi

timeout 30 npx --no-install vitest related --run "$file" --reporter=basic 2>&1 | tail -10 || true
exit 0
