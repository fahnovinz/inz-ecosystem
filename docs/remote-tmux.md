# Persistent tmux in the remote container

The remote dev container is a Firecracker microVM that is cloned fresh at the
start of a session and reclaimed after a period of inactivity. Every shell
command runs in its own short-lived `bash -c`, so a process started by one
command is gone by the next unless something outlives that shell.

`scripts/tmux-bootstrap.sh` provides that something: a detached tmux server
that reparents to PID 1 and keeps running between commands.

## Usage

```bash
bash scripts/tmux-bootstrap.sh        # idempotent: creates or reuses the session
tmux ls                               # inz: 2 windows
tmux attach -t inz                    # from an interactive shell
```

Driving the session without attaching — this is how an agent uses it:

```bash
tmux send-keys -t inz:repo 'npm test' Enter
tmux capture-pane -p -t inz:repo      # read the pane's visible contents
tmux capture-pane -p -S -3000 -t inz:repo   # include scrollback
```

The session has two windows:

| Window | Purpose |
| --- | --- |
| `repo` | A shell in the repository root, for long-running work. |
| `heartbeat` | Appends a UTC timestamp and host uptime to `~/.local/state/inz/heartbeat.log` every 30s. |

The heartbeat log distinguishes the two failure modes that otherwise look
identical: a gap in the timestamps means the tmux server died, while an
`up=` value that resets to near zero means the container itself was recycled.

Environment overrides: `INZ_TMUX_SESSION`, `INZ_REPO_DIR`, `INZ_STATE_DIR`,
`INZ_HEARTBEAT_INTERVAL`.

## Automatic startup

`.claude/settings.json` registers the script as a `SessionStart` hook, so a new
container rebuilds the workspace before any work begins. The script installs
tmux when it is missing and exits successfully if it cannot, so a package
mirror outage degrades the session rather than blocking it.

## What tmux does not do

Two limits are worth stating plainly, because tmux is often reached for as a
fix for both and solves neither.

**It cannot host the agent session itself.** The `claude` process runs with no
controlling terminal — `ps` reports `TT = ?`, and its stdin, stdout and stderr
are anonymous pipes to the supervising `environment-manager` process, which is
what carries the conversation to and from the API. tmux multiplexes PTYs; a
process that was never given one cannot be moved into a pane, and a process's
stdio cannot be re-pointed from the outside. Relaunching it under tmux would
mean killing the process that is holding the conversation open. So tmux hosts
the *work*, and the session stays where it is.

**It does not keep the container alive.** Reclamation is driven by session
inactivity and takes the whole microVM with it — tmux server, windows,
scrollback and all. Only activity on the session defers it; a scheduled
wake-up that pings the session on an interval is what keeps a container warm,
and even that is a delay rather than a guarantee.

The practical consequence is the usual one: commit and push anything worth
keeping. Nothing on this disk is durable.
