# Phase 7: Daytona Sprint Enhancements (Winning Features)

## Goal
Transform the project into a "winning submission" for the Daytona Sprint by adding **Agentic Infrastructure Control**, **Autonomous Testing**, **Integrity Monitoring**, and **Post-Interview Reporting**. These features demonstrate the unique value of Daytona's secure sandboxes when controlled by an AI agent.

## Detailed Implementation Steps

### 1. Agentic Environment Management
Give the Gemini Live agent the ability to install dependencies dynamically, proving it controls the infrastructure.

*   **Update `DaytonaService` (`src/lib/daytona.ts`)**:
    *   Enhance `installDependencies` to accept a package name and manager (pip/npm) and return detailed success/fail output.
    *   Ensure it handles `sudo` or permissions correctly within the Daytona container if needed (usually root by default).
*   **Update `InterviewAgent` (`src/components/agent/InterviewAgent.tsx`)**:
    *   Add a new client tool: `install_dependency`.
    *   **Tool Signature**: `({ packageName, manager }: { packageName: string, manager: string })`
    *   **Logic**: Calls `DaytonaService.installDependencies` (via API proxy) and returns "Installed X successfully" or error log.

### 2. Autonomous "Test Engineer" Mode
Enable the agent to write and run its own hidden tests to verify candidate code without user intervention.

*   **Update `InterviewAgent` Client Tools**:
    *   Add tool: `run_hidden_test`.
    *   **Tool Signature**: `({ testCode }: { testCode: string })`
    *   **Logic**:
        1.  Saves `testCode` to a hidden file (e.g., `_agent_test.py`) using `daytona.saveFile`.
        2.  Executes the file using `daytona.executeCode`.
        3.  Returns `stdout/stderr` to the Agent *only* (does not display in the candidate's console).
        4.  Agent uses this output to give verbal feedback ("I tested with an empty list and it crashed.").

### 3. Integrity & Anti-Cheating
 leverage the "Secure Infrastructure" theme to add proctoring capabilities.

*   **Update Store (`src/lib/store.ts`)**:
    *   Add `IntegrityState` slice:
        *   `blurCount`: number (times tab lost focus).
        *   `pasteCount`: number.
        *   `largePasteEvents`: Array of timestamps and lengths.
        *   `addIntegrityEvent`: Action.
*   **Update `CodeEditor` (`src/components/editor/CodeEditor.tsx`)**:
    *   Add `onPaste` handler to detect large insertions (>50 chars).
    *   Add `window.addEventListener('visibilitychange')` to track tab switching.
*   **Update `InterviewAgent`**:
    *   Add tool: `get_integrity_status` that reads from the store and returns a summary ("Candidate has left the tab 3 times").

### 4. Post-Interview "Hire/No-Hire" Report
Generate a tangible artifact from the interview session.

*   **Create Reporting Service (`src/lib/reporting.ts`)**:
    *   Function `generateReport(state)` that compiles:
        *   Final Code.
        *   Test Results (from `run_hidden_test` logs if we track them).
        *   Integrity Score (calculated from blur/paste counts).
        *   Agent's final verbal summary (we might need to ask the agent for a final summary via a new tool or prompt).
*   **UI Integration**:
    *   Add "End Interview" button.
    *   On click: Trigger report generation -> Download `interview_report.md` or show in a Modal.

### 5. Documentation
*   Create `plans/phase_7_daytona_sprint.md` (this file) to track progress.
*   Update `README.md` to highlight these "Agentic" features for the hackathon judges.
