#!/usr/bin/env bash
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

ROUTE="${1:-}"
if [[ -z "$ROUTE" ]]; then
  echo "usage: $0 src/app/api/<group>/route.ts"
  exit 1
fi

if [[ ! -f "$ROUTE" ]]; then
  echo "❌ not found: $ROUTE"
  exit 1
fi

case "$ROUTE" in
  src/app/api/*/route.ts) ;;
  *) echo "❌ not an API route: $ROUTE"; exit 1 ;;
esac

TEST="${ROUTE%.ts}.test.ts"
if [[ -f "$TEST" ]]; then
  echo "❌ test already exists: $TEST"
  exit 1
fi

IMPORTS=$(grep -E "^import .* from '@/lib/" "$ROUTE" \
  | grep -oE "@/lib/[A-Za-z0-9_./-]+" \
  | sort -u)

MOCK_BLOCK=""
while IFS= read -r mod; do
  [[ -z "$mod" ]] && continue
  MOCK_BLOCK+="vi.mock('$mod');"$'\n'
done <<< "$IMPORTS"

ROUTE_REL_FROM_TEST="./$(basename "$ROUTE" .ts)"
GROUP=$(echo "$ROUTE" | sed -E 's|^src/app/api/||; s|/route\.ts$||')

cat > "$TEST" <<EOF
import { describe, it, expect, vi, beforeEach } from 'vitest';

${MOCK_BLOCK}vi.mock('@/lib/rate-limiter');
vi.mock('@/lib/session');

describe('$GROUP route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('rate limit', () => {
    it('returns 429 when rate limiter rejects', async () => {
      // TODO: mock rateLimiter.check to return { allowed: false }
      // TODO: import POST from '$ROUTE_REL_FROM_TEST' and call it with a Request
      // TODO: expect(res.status).toBe(429)
      expect(true).toBe(true);
    });
  });

  describe('missing session token', () => {
    it('returns 401 when validateSession fails', async () => {
      // TODO: mock validateSession to return null/throw
      // TODO: call POST with no/invalid session cookie
      // TODO: expect(res.status).toBe(401)
      expect(true).toBe(true);
    });
  });

  describe('success', () => {
    it('returns 200 on the happy path', async () => {
      // TODO: mock rateLimiter.check -> allowed
      // TODO: mock validateSession -> valid session
      // TODO: mock the underlying service call to return a fixture
      // TODO: call POST with a valid body
      // TODO: expect(res.status).toBe(200)
      expect(true).toBe(true);
    });
  });

  describe('validation error', () => {
    it('returns 400 when the body fails Zod validation', async () => {
      // TODO: mock rateLimiter.check -> allowed
      // TODO: mock validateSession -> valid session
      // TODO: call POST with a body that violates the schema
      // TODO: expect(res.status).toBe(400)
      expect(true).toBe(true);
    });
  });
});
EOF

echo "✅ wrote $TEST"
