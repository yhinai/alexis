# Discord Webhook Test

Smoke-test for `.claude/hooks/git-discord-notify.sh`. The PostToolUse Bash hook should fire on the commit and the push that introduce this file, posting two messages to the configured `DISCORD_WEBHOOK_URL`.

If you see exactly two notifications in the Discord channel — one labeled `git commit` and one labeled `git push`, both with a ✅ — the wiring is good. If only one fires, the matcher may be matching only commit *or* push, not both. If none fire, check that `DISCORD_WEBHOOK_URL` is set in `.env.local`.

This file can be deleted after the test.
