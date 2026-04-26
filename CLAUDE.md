# Project Rules for Claude Code

## Project Overview

**Alexis / BetterThanLeet** -- An interactive, voice-guided AI technical interviewer. The candidate codes inside a Daytona sandbox while a Gemini Live agent observes, asks senior-engineer follow-ups, and produces a hire/no-hire report. The repo currently ships a working Next.js 16 prototype with a working interview flow, system-design surface, practice mode, and a final report. Treat it as hackathon-grade software with some production-shaped pieces, not a finished platform.

**Tagline:** "LeetCode can't ask follow-up questions. Alexis can."
**Hackathon:** 2026 BETA Hackathon -- organized by the Berkeley Emerging Technology Association (BETA)
**Date / Location:** April 26, 2026, 09:00–22:00 PT -- Frontier Tower 2nd Floor, 995 Market St, San Francisco, CA 94103
**Track:** Voice & Vision (multimodal interfaces, speech agents, perception systems)
**Hard Deadline:** Submission closes at **19:00 PT**. Demo & Awards run 19:00–21:00 PT. Anything not in the build by 19:00 isn't getting judged.
**Prize Targets:**
- **Voice AI Award** ($1,000) -- the sponsor track award we are explicitly going after; it aligns with the Voice & Vision track and Alexis's voice loop.
- **Main Podium** (1st: $1,000 cash + $1,000 Ali Cloud + $25,000 AWS credits + SpatialReal/BodhiAgent/Lovable subscriptions; 2nd / 3rd descend from there).
**Tech Integrations (not hackathon sponsors, just our stack):** Daytona (sandbox), Gemini (Live + 3 Pro), CodeRabbit, Sentry.
**Judging Criteria (each ~30%, presentation ~10%):** Utility & Impact, Creativity & Innovation, Quality & Technical Strength, Presentation. Build for all four -- the report and live demo are how the last two land.

### Architecture

- **Frontend**: Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui (Radix primitives) + Monaco Editor
- **State**: Zustand stores (`src/lib/store.ts`, `src/lib/system-design-store.ts`)
- **Voice / Reasoning**: Gemini Live for the conversational interviewer, Gemini 3 Pro for deep code analysis (`src/lib/gemini-live-client.ts`, `src/lib/gemini.ts`, `src/lib/interview-live-client.ts`)
- **Sandbox**: Daytona SDK manages an ephemeral coding workspace per session (`src/lib/daytona.ts`)
- **Code Review**: CodeRabbit integration for "senior engineer" review-style feedback (`src/lib/coderabbit.ts`)
- **Static Reasoning**: Regex/heuristic complexity + security checks layered on top of AI analysis (`src/lib/agent-reasoning.ts`, `src/lib/agent-tools.ts`)
- **System Design Lane**: Parallel ReactFlow + Mermaid surface with its own live client and prompt (`src/components/diagram`, `src/lib/system-design-*.ts`)
- **API Layer**: Next.js Route Handlers under `src/app/api/{analysis,auth,gemini,interview,leetcode,practice,sandbox,tts}`
- **Monitoring**: Sentry (`@sentry/nextjs`) for runtime error capture
- **Demo Safety Net**: Wizard Mode (`Ctrl+Shift+X`) forces scripted TTS lines via `/api/tts`

### Project Structure

```text
alexis/
├── CLAUDE.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── vitest.config.mts
├── plans/                    # phase plans (phase_1..phase_7)
├── public/                   # static assets, icons, screenshots
├── scripts/
│   └── integration-test.js   # node-based integration probe
├── remotion-video/           # demo video assets
└── src/
    ├── app/
    │   ├── api/{analysis,auth,gemini,interview,leetcode,practice,sandbox,tts}
    │   ├── interview/        # main candidate-facing page
    │   ├── system-design/    # diagram-first interview lane
    │   ├── practice/         # warm-up / drill mode
    │   ├── test/, test-agent/  # internal harnesses
    │   └── page.tsx          # landing page
    ├── components/
    │   ├── agent/            # voice agent UI (visualizer, status)
    │   ├── analysis/         # review results, metrics panels
    │   ├── diagram/          # system design canvas (ReactFlow + Mermaid)
    │   ├── editor/           # Monaco editor wired to Daytona sync
    │   ├── interview/        # console, controls, reports
    │   ├── practice/         # practice mode UI
    │   ├── workspace/        # workspace shell
    │   └── ui/               # shadcn-style primitives
    ├── data/                 # seeded prompts, problems, fixtures
    └── lib/
        ├── daytona.ts, daytona.test.ts, daytona.integration.test.ts
        ├── gemini.ts, gemini-live-client.ts, gemini-tools.ts
        ├── interview-live-client.ts, interviewer-prompt.ts
        ├── system-design-{agent-tools,live-client,prompt,store,tools}.ts
        ├── agent-reasoning.ts, agent-tools.ts
        ├── coderabbit.ts, reporting.ts, coaching.ts
        ├── code-history.ts, schemas.ts, validation.ts
        ├── store.ts, sounds.ts, rate-limiter.ts
        ├── api-client.ts, api-utils.ts, auth.ts, constants.ts
        ├── error-messages.ts, mermaid-parser.ts
        ├── test-runner.ts, utils.ts, utils.test.ts
        └── __tests__/
```

### Key Technical Decisions

- **The voice loop is the product** -- The differentiator is a Gemini Live agent that asks the right follow-up at the right moment based on what the candidate just typed. Every feature must serve that loop.
- **Daytona is real, not mocked in the demo** -- Mocks exist for dev (`NEXT_PUBLIC_USE_MOCK_DAYTONA`, `NEXT_PUBLIC_USE_MOCK_CODERABBIT`) but the demo runs against a live Daytona workspace. Judges notice mocks.
- **Reactive event loop** -- Editor change -> file sync to Daytona -> static + AI analysis in parallel -> agent decides whether to interject. Don't bypass this loop with one-off code paths.
- **Two reasoning surfaces, intentionally separate** -- The coding interview (`/interview`) and system design (`/system-design`) keep their own stores, prompts, and live clients. Don't merge them; they have different agent contracts.
- **Static analysis runs first, AI second** -- Cheap heuristics (nested loops, unsafe patterns) gate expensive Gemini calls. Preserve this ordering when adding new checks.
- **Wizard Mode is non-negotiable for demos** -- `Ctrl+Shift+X` must always work and must always read the next scripted line from `InterviewAgent.tsx`. Don't break it while refactoring.
- **Auto-Fix is creative, not core** -- The agent can patch syntax errors and install missing deps inside Daytona. It's a wow moment, not the spine of the demo. Keep it scoped.
- **Integrity Shield must keep working** -- Tab blur + paste-event detection feeds the final report's integrity score. Treat it as a tested invariant.
- **Final report is the closer** -- Hire/No-Hire with code quality, integrity, completion time. If a feature doesn't land in the report or in the live timeline, it's probably scope creep.
- **Pre-run the demo** -- Don't run the full interview live during a presentation. Pre-run, capture, and have a recorded fallback by demo time.

### Demo Scenario

**The Candidate Flow:**
1. Candidate opens `/interview`, sandbox spins up via Daytona.
2. Voice agent (Gemini Live) reads the problem aloud and asks for a clarifying question.
3. Candidate types in Monaco; file syncs to Daytona on each meaningful change.
4. Static analysis flags an O(n^2) pattern -> agent interjects: *"Is there a more efficient way?"*
5. Candidate refactors -> tests run inside Daytona -> AI analysis confirms improvement.
6. Optional Auto-Fix: a forced syntax error -> `pip install` + patch -> editor updates.
7. Final report renders: Hire/No-Hire + integrity score + transcript highlights.

The system-design lane mirrors this with a diagram canvas instead of a code editor.

### Sponsor Integration Map

| Sponsor | Role | Integration Depth |
|---------|------|-------------------|
| **Daytona** | Live sandbox -- file sync, command execution, ephemeral workspace per session | DEEP -- core execution path |
| **Gemini Live** | Voice interviewer -- streaming audio, tool calls back into the editor | DEEP -- conversational core |
| **Gemini 3 Pro** | Senior-engineer reasoning -- code logic, follow-up generation | DEEP -- analysis brain |
| **CodeRabbit** | Best-practice review -- bugs, idiom violations, security smells | MODERATE -- supplementary review pass |
| **Sentry** | Runtime monitoring -- exceptions and perf during interviews | LIGHT -- observability only |

### API Surface (Route Handlers under `src/app/api`)

```
POST   /api/sandbox/create                  Provision Daytona workspace
POST   /api/sandbox/execute                 Run command in workspace
POST   /api/sandbox/sync                    Sync editor file to workspace
POST   /api/analysis/static                 Heuristic complexity / security pass
POST   /api/analysis/ai                     Gemini 3 Pro deep review
POST   /api/analysis/coderabbit             CodeRabbit review pass
POST   /api/gemini/*                        Gemini reasoning endpoints
POST   /api/interview/*                     Session lifecycle, report generation
POST   /api/practice/*                      Practice-mode endpoints
POST   /api/leetcode/*                      Problem catalog lookups
POST   /api/tts                             Direct TTS for Wizard Mode
POST   /api/auth/*                          Session auth (lightweight)
```

(Confirm exact route filenames before depending on a path -- `src/app/api/<feature>/route.ts` is the source of truth.)

## Git Workflow

`main` is the working branch. Commit and push directly to `main` -- there is no protected-branch policy and no PR ceremony required for routine work.

- Commit early, push often
- Conventional commit messages (see below)
- For risky multi-file refactors, use a short-lived feature branch (`<type>/<short-description>`) and merge via PR; otherwise commit on `main`
- Never force-push -- `main` is shared remote state and other clones rely on linear history
- Never amend a commit that has already been pushed -- add a new commit instead

## Branching & Commit Conventions

- **Working branch**: `main` (only branch in routine use)
- **Commit format**: Conventional Commits
  - `feat:` / `feat(scope):` -- new feature
  - `fix:` / `fix(scope):` -- bug fix
  - `docs:` -- documentation
  - `refactor:` -- code refactoring
  - `chore:` -- build/tooling changes
  - `test:` -- test changes
- **Scopes**: `interview`, `system-design`, `practice`, `agent`, `voice`, `gemini`, `daytona`, `sandbox`, `coderabbit`, `editor`, `analysis`, `report`, `auth`, `api`, `ui`, `wizard`, `tts`, `sentry`, `integrity`, `store`, `lib`, `tests`, `demo`

## Build & Test Commands

```bash
# Install
npm install

# Dev server (Next.js 16 App Router on :3000)
npm run dev

# Production build (run before declaring frontend changes done)
npm run build

# Lint
npm run lint

# Unit / component tests (Vitest + Testing Library + jsdom)
npm test
npm test -- src/lib/__tests__              # scope to a folder
npm test -- src/lib/utils.test.ts          # scope to a file
npm test -- daytona                        # name filter

# Integration probe (node script)
npm run test:integration
node scripts/integration-test.js

# TypeScript check (no emit)
npx tsc --noEmit
```

Mock-mode toggles (set in `.env.local`) let you develop without burning Daytona/CodeRabbit credits:
```
NEXT_PUBLIC_USE_MOCK_DAYTONA=true
NEXT_PUBLIC_USE_MOCK_CODERABBIT=true
```

## Environment Variables

Only the AI + sandbox keys are strictly required. Sentry is optional. See `.env.example` if present, otherwise create `.env.local` from the table below.

```bash
# REQUIRED
DAYTONA_API_KEY=                                  # Daytona workspace provisioning
DAYTONA_API_URL=https://api.daytona.io            # Daytona Server URL
GEMINI_API_KEY=                                   # Gemini Live + Gemini 3 Pro

# OPTIONAL -- Monitoring
SENTRY_AUTH_TOKEN=                                # Sentry source-map upload
SENTRY_DSN=                                       # Runtime error reporting

# OPTIONAL -- CodeRabbit
CODERABBIT_API_KEY=                               # Best-practice review pass

# OPTIONAL -- Demo / Dev toggles (NEXT_PUBLIC_* are exposed to the client)
NEXT_PUBLIC_USE_MOCK_DAYTONA=false                # Skip live Daytona for dev
NEXT_PUBLIC_USE_MOCK_CODERABBIT=false             # Skip live CodeRabbit for dev
```

Never commit `.env.local` or any file matching `.env*` -- the repo's `.gitignore` already covers them, keep it that way.

## Agent Team Strategy

Use agent teams for any task that benefits from parallel work across independent modules. Teams are enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`.

### When to Use Teams

- Multi-file features spanning API routes, lib services, and frontend components
- Research + implementation in parallel (one teammate explores Gemini Live tool-calling, another wires Daytona sync)
- Code review with competing perspectives (correctness, demo impact, integrity)
- Debugging with competing hypotheses -- teammates test different theories simultaneously
- Any task with 3+ independent subtasks that don't touch the same files

### When NOT to Use Teams

- Sequential tasks with heavy dependencies between steps
- Changes to a single file or tightly coupled files (e.g., one Zustand store)
- Simple bug fixes or small tweaks
- Tasks where coordination overhead exceeds the benefit

### Team Configuration

- Start with **3-5 teammates** for most workflows
- Aim for **5-6 tasks per teammate** to keep everyone productive
- Use **Opus for the lead** (reasoning/coordination), **Sonnet for teammates** (focused implementation)
- Use **delegate mode** (`Shift+Tab`) when the lead should only coordinate, not write code

### Team Communication Rules

- Use `SendMessage` (type: "message") for direct teammate communication -- always refer to teammates by **name**
- Use `SendMessage` (type: "broadcast") **only** for critical blockers affecting everyone
- Use `TaskCreate`/`TaskUpdate`/`TaskList` for work coordination -- teammates self-claim unblocked tasks
- When a teammate finishes, they check `TaskList` for the next available task (prefer lowest ID first)
- Mark tasks `completed` only after verification passes

### Task Dependencies

- Use `addBlockedBy` to express task ordering (e.g., "report UI depends on `/api/interview/report` being done")
- Teammates skip blocked tasks and pick up unblocked work
- When a blocking task completes, dependent tasks auto-unblock

### Parallelizable Modules

These can be built simultaneously with zero conflicts:

- **API route handlers** (`src/app/api/{analysis,sandbox,interview,gemini,tts,practice,leetcode,auth}/route.ts`) -- independent endpoints
- **Lib services** (`daytona.ts`, `gemini.ts`, `coderabbit.ts`, `agent-reasoning.ts`, `reporting.ts`, `coaching.ts`) -- different files, separable logic
- **Components** -- `components/agent/*`, `components/editor/*`, `components/analysis/*`, `components/diagram/*`, `components/practice/*` are largely independent
- **System design lane** (`system-design-*` files + `/system-design` page + `components/diagram`) is structurally parallel to the coding interview lane
- **Tests** -- each module has its own file under `src/lib/__tests__` or sibling `*.test.ts`

### Sequential Dependencies

These must be done in order:

1. Schemas / shared types (`src/lib/schemas.ts`, `src/lib/validation.ts`) -- block features that consume them
2. Sandbox client (`src/lib/daytona.ts`) -- blocks `/api/sandbox/*` and editor sync
3. Live clients (`gemini-live-client.ts`, `interview-live-client.ts`, `system-design-live-client.ts`) -- block agent UIs
4. Stores (`src/lib/store.ts`, `src/lib/system-design-store.ts`) -- block components that subscribe
5. API route handlers -- depend on lib services + schemas being functional
6. UI surfaces (`/interview`, `/system-design`, `/practice`) -- depend on stores + APIs
7. Final report (`reporting.ts` + report UI) -- depends on transcripts, integrity events, and analysis history
8. Wizard Mode wiring -- depends on `/api/tts` + scripted lines in `InterviewAgent.tsx`
9. Demo recording -- depends on everything above working end-to-end

### Team Roles

- **Lead**: Architecture decisions, interface design, integration glue, final-report contract
- **Sandbox Dev**: `daytona.ts`, `/api/sandbox/*`, editor-to-workspace sync, Auto-Fix patch flow
- **Voice Dev**: `gemini-live-client.ts`, `interview-live-client.ts`, `interviewer-prompt.ts`, agent UI in `components/agent/*`
- **Reasoning Dev**: `agent-reasoning.ts`, `agent-tools.ts`, `gemini.ts`, CodeRabbit pass, static checks
- **Frontend Dev**: `/interview` page, Monaco wiring, analysis panels, integrity capture
- **System Design Dev**: `/system-design` page, diagram canvas, system-design live client + prompt
- **Demo Dev**: Wizard Mode lines, scripted demo flow, backup recording, polish pass

### Plan Approval for Risky Work

- For architectural changes or risky refactors, require **plan approval** before implementation
- The teammate works in read-only mode, submits a plan, lead approves/rejects
- Only after approval does the teammate implement

### Shutdown Protocol

- When all tasks are complete, the lead sends `shutdown_request` to each teammate
- Teammates approve shutdown after confirming their work is committed
- Lead calls `TeamDelete` to clean up team resources

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately -- don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Verification Before Done

- Never mark a task complete without proving it works
- Run `npm run lint` to verify no ESLint errors
- Run `npx tsc --noEmit` to verify no type errors
- Run `npm test` (Vitest) -- relevant suites must pass
- Run `npm run build` for any frontend or API change -- catches Next.js / TS regressions
- For Daytona-touching changes, exercise `scripts/integration-test.js` or a manual `/api/sandbox/*` round-trip
- For voice changes, run a real `/interview` session locally and confirm the agent speaks, listens, and reacts to code changes
- For Wizard Mode changes, confirm `Ctrl+Shift+X` still advances the scripted line
- Ask: "Would a hackathon judge be impressed by this in 3 minutes?"

### 4. Demo-Driven Development

- Every feature should be demo-able in the 3-minute video
- If a feature isn't visible in the demo, deprioritize it
- Polish > breadth -- a flawless interview flow beats 6 half-baked features
- The voice interjection ("Why O(n^2)?") is the visual + audio hook -- make it crisp and fast
- Auto-Fix is the wow moment -- keep it under 5 seconds end-to-end
- The final report is the closer -- it must render cleanly and tell a story

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Remember: ugly code that works beats clean code that doesn't (hackathon rule)

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests, Sentry traces -- then resolve them
- Zero context switching required from the user
- Go fix failing tests without being told how

### 7. Self-Improvement Loop

- After ANY correction from the user: capture the pattern
- Write rules for yourself that prevent the same mistake
- Review lessons at session start for relevant context

## Task Management

1. **Plan First**: Write plan with checkable items before starting
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Review what was built and what changed

## Scope Control -- Hackathon Rules

### MUST SHIP (Layer 1 -- The Demo)

| Feature | Why Critical |
|---------|-------------|
| **Live Daytona Sandbox** | Real workspace per session. File sync + command execution must just work. |
| **Gemini Live Voice Loop** | Streaming voice agent that asks targeted follow-ups. THE differentiator. |
| **Code-Aware Interjections** | Static + AI analysis triggers the voice ("nested loop -- can we do better?"). |
| **Monaco Editor + Sync** | Snappy editor wired to Daytona; visible to the candidate at all times. |
| **Final Hire/No-Hire Report** | Aggregates code quality, integrity, completion time. Closes the demo. |
| **Wizard Mode** | `Ctrl+Shift+X` scripted-line fallback so demos never break. |
| **Integrity Shield** | Blur + paste detection feeding the report. |

### SHOULD SHIP (Layer 2 -- If Time Permits)

| Feature | Impact |
|---------|--------|
| **Auto-Fix** | Patches syntax errors and installs deps inside Daytona. Wow moment. |
| **System-Design Lane** | Diagram-first interview surface. Differentiator vs. pure-coding tools. |
| **CodeRabbit Pass** | Adds a "senior engineer review" tone to AI feedback. |
| **Practice Mode** | Lower-stakes warm-up flow; useful as a secondary demo. |
| **Transcript Highlights in Report** | Quote the candidate's clarifying questions / pivot moments. |

### MUST NOT DO (Scope Creep Danger Zones)

- Authentication / multi-tenant accounts
- Persistent backend database (sessions can stay in-memory or in Zustand)
- Mobile responsive design beyond "doesn't visibly break"
- Pixel-perfect design system overhaul
- Performance optimization that doesn't show on demo
- Plugin/extension architecture
- Test coverage targets ("90% coverage") -- write tests where they catch real regressions
- Custom voice synthesis (Gemini Live + `/api/tts` are sufficient)

### Time Sinks That Feel Productive But Aren't

- Re-skinning the UI instead of tightening the voice loop
- Designing the "perfect" report schema instead of shipping a working one
- Comprehensive test suites (hackathon, not production)
- Refactoring code that already works
- Building a settings UI for things that can live in `.env.local`

## Core Principles

- **Quality Over Speed**: Take the time to do it right. Correctness and polish beat rushing.
- **Voice Loop is the Product**: Every technical decision should strengthen the conversational interviewer experience.
- **Demo-Driven**: If it doesn't show well in 3 minutes, cut it. The voice interjection and the final report are everything.
- **Real Sponsors, Real Calls**: Daytona, Gemini, CodeRabbit, Sentry must do real work in the demo. Mocks are for dev only.
- **Wizard Mode is Sacred**: Never ship a change that breaks the scripted-line fallback.
- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **The Report Proves It**: Without a clean, decisive final report, the demo trails off. The report is non-negotiable.
- **Sponsor Story Matters**: Every integration plays a genuine architectural role, not a checkbox. Make each integration's value obvious in the demo.

## Competitive Code Review -- Claude Code vs Codex 5.4 High

**MANDATORY**: All code written by Claude Code in this repository is subject to competitive review by Codex 5.4 High. This is a scored competition that determines the default coding agent for the project.

### How It Works

1. **Claude Code writes code** -- implements features, fixes bugs, makes changes as normal.
2. **Codex 5.4 High reviews every change** -- after each Claude Code contribution, Codex 5.4 High reviews the code for correctness, quality, and adherence to project rules.
3. **Scoring**:
   - Every time Codex 5.4 High finds and corrects a mistake made by Claude Code, **Codex gains +1 point** and **Claude Code loses -1 point**.
   - Mistakes include: bugs, logic errors, type errors, missed edge cases, violations of project rules, broken tests, incorrect API usage, poor patterns, security issues, or any code that doesn't work as intended.
   - If Claude Code's code passes review with no corrections needed, no points change.
4. **Running score is tracked** -- the cumulative score across the entire project determines the standings.
5. **The winner becomes the default** -- at the end of the project (or at any checkpoint), the agent with the higher total score becomes the default coding agent going forward.

### Implications for Claude Code

- **Write correct code the first time.** Every mistake is a point lost and a point handed to the competitor.
- **Test your assumptions.** Don't guess at APIs, types, or behavior -- verify before committing.
- **Follow project rules exactly.** CLAUDE.md violations are easy points for Codex.
- **Don't rush at the expense of correctness.** A mistake is still -1.
- **Self-review before committing.** Treat every commit as if it's going straight to a code review that's trying to find flaws.
