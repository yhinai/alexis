# Phase 4: Monitoring & Analysis (Gemini 3 + Sentry AI)

## Goal
Implement a robust analysis loop using **Google Gemini 3 Pro** for deep code review and **Sentry AI Monitoring** to trace the agent's performance and costs.

## Detailed Implementation Steps

### 1. Sentry for Runtime & Agent Monitoring
*   **Frontend**: Standard `@sentry/nextjs` config.
*   **Agent Tracing**:
    *   Wrap the Gemini API calls in Sentry Spans to track token usage and latency.

    ```typescript
    import * as Sentry from "@sentry/nextjs";

    // In your analysis route
    export async function analyzeCode(code: string) {
      return Sentry.startSpan({ name: "ai.analysis", op: "ai.pipeline" }, async (span) => {
        // ... Gemini call here ...
        span.setAttribute("ai.model_id", "gemini-3-pro");
        span.setAttribute("ai.prompt_tokens", usageMetadata.promptTokenCount);
        // ...
      });
    }
    ```

### 2. "Gemini 3" Analysis Proxy
Create a background function that runs when code is executed.

**Prompt for Gemini 3 Pro**:
```text
Role: Senior Code Reviewer.
Input: Python/TS Code.
Task: Analyze for:
1. Critical Bugs (Syntax errors missed, logic errors).
2. Time Complexity (Big O).
3. Code Smells.

Use "Deep Think" reasoning to verify if the algorithm handles edge cases.

Output JSON:
{
  "score": 1-10,
  "complexity": "O(n)",
  "issues": ["List of brief issue descriptions"],
  "reasoning_trace": "Brief summary of thought process"
}
```

**Route: `src/app/api/analysis/review/route.ts`**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro" });

export async function POST(req: Request) {
   const { code } = await req.json();
   const result = await model.generateContent(PROMPT + code);
   // ... return JSON
}
```

### 3. Competency Report
*   Collect the Gemini 3 analysis results.
*   Display:
    *   Pass/Fail Status.
    *   Issues List.
    *   **"AI Reasoning"**: Show the `reasoning_trace` so the candidate learns *why* their code was flagged.

## Debugging & Verification

### Step 1: The "Deep Think" Test
*   Write a subtle bug (e.g., an "off-by-one" error in a loop).
*   Run the Gemini Proxy.
*   **Check**: Does Gemini 3 catch it where a simpler model might miss it?

### Step 2: Sentry Dashboard Check
*   Trigger an analysis run.
*   Go to Sentry -> **AI Monitoring**.
*   **Check**: Can you see the "Trace", the prompt sent, and the token usage cost?

### Step 3: Rate Limit Handling
*   Ensure the Analysis API doesn't run on *every* keystroke.
*   **Check**: Verify it only runs on "Run Code" click or explicitly every 60 seconds.
