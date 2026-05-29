/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers and strings
 */

// Wizard Mode Script - Demo interview prompts
export const WIZARD_SCRIPT = [
    "Hi there! I'm Alex. Today we're going to work on reversing a linked list. Can you start by defining the Node class?",
    "Great start. Now, how would you handle the prev pointer in the reversal function?",
    "Hmm, take a look at line 15. Are we updating the head reference correctly?",
    "Excellent work. You nailed the pointer manipulation."
];

// Integrity Shield Thresholds
export const LARGE_PASTE_THRESHOLD = 50;

// Code Complexity Thresholds
export const COMPLEXITY_HIGH = 8;
export const COMPLEXITY_MEDIUM = 6;
export const MAX_HINTS = 3;

// Timeout Values (in milliseconds)
export const DEFAULT_EXECUTION_TIMEOUT = 30000;
export const DEFAULT_CREATE_TIMEOUT = 60; // seconds

// Daytona Configuration - Optimized for disk limit management
export const DEFAULT_AUTO_STOP_INTERVAL = 5; // minutes - stop quickly when idle
export const DEFAULT_AUTO_ARCHIVE_INTERVAL = 10; // minutes - archive quickly to free disk
export const DEFAULT_NETWORK_ALLOW_LIST = ''; // Empty = allow all
export const MAX_WORKSPACE_AGE_MS = 30 * 60 * 1000; // 30 minutes max workspace lifetime

// Retry Configuration
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
} as const;

// Gemini AI Retry Configuration
export const GEMINI_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
} as const;

// CodeRabbit CLI Configuration
export const CODERABBIT_INSTALL_CMD = 'curl -fsSL https://cli.coderabbit.ai/install.sh | sh';
export const CODERABBIT_INSTALL_TIMEOUT = 60000; // 60 seconds

// Voice Configuration (Gemini Live voices: Aoede, Puck, Charon, Kore, Fenrir)
export const DEFAULT_GEMINI_VOICE = "Aoede"; // Warm, professional female voice
export const DEFAULT_VOICE_ID = DEFAULT_GEMINI_VOICE; // Alias for backwards compatibility

// Gemini model identifiers — single source of truth. Rotating a model = one-line PR.
export const GEMINI_MODELS = {
  reasoning: 'gemini-3.1-pro-preview',
  tts: 'gemini-3.1-flash-tts-preview',
  liveAudio: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
} as const;

// Keyboard Shortcuts — Wizard Mode is a dev-only demo override.
// In production builds we set this to null so the listener short-circuits.
export const WIZARD_SHORTCUT: { ctrl: boolean; shift: boolean; key: string } | null =
  process.env.NODE_ENV === 'production'
    ? null
    : { ctrl: true, shift: true, key: 'X' };

// Aggressive throttle on credential-mint endpoint. Even after ephemeral-token
// migration, this endpoint is the gate to costly downstream calls. 10/min
// tolerates StrictMode double-mounts in dev and occasional refreshes during
// a slow Daytona cold start.
export const GEMINI_SESSION_RATE_LIMIT = { tokens: 10, window: 60_000 } as const;
