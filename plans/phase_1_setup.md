# Phase 1: Project Setup & Infrastructure

## Goal
Initialize the repository with a robust Next.js 14+ (App Router) architecture, ensuring all necessary dependencies for Voice AI, Code Editing, and Sandbox management are correctly installed and configured, leveraging the latest **2025/2026** toolset.

## Detailed Implementation Steps

### 1. Project Initialization & Structure
*   **Command**: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`
*   **Target Directory Structure**:
    ```text
    /
    ├── .env.local              # Secrets (GEMINI_API_KEY, DAYTONA_API_KEY, etc.)
    ├── next.config.js          # Next.js config
    ├── tailwind.config.ts      # UI styling config
    ├── src/
    │   ├── app/
    │   │   ├── api/            # Backend routes (Sandbox proxy)
    │   │   ├── interview/      # Main interview page
    │   │   ├── layout.tsx      # Root layout (Providers: Theme, Sentry)
    │   │   └── page.tsx        # Landing page
    │   ├── components/
    │   │   ├── ui/             # Shadcn/Radix primitives (Button, Card, Dialog)
    │   │   ├── editor/         # Monaco Editor wrapper components
    │   │   └── agent/          # AudioVisualizer, StatusIndicators
    │   ├── lib/
    │   │   ├── daytona.ts      # Daytona SDK wrapper / API service
    │   │   ├── gemini.ts       # Google Generative AI Service
    │   │   ├── store.ts        # Zustand state store
    │   │   └── utils.ts        # CN helper, formatters
    │   └── types/              # TS Interfaces (InterviewState, SandboxResponse)
    ```

### 2. Dependency Installation
Execute the following to install locked versions of critical packages (updated for 2026 stack):

```bash
# UI & Icons
npm install lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-dialog

# State Management
npm install zustand

# Code Editor
npm install @monaco-editor/react

# AI & Voice
npm install @google/genai             # For Gemini Live (voice) and Gemini 3 Pro

# Monitoring
npm install @sentry/nextjs

# Sandbox (Daytona)
npm install @daytonaio/sdk            # Official SDK for programmatic workspaces
```

### 3. Configuration Setup

**A. `next.config.js`**
Configure to allow images if we use external avatars, and suppress strict mode if Monaco causes double-mount issues during dev.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Often helps with Monaco/WebSockets in dev
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};
module.exports = nextConfig;
```

**B. Environment Variables (`.env.local`)**
Create the template:

```ini
# Daytona
DAYTONA_API_KEY=dy_...
DAYTONA_API_URL=https://api.daytona.io/...
NEXT_PUBLIC_USE_MOCK_DAYTONA=true  # Set to false when real API is ready

# Gemini (voice via Gemini Live + Gemini 3 reasoning)
GEMINI_API_KEY=AIza...

# Monitoring
SENTRY_DSN=...
```

## Debugging & Verification

### Step 1: Dependency Conflict Check
Run `npm ls` to ensure no peer dependency warnings.
*   **Command**: `npm ls --depth=0`
*   **Expected**: No "UNMET PEER DEPENDENCY" errors. Specifically check `@google/genai` version.

### Step 2: Smoke Test Components
Create a temporary page `src/app/test/page.tsx`:
1.  Import `MonacoEditor`.
2.  Import `lucide-react` icon.
3.  Render both.
4.  Run `npm run dev`.
5.  **Check**: Does the editor load? Do icons appear?

### Step 3: Sentry Verification
*   Uncomment the `Sentry.init` in `instrumentation.ts` (created by wizard).
*   Throw a test error in a `useEffect` on the landing page: `throw new Error("Sentry Test")`.
*   **Check**: Verify the error appears in the Sentry dashboard.
