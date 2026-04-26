---
name: verify-avatar
description: Smoke-test the SpatialReal avatar pipeline end-to-end — session token mint, WASM availability at the rewrite URL, and avatar manifest fetch. Use before demos and after touching anything in the avatar chain.
disable-model-invocation: true
---

# verify-avatar

Three checks specific to the avatar integration:

1. **Session mint** — POSTs to the SpatialReal console with the server-side `SPATIALREAL_API_KEY`. A 200 + non-empty `sessionToken` means your key is valid and the right region is reachable.
2. **WASM URL** — GETs `http://localhost:3000/spatialreal/avatar_core_wasm-bd762669.wasm` and verifies the response is `application/wasm` and the byte count matches the npm package's WASM. A drift here means the constant in `SpatialRealAvatar.tsx` is stale or the file in `public/` was modified.
3. **Avatar manifest** — uses the freshly-minted token to call the SpatialReal manifest endpoint for the avatar configured in `NEXT_PUBLIC_SPATIALREAL_AVATAR_ID`. Confirms the avatar exists for this app.

## Run

```bash
bash .claude/skills/verify-avatar/run.sh
```

Requires the dev server to be running (the WASM URL check goes through Next).
