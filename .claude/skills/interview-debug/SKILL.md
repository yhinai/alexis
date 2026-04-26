---
name: interview-debug
description: Diagnose why the voice interview isn't connecting. Use when the user reports "WebSocket Error", "API Key missing", or 401 errors from the InterviewAgent or SystemDesignAgent.
---

# interview-debug

Standard playbook for the auth → key → WebSocket chain. Walk it in order — each
step's failure mode points at exactly one fix.

## Step 1 — Is the dev server running with the latest env?

```bash
curl -s http://localhost:3000/api/auth/session -X POST | jq .
```

Expected: `{ "data": { "token": "..." } }`. Anything else → restart dev server
so it picks up `.env.local` changes.

## Step 2 — Does the session endpoint accept the token?

```bash
TOK=$(curl -s -X POST http://localhost:3000/api/auth/session | jq -r .data.token)
curl -s http://localhost:3000/api/gemini/session -H "x-session-token: $TOK" | jq '.data.apiKey | .[0:10]'
```

Expected: first 10 chars of the Gemini key. 401 → session race; the InterviewAgent
should `await initSession()` before calling `authFetch` (`src/components/agent/InterviewAgent.tsx`).

## Step 3 — Does the key actually work?

```bash
bash .claude/skills/verify-models/run.sh
```

If reasoning fails, the model name in `src/lib/gemini.ts` is deprecated.
If Live fails with "not found", the model name in `src/lib/interview-live-client.ts`
is wrong for `bidiGenerateContent`. If Live fails with policy, billing isn't
enabled on the GCP project.

## Step 4 — Read the close code in browser console

The browser's `WebSocket.onerror` event is opaque (`{}` by design). The real
reason is in `onclose`. Look for:

```
🔌 Gemini Live WebSocket Closed: <code> <reason>
```

| Code | Means |
|------|-------|
| 1007 | Protocol/format error |
| 1008 | Auth or model-not-found (read the reason) |
| 1011 | Server side; retry |
| 4xxx | Custom — reason is authoritative |

## Step 5 — Stale browser bundle?

After changing a `NEXT_PUBLIC_*` var or restarting dev, hard-reload the page
(Cmd+Shift+R). The browser caches the old bundle and old key.
