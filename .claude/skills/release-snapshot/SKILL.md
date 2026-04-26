---
name: release-snapshot
description: Tag HEAD as a dated release (v$DATE), generate a changelog from the last N commits, and notify Discord. Refuses to run on a dirty working tree. Use when cutting a release snapshot before a demo or deploy.
disable-model-invocation: true
---

# release-snapshot

Cuts a snapshot tag with today's date.

- Tag format: `vYYYY.MM.DD`. If today's date already has a tag, increments to `vYYYY.MM.DD-2`, `-3`, etc.
- Changelog: `git log --oneline` from the previous tag (or last N=20 commits if no prior tag).
- Posts a Discord ping using the webhook embedded in `.claude/hooks/git-discord-notify.sh`.
- Refuses to run if `git status --porcelain` is non-empty.

## Run

```bash
bash .claude/skills/release-snapshot/run.sh [N]
```

`N` overrides the commit window (default 20). The script does not push the tag — push it manually with `git push origin <tag>` once you're happy.
