#!/usr/bin/env bash
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
content=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')

[[ -z "$content" ]] && exit 0

patterns=(
  'AIzaSy[A-Za-z0-9_-]{30,}'
  'dtn_[a-f0-9]{30,}'
  'sk-[A-Za-z0-9_=-]{30,}'
  'ghp_[A-Za-z0-9]{30,}'
  'discord\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+'
)

for p in "${patterns[@]}"; do
  if printf '%s' "$content" | grep -qE "$p"; then
    echo "Refusing edit: secret-like pattern matched ($p) in $file" >&2
    exit 2
  fi
done

exit 0
