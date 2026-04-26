#!/usr/bin/env bash
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[[ -z "$file" ]] && exit 0
[[ ! "$file" =~ src/app/api/.*/route\.ts$ ]] && exit 0
[[ ! -f "$file" ]] && exit 0

missing=()
grep -q 'rateLimiter\.check' "$file" || missing+=("rateLimiter.check")
grep -q 'validateSession' "$file" || missing+=("validateSession")
grep -q 'validateRequest' "$file" || missing+=("validateRequest")

if (( ${#missing[@]} > 0 )); then
  echo "⚠️  $file missing: ${missing[*]}" >&2
fi

exit 0
