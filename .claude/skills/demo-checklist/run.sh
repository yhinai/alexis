#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
fail=0
mark() { case "$1" in ok) printf '  ✅ %s\n' "$2" ;; bad) printf '  ❌ %s\n' "$2"; fail=1 ;; skip) printf '  ⏭  %s\n' "$2" ;; esac; }

DEV_URL="${DEV_URL:-http://localhost:3000}"
PROD_URL="${PROD_URL:-https://alexis-code.vercel.app}"

echo "1/7 local dev server"
http=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$DEV_URL/" 2>/dev/null || echo 000)
case "$http" in 200) mark ok "GET /";; *) mark bad "GET / -> $http (start dev: npm run dev)";; esac

if [[ "$http" == "200" ]]; then
  for ep in /api/auth/session /api/spatialreal/session; do
    if [[ "$ep" == "/api/auth/session" ]]; then
      h=$(curl -s -o /dev/null -w "%{http_code}" -X POST -m 5 "$DEV_URL$ep" 2>/dev/null || echo 000)
    else
      tok=$(curl -s -X POST -m 5 "$DEV_URL/api/auth/session" | jq -r '.data.token // empty' 2>/dev/null)
      h=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -H "x-session-token: $tok" "$DEV_URL$ep" 2>/dev/null || echo 000)
    fi
    [[ "$h" == "200" ]] && mark ok "$ep -> 200" || mark bad "$ep -> $h"
  done
else
  mark skip "session endpoints (dev server down)"
fi

echo
echo "2/7 production health"
for path in / /interview; do
  h=$(curl -s -o /dev/null -w "%{http_code}" -m 8 "$PROD_URL$path" 2>/dev/null || echo 000)
  [[ "$h" == "200" ]] && mark ok "prod $path -> 200" || mark bad "prod $path -> $h"
done

echo
echo "3/7 verify-models"
if [[ -x .claude/skills/verify-models/run.sh ]]; then
  out=$(bash .claude/skills/verify-models/run.sh 2>&1 | tail -1)
  echo "$out" | grep -q '✅' && mark ok "$out" || mark bad "$out"
else
  mark skip "verify-models script missing"
fi

echo
echo "4/7 verify-avatar"
if [[ -x .claude/skills/verify-avatar/run.sh ]]; then
  out=$(bash .claude/skills/verify-avatar/run.sh 2>&1 | tail -1)
  echo "$out" | grep -q '✅' && mark ok "$out" || mark bad "$out"
else
  mark skip "verify-avatar script missing"
fi

echo
echo "5/7 tool wiring"
declared=$(grep -oE 'name:[[:space:]]*["'\'']([a-z_]+)' src/lib/gemini-tools.ts | sed 's/.*["'\'']//' | sort -u)
[[ -z "$declared" ]] && { mark skip "no tools found in gemini-tools.ts"; declared=""; }
for t in $declared; do
  has_handler=$(grep -cE "${t}:[[:space:]]*wrapTool|${t}:[[:space:]]*async" src/lib/agent-tools.ts || true)
  has_prompt=$(grep -cE "${t}|\`${t}\`" src/lib/interviewer-prompt.ts || true)
  if (( has_handler == 0 )); then mark bad "tool $t missing handler in agent-tools.ts"
  elif (( has_prompt == 0 )); then mark bad "tool $t never mentioned in interviewer-prompt.ts"
  else mark ok "$t (handler + prompt)"
  fi
done

echo
echo "6/7 sample-rate match (Gemini 24kHz <-> AvatarSDK)"
gemini_sr=$(grep -oE 'OUTPUT_SAMPLE_RATE\s*=\s*[0-9]+' src/lib/interview-live-client.ts | grep -oE '[0-9]+')
avatar_sr=$(grep -oE 'sampleRate:\s*[0-9]+' src/components/agent/SpatialRealAvatar.tsx | grep -oE '[0-9]+')
if [[ "$gemini_sr" == "$avatar_sr" && "$gemini_sr" == "24000" ]]; then
  mark ok "both at 24000 Hz"
else
  mark bad "drift: gemini=$gemini_sr avatar=$avatar_sr (must be 24000)"
fi

echo
echo "7/7 WASM filename drift"
pkg_wasm=$(find node_modules/@spatialwalk/avatarkit/dist -maxdepth 1 -name '*.wasm' 2>/dev/null | head -1 | xargs -n1 basename 2>/dev/null)
src_wasm=$(grep -oE 'avatar_core_wasm-[A-Za-z0-9_-]+\.wasm' src/components/agent/SpatialRealAvatar.tsx | head -1)
pub_wasm=$(find public/spatialreal -maxdepth 1 -name '*.wasm' 2>/dev/null | head -1 | xargs -n1 basename 2>/dev/null)
if [[ -n "$pkg_wasm" && "$pkg_wasm" == "$src_wasm" && "$pkg_wasm" == "$pub_wasm" ]]; then
  mark ok "package = src = public ($pkg_wasm)"
else
  mark bad "drift: pkg=$pkg_wasm src=$src_wasm public=$pub_wasm (run /update-avatar-wasm)"
fi

echo
[[ $fail -eq 0 ]] && echo "🎬  DEMO READY" || { echo "❌  Fix the failures above before going live."; exit 1; }
