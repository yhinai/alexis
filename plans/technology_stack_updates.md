# Technology Stack Updates (2026 Edition)

This document outlines the major technology upgrades implemented to ensure **InterviewSandbox** is cutting-edge, performant, and robust.

## 1. Google Gemini 3 Pro (The Intelligence Layer)
*   **Version**: `gemini-3-pro`
*   **Why**:
    *   **Reasoning Capability**: Replaces generic LLMs with Gemini 3's "Deep Think" mode. This allows the system to perform actual *algorithm analysis* (calculating Time Complexity from raw code) rather than just pattern matching.
    *   **Context**: 1M+ token window means the agent remembers the *entire* interview context, including every code edit.
    *   **Speed**: Faster inference for real-time feedback loops.

## 2. Google Gemini Live (The Interface)
*   **Version**: `@google/genai` (Gemini Live API)
*   **Why**:
    *   **Interruptibility**: Low-latency bidirectional streaming over WebSockets, allowing candidates to interrupt the interviewer naturally.
    *   **Multimodal Input**: The agent processes text context (code) and audio (voice) simultaneously through a single Google AI provider.
    *   **Unified Stack**: Same `GEMINI_API_KEY` powers both voice (Gemini Live) and reasoning (Gemini 3), simplifying ops and cost tracking.

## 3. Daytona SDK + MCP (The Environment)
*   **Version**: `@daytonaio/sdk` (2025 Release)
*   **Why**:
    *   **Programmatic Workspaces**: `daytona.create()` now spins up containers in ~200ms, removing the need for complex pre-warming pools.
    *   **MCP Support**: Future-proofing the app to allow the AI Agent to directly interact with the sandbox (running tests, listing files) via the Model Context Protocol standards.

## 4. Sentry AI Monitoring (The Observability)
*   **Version**: `@sentry/nextjs` (with AI/Seer enabled)
*   **Why**:
    *   **Token Cost Tracking**: Automatically tracks Gemini API usage per interview.
    *   **Agent Tracing**: Visualizes the "Thought Process" of the AI. If the interviewer hallucinates, we can replay the exact prompt/response trace in Sentry.
    *   **Seer**: Uses AI to group error logs intelligently, distinguishing between "Sandbox Runtime Errors" (User code) and "System Errors" (Our platform).
