# 🎙️ Alexis — Voice + Vision AI Interviewer

> **"LeetCode can't ask follow-up questions. Alexis can — and she watches you while she does."**
>
> A live, multi-modal AI interviewer with a 3D rendered face, real-time voice, and the eyes to notice when you're stuck, frustrated, or reaching for your phone.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-alexis--code.vercel.app-purple)](https://alexis-code.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Powered by](https://img.shields.io/badge/Powered%20by-Gemini%20Live%20%2B%20SpatialReal%20%2B%20Daytona-orange)

🌐 **Live demo:** [https://alexis-code.vercel.app](https://alexis-code.vercel.app)

## 📖 What It Is

A technical interview that *speaks to you*, *sees you*, and *reacts*. Built for the **SpatialReal Voice & Vision Track** — judged on real-world impact, interaction fluidity, and architectural depth.

Instead of a silent code editor and an autograder, Alexis:

- **Speaks naturally** — full-duplex voice via Gemini Live native audio (~100 ms time-to-first-word)
- **Watches the candidate** — webcam frames stream into the same model at 1 fps, so she picks up body language
- **Renders a face** — SpatialReal AvatarKit lip-syncs a 3D avatar to her voice, on-device
- **Acts on intent** — "skip this", "I need a break", "make it easier" → real system changes
- **Codes in a real sandbox** — Daytona spins up an ephemeral container for every interview
- **Generates a report** — final hire/no-hire writeup with visual observations timeline

## ✨ Headline Features

### 🗣️ Voice
- **Gemini Live native audio** — text + speech in one model, no separate TTS hop
- **VAD + interruption-safe** — interrupt the AI mid-sentence, she stops and listens
- **24 kHz PCM** end-to-end, lip-sync delay tuned to 500 ms so audio and animation land together

### 👁 Vision
- **1 fps webcam stream** piped into the same Gemini Live WebSocket as audio
- **7 observation categories** that show up in the final report:
  - `away` — looking off-camera ≥5 s
  - `integrity` — phone in hand, second monitor reads, another person in frame, mid-interview identity swap
  - `stress` — sighs, slumped shoulders, head in hands (cascading response)
  - `engagement` — leaning in, smiling, gesturing
  - `aha` — visible "click" moment
  - `gesture` — finger counts, sketches, pointing
  - `environment` — yawns, lighting changes (long-session cue)

### 🧠 Stress-Aware Cascade
Alexis doesn't just notice stress — she responds proportionally:

| Severity | Trigger | Response |
|---|---|---|
| Mild | passing frown / one sigh | softer tone only |
| Real | 3 s+ sustained frustration | acknowledge → unsolicited hint → record (medium) |
| Severe | head in hands ≥3 s | acknowledge → `take_break(120s)` → record (high) |
| Sustained | repeat pattern across 2 problems | `change_difficulty('easier')` → record (high) |

### 🎙️ Voice-Controlled Flow
The candidate steers the interview hands-free:

| Say | Tool fired | Effect |
|---|---|---|
| *"End the interview"* | `end_interview_now` | wraps up + opens the final report |
| *"Skip this problem"* | `skip_to_next_problem` | swaps to a problem at the same difficulty |
| *"Make it easier / harder"* | `change_difficulty` | swaps difficulty |
| *"Take a 2-minute break"* | `take_break` | live countdown overlay on the avatar |
| *"Repeat the question"* | `repeat_question` | re-states the problem |

### 🛡️ Integrity Shield
Anti-cheat without paranoia. Each cue gets a calm, scripted re-engagement and a record in the report — never an accusation.

### 📊 Final Report
Hire / No-Hire writeup with: code-quality assessment, complexity analysis (Gemini 3.1 Pro), CodeRabbit review, and a **Visual Observations timeline** (mm:ss offsets, severity dots, and the actual notes Alexis recorded during the interview).

## 🏗️ Architecture

```
🎤 Mic ──► Gemini Live WS ◄─── 📹 Webcam (1 fps JPEG)
              │
              ├─► 🔊 Web Audio (you HEAR it)
              │
              ├─► SpatialAudioBus ──► AvatarKit WS ──► 👀 3D Lip-sync render
              │
              └─► record_visual_observation tool ──► Final report timeline

User intent ──► Tool calls ──► Daytona sandbox / Problem swap / Break / Hint / End
```

| Concern | Where it lives |
|---|---|
| Voice generation | Gemini Live (`gemini-2.5-flash-native-audio-preview-12-2025`) |
| Reasoning + reports | Gemini 3.1 Pro (`gemini-3.1-pro-preview`) |
| Wizard-mode TTS | Gemini 3.1 Flash TTS (`gemini-3.1-flash-tts-preview`) |
| 3D avatar rendering | SpatialReal AvatarKit (on-device WASM + WebGL) |
| Sandboxed code execution | Daytona ephemeral workspaces |
| Code review | CodeRabbit CLI inside the sandbox |
| Error monitoring | Sentry |
| Hosting | Vercel (`https://alexis-code.vercel.app`) |

## 🚀 Run Locally

### Prerequisites
- Node.js 18+
- API keys for: **Gemini** (Google AI Studio), **Daytona**, **SpatialReal**

### Setup

```bash
git clone https://github.com/yhinai/alexis.git
cd alexis
npm install
cp .env.example .env.local   # then fill in keys (see below)
npm run dev                  # http://localhost:3000
```

### Environment Variables

```env
# Gemini (one key for all three: voice, reasoning, TTS)
GEMINI_API_KEY=AIza...

# Daytona
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://app.daytona.io/api

# SpatialReal
SPATIALREAL_APP_ID=app_...
SPATIALREAL_API_KEY=sk-...
NEXT_PUBLIC_SPATIALREAL_APP_ID=app_...
NEXT_PUBLIC_SPATIALREAL_AVATAR_ID=ca9c5c22-6dba-4b59-ae3b-d26066f8c017

# Optional
NEXT_PUBLIC_USE_MOCK_DAYTONA=false
SENTRY_AUTH_TOKEN=...
DISCORD_WEBHOOK_URL=...   # for git-commit notifications via the dev hook
```

### Verify Everything Works

```bash
bash .claude/skills/demo-checklist/run.sh
```

One command checks all 7 stages: dev sessions, prod health, Gemini/Daytona/SpatialReal API health, every tool wired to a handler + prompt, sample-rate match, and WASM filename drift.

## 🛠️ Developer Tooling (Claude Code)

The repo ships project-local Claude Code automation under `.claude/`:

**Skills (`/<name>` to invoke):**
- `/demo-checklist` — pre-demo runbook
- `/verify-models` — smoke-test every external service
- `/verify-avatar` — smoke-test the SpatialReal pipeline
- `/interview-debug` — diagnose voice-agent connection failures
- `/swap-avatar` — switch the active avatar by ID
- `/update-avatar-wasm` — re-sync the bundled WASM after package upgrades
- `/mint-spatial-token` — print a fresh SpatialReal session JWT
- `/env-doctor` — diff `.env.local` against required keys
- `/release-snapshot` — tag + changelog + Discord ping
- `/gen-test-from-route` — scaffold a Vitest suite from an API route

**Subagents:**
- `gemini-model-auditor`, `daytona-sandbox-leak-checker`, `spatialreal-integration-auditor`
- `auth-flow-auditor`, `prompt-injection-reviewer`, `api-contract-checker`
- `accessibility-reviewer`, `tool-coverage-checker`, `avatar-perf-analyzer`
- `middleware-to-proxy-migrator`

**Hooks** — secret-diff scan on writes, env-status banner at session start, Vitest related on TS edits, API-route schema check, AvatarKit WASM drift detector, `.env*` edit refusal, deletion refusal on `public/spatialreal/`, Discord ping on git commit/push.

## 📂 Project Structure

```
src/
├── app/
│   ├── api/               # rate-limited, session-auth'd routes
│   │   ├── auth/session   # mint short-lived session token
│   │   ├── gemini/session # mint Gemini key for the client
│   │   ├── spatialreal/session # mint SpatialReal session JWT
│   │   ├── sandbox/*      # Daytona lifecycle + exec
│   │   ├── analysis/*     # Gemini + CodeRabbit
│   │   └── tts            # Gemini TTS for Wizard Mode
│   └── interview/         # the live interview page
├── components/
│   ├── agent/             # Gemini Live client + UI (avatar, self-view)
│   ├── editor/            # Monaco + Daytona file sync
│   ├── interview/         # report dialog, controls, transcript
│   └── analysis/          # review/metrics panels
└── lib/
    ├── interview-live-client.ts    # Gemini Live WebSocket
    ├── spatial-audio-bus.ts        # pub/sub for avatar lip-sync feed
    ├── visual-observations.ts      # report timeline types
    ├── interviewer-prompt.ts       # Alexis's system prompt
    ├── gemini-tools.ts             # 17 tool declarations
    ├── agent-tools.ts              # tool handlers
    ├── daytona.ts                  # sandbox client
    ├── coderabbit.ts               # CodeRabbit integration
    └── store.ts                    # Zustand session store
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. `npm run lint && npx tsc --noEmit && npm test`
4. Run `bash .claude/skills/demo-checklist/run.sh` before opening a PR
5. Open the PR — the auto-deploy hits Vercel preview

## 📜 License

MIT.
