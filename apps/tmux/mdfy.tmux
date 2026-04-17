#!/usr/bin/env bash
# mdfy tmux plugin — capture pane and publish to mdfy.cc
#
# Installation:
#   1. Copy this file to ~/.tmux/plugins/mdfy/mdfy.tmux
#   2. Add to ~/.tmux.conf:
#      run-shell ~/.tmux/plugins/mdfy/mdfy.tmux
#   3. Reload: tmux source ~/.tmux.conf
#
# Or with TPM (Tmux Plugin Manager):
#   set -g @plugin 'raymindai/mdfy-tmux'
#
# Usage:
#   prefix + M    — Capture current pane and publish to mdfy.cc
#   prefix + C-m  — Capture and publish (copy mode selection only)
#
# Requires: mdfy CLI (npm install -g mdfy)

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default keybinding: prefix + M
tmux_key="${MDFY_KEY:-M}"

# Capture and publish script
capture_script="$CURRENT_DIR/scripts/capture.sh"

# Bind key
tmux bind-key "$tmux_key" run-shell "$capture_script"
