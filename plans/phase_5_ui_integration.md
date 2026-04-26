# Phase 5: UI/UX & Integration

## Goal
Assemble the pieces into a seamless, single-page interview application. The layout must minimize context switching between coding and listening.

## Detailed Implementation Steps

### 1. State Management (`src/lib/store.ts`)
Define the comprehensive Zustand store.

```typescript
interface InterviewState {
  // Session
  status: 'idle' | 'active' | 'completed';
  startSession: () => void;
  endSession: () => void;

  // Code
  language: 'python' | 'typescript';
  code: string;
  setCode: (code: string) => void;
  consoleOutput: string[];
  addLog: (log: string) => void;

  // Analysis
  latestReview: { score: number; issues: string[] } | null;
  setReview: (review: any) => void;
}
```

### 2. Component Architecture (`src/app/interview/page.tsx`)
Use a CSS Grid or Resizable Panels (using `react-resizable-panels`) for the layout.

```tsx
<InterviewLayout>
  {/* Left: 30% width */}
  <Panel defaultSize={30}>
    <ProblemDescription markdown={PROBLEM_MARKDOWN} />
  </Panel>

  {/* Center: 50% width */}
  <Panel defaultSize={50}>
    <MonacoWrapper
      language={state.language}
      value={state.code}
      onChange={state.setCode}
    />
    <ConsolePanel output={state.consoleOutput} />
  </Panel>

  {/* Right: 20% width (Overlay or Sidebar) */}
  <Panel defaultSize={20}>
    <AgentOverlay /> {/* Contains Visualizer & Status */}
    <Controls /> {/* Start/Stop, Submit */}
  </Panel>
</InterviewLayout>
```

### 3. Middleware/Logger
Add a subscriber to the store to log changes during development.
```typescript
useInterviewStore.subscribe((state) => {
  console.log("State Changed:", state.status, state.code.length + " chars");
});
```

## Debugging & Verification

### Step 1: Responsive Design Check
*   Open DevTools and resize to Tablet size (768px).
*   **Check**: Does the Monaco Editor collapse gracefully? Do panels stack?
*   **Fix**: If mobile is unusable, show a "Desktop Required" banner (common for coding interviews).

### Step 2: State Persistence
*   Reload the page.
*   **Check**: Does the code disappear?
*   **Refinement**: Use `persist` middleware in Zustand to save `code` to localStorage so candidates don't lose work on refresh.

### Step 3: Keyboard Navigation
*   Ensure `Tab` works inside the editor (indentation) vs `Tab` outside (navigation).
*   Monaco usually traps focus; ensure there is an escape key (`Esc`) hint to exit the editor focus.
