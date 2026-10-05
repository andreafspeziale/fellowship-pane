#!/usr/bin/env bash
set -euo pipefail

herdr=${HERDR_BIN_PATH:-herdr}
profiles=${PI_AGENT_PROFILES_DIR:-$HOME/.pi/agent/profiles}

# Personal setup: these are the roles, display names, and model IDs I use.
# Keep them as an example or replace them with values that fit your providers,
# available models, and budget. Run `pi --list-models` to inspect your catalog.
#
# Keep these arrays in the same order: each index describes one agent. This
# layout expects exactly five agents.
roles=(main documenter reviewer qa ops-recon)
aliases=(Aragorn Bilbo Gandalf Samwise Legolas)
# models=(
#   litellm/mantle/openai.gpt-5.6-sol
#   litellm/mantle/openai.gpt-5.6-luna
#   litellm/mantle/openai.gpt-5.6-sol
#   litellm/mantle/openai.gpt-5.6-luna
#   litellm/mantle/openai.gpt-5.6-sol
# )
models=()

# I use high thinking for every pane. Leave this empty to use Pi's default.
# thinking=high
thinking=

if [[ ${HERDR_ENV:-} != 1 || -z ${HERDR_WORKSPACE_ID:-} || -z ${HERDR_PANE_ID:-} ]]; then
  echo "Run this action from a fresh Herdr workspace." >&2
  exit 1
fi

command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
[[ ${#roles[@]} == 5 ]] || { echo "Configure exactly five roles in setup.sh." >&2; exit 1; }
[[ ${#aliases[@]} == 5 ]] || { echo "Configure exactly five aliases in setup.sh." >&2; exit 1; }
[[ ${#models[@]} == 5 ]] || { echo "Configure exactly five models in setup.sh." >&2; exit 1; }

for role in "${roles[@]}"; do
  [[ -s "$profiles/$role.md" ]] || { echo "Missing profile: $profiles/$role.md" >&2; exit 1; }
done

workspace=$HERDR_WORKSPACE_ID
agent_prefix=$(printf '%s' "$workspace" | tr '[:upper:]' '[:lower:]')
root=$HERDR_PANE_ID
pane_json=$($herdr pane get "$root")
cwd=$(jq -er '.result.pane.foreground_cwd // .result.pane.cwd' <<<"$pane_json")
pane_count=$($herdr pane list --workspace "$workspace" | jq -er '.result.panes | length')
[[ $pane_count == 1 ]] || { echo "Pi Team requires a fresh one-pane workspace." >&2; exit 1; }

split() {
  $herdr pane split "$1" --direction "$2" --ratio "${3:-0.5}" --cwd "$cwd" --no-focus |
    jq -er '.result.pane.pane_id'
}

bottom_left=$(split "$root" down 0.60)
top_right=$(split "$root" right 0.60)
bottom_middle=$(split "$bottom_left" right 0.333333)
bottom_right=$(split "$bottom_middle" right 0.50)

panes=("$root" "$top_right" "$bottom_middle" "$bottom_left" "$bottom_right")
for i in "${!roles[@]}"; do
  $herdr pane rename "${panes[$i]}" "${aliases[$i]} · ${roles[$i]}" >/dev/null
done

start() {
  local role=$1 alias=$2 model=$3 pane=$4
  local args=(
    --model "$model"
    --name "$alias / $role"
    --append-system-prompt "$profiles/$role.md"
  )
  [[ -z $thinking ]] || args+=(--thinking "$thinking")

  $herdr agent start "$agent_prefix-$role" --kind pi --pane "$pane" -- "${args[@]}" >/dev/null
}

pids=()
for i in 0 1 3 2 4; do
  start "${roles[$i]}" "${aliases[$i]}" "${models[$i]}" "${panes[$i]}" &
  pids+=("$!")
done

status=0
for pid in "${pids[@]}"; do
  wait "$pid" || status=1
done
[[ $status == 0 ]] || exit "$status"

echo "Pi team ready in $workspace ($cwd)."
