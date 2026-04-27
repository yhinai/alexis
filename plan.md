# BetterThanLeet (Alexis) — Improvement Plan

> **For the engineer executing this plan:** use `superpowers:executing-plans` to walk it task-by-task. Commits should land per item (or per `.x` sub-step). Don't batch.

**Goal.** Take BetterThanLeet from "hackathon-grade demo" to "demo-safe today, candidate-safe in 4–6 weeks" by fixing the real issues, killing dead code, and hardening the bits that will embarrass us in front of a judge or a paying customer.

**Architecture.** Next.js 16 / React 19 app on Vercel Fluid Compute. Voice via Gemini Live (WebSocket from the browser). Code execution via Daytona sandboxes. Analysis via Gemini 3 Pro and CodeRabbit. New SpatialReal WASM avatar. Zustand for client state. Sentry for monitoring. The plan keeps the architecture; it does not propose a rewrite.

**Tech stack.** Next.js 16.1.4, React 19.2.3, TypeScript strict, Tailwind 4, Vitest, `@google/genai` (target SDK), `@daytonaio/sdk`, `@spatialwalk/avatarkit`, `@sentry/nextjs`, Radix UI, Monaco, Mermaid, Zod.

---

## 1. Team that produced this plan

| Teammate | Remit | Subagent |
|---|---|---|
| **Architect** | Code structure, duplication, dead code, type safety, oversized modules | `Explore` |
| **Security** | API attack surface, auth, secret handling, sandbox sanitization | `Explore` |
| **UX / Frontend** | Demo-blockers, accessibility, half-built features, voice agent UX | `Explore` |
| **Sandbox-Leak** | Daytona lifecycle correctness — orphan paths, cleanup gaps | `daytona-sandbox-leak-checker` |
| **Gemini-Models** | Hardcoded model names vs live `models.list`, dual-SDK conflict | `gemini-model-auditor` |
| **Performance** | Bundle, Next.js 16 unused features, WASM kludge, runtime config | `vercel:performance-optimizer` |
| **Devil's Advocate** | Skeptic — attacked the draft to expose wishful thinking, sequencing errors, missing items | `general-purpose` |

The Devil's Advocate's critique is integrated throughout the phases below and called out explicitly at the end of each item where it changed the original draft.

---

## 2. Verified facts (do not relitigate)

These were confirmed by direct file reads, not just claimed by an agent:

1. `.env.local` is **NOT** committed. `.gitignore` has `.env*`; `git ls-files` returns no env files. **Key rotation is not urgent.** (Security agent's "Critical 1" was wrong.)
2. `src/app/api/gemini/session/route.ts:44` returns `data: { apiKey: apiKey.trim() }` to authed clients. **This is a real key-exfil channel by design.** Auth doesn't help — once a candidate is authed they can drain the key.
3. `src/components/agent/SystemDesignAgent.tsx` and `src/lib/system-design-live-client.ts` together contain **10 hardcoded `fetch('http://127.0.0.1:7242/ingest/...')`** calls — debug telemetry shipped to production.
4. `WIZARD_SHORTCUT` is exported from `src/lib/constants.ts:57` and `isWizardMode` is **persisted to localStorage** by `src/lib/store.ts:353`. No `NODE_ENV` gate.
5. Three live-client files duplicate ~75% of code: `gemini-live-client.ts` (981 LOC), `interview-live-client.ts` (911 LOC), `system-design-live-client.ts` (864 LOC).
6. `src/lib/code-history.ts` (7KB undo/redo, complete) is **never imported** by any editor or agent. Orphaned feature.
7. `src/lib/gemini.ts.backup` is committed; ~30k LOC dead.
8. `package.json` ships **both** `@google/genai ^1.0.0` and `@google/generative-ai ^0.24.1`.
9. `@xyflow/react` is in `package.json` but **not imported anywhere in `src/`**.
10. `next.config.ts` rewrites a hardcoded WASM filename `avatar_core_wasm-bd762669.wasm`. `SpatialRealAvatar.tsx:36` *also* installs a global `window.fetch` shim — two layers of workaround for the same SDK bug.
11. `src/app/test/page.tsx` creates a Daytona sandbox in `useEffect` with **no cleanup at all** — leaks one sandbox per visit.
12. The in-memory rate limiter in `src/lib/rate-limiter.ts` does not survive across Lambda instances on Vercel — security theater on serverless.
13. tsconfig has `strict: true`; `next.config.ts:4` has `reactStrictMode: false` ("Helps with Monaco/WebSockets in dev"). Hides effect bugs.
14. ~4 test files cover ~38 lib files + 17 API routes. Coverage is asymmetric.
15. Daytona `createWorkspace` (`src/lib/daytona.ts:247`) runs CodeRabbit install **synchronously** post-create — ~5–10s of avoidable cold start.

---

## 3. Risk register (read this before every commit)

| # | Risk | Trigger | Mitigation in plan |
|---|---|---|---|
| R1 | Refactor lands within 7 days of a demo and silently breaks voice mode | Phase 1 changes shipped late | All Phase 1 work is feature-flagged; gate with `NEXT_PUBLIC_USE_BASE_LIVE_CLIENT` for the live-client extraction |
| R2 | Gemini Live ephemeral-token migration breaks audio mid-demo | P0-1 not feature-flagged | P0-1 ships with `GEMINI_AUTH_MODE=direct\|ephemeral` env switch and a verified rollback |
| R3 | Cleanup PRs touch the same files | parallel work on the live clients | Sequence: tests → extraction → callers; each in its own commit |
| R4 | StrictMode flip surfaces 10 effect bugs the day before the demo | turning it on too late | StrictMode flip moves to **Phase 0** (per Devil's Advocate); fix bugs as they surface, with a week of buffer |
| R5 | A reviewer realizes Wizard Mode exists during the demo | not removed pre-demo | P0-3 lands first |
| R6 | Daytona costs run away when a candidate walks away | no server-side reaper | P0-9 (was P2-5) — promoted to Phase 0 |
| R7 | Cross-state recording laws (CA/IL/FL/MA) violated when a real candidate is recorded | no consent flow | P0-10 — explicit opt-in before mic |

---

## 4. Phase 0 — Demo-blockers + critical correctness (week 1, ~25–35 hours)

Everything in Phase 0 must land before any external demo or candidate exposure. Each item is a separate commit.

### P0-1: Stop returning `apiKey` from `/api/gemini/session/route.ts` *(highest blast radius)*

**Files:** `src/app/api/gemini/session/route.ts`, `src/lib/gemini-live-client.ts`, `src/lib/interview-live-client.ts`, `src/lib/system-design-live-client.ts`, `package.json` (verify `@google/genai` version)

**Decision (per Devil's Advocate):** The only Phase-0-viable path is **ephemeral auth tokens via `@google/genai`'s `ai.authTokens.create`**. Proxying a 30–45 minute Gemini Live WebSocket through Vercel functions is architecturally wrong (Vercel function maxDuration ≤ 300s, even on Fluid). Do not pursue proxying in this plan.

**Pre-flight check (~15 min):** verify the pinned `@google/genai ^1.0.0` exposes `ai.authTokens.create` — if it doesn't, **do not migrate auth in Phase 0**; instead lock the route behind an aggressive rate limit (5 req/min/IP, single concurrent session per user) and treat the key as a "bring-down-prod" risk, not a "mass exfil" risk, until the SDK supports tokens.

**Steps:**
1. Add `GEMINI_AUTH_MODE` env var. Values: `direct` (current behavior), `ephemeral` (new behavior). Default to `direct` until verified.
2. Implement the `ephemeral` branch: server calls `ai.authTokens.create({ uses: 1, expireTime: now + 600s })` and returns the token, never the key.
3. Update the three live clients to accept either an apiKey or a token at construction.
4. Verify on every deploy by checking the network tab: `/api/gemini/session` response should not contain a 39-character `AIza...` string in `ephemeral` mode.

**Commit:** `feat(api): mint ephemeral Gemini auth tokens behind GEMINI_AUTH_MODE flag`

**Verification:**
```bash
# After deploy, with cookie + ephemeral mode set:
curl -sH "cookie: ..." https://.../api/gemini/session | jq .data.apiKey
# Expected: null or absent. The presence of any AIza... value FAILS verification.
```

### P0-2: Strip the localhost telemetry

**Files:** `src/components/agent/SystemDesignAgent.tsx` (lines 71, 77, 87, 98, 226), `src/lib/system-design-live-client.ts` (lines 173, 232, 352, 384, 489)

**Action:** Delete every `fetch('http://127.0.0.1:7242/ingest/...')` call. There are 10 of them — confirmed by grep. They were a developer's local hypothesis-tracking server; in prod they spam network errors to the console and reveal internal hypothesis IDs in source.

**Replacement:** if structured telemetry is needed, route through Sentry's `Sentry.addBreadcrumb` (already a dep) — but do that in P0-7, not here. For now, just delete.

**Commit:** `chore: remove localhost:7242 hypothesis-tracker telemetry`

### P0-3: Kill Wizard Mode in production

**Files:** `src/lib/constants.ts:57`, `src/lib/store.ts:131,255,256,353`, `src/components/agent/InterviewAgent.tsx`, `src/components/agent/SystemDesignAgent.tsx`

**Per Devil's Advocate:** gating `WIZARD_SHORTCUT` alone leaves users with `isWizardMode: true` already cached in localStorage from prior dev sessions. Bump the persist version and migrate the field out.

**Steps:**
1. In `constants.ts:57`: `export const WIZARD_SHORTCUT = process.env.NODE_ENV === 'production' ? null : { ctrl: true, shift: true, key: 'X' };`
2. In `store.ts` `persist` config, bump `version` and add a `migrate` that deletes `isWizardMode` from any older snapshot.
3. In all `useEffect` blocks that listen for the shortcut, early-return if `WIZARD_SHORTCUT === null`.
4. Smoke test: open prod build, press `Ctrl+Shift+X` — nothing should happen.

**Commit:** `fix: gate Wizard Mode to development; migrate stale localStorage`

### P0-4 (was P2-7): Re-enable `reactStrictMode`

**File:** `next.config.ts:4`

**Per Devil's Advocate (sequencing):** flipping StrictMode last hides every effect bug from now until then. Surface them now while there's a week of buffer before the demo.

**Action:** delete `reactStrictMode: false`. Run the app. Fix the cascade. Common fallout in this codebase will be: double-`useEffect` in `InterviewAgent.tsx`, `SystemDesignAgent.tsx`, and any page that calls `/api/sandbox/create` on mount (which is P0-9 territory).

**Commit:** `fix: re-enable reactStrictMode; resolve double-effect bugs`

### P0-5: Daytona createWorkspace — atomic create-or-delete

**File:** `src/lib/daytona.ts:247-270`

**Action:** wrap the post-`create()` initialization (CodeRabbit install + any subsequent setup) in `try { ... } catch (err) { try { await workspace.delete(); } catch {} throw err; }`. If anything between `create()` and the function returning throws, delete the half-created sandbox before bubbling.

**Commit:** `fix(daytona): delete partially-initialized sandbox on init failure`

### P0-6: Path sanitization for sandbox file APIs

**File:** `src/lib/daytona.ts:84` (and the `validPathPattern` site)

**Action:** replace the regex with a proper allow-list:
```ts
const ALLOWED_BASES = ['/workspace'];
function sanitizePath(p: string): string {
  if (p.includes('\0')) throw new Error('Bad path');
  const resolved = path.posix.resolve('/workspace', p);
  if (!ALLOWED_BASES.some(base => resolved === base || resolved.startsWith(base + '/'))) {
    throw new Error('Path outside workspace');
  }
  return resolved;
}
```

**Tests (in `src/lib/daytona.test.ts`):** add cases for `/etc/passwd`, `../../../etc/passwd`, `./../etc/shadow`, `/workspace/../../etc/passwd`, paths with NUL bytes, and Unicode normalization tricks. All must throw.

**Commit:** `fix(daytona): tighten path sanitizer; add path-traversal tests`

### P0-7: Sandbox lifecycle hygiene (split into 4 commits)

Per Devil's Advocate, P0-4 (original draft) bundled four unrelated leaks. They become four commits:

| Sub | File | Action |
|---|---|---|
| 7a | `src/app/test/page.tsx` | **Delete the page** (it was always test scaffolding) — or, if kept, add `useEffect` cleanup + `pagehide` handler. Verified: leaks 1 sandbox per visit |
| 7b | `src/app/interview/page.tsx:192-221` | Add `pagehide` listener alongside `beforeunload` (iOS bfcache safety). Both call `navigator.sendBeacon('/api/sandbox/delete', JSON.stringify({...}))` |
| 7c | `src/components/interview/InterviewReportDialog.tsx:94-108` | Move the cleanup call to `finally`, not the success branch |
| 7d | `src/app/api/sandbox/create/route.ts` | Honor `request.signal.aborted` after `createWorkspace`; if aborted, delete and return 499 |

**Honest scope:** these are best-effort. The real fix is P0-9 (server-side reaper). These four commits reduce leak rate but do not eliminate it.

### P0-8 (was P0-6): CodeRabbit install — bake into snapshot

**File:** `src/lib/daytona.ts:247-269`, plus a Daytona snapshot rebuild

**Per Devil's Advocate (pick one):** option (a) — bake CodeRabbit into the snapshot. Option (b) (parallelize the install) makes the agent's first 5–10s of behavior depend on a race the candidate sees.

**Steps:**
1. Build a new Daytona snapshot with CodeRabbit pre-installed; tag and update the snapshot reference in env.
2. Remove the inline `executeCommand(CODERABBIT_INSTALL_CMD)` from `createWorkspace`.
3. Add a smoke check on workspace ready that confirms CodeRabbit responds, with a `Sentry.captureMessage` if the snapshot drifts.

**Commit:** `perf(daytona): bake CodeRabbit into snapshot; remove inline install`

**Expected savings:** 5–10s off every workspace cold start.

### P0-9 (was P2-5, promoted): Server-side sandbox reaper

**Files:** new `src/app/api/cron/sandbox-cleanup/route.ts`, `vercel.ts` (new), `src/lib/daytona.ts` (label every create)

**Per Devil's Advocate:** client cleanup (`beforeunload`/`pagehide`) is best-effort and unreliable. The reaper is the only durable fix. Promoted from Phase 2 to Phase 0.

**Steps:**
1. Label every sandbox at create time: `labels: { app: 'alexis', userId, sessionId, createdAt: String(Date.now()) }`.
2. New cron route lists sandboxes with `app=alexis` older than 1 hour and deletes them.
3. New `vercel.ts` (per modern Vercel guidance — replaces `vercel.json`):
   ```ts
   import { type VercelConfig } from '@vercel/config/v1';
   export const config: VercelConfig = {
     framework: 'nextjs',
     crons: [{ path: '/api/cron/sandbox-cleanup', schedule: '*/15 * * * *' }],
     functions: {
       'src/app/api/interview/report/route.ts': { maxDuration: 60 },
       'src/app/api/practice/feedback/route.ts': { maxDuration: 60 },
       'src/app/api/analysis/coderabbit/route.ts': { maxDuration: 60 },
     },
   };
   ```
4. Cron route requires `Authorization: Bearer ${process.env.CRON_SECRET}` (Vercel sets this for crons automatically).

**Commit:** `feat: server-side Daytona sandbox reaper; vercel.ts config`

### P0-10: Candidate consent / recording disclosure *(missing from draft — added per Devil's Advocate)*

**Files:** new `src/components/interview/ConsentDialog.tsx`, modify `src/app/interview/page.tsx`, `src/app/practice/page.tsx`

**Why this is Phase 0:** Two-party consent states (CA, IL, FL, MA, MD, MT, NV, NH, PA, WA) and GDPR require explicit opt-in *before* the mic turns on. This is a launch-blocker for paying customers, not a "future" item.

**Action:** modal that lists exactly what is captured (audio, code, sandbox actions, paste/blur events), where it goes (Gemini, Daytona, Sentry), and how long it's retained. "I consent" button is required before any `getUserMedia` call. Persist consent + timestamp + version of the disclosure to localStorage and to the server when the session starts.

**Commit:** `feat: explicit candidate consent before mic activation`

### P0-11: Demo-day fallbacks

**Files:** `src/components/agent/InterviewAgent.tsx`, `src/components/agent/SpatialRealAvatar.tsx`, new `src/lib/fallbacks.ts`

**Per Devil's Advocate:** plan had no fallback for "Gemini Live down at 2pm during the demo" or "SpatialReal WASM fails to load." Both are single points of failure for marquee features.

**Steps:**
1. If `getUserMedia` fails or the user denies the mic: surface a "Text-only mode" toggle in `InterviewAgent` that uses `model.generateContent` over the existing `/api/gemini/session` instead of Live audio.
2. If Gemini Live websocket fails to connect within 5s after consent + auth: same toggle, automatic.
3. If `SpatialRealAvatar` throws or the WASM 404s: render a static portrait placeholder (PNG) and continue without animation. The audio bus must still play.

**Commit:** `feat: text-only fallback for voice; static fallback for avatar`

### P0-12: Aggressive rate limit specifically on `/api/gemini/session`

**Files:** `src/lib/rate-limiter.ts` (`getRateLimitConfig`), unit test in `src/lib/__tests__/`

**Per Devil's Advocate:** even after P0-1, the endpoint that mints credentials needs aggressive throttling. Today's per-IP defaults aren't tight enough.

**Action:** for `/api/gemini/session`, set tokens=5, refillRate=1 token / 60s, and burst=2. Add concurrency cap: at most one active Live token per authed user.

**Commit:** `fix(rate-limit): aggressive throttle on /api/gemini/session`

### P0-13: Quick wins — file deletion + dependency hygiene

| Sub | Action |
|---|---|
| 13a | `git rm src/lib/gemini.ts.backup` |
| 13b | `npm uninstall @xyflow/react` (verified unused) |
| 13c | Hoist Gemini model strings to `src/lib/constants.ts`: `GEMINI_MODELS = { reasoning: 'gemini-3.1-pro-preview', tts: 'gemini-3.1-flash-tts-preview', liveAudio: 'models/gemini-2.5-flash-native-audio-latest' }`. Update 5 call sites. |
| 13d | Remove or env-gate `src/app/test-agent/` and the **content** of `src/app/test/` (whatever survives 7a) |

**Per Devil's Advocate:** the `@google/generative-ai` removal is **not** a P0 quick win — see P1-0 below. It involves migrating `gemini.ts` to a different SDK with different streaming, safety, and multimodal contracts. Do not bury that work inside a chore commit.

**Commit:** `chore: remove backup file, unused @xyflow/react, hoist model constants, drop test pages`

---

## 5. Phase 1 — Structural cleanup (weeks 2–3, ~50–70 hours)

### P1-0: SDK migration — `@google/generative-ai` → `@google/genai`

**Files:** `src/lib/gemini.ts` (~30k LOC), `src/lib/__tests__/gemini.test.ts`, `package.json`

**Per Devil's Advocate (carved out of P0-7 because it's its own ~1-day task):** the two SDKs differ in streaming API shape, safety-setting object shape, and multimodal payload contract. This is a regression risk on every analysis endpoint.

**Steps:**
1. Write characterization tests for current `gemini.ts` exports first — golden-file inputs/outputs from real Gemini calls (recorded). Lock the contract.
2. Migrate `generateAnalysis`, `generateAutoFix`, `generateReport`, `generateFeedback` (and any other entry points) one at a time.
3. Run the recorded golden tests after each migration; expect parity.
4. Remove `@google/generative-ai` from `package.json`.

**Commit per entry point.** Final commit: `chore: drop @google/generative-ai dependency`.

### P1-1: Extract `BaseLiveClient` *(only after tests exist)*

**Per Devil's Advocate (sequencing fix):** P4-2 (live-client tests) **must precede** the extraction. Three files at 75% overlap that drifted independently means the 25% difference is exactly what matters per use case.

**Files:** new `src/lib/base-live-client.ts`, modify `src/lib/gemini-live-client.ts`, `src/lib/interview-live-client.ts`, `src/lib/system-design-live-client.ts`

**Pre-requisite:** P4-2a (live-client unit tests) lands first.

**Steps:**
1. Create `BaseLiveClient` containing the shared 75%: WebSocket connection lifecycle, audio capture/playback, VAD, retry/backoff, tool dispatch shell. Target ~600 LOC.
2. Each subclass overrides the differences: tool schema, system instruction, mode-specific event handling. Target each subclass <250 LOC.
3. Feature-flag: `NEXT_PUBLIC_USE_BASE_LIVE_CLIENT=true` runs the new path, false runs the old. Default to false until a week of dogfooding.
4. Remove the old files only after the flag has been on for a week without incident.

**Commit cadence:** one commit per subclass migration.

### P1-2: Wire `code-history.ts` to the editor

**Files:** `src/lib/code-history.ts` (already complete, do not rewrite), `src/components/editor/CodeEditor.tsx`, new `src/components/editor/AutoFixDiffDialog.tsx`

**Steps:**
1. In `CodeEditor.tsx`, add Undo / Redo buttons (Cmd-Z / Cmd-Shift-Z bindings already exist in Monaco — wire them to `pushSnapshot` / `popSnapshot`).
2. When auto-fix returns a result, snapshot the current code, then open `AutoFixDiffDialog` with side-by-side diff. User must Accept or Reject. Reject pops the snapshot.
3. After successful run/test, also snapshot for "go back to last green" recall.

**Commit:** `feat(editor): wire code-history to undo/redo + auto-fix diff modal`

### P1-3: Type-safe tool registry

**Files:** new `src/lib/tool-registry.ts`, modify `src/components/agent/InterviewAgent.tsx:88`, `src/components/agent/SystemDesignAgent.tsx:82`

**Action:** define `type ToolName = 'runCode' | 'autoFix' | ...` as a literal union and `type ToolRegistry = { [K in ToolName]: ToolHandler<K> }`. Replace `(toolFunctions as any)[name]` with a discriminated dispatcher that returns `never` on unknown names — so missing tools fail at compile-time, not at runtime via Gemini hallucinating a tool name.

**Commit:** `refactor: type-safe tool registry; remove (toolFunctions as any)[name]`

### P1-4: Logger abstraction; kill 230 console.logs

**Files:** new `src/lib/logger.ts`, ripple across the codebase

**Per Devil's Advocate (PII):** `console.log` in dev still ends up in Vercel build logs and shared dev sessions. Treat as Phase 0 if the logs include candidate code or transcripts (grep first).

**Steps:**
1. New `logger.ts`: `const log = (level, msg, ctx) => process.env.NODE_ENV === 'production' ? Sentry.addBreadcrumb({ level, message: msg, data: ctx }) : console[level](msg, ctx);`
2. Add a redactor that strips fields named `code`, `transcript`, `apiKey`, `token`, `email`, `name` from any logged context.
3. Codemod replace `console.log(...)` → `log.info(...)`, `console.error(...)` → `log.error(...)` etc.
4. Add an ESLint rule `no-console: error` to prevent regressions.

**Commit:** `chore: replace 230 console.logs with redacting logger`

### P1-5: Resolve the WASM dual-kludge

**Files:** `next.config.ts:14-25`, `src/components/agent/SpatialRealAvatar.tsx:36-51`

**Honest scope (per Devil's Advocate):** forking the SDK is not a Phase 1 task. Likely outcome: keep the rewrite, kill one of the two layers, document the rest.

**Steps:**
1. Restrict the `installWasmFetchShim` so it only runs on `/interview` and `/practice` (not globally on every page).
2. Generalize the `next.config.ts` rewrite to a wildcard: `/:path*/avatar_core_wasm-*.wasm` so a SpatialReal SDK upgrade doesn't silently break the rewrite.
3. Open an upstream issue at SpatialReal asking for a configurable `wasmUrl` option. Track in a TODO comment, not in this plan.

**Commit:** `chore(spatialreal): scope WASM shim to interview routes; generalize rewrite`

### P1-6: Component-internal data fetching → centralize

**Files:** ~17 components with inline `fetch` calls. Move to `src/lib/api-client.ts` (already exists).

**Action:** every component-level `fetch` becomes a typed call against `apiClient.<route>()`. Centralizes auth header, retry, and request-id injection.

**Commit cadence:** one per route group (sandbox, analysis, etc.).

---

## 6. Phase 2 — Resilience & correctness (weeks 4–5, ~50–60 hours)

### P2-1: Replace in-memory rate limiter with Redis-backed (Upstash)

**Files:** `src/lib/rate-limiter.ts`, `src/middleware.ts`, `package.json` (`@upstash/redis`, `@upstash/ratelimit`)

**Action:** swap the token-bucket implementation for `@upstash/ratelimit`. Same external API. Move config to env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) — provision via Vercel Marketplace.

**Commit:** `feat(rate-limit): Upstash Redis-backed limiter`

### P2-2: Auth — Redis-backed sessions (revocable)

**Per Devil's Advocate:** the draft's "HMAC tokens or Redis sessions" hides a real decision. **Pick Redis** — we need to revoke mid-interview (cheating detection, rage-quit cleanup, force-end). HMAC tokens are not revocable.

**Files:** `src/lib/auth.ts`, new `src/lib/session-store.ts`

**Steps:**
1. Session store backed by the same Upstash instance from P2-1: `sess:{token}` → `{ userId, createdAt, expiresAt, scope }`.
2. `validateSession` reads from Redis, not from in-memory map. Cache positive results in memory for 30s to reduce Redis hits.
3. New endpoint `POST /api/auth/revoke` (admin-scoped) deletes the session.
4. Token format stays opaque (random base64); they're keys into Redis, not signed claims.

**Open question to surface to the user:** are we adopting NextAuth/Clerk/WorkOS within 3 months? If yes, P2-2 is interim-only; design accordingly. If no, this is the long-term auth.

**Commit:** `feat(auth): Redis-backed revocable sessions`

### P2-3: Gemini call resilience — retry + circuit breaker + typed errors

**Files:** new `src/lib/ai-resilience.ts`, modify `src/lib/gemini.ts`

**Action:** wrap every `generateContent`/`generateContentStream` in a wrapper that does:
- 3 retries with exponential backoff, only on 5xx and timeout
- Schema validate the response with Zod (already a dep) — failure is a typed `AiResponseShapeError`, not a silent `score: 0`
- A simple per-process circuit breaker — open after 5 failures in 30s, half-open after 60s
- Surface the error to the UI: "Analysis temporarily unavailable; falling back to heuristic." Heuristic implementation already exists in `agent-reasoning.ts`.

**Commit:** `feat(ai): retry + circuit breaker + typed errors for Gemini`

### P2-4: CSRF / Origin validation on POST routes

**Files:** `src/middleware.ts`

**Action:** in middleware, for any `POST/PUT/DELETE/PATCH`, check `Origin` header against an allow-list (`process.env.ALLOWED_ORIGINS`). Reject with 403 otherwise. Set session cookies with `SameSite=Strict; Secure; HttpOnly`.

**Commit:** `feat(security): origin allow-list + SameSite=Strict cookies`

### P2-5: Concurrent-write safety for candidate state *(redesigned per Devil's Advocate)*

**Per Devil's Advocate:** the draft's "store mutex" was wrong abstraction. Zustand runs single-threaded per tab. The actual races are one of:

| Real race | Fix |
|---|---|
| Cross-tab (two tabs open, both writing the same session via localStorage) | `BroadcastChannel` + single-writer election, or move all writes through the server |
| Server-side (two API requests for the same session land on different Lambdas) | Redis-backed session state (P2-2) + optimistic concurrency on the few mutable fields |
| StrictMode double-fire | Idempotent effects (handled by P0-4 + per-effect identity keys) |

**Action this phase:** move all candidate-state writes server-side to Redis (extends P2-2). Drop client-side `candidateProfile` mutation. The store reads only.

**Commit:** `refactor(state): server-authoritative candidate profile`

### P2-6: PII-aware Sentry configuration

**Files:** `sentry.client.config.ts`, `sentry.server.config.ts` (or wherever Sentry is configured)

**Action:** add `beforeSend` that scrubs candidate code, transcripts, emails. Add `denyUrls` for the localhost telemetry endpoint (already deleted in P0-2 but defense in depth). Add session replay only with explicit consent (ties into P0-10).

**Commit:** `feat(observability): PII redaction in Sentry; consent-gated replay`

### P2-7: Per-session cost ceiling

**Files:** new `src/lib/cost-tracker.ts`, integrate with sandbox/Gemini calls

**Per Devil's Advocate (missing item):** a runaway agent loop or a candidate who walks away with an open sandbox burns money. No per-session budget cap exists.

**Action:** track estimated cost per session in Redis. Hard cap at `$X` (configurable, start $5). On approach (80%) warn the agent; on exceed, force-end the interview gracefully.

**Commit:** `feat(cost): per-session cost ceiling + graceful force-end`

---

## 7. Phase 3 — Performance & UX (weeks 5–6, ~40–60 hours)

### P3-1: Lazy-load Mermaid + canvas-confetti

**Files:** `src/app/interview/page.tsx`, `src/components/diagram/MermaidDiagramCanvas.tsx`

**Action:**
- `MermaidDiagramCanvas` and `SystemDesignAgent` → `next/dynamic({ ssr: false })`, only imported on `/system-design` route or when `interviewMode === 'system-design'`.
- `canvas-confetti` → `await import('canvas-confetti')` inside the success branch only.

**Expected:** ~900KB gzipped off coding-interview route, ~25KB off initial.

**Commit:** `perf: lazy-load Mermaid and canvas-confetti`

### P3-2: Prefetch SpatialReal WASM

**Files:** `src/app/interview/layout.tsx` or a route-level `<link rel="preload" as="fetch">`

**Action:** after page load, prefetch `/spatialreal/avatar_core_wasm-bd762669.wasm` into HTTP cache so when the avatar mounts the WASM is already local.

**Commit:** `perf: prefetch SpatialReal WASM after page load`

### P3-3: Stream the analysis routes *(scoped honestly)*

**Per Devil's Advocate:** budget a day per endpoint, not "an afternoon." Zod can't validate partial JSON, so client side either accumulates and validates at end (TTFB win, no progressive UI) or accepts a streaming-text shape (more UI work).

**Files:** `src/app/api/interview/report/route.ts`, `src/app/api/practice/feedback/route.ts`, `src/app/api/analysis/review/route.ts`, plus client consumers

**Approach:** start with `interview/report` only. Use `model.generateContentStream` + `ReadableStream` server-side; client accumulates and validates with Zod at end-of-stream (still wins TTFB; progressive UI deferred). Roll out the other two only after the first is stable.

**Commit per route.**

### P3-4: Caching where the key is right

**Per Devil's Advocate (correctness fix):** caching analysis on `sha256(code+lang)` alone leaks one candidate's review to another. Cache key must include `interviewId` (and ideally session token).

**Files:** `src/app/api/leetcode/import/route.ts`, `src/app/api/analysis/coderabbit/route.ts`

**Action:**
- `fetchLeetCodeProblem(slug)`: wrap with `'use cache'` + `cacheTag(\`leetcode-\${slug}\`)`. Public data, no leak risk. **Verify `'use cache'` is GA in the pinned Next.js version before committing.**
- CodeRabbit results: cache in Vercel Runtime Cache keyed `${interviewId}:${sha256(code+lang)}`. Limit TTL to interview duration.

**Commit:** `perf: cache LeetCode imports and per-interview CodeRabbit results`

### P3-5: Accessibility pass

**Files:** every `*.tsx` with an icon-only button (Lucide); `src/components/agent/TranscriptPanel.tsx`; `src/components/diagram/MermaidDiagramCanvas.tsx`

**Action:** systematic pass with `eslint-plugin-jsx-a11y`. Add `aria-label` to every icon-only button, `Escape` handler to pause the agent, text + icon prefix on transcript bubbles (not color-alone), `aria-label` + `<title>` on Mermaid SVG, `aria-live="polite"` on the workspace progress region.

**Commit:** `feat(a11y): aria labels, escape-to-pause, color-blind-safe transcript`

### P3-6: Workspace cold-start UX

**Files:** `src/app/interview/page.tsx`, `src/components/interview/WorkspaceProgressIndicator.tsx`

**Action:** show ETA based on step ("~25 seconds remaining"), retry button on failure, friendly fallback if Daytona is down. Pre-warm a sandbox during the consent flow (P0-10) — by the time the candidate clicks past consent, the sandbox is ready.

**Commit:** `feat(ux): workspace progress with ETA, retry, and pre-warm`

### P3-7 (cut from draft per Devil's Advocate)

PPR for landing page, Turbopack dev/build switch, and the "user is typing" DND mode all moved to backlog. None of them are candidate-blocking.

---

## 8. Phase 4 — Tests & quality gates (ongoing, sequenced)

### P4-1: Live-client characterization tests *(precedes P1-1)*

**Files:** new `src/lib/__tests__/gemini-live-client.test.ts`, `interview-live-client.test.ts`, `system-design-live-client.test.ts`

**Per Devil's Advocate:** without these, P1-1 lands silent voice-mode bugs.

**Action:** mock the WebSocket (use `mock-socket`); record fixtures for setup, audio chunk handling, tool call dispatch, retry on close. Tests pin behavior before refactoring.

**Commit:** `test: characterization tests for live clients`

### P4-2: API route tests

For each of 17 API routes: input validation (zod schema), auth gate (`validateSession`), rate-limit headers, error shape. ~3–4 hours per route.

### P4-3: Playwright E2E

**Files:** new `tests/e2e/interview-flow.spec.ts`

**Action:** Playwright; mock Gemini and Daytona at the network layer (MSW or Playwright route interception). Cover: consent → workspace ready → write code → run → autofix → report. One green flow first; expand later.

### P4-4: GitHub Actions CI

**Files:** new `.github/workflows/ci.yml`

**Action:** typecheck + lint + test + build on every PR. Coverage gate starting at 30%, ratchet up monthly. Cache `node_modules` and `.next`.

### P4-5: Missing scripts

**File:** `package.json`

```json
"typecheck": "tsc --noEmit",
"format": "prettier -w .",
"analyze": "next experimental-analyze"
```

**Commit:** `chore: add typecheck/format/analyze scripts`

---

## 9. Phase 5 — Future bets (post-launch; do not start before Phase 0–2 are done)

These are honest about being multi-month projects, not bullets:

- **Server-side session storage (DB, not Redis)** for sandbox tracking, replay, audit.
- **Recording + transcript storage** for hiring-manager replay (depends on consent v2).
- **Real integrity signals** — keystroke dynamics, code similarity vs LeetCode/SO. Multi-month research, not a sprint.
- **Multi-language analyzers** beyond Python (TypeScript, Go, Rust).
- **Workspace pooling** — pre-warm 5 containers; complements P0-8.

---

## 10. Devil's Advocate concessions (changes to the original draft)

This section exists for transparency — the team should know what changed and why.

| Change | Reason |
|---|---|
| P0-1 path narrowed to ephemeral tokens (not WS proxy) | Vercel functions can't host 30-min WebSockets |
| P0-1 added pre-flight SDK version check | Don't promise a fix that the pinned SDK can't deliver |
| Wizard mode gating bumps zustand persist version | Otherwise stale localStorage carries the flag forward |
| StrictMode flip moved Phase 2 → Phase 0 | Surface effect bugs early, not the day before demo |
| Sandbox reaper moved Phase 2 → Phase 0 | Client cleanup is best-effort; reaper is the durable fix |
| Original P0-4 split into 4 commits (P0-7a/b/c/d) | Bundling unrelated leaks hides progress |
| P0-7 chore split: SDK migration carved into P1-0 | Migration has regression risk; don't bury it |
| P2-4 (zustand mutex) dropped; replaced with server-authoritative state | Wrong abstraction; zustand is single-threaded per tab |
| P2-2 picks Redis (not HMAC) | We need revocability mid-interview |
| Caching keys in P3-4 must include interviewId | Cross-candidate leak otherwise |
| Streaming (P3-2 → P3-3) scoped to one route first | "30-min job" was wishful thinking |
| Added P0-10: candidate consent | Two-party-consent states + GDPR are launch blockers |
| Added P0-11: demo-day fallbacks | Single points of failure ignored in original draft |
| Added P0-12: aggressive `/api/gemini/session` rate limit | Even after P0-1, the credential-mint endpoint needs hardening |
| Added P2-7: per-session cost ceiling | Runaway loops + walk-away sandboxes burn money |
| Cut: PPR for landing, Turbopack switch, "user typing" DND | Scope creep relative to demo + candidate readiness |
| Phase 5 honestly labeled "multi-month" | Bullets disguising research projects do not deserve a Phase |

---

## 11. Execution order at a glance

```
P0-13 (deletions, 30 min)
  ↓
P0-2 (telemetry strip, 15 min)
  ↓
P0-3 (wizard mode, 1 h)
  ↓
P0-4 (StrictMode flip + cascade fixes, 4–8 h)
  ↓
P0-5, P0-6 (daytona safety, 3–5 h)
  ↓
P0-7a/b/c/d (sandbox cleanup, 2 h each)
  ↓
P0-8 (snapshot bake, 4–6 h, depends on Daytona infra)
  ↓
P0-9 (server reaper + vercel.ts, 4 h)
  ↓
P0-10 (consent, 6–8 h)
  ↓
P0-11 (fallbacks, 6 h)
  ↓
P0-12 (rate-limit hardening, 1 h)
  ↓
P0-1 (ephemeral tokens, ½–2 days depending on SDK support)
  ↓ === DEMO READY ===

P1-0 (SDK migration, 1–2 days)
P4-1 (live-client tests, 2 days) → P1-1 (extract base, 3–4 days)
P1-2 (wire code-history, 4 h)
P1-3 (tool registry, 2 h)
P1-4 (logger, 1 day)
P1-5 (WASM cleanup, 4 h)
P1-6 (centralize fetches, 1 day)
  ↓ === CANDIDATE-FACING READY ===

P2-1 (Upstash rate limit, 4 h)
P2-2 (Redis sessions, 1–2 days) → P2-5 (server-auth state, 1 day)
P2-3 (resilience, 1 day)
P2-4 (CSRF, 4 h)
P2-6 (Sentry PII, 4 h)
P2-7 (cost ceiling, 1 day)
  ↓ === HARDENED ===

P3 (performance + UX) and P4 (tests/CI) interleave from here.
```

Total Phase 0: ~25–35 h. Total Phase 0–2: ~140–180 h. Phase 3–4: ongoing.

---

## 12. Definition of done

- **Demo-ready:** all of Phase 0 merged. Wizard Mode invisible in prod. Telemetry stripped. Consent flow live. Avatar + voice fallbacks tested. Server reaper running. `/api/gemini/session` no longer returns the API key.
- **Candidate-ready:** Phase 1 complete. SDK consolidated. Live client deduped behind a tested base. Code-history wired. Tool registry typed.
- **Production-ready:** Phase 2 complete. Redis auth + rate limit. CSRF closed. AI calls resilient. Cost ceilings enforced.
- **Sustainable:** Phase 4 ratcheting coverage; CI enforcing.
