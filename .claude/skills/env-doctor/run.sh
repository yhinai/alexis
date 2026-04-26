#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

ENV_FILE=".env.local"
[[ -f "$ENV_FILE" ]] || { echo "❌ $ENV_FILE not found"; exit 1; }

REQUIRED=(
  GEMINI_API_KEY
  DAYTONA_API_KEY
  DAYTONA_API_URL
  SPATIALREAL_API_KEY
  SPATIALREAL_APP_ID
  NEXT_PUBLIC_SPATIALREAL_APP_ID
  NEXT_PUBLIC_SPATIALREAL_AVATAR_ID
)

env_has() {
  grep -qE "^$1=." "$ENV_FILE"
}

src_uses() {
  grep -rqE "process\.env\.$1\b" src/ 2>/dev/null
}

printf '%-42s %-6s %-12s %-8s\n' "VAR" "SET?" "NEXT_PUBLIC?" "IN_SRC?"
printf '%-42s %-6s %-12s %-8s\n' "---" "----" "------------" "-------"

for v in "${REQUIRED[@]}"; do
  set_mark="✗"; env_has "$v" && set_mark="✓"
  if [[ "$v" == NEXT_PUBLIC_* ]]; then
    pub_mark="—"
  else
    counterpart="NEXT_PUBLIC_$v"
    pub_mark="✗"
    env_has "$counterpart" && pub_mark="✓"
    grep -qE "^${counterpart}\b" <<< "${REQUIRED[*]}" && pub_mark="${pub_mark} (req)"
  fi
  src_mark="✗"; src_uses "$v" && src_mark="✓"
  printf '%-42s %-6s %-12s %-8s\n' "$v" "$set_mark" "$pub_mark" "$src_mark"
done

echo
echo "process.env.* references in src/ NOT declared in $ENV_FILE:"
grep -rhoE "process\.env\.[A-Z][A-Z0-9_]+" src/ 2>/dev/null \
  | sed 's/process\.env\.//' \
  | sort -u \
  | while read -r name; do
      [[ -z "$name" ]] && continue
      if ! env_has "$name"; then
        case "$name" in
          NODE_ENV|NEXT_RUNTIME|VERCEL|VERCEL_ENV|VERCEL_URL) continue ;;
        esac
        echo "  - $name"
      fi
    done
