# Phase 6: Polish & Demo Prep

## Goal
Prepare the application for the final presentation. The focus is on a smooth "Happy Path" that demonstrates all key features (Voice, Code, Analysis) in under 3 minutes.

## Detailed Implementation Steps

### 1. The Demo Script (Happy Path)
1.  **Start**: User clicks "Start Interview".
2.  **Agent Intro**: "Hi there! I'm Alex. Today we're going to work on reversing a linked list. Can you start by defining the Node class?"
3.  **Action**: User writes `class Node: ...`.
4.  **Agent Observation**: "Great start. Now, how would you handle the `prev` pointer in the reversal function?"
5.  **Mistake**: User writes a bug (forgetting to update `head`).
6.  **Agent Correction**: "Hmm, take a look at line 15. Are we updating the head reference correctly?"
7.  **Success**: User fixes it. "Run Code". Output Correct.
8.  **Completion**: Agent says "Excellent work. You nailed the pointer manipulation."

### 2. Fallback Strategy ("Wizard of Oz")
If the AI is unpredictable during the live recording:
*   **Hardcode Response Mode**: Add a hidden button (or keyboard shortcut `Ctrl+Shift+X`).
*   When pressed, force the Agent (via `text-to-speech` only) to say the next scripted line from a pre-defined array, ignoring the actual LLM output.
*   This ensures the video narrative remains coherent even if the LLM hallucinates.

### 3. Final Code Cleanup
*   Run `eslint --fix` on the whole project.
*   Add a `README.md` with:
    *   **Architecture Diagram** (Mermaid).
    *   **Setup Instructions** (`npm install`, `.env` setup).
    *   **Features List** (Voice Interview, Live Sandbox, Auto-Analysis).

## Debugging & Verification

### Step 1: Dry Run Checklist
*   [ ] Microphone Input Level: Checked?
*   [ ] API Keys Valid: Gemini, Daytona?
*   [ ] Latency: Is the voice response < 3 seconds?
*   [ ] Console Clean: No red errors visible during the flow?

### Step 2: Visual Polish
*   Check the "Agent Speaking" visualizer. Is it synced?
*   Ensure the "Code Running" spinner is visible so the user knows something is happening.
