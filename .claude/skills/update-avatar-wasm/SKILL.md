---
name: update-avatar-wasm
description: Sync public/spatialreal WASM with the @spatialwalk/avatarkit npm package and update WASM_FILENAME / WASM_PUBLIC_URL constants in SpatialRealAvatar.tsx. Run after `npm i @spatialwalk/avatarkit@latest` because the WASM filename has a content hash that changes between versions.
disable-model-invocation: true
---

# update-avatar-wasm

The AvatarKit Vite build emits `avatar_core_wasm-<hash>.wasm` next to its JS bundle. The hash changes when the WASM bytes change, which means our hardcoded constant in `src/components/agent/SpatialRealAvatar.tsx` and the file at `public/spatialreal/` will both rot on a package upgrade.

This skill:

1. Finds the actual WASM filename in `node_modules/@spatialwalk/avatarkit/dist/`.
2. Removes any stale `*.wasm` from `public/spatialreal/`.
3. Copies the current package WASM into `public/spatialreal/` with its real name.
4. Rewrites the two constants in `SpatialRealAvatar.tsx` to match.
5. Rewrites the rewrite rule in `next.config.ts` to match.

After running, restart `npm run dev` so `next.config.ts` reloads.

## Run

```bash
bash .claude/skills/update-avatar-wasm/run.sh
```
