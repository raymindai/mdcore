#!/usr/bin/env bash
# mdfy skill installer for AI coding tools.
#
# Defaults to Claude Code. Pass --target=cursor for the Cursor rule.
#
# Claude Code:
#   curl -fsSL https://staging.mdfy.app/skills/mdfy/install.sh | sh
#
# Cursor:
#   curl -fsSL https://staging.mdfy.app/skills/mdfy/install.sh | sh -s -- --target=cursor
#
# Idempotent and safe to rerun.

set -euo pipefail

BASE_URL="${MDFY_BASE_URL:-https://staging.mdfy.app}"
TARGET="claude"
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#--target=}" ;;
    *) ;;
  esac
done

fetch() {
  local url="$1"; local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$out"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$out" "$url"
  else
    echo "mdfy install requires curl or wget. Install one and retry." >&2
    exit 1
  fi
}

case "$TARGET" in
  claude|claude-code)
    SKILL_DIR="${HOME}/.claude/skills/mdfy"
    mkdir -p "$SKILL_DIR"
    fetch "$BASE_URL/skills/mdfy/SKILL.md" "$SKILL_DIR/SKILL.md"
    cat <<EOF
mdfy skill installed at: $SKILL_DIR/SKILL.md

Restart Claude Code (or run /reload-skills) to pick it up.
Then in any chat, say:

  /mdfy capture <title>     save this conversation
  /mdfy bundle <topic>      group related docs into a bundle
  /mdfy hub                 get your hub URL

Sign in at $BASE_URL to claim captures.
EOF
    ;;
  cursor)
    # Cursor reads ~/.cursor/rules/*.mdc as global rules. Project-scoped
    # rules go under <repo>/.cursor/rules/. We install globally so the
    # user's mdfy actions are available in every Cursor project.
    RULES_DIR="${HOME}/.cursor/rules"
    mkdir -p "$RULES_DIR"
    fetch "$BASE_URL/skills/mdfy/cursor-rule.mdc" "$RULES_DIR/mdfy.mdc"
    cat <<EOF
mdfy rule installed at: $RULES_DIR/mdfy.mdc

Restart Cursor (or open Settings -> Rules and toggle once) to pick
it up. Then in any chat, say things like:

  Save this to mdfy as "<title>"
  Bundle my docs about <topic>
  Give me my hub URL

Sign in at $BASE_URL to claim captures.
EOF
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    echo "Supported targets: claude, cursor" >&2
    exit 2
    ;;
esac
