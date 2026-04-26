/**
 * Interview Tools for Gemini Live WebSocket API
 * Uses plain JSON format compatible with Live API (not SDK types)
 */
export const INTERVIEW_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "read_candidate_code",
        description: "Read the current code written by the candidate in the code editor. Use this to see what they've typed.",
      },
      {
        name: "run_code",
        description: "Execute the candidate's current code and run tests. Use this when the candidate says 'run it', 'test it', 'execute', or 'I'm done'.",
      },
      {
        name: "get_current_problem",
        description: "Get the current coding problem details including description, examples, and constraints.",
      },
      {
        name: "read_sandbox_file",
        description: "Read a specific file from the sandbox workspace.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The file path to read",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "install_dependency",
        description: "Install a package in the sandbox environment.",
        parameters: {
          type: "object",
          properties: {
            packageName: {
              type: "string",
              description: "Package name to install",
            },
            manager: {
              type: "string",
              description: "Package manager: 'pip' or 'npm'",
            },
          },
          required: ["packageName", "manager"],
        },
      },
      {
        name: "run_hidden_test",
        description: "Run a specific test case against the candidate's code.",
        parameters: {
          type: "object",
          properties: {
            testCode: {
              type: "string",
              description: "The test code to execute",
            },
          },
          required: ["testCode"],
        },
      },
      {
        name: "get_interview_mode",
        description: "Get current interview mode (real or practice) and role instructions.",
      },
      {
        name: "provide_hint",
        description: "Provide a hint to help the candidate (practice mode only).",
        parameters: {
          type: "object",
          properties: {
            level: {
              type: "number",
              description: "Hint level (0 = first hint, 1 = more specific, etc.)",
            },
          },
        },
      },
      {
        name: "explain_concept",
        description: "Explain a coding concept to the candidate (practice mode only).",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The concept to explain",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "get_integrity_status",
        description: "Check if candidate has copy-pasted code or switched tabs.",
      },
      {
        name: "end_interview",
        description: "End the interview session and generate the final report. Use this when the candidate says they want to end the interview, says 'I'm done with the interview', 'let's wrap up', 'end the interview', or similar. Always give a brief closing remark before calling this tool.",
      },
      {
        name: "end_interview_now",
        description: "Wrap up the interview and trigger the final report. Use when the candidate clearly says they are done, want to stop, or asks to end the interview.",
      },
      {
        name: "skip_to_next_problem",
        description: "Move on to a different problem of the same difficulty. Use when the candidate says skip / next / try a different one.",
      },
      {
        name: "change_difficulty",
        description: "Switch to a problem of the requested difficulty (Easy/Medium/Hard). Use when the candidate asks for an easier or harder problem.",
        parameters: {
          type: "object",
          properties: {
            direction: {
              type: "string",
              enum: ["easier", "harder"],
              description: "Direction to change difficulty.",
            },
          },
          required: ["direction"],
        },
      },
      {
        name: "take_break",
        description: "Pause the interview for N seconds. Use when the candidate asks for a break, water, restroom, etc.",
        parameters: {
          type: "object",
          properties: {
            seconds: {
              type: "number",
              description: "Break duration in seconds (max 600).",
            },
          },
          required: ["seconds"],
        },
      },
      {
        name: "repeat_question",
        description: "Re-state the current problem clearly. Use when the candidate asks to hear the question again or seems lost on what to solve.",
      },
      {
        name: "record_visual_observation",
        description: "Record a noteworthy visual observation about the candidate. Call this when you see something significant: a long away gap, an integrity concern, a stress spike, an aha moment, a meaningful gesture, or an environmental cue. Don't call for routine reactions — only for events worth showing in the final report.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["away", "integrity", "stress", "engagement", "aha", "gesture", "environment"],
              description: "The category of the observation.",
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Severity. Use 'high' for integrity concerns, 'medium' for stress/away, 'low' for positive engagement/aha.",
            },
            note: {
              type: "string",
              description: "A short factual description of what you saw (max 200 chars). Avoid speculation — describe the observable cue.",
            },
          },
          required: ["category", "severity", "note"],
        },
      },
    ],
  },
];
