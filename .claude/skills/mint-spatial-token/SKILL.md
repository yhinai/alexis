---
name: mint-spatial-token
description: Mint a fresh SpatialReal session JWT from the server-side API key and print it. Useful for testing AvatarKit outside Next or pasting into the SpatialReal Studio for the docs-style 24h test token. Optional first arg is TTL in seconds (default 3600, max 86400).
disable-model-invocation: true
---

# mint-spatial-token

```bash
bash .claude/skills/mint-spatial-token/run.sh        # 1h token
bash .claude/skills/mint-spatial-token/run.sh 86400  # 24h token (max)
```

Prints just the token to stdout. Errors go to stderr. No expansion of the API key — only the JWT comes back.

Common uses:
- Drop the JWT into a curl call against the SpatialReal API to debug avatar manifest issues.
- Set as `VITE_SPATIALREAL_SESSION_TOKEN` in the standalone speech-to-avatar quickstart for direct comparison.
