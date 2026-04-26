# Phase 2: Daytona Sandbox Integration

## Goal
Build the bridge between the frontend editor and the Daytona execution environment. This involves a service layer to manage workspaces and Next.js API routes to securely proxy requests, bypassing CORS and exposing only necessary operations.

## Detailed Implementation Steps

### 1. Service Layer (`src/lib/daytona.ts`)
Create a singleton or utility class `DaytonaService` to handle API logic.

```typescript
// Conceptual Interface
interface WorkspaceConfig {
  language: 'python' | 'typescript';
  id: string;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DaytonaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DAYTONA_API_KEY!;
    this.baseUrl = process.env.DAYTONA_API_URL!;
  }

  // 1. Create a workspace (or getting a pre-warmed one)
  async createWorkspace(language: string): Promise<WorkspaceConfig> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      return { id: 'mock-ws-123', language };
    }
    // Call real Daytona Create API
    // POST /workspaces ...
  }

  // 2. Execute Code
  async executeCode(workspaceId: string, code: string): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      return { stdout: "Mock Output: Hello World", stderr: "", exitCode: 0 };
    }
    // Call Daytona Exec API
    // POST /workspaces/{id}/exec ...
  }

  // 3. File Operations (for syncing editor)
  async updateFile(workspaceId: string, path: string, content: string): Promise<void> {
    // PUT /workspaces/{id}/files ...
  }
}
```

### 2. API Routes (Next.js Backend)
Since the browser cannot hold the `DAYTONA_API_KEY`, we wrap calls in internal APIs.

**Route: `src/app/api/sandbox/execute/route.ts`**
*   **Method**: `POST`
*   **Request Schema**:
    ```json
    {
      "workspaceId": "string",
      "code": "string",
      "language": "python"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "stdout": "string",
      "stderr": "string",
      "isError": boolean
    }
    ```

**Route: `src/app/api/sandbox/create/route.ts`**
*   **Method**: `POST`
*   **Body**: `{ "language": "python" }`
*   **Response**: `{ "workspaceId": "...", "status": "ready" }`

### 3. Editor Integration (Frontend)
In `src/components/editor/CodeEditor.tsx`:
*   Use `onChange` listener from Monaco.
*   Implement a **Debounce** (wait 1000ms after last keystroke) before saving to Daytona (to save API bandwidth).
*   Add a "Run" button that calls `/api/sandbox/execute` immediately.

## Debugging & Verification

### Step 1: Mock Mode Verification
*   Set `NEXT_PUBLIC_USE_MOCK_DAYTONA=true` in `.env.local`.
*   Click "Run" in the UI.
*   **Expected**: Console logs "Mock Output: Hello World".

### Step 2: API Endpoint Testing (Curl)
Test the internal API independent of the UI.
```bash
curl -X POST http://localhost:3000/api/sandbox/execute \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"test", "code":"print(1+1)", "language":"python"}'
```
*   **Expected**: JSON response with `stdout`.

### Step 3: Latency Check
*   Measure the time from clicking "Run" to seeing output.
*   If > 2 seconds, verify if Daytona container spin-up is the bottleneck.
*   **Fix**: Implement "Keep-Alive" pings or pre-provision workspaces on the Landing Page.
