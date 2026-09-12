#!/usr/bin/env bash
# Bootstrap a persistent tmux workspace for this repo.
#
# The remote dev container is ephemeral: every new session starts from a fresh
# clone, so anything written to $HOME is gone. This script is idempotent and
# cheap to re-run, which lets a SessionStart hook rebuild the workspace each
# time the container comes up.
#
#   bash scripts/tmux-bootstrap.sh          # create (or reuse) the session
#   tmux attach -t inz                      # attach from an interactive shell
#   tmux send-keys -t inz:repo 'npm test' Enter
#   tmux capture-pane -p -t inz:repo        # read a pane without attaching
set -euo pipefail

SESSION="${INZ_TMUX_SESSION:-inz}"
REPO_DIR="${INZ_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_DIR="${INZ_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/inz}"
HEARTBEAT_LOG="$STATE_DIR/heartbeat.log"
HEARTBEAT_INTERVAL="${INZ_HEARTBEAT_INTERVAL:-30}"

log() { printf '[tmux-bootstrap] %s\n' "$*"; }

if ! command -v tmux >/dev/null 2>&1; then
  log "tmux not found, installing"
  if command -v apt-get >/dev/null 2>&1; then
    # Non-fatal: a hook must never block the session on a package mirror.
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq tmux >/dev/null 2>&1 \
      || { log "install failed, skipping bootstrap"; exit 0; }
  else
    log "no apt-get available, skipping bootstrap"
    exit 0
  fi
fi

mkdir -p "$STATE_DIR"

# Only write the config when there isn't one, so a hand-tuned ~/.tmux.conf
# survives a re-run.
CONF="$HOME/.tmux.conf"
if [ ! -f "$CONF" ]; then
  log "writing $CONF"
  cat > "$CONF" <<'CONF_EOF'
set -g default-terminal "tmux-256color"
set -g history-limit 100000
set -g mouse on
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# Keep the server up even with no sessions and no client attached.
set -g exit-empty off
set -g exit-unattached off
set -g destroy-unattached off

# Leave finished panes in place so their output stays readable.
set -g remain-on-exit on

set -g escape-time 10
set -g focus-events on
set -g status-interval 5
set -g status-left  "#[bold] #S #[default]| "
set -g status-right "%Y-%m-%d %H:%M:%S "
set -g status-left-length 40
CONF_EOF
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  log "session '$SESSION' already running"
else
  log "creating session '$SESSION' in $REPO_DIR"
  tmux new-session -d -s "$SESSION" -n repo -c "$REPO_DIR"
fi

# A heartbeat window makes it obvious at a glance whether the server has been
# up continuously or the container was recycled underneath it.
if ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx heartbeat; then
  log "starting heartbeat window (every ${HEARTBEAT_INTERVAL}s -> $HEARTBEAT_LOG)"
  tmux new-window -d -t "$SESSION:" -n heartbeat -c "$REPO_DIR" \
    "while :; do printf '%s up=%s\n' \"\$(date -u '+%Y-%m-%dT%H:%M:%SZ')\" \"\$(cut -d' ' -f1 /proc/uptime)\" >> '$HEARTBEAT_LOG'; sleep $HEARTBEAT_INTERVAL; done"
fi

log "server pid $(tmux display-message -p '#{pid}')"
tmux list-windows -t "$SESSION" -F '[tmux-bootstrap]   #{window_index}:#{window_name} (#{window_panes} pane/s)'
