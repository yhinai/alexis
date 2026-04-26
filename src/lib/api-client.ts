/**
 * Client-side API helper that attaches session auth tokens to requests.
 */

const SESSION_HEADER = 'x-session-token';
let sessionToken: string | null = null;
let sessionPromise: Promise<string | null> | null = null;

/**
 * Initialize the session by fetching a token from the server.
 * Idempotent — concurrent and repeat callers share one in-flight request.
 */
export function initSession(): Promise<string | null> {
    if (sessionToken) return Promise.resolve(sessionToken);
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
        try {
            const res = await fetch('/api/auth/session', { method: 'POST' });
            const data = await res.json();
            if (data.data?.token) {
                sessionToken = data.data.token;
                return sessionToken;
            }
        } catch (err) {
            console.warn('Failed to init session:', err);
        } finally {
            sessionPromise = null;
        }
        return null;
    })();
    return sessionPromise;
}

/**
 * Get the current session token (for manual use).
 */
export function getSessionToken(): string | null {
    return sessionToken;
}

/**
 * Wrapper around fetch that automatically attaches the session token header.
 */
export function authFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (sessionToken) {
        headers.set(SESSION_HEADER, sessionToken);
    }
    return fetch(url, { ...init, headers });
}
