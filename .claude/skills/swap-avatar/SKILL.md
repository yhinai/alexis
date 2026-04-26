---
name: swap-avatar
description: Swap the active SpatialReal avatar by setting NEXT_PUBLIC_SPATIALREAL_AVATAR_ID in .env.local. Pass the new avatar ID as an argument. Restarts the dev server is required afterward (NEXT_PUBLIC_ vars are bundled at build).
disable-model-invocation: true
---

# swap-avatar

The avatar shown in the interview is whatever `NEXT_PUBLIC_SPATIALREAL_AVATAR_ID` points at. To switch:

```bash
bash .claude/skills/swap-avatar/run.sh <avatar-id>
```

Where `<avatar-id>` is from the library at `https://app.spatialreal.ai/avatars/library`.

The script:
1. Validates the format (UUID-ish).
2. Updates the line in `.env.local` (creates it if absent).
3. Hits the SpatialReal manifest endpoint with a freshly-minted session token to confirm the avatar is reachable for this app.
4. Reminds you to restart `npm run dev` because `NEXT_PUBLIC_*` vars are baked into the client bundle.
