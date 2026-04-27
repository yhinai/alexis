---
name: demo-checklist
description: Pre-demo runbook for the SpatialReal Voice & Vision pitch. Hits the production URL, calls every verify-* skill, and prints a single pass/fail summary so any silent regression surfaces before judges see it.
disable-model-invocation: true
---

# demo-checklist

End-to-end "is everything wired" check before a live demo. Combines the existing `verify-models` and `verify-avatar` scripts, adds production URL pings, surfaces voice-tool wiring, and prints one summary line per stage.

## What it checks

1. **Local dev server** — `/api/auth/session`, `/api/gemini/session`, `/api/spatialreal/session` all return 200
2. **Production health** — `https://alexis-code.vercel.app/` and `/interview` return 200
3. **`verify-models`** — Gemini reasoning, TTS, Live WS, Daytona, SpatialReal session
4. **`verify-avatar`** — session mint, WASM URL, avatar manifest reachable
5. **Tool wiring** — every tool declared in `gemini-tools.ts` has a handler in `agent-tools.ts` AND a mention in `interviewer-prompt.ts`
6. **Vision sample rate** — confirms `OUTPUT_SAMPLE_RATE` in `interview-live-client.ts` is 24000 (matches AvatarSDK init)
7. **WASM filename drift** — file in `public/spatialreal/` matches the constant in `SpatialRealAvatar.tsx`

## Run

```bash
bash .claude/skills/demo-checklist/run.sh
```

Requires the dev server running. Each line prints a one-character status (✅ / ❌ / ⏭) followed by the check name. A non-zero exit = at least one ❌; fix before the demo.
