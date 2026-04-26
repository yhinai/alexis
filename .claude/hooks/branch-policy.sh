#!/usr/bin/env bash
# Branch policy enforcement.
#
# Working branch: charlie
# Protected branch: main
#
# Wired up as a PreToolUse Bash hook in .claude/settings.json. The hook splits
# the incoming Claude Code Bash command into segments on shell separators
# (`;`, `&&`, `||`) and evaluates each segment independently, so a commit
# message that mentions "main" or a tutorial string that contains "git push"
# does not get conflated with an actual destructive operation later in the
# same compound command.
#
# Refuses, with stderr message and exit 2:
#   - any segment that runs `git commit` / `cherry-pick` / `revert` while
#     HEAD is on `main`
#   - any segment that runs `git push` whose remote ref is `main`
#     (e.g. `origin main`, `HEAD:main`, `charlie:main`)
#   - any `--force` / `-f` push segment that mentions `main`

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0

cur=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null || true)

# Split on shell separators. sed turns `&&`, `||`, and `;` into newlines so we
# can iterate segments without trying to write a real shell parser.
segments=$(printf '%s' "$cmd" | sed -E 's/(&&|\|\||;)/\n/g')

violation_msg=""

while IFS= read -r seg; do
  [ -z "$seg" ] && continue

  # The segment is treated as "really a git push" only if its first non-whitespace
  # tokens are `git push`. Same for git commit / cherry-pick / revert. This keeps
  # us from flagging substrings that appear inside argument values (e.g. a commit
  # message body that says "git push to charlie" or mentions "main").

  # 1) Refuse committing operations while sitting on main.
  if [ "$cur" = "main" ] \
     && printf '%s' "$seg" | grep -qE '^[[:space:]]*git[[:space:]]+(commit|cherry-pick|revert)\b'; then
    violation_msg="HEAD is on 'main' but the working branch is 'charlie'. Run: git checkout charlie"
    break
  fi

  # 2) Refuse any push segment whose remote ref is main (origin main, HEAD:main, charlie:main, etc.).
  if printf '%s' "$seg" | grep -qE '^[[:space:]]*git[[:space:]]+push\b' \
     && printf '%s' "$seg" | grep -qE '(:main([[:space:]]|$)|[[:space:]]main([[:space:]]|$))'; then
    violation_msg="push targets 'main'. Push 'charlie' instead."
    break
  fi

  # 3) Belt-and-braces: refuse any --force / -f push segment that mentions main anywhere.
  if printf '%s' "$seg" | grep -qE '^[[:space:]]*git[[:space:]]+push\b.*(--force|[[:space:]]-f([[:space:]]|$))' \
     && printf '%s' "$seg" | grep -q 'main'; then
    violation_msg="force-push mentions 'main'."
    break
  fi
done <<HERE
$segments
HERE

if [ -n "$violation_msg" ]; then
  echo "BRANCH POLICY: refusing — $violation_msg" >&2
  exit 2
fi

exit 0
