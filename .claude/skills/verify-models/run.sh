#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

[[ -f .env.local ]] || { echo "❌ .env.local not found"; exit 1; }
set -a; . .env.local; set +a

KEY="${GEMINI_API_KEY:-}"
DKEY="${DAYTONA_API_KEY:-}"
DURL="${DAYTONA_API_URL:-https://app.daytona.io/api}"
[[ -z "$KEY" ]] && { echo "❌ GEMINI_API_KEY not set"; exit 1; }

# Extract model names from source
REASONING=$(grep -oE 'gemini-[0-9][^"]*' src/lib/gemini.ts | head -1)
TTS=$(grep -oE "gemini-[^']+-tts[^']*" src/app/api/tts/route.ts | head -1)
LIVE=$(grep -oE 'models/gemini[^"]+' src/lib/interview-live-client.ts | head -1)

echo "Models in source:"
echo "  reasoning: $REASONING"
echo "  tts:       $TTS"
echo "  live:      $LIVE"
echo

fail=0

echo "1/4 reasoning ($REASONING)"
out=$(curl -fsS -m 20 -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/$REASONING:generateContent?key=$KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"OK"}]}]}' 2>&1) \
  && echo "  ✅" || { echo "  ❌ $out"; fail=1; }

echo "2/4 tts ($TTS)"
out=$(curl -fsS -m 20 -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/$TTS:generateContent?key=$KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Kore"}}}}}' 2>&1) \
  && echo "  ✅" || { echo "  ❌ $out"; fail=1; }

echo "3/4 live websocket ($LIVE)"
K="$KEY" M="$LIVE" node --input-type=module -e "
const KEY = process.env.K, MODEL = process.env.M;
const ws = new WebSocket(\`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=\${KEY}\`);
const t = setTimeout(() => { console.log('  ❌ TIMEOUT'); process.exit(2); }, 8000);
ws.addEventListener('open', () => ws.send(JSON.stringify({ setup: { model: MODEL, generationConfig: { responseModalities: ['AUDIO'] } } })));
ws.addEventListener('message', async (e) => {
  const s = typeof e.data === 'string' ? e.data : await new Response(e.data).text();
  if (s.includes('setupComplete')) { console.log('  ✅'); clearTimeout(t); ws.close(); process.exit(0); }
});
ws.addEventListener('close', (e) => { if (e.code !== 1000) { console.log(\`  ❌ \${e.code} \${e.reason.slice(0,160)}\`); process.exit(1); } });
" || fail=1

echo "4/4 daytona ($DURL)"
http=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -H "Authorization: Bearer $DKEY" "$DURL/sandbox")
[[ "$http" == "200" ]] && echo "  ✅" || { echo "  ❌ HTTP $http"; fail=1; }

echo "5/5 spatialreal session"
SR_KEY="${SPATIALREAL_API_KEY:-}"
if [[ -z "$SR_KEY" ]]; then
  echo "  ❌ SPATIALREAL_API_KEY not set"; fail=1
else
  EXP=$(($(date +%s) + 3600))
  http=$(curl -s -o /dev/null -w "%{http_code}" -m 15 -X POST \
    "https://console.us-west.spatialwalk.cloud/v1/console/session-tokens" \
    -H "X-Api-Key: $SR_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"expireAt\":$EXP,\"modelVersion\":\"\"}")
  [[ "$http" == "200" ]] && echo "  ✅" || { echo "  ❌ HTTP $http"; fail=1; }
fi

echo
[[ $fail -eq 0 ]] && echo "All 5 ✅" || { echo "Some checks failed"; exit 1; }
