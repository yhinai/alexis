---
name: verify-models
description: Smoke-test all external services this project depends on — Gemini reasoning, Gemini TTS, Gemini Live WebSocket, and Daytona API. Use when models seem broken, after key rotations, or before a demo.
disable-model-invocation: true
---

# verify-models

Reads `GEMINI_API_KEY` and `DAYTONA_API_KEY` from `.env.local`, then pings each
endpoint with the exact model name found in the source.

## What gets checked

| # | Service | Model location | Check |
|---|---------|----------------|-------|
| 1 | Reasoning | `src/lib/gemini.ts` (`MODEL_NAME`) | `:generateContent` returns text |
| 2 | TTS | `src/app/api/tts/route.ts` | `:generateContent` returns inlineData audio |
| 3 | Live voice | `src/lib/interview-live-client.ts` (`MODEL`) | WebSocket `setupComplete` |
| 4 | Daytona | `DAYTONA_API_URL` | `GET /sandbox` returns 200 |

## How to run

```bash
bash .claude/skills/verify-models/run.sh
```

The script extracts model names from source so it stays in sync as they change.
A failure on any line tells you exactly which service to fix.

## Common failure modes

- **Reasoning 404** → model deprecated. List models with `curl ".../v1beta/models?key=$KEY"` and pick a current one.
- **Live WebSocket close 1008 with "not found"** → wrong model name for `bidiGenerateContent` (model exists for REST but not Live).
- **Live WebSocket close 1008 with "policy"** → key lacks Live API access (needs billing on the GCP project).
- **Daytona non-200** → check `DAYTONA_API_URL` (note the `/api` suffix on `https://app.daytona.io/api`).
