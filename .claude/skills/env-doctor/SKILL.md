---
name: env-doctor
description: Audit .env.local against the canonical required-vars list and against process.env.* references found in src/. Reports which vars are set, which are missing, and which client-side counterparts (NEXT_PUBLIC_*) exist.
disable-model-invocation: true
---

# env-doctor

Cross-checks three sources of truth:

1. The canonical required list (hardcoded in this skill).
2. `.env.local` on disk.
3. Every `process.env.X` reference under `src/`.

## What it prints

A table with rows for each canonical var (set?, NEXT_PUBLIC_ counterpart present?, used in src/?), followed by a list of `process.env.*` references in `src/` that are NOT in `.env.local`.

## Run

```bash
bash .claude/skills/env-doctor/run.sh
```
