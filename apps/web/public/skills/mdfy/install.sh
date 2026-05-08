#!/usr/bin/env bash
# mdfy skill installer for Claude Code.
#
# Usage:
#   curl -fsSL https://staging.mdfy.app/skills/mdfy/install.sh | sh
#
# Drops SKILL.md into ~/.claude/skills/mdfy/. Idempotent and safe to
# rerun. Prints the installed location and the next step.

set -euo pipefail

BASE_URL="${MDFY_BASE_URL:-https://staging.mdfy.app}"
SKILL_DIR="${HOME}/.claude/skills/mdfy"

mkdir -p "$SKILL_DIR"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$BASE_URL/skills/mdfy/SKILL.md" -o "$SKILL_DIR/SKILL.md"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$SKILL_DIR/SKILL.md" "$BASE_URL/skills/mdfy/SKILL.md"
else
  echo "mdfy install requires curl or wget. Install one and retry." >&2
  exit 1
fi

cat <<EOF
mdfy skill installed at: $SKILL_DIR/SKILL.md

Restart Claude Code (or run /reload-skills) to pick it up.
Then in any chat, say:

  /mdfy capture <title>     save this conversation
  /mdfy bundle <topic>      group related docs into a bundle
  /mdfy hub                 get your hub URL

Sign in or create an account at $BASE_URL to claim captures.
EOF
