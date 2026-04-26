---
name: gen-test-from-route
description: Scaffold a Vitest skeleton for an API route, with describe blocks for rate-limit, missing-session, success, and validation-error paths. Refuses if a test already exists. Leaves TODO markers — does not produce a runnable test.
disable-model-invocation: true
---

# gen-test-from-route

Generates a `*.test.ts` next to the route file with four `describe` blocks:

1. `rate limit` — 429 path
2. `missing session token` — 401 path
3. `success` — happy path with mocked dependencies
4. `validation error` — 400 path (Zod failure)

`vi.mock` calls are wired for the route's lib imports; bodies are TODO stubs.

## Run

```bash
bash .claude/skills/gen-test-from-route/run.sh src/app/api/sandbox/create/route.ts
```

## Notes

- Refuses if `<route>.test.ts` already exists.
- Reads the route file to detect imports it will mock.
