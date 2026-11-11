#!/usr/bin/env bash
set -euo pipefail

(( $# == 0 )) || { echo "Usage: $0" >&2; exit 2; }
herdr=${HERDR_BIN_PATH:-herdr}
profiles=${PI_AGENT_PROFILES_DIR:-$HOME/.pi/agent/profiles}

# Personal setup: these are the roles, display names, and model IDs I use.
# Keep them as an example or replace them with values that fit your providers,
# available models, and budget. Run `pi --list-models` to inspect your catalog.
#
# Keep these arrays in the same order: each index describes one agent. This
# layout expects exactly five agents.
roles=(main documenter qa reviewer ops-recon)
aliases=(Aragorn Bilbo Samwise Gandalf Legolas)
# models=(
#   litellm/mantle/openai.gpt-6.1-sol
#   litellm/mantle/openai.gpt-6-luna
#   litellm/mantle/openai.gpt-6-luna
#   litellm/mantle/anthropic.claude-opus-5-5
#   litellm/mantle/openai.gpt-6.1-sol
# )
models=()

# I use high thinking for every pane. Leave this empty to use Pi's default.
# thinking=high
thinking=

fail() { echo "Pi Team: $*" >&2; exit 1; }

profile_for() {
  printf '%s/%s.md\n' "$profiles" "$1"
}

[[ ${HERDR_ENV:-} == 1 && -n ${HERDR_WORKSPACE_ID:-} && -n ${HERDR_PANE_ID:-} ]] ||
  fail "run this action from a Herdr pane."
command -v jq >/dev/null || fail "jq is required."
command -v zsh >/dev/null || fail "zsh is required."
(( ${#roles[@]} == 5 && ${#aliases[@]} == 5 )) || fail "configure exactly five roles and aliases."
(( ${#models[@]} == 5 )) || fail "configure exactly five models in setup.sh."
workspace=$HERDR_WORKSPACE_ID

# A kernel lock is released on exit, including a killed bootstrap.
if [[ ${PI_TEAM_LOCKED:-} != 1 ]]; then
  lock_dir=${XDG_CACHE_HOME:-$HOME/.cache}/pi-team
  mkdir -p "$lock_dir"
  key=$(printf '%s\n' "${HERDR_SOCKET_PATH:-default}" "$workspace" | cksum | cut -d ' ' -f 1)
  lock=$lock_dir/herdr-$key.lock
  (umask 077; : >> "$lock")
  exec zsh -fc '
    zmodload zsh/system || exit 1
    zsystem flock -t 0 -e "$1" || exit 0
    shift
    export PI_TEAM_LOCKED=1
    exec bash "$@"
  ' pi-team-lock "$lock" "$0" "$@"
fi

for role in "${roles[@]}"; do
  profile=$(profile_for "$role")
  [[ -s $profile ]] || fail "missing profile $profile"
done

caller=$HERDR_PANE_ID
context=$("$herdr" pane get "$caller")
caller_tab=$(jq -er '.result.pane.tab_id' <<<"$context")
cwd=$(jq -er '.result.pane.foreground_cwd // .result.pane.cwd' <<<"$context")
pane_count=$("$herdr" pane list --workspace "$workspace" |
  jq -er --arg tab "$caller_tab" '[.result.panes[] | select(.tab_id == $tab)] | length')
agent=$(jq -r '.result.pane.agent // empty' <<<"$context")
shell_idle=$("$herdr" pane process-info --pane "$caller" | jq -r '
  .result.process_info | .shell_pid as $shell |
  .foreground_processes | length > 0 and all(.[]; .pid == $shell)')
names=$("$herdr" tab list --workspace "$workspace" | jq -r '.result.tabs[].label // empty')
name="Pi Team"
number=2
while grep -Fxq "$name" <<<"$names"; do name="Pi Team $number"; number=$((number + 1)); done

if [[ $pane_count == 1 && -z $agent && $shell_idle == true ]]; then
  tab=$caller_tab
  root=$caller
  "$herdr" tab rename "$tab" "$name" >/dev/null
else
  created=$("$herdr" tab create --workspace "$workspace" --cwd "$cwd" --label "$name" --no-focus)
  tab=$(jq -er '.result.tab.tab_id' <<<"$created")
  root=$(jq -er '.result.root_pane.pane_id' <<<"$created")
fi
prefix=$(printf '%s' "$tab" | tr '[:upper:]:' '[:lower:]-')

split() {
  "$herdr" pane split "$1" --direction "$2" --ratio "$3" --cwd "$cwd" --no-focus |
    jq -er '.result.pane.pane_id'
}

bottom_left=$(split "$root" down 0.60)
top_right=$(split "$root" right 0.60)
bottom_middle=$(split "$bottom_left" right 0.333333)
bottom_right=$(split "$bottom_middle" right 0.50)
panes=("$root" "$top_right" "$bottom_left" "$bottom_middle" "$bottom_right")

start_agent() {
  local i=$1 role=${roles[$1]} pane=${panes[$1]}
  "$herdr" pane rename "$pane" "${aliases[$i]} · $role" >/dev/null
  local args=(--model "${models[$i]}" --name "${aliases[$i]} / $role")
  [[ -z $thinking ]] || args+=(--thinking "$thinking")
  "$herdr" agent start "$prefix-$role" --kind pi --pane "$pane" -- \
    "${args[@]}" --append-system-prompt "$(profile_for "$role")" >/dev/null
}

pids=()
for i in 0 1 2 3 4; do start_agent "$i" & pids+=("$!"); done
status=0
for pid in "${pids[@]}"; do wait "$pid" || status=1; done
[[ $status == 0 ]] || exit "$status"
"$herdr" agent focus "$prefix-main" >/dev/null
