<div align="center">
  <p>
    <a href="https://pi.dev" target="blank"><img src="./assets/pi-logo.svg" width="160" alt="Pi Logo" /></a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://herdr.dev" target="blank">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./assets/herdr-logo-dark.png" />
        <img src="./assets/herdr-logo-light.webp" width="160" alt="Herdr Logo" />
      </picture>
    </a>
  </p>
  <p>
    The dotfiles behind the visible, five-agent workflow described in <br>
    <a href="https://spznrf.vercel.app/blog/the-fellowship-of-the-pane"><i>The Fellowship of the Pane</i></a>.
  </p>
</div>

> [!IMPORTANT]
> This is a working reference, not a setup to copy blindly. Adapt models,
> providers, permissions, profiles, and tools to your environment.
>
> Profiles are versioned experiments. I change them, compare results, and roll
> them back as evidence evolves. The history records what works for me, not a
> universal recommendation.

The repository mirrors the relevant paths under `$HOME`:

```text
.
├── .config/
│   ├── herdr/
│   │   ├── config.toml
│   │   └── plugins/
│   │       └── pi-team/
│   │           ├── herdr-plugin.toml
│   │           └── setup.sh
│   └── opencode/
│       ├── opencode.json
│       ├── agents/
│       ├── commands/
│       ├── plugins/
│       │   └── profiles/
│       └── profiles/
└── .pi/
    └── agent/
        ├── extensions/
        ├── profiles/
        ├── settings.json
        ├── skills/
        └── themes/
```

## Before copying anything

You need:

- [Pi](https://pi.dev)
- [OpenCode](https://opencode.ai) v2, for the [OpenCode variant](#opencode-variant)
- [Herdr](https://herdr.dev) `>= 0.9.1`
- Bash and zsh (run the Pi team action)
- [`jq`](https://jqlang.github.io/jq/) (parses Herdr's JSON output in the action)
- Herdr's managed Pi and OpenCode integrations

Install the integrations with:

```sh
herdr integration install pi
herdr integration install opencode
```

They generate and maintain their own files under `~/.pi/agent/extensions` and
`~/.config/opencode`. Those files are intentionally not committed here and
should not be copied by hand.

After copying the plugin to `~/.config/herdr/plugins/pi-team`, register it with:

```sh
herdr plugin link ~/.config/herdr/plugins/pi-team --enabled
```

The roles and Lord of the Rings aliases live in `setup.sh`, while its `models`
array is empty. Fill it before running the action:

```bash
roles=(main documenter reviewer qa ops-recon)
aliases=(Aragorn Bilbo Gandalf Samwise Legolas)
models=(
  # Add exactly five model IDs here, in the same order as the roles above.
)
```

The commented block immediately above the arrays shows the model IDs from my
setup. They are examples tied to my provider and are not expected to work in
yours.

List the models available to your Pi installation with:

```sh
pi --list-models
```

The remote Ops Recon variant described in the post is deliberately absent. This
repository covers the local five-pane setup only.

## Equip Pi

`.pi/agent/settings.json` contains a curated subset of my preferences and
provider-independent packages. It omits generated state, defaults that add no
information, and all provider credentials.

If you merge its package declarations into your settings, reconcile them with:

```sh
pi update --extensions
```

Alternatively, install the packages individually:

```sh
pi install git:github.com/DietrichGebert/ponytail
pi install npm:pi-web-access
pi install npm:@sting8k/pi-vcc
```

They provide, respectively, a persistent bias toward simpler code, web access,
and algorithmic conversation compaction with lossless recall. Remove any
package you do not want.

I currently run Ponytail with its always-on ruleset turned off, exporting this
from `~/.zshrc`:

```sh
export PONYTAIL_DEFAULT_MODE=off
```

Its skills, such as `ponytail` and `ponytail-review`, stay available: the Main
and Reviewer profiles load them when needed, and `/ponytail` turns the mode on
for a session.

In my setup, models are routed through a self-hosted LiteLLM proxy. This
centralizes model discovery and routing, authentication and SSO, and usage and
cost visibility. Proxy routes also let models or upstream providers change
without changing profiles or the Herdr workflow. Fellowship Pane does not
depend on it.

To use the same provider extension, install it with:

```sh
pi install npm:pi-provider-litellm
```

Configure its URL and credentials through the environment as documented by the
extension. Merge and customize this valid settings fragment:

```json
{
  "defaultProvider": "litellm",
  "defaultModel": "<model-id-exposed-by-your-proxy>",
  "litellm": {
    "skills": {
      "enabled": false
    },
    "mcp": {
      "enabled": false
    },
    "budget": {
      "enabled": false
    }
  }
}
```

The extension enables LiteLLM's Skills Gateway, its MCP server, and a budget
footer by default. This fragment turns all three off: skills come from
`.pi/agent/skills`, MCP servers are configured per agent, and the footer
extension already shows cost.

All local skills in `.pi/agent/skills` use `disable-model-invocation: true`, so
they do not advertise themselves to the model. The Main and Reviewer profiles
provide explicit paths for the skills they must
load, and a user can invoke one directly with `/skill:<name>`.

The Pi setup also includes three source extensions under `.pi/agent/extensions`:

- `custom-footer.ts` shows path, branch, cost, context usage, model, and thinking
  level on one line
- `custom-tool-output.ts` keeps tool output compact until expanded
- `questions-tool.ts` adds a questionnaire tool, so the agent can ask the user
  one or more questions

They use Pi's extension APIs and may require adjustment after future Pi updates.
Review executable extensions before loading them.

`.pi/agent/themes/mellow.json` contains the theme selected by the provided
settings. Remove the setting or choose another theme if you do not copy it.

## Roles are not capabilities

The files under `.pi/agent/profiles` are the five specialization prompts:

- `main.md`: technical ownership, implementation, and coordination
- `documenter.md`: Jira and Confluence project records
- `reviewer.md`: independent review and blocker verdict
- `qa.md`: functional validation with ephemeral fixtures and cleanup
- `ops-recon.md`: read-only operational investigation by default

They include `Personal setup` comments near assumptions that need attention.
Those comments are markers for humans, not an isolation mechanism: profiles are
appended to Pi's system prompt as raw Markdown, so the model can still read HTML
comments. Remove comments and instructions that do not belong in your setup.

The Documenter profile uses Jira and Confluence through Atlassian MCP. Nothing
in this repository installs or authenticates that integration. If you want the
same backend in Pi, create `~/.pi/agent/mcp.json` with:

```json
{
  "mcpServers": {
    "atlassian": {
      "url": "https://mcp.atlassian.com/v2/mcp",
      "exposure": "codemode"
    }
  }
}
```

Then validate and authenticate it:

```sh
pi mcp list
pi mcp login atlassian
```

For the OpenCode variant, add the same server to `mcp.servers` in
`~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "type": "remote",
        "url": "https://mcp.atlassian.com/v1/mcp"
      }
    }
  }
}
```

Then authenticate it with `opencode mcp auth atlassian`.

Replace the Documenter profile if you use another issue tracker, knowledge base,
or integration. Never commit `mcp-auth.json`.

The Ops Recon profile names `gcx`, `sea-cli`, `az`, and `aws` because those CLIs
exist and are authenticated on my host. A profile does not install a command,
create credentials, or grant permissions. Replace that list with tools your
machine can actually run and describe what each one is for.

The same principle applies to every role. Responsibility belongs in the profile.
Capability comes from the environment.

## Start the team

After completing the model list and copying or adjusting the profiles, skills,
extensions, packages, and host tools you want:

1. start Herdr in a fresh one-pane workspace
2. invoke the configured Pi team action
3. verify that each pane starts with the intended role, model, and working directory

The action refuses to run outside a Herdr pane, without `jq` or `zsh`, without
exactly five models, or with a missing profile. If the tab you launch it from is a single idle shell, it builds
the team there; otherwise it opens a new "Pi Team" tab. A second run in the same
workspace while one is starting is ignored.

## OpenCode variant

`.config/opencode` adapts the same roles to [OpenCode](https://opencode.ai) v2.
It is a different shape of team: one primary agent delegates to subagents in
child sessions, instead of five peers in visible panes.

- `profiles/main.md` is the Main profile for OpenCode. Its Specialists section
  delegates through the `subagent` tool instead of Herdr.
- `agents/` holds the four subagents. They replace OpenCode's base prompt, so
  each one states its own identity, works only from the delegated task, and
  returns a fixed report to the primary agent.
- `devops` is the OpenCode counterpart of `ops-recon`, and unlike it, it can
  operate: it makes explicitly requested changes, such as a Grafana dashboard
  or an Azure DevOps variable group, capturing the previous state first.
- `plugins/profiles` appends a profile to the system prompt of its primary
  agent inside `<addendum>`, like `pi --append-system-prompt`. A Markdown agent
  would replace OpenCode's base prompt instead.
- `commands/` gives each skill its `/` command. The skills themselves are read
  from `~/.pi/agent/skills`, so both hosts share one copy.

`opencode.json` starts in OpenCode's `build` agent for quick work and disables
`plan`. Switch to `main` with Shift+Tab for the full workflow. Each subagent
and Main need a model: replace the commented `model` lines with IDs from
`opencode models`, and set a top-level `model` for `build`.

As with Pi, route models through your provider of choice. With the same
LiteLLM proxy, add the
[`opencode-plugin-litellm`](https://github.com/yuseferi/opencode-litellm)
provider settings to `opencode.json` and give the background service its key:

```json
{
  "providers": {
    "litellm": {
      "name": "LiteLLM",
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "<your-litellm-url>/v1",
        "apiKey": "{env:LITELLM_API_KEY}"
      }
    }
  }
}
```

OpenCode runs its plugins in a background service that takes its environment
once, when it starts. After exporting a variable in your shell profile, such as
`LITELLM_API_KEY` or `PONYTAIL_DEFAULT_MODE`, restart the service from a new
shell:

```sh
opencode service restart
```

To keep a variable whatever starts the service, set it on the service itself
with `opencode service set env <NAME> <value>`.

## Also in my setup

- [Hex](https://anoma.ly/hex): on-device voice dictation for any app.
- [Browse](https://opencode.ai/product/browse): an MCP server that lets agents
  use your real browser, with your tabs and logins.

## Stay in touch

- Author - [Andrea Francesco Speziale](https://x.com/andreafspeziale)

## License

fellowship-pane is [MIT licensed](LICENSE).
