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
│   └── herdr/
│       ├── config.toml
│       └── plugins/
│           └── pi-team/
│               ├── herdr-plugin.toml
│               └── setup.sh
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
- [Herdr](https://herdr.dev) `>= 0.9.1`
- Bash
- [`jq`](https://jqlang.github.io/jq/)
- Herdr's managed Pi integration

Install the integration with:

```sh
herdr integration install pi
```

It generates and maintains `~/.pi/agent/extensions/herdr-agent-state.ts`. That
file is intentionally not committed here and should not be copied by hand.

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
pi install npm:@earendil-works/pi-voice
```

They provide, respectively, a persistent bias toward simpler code, web access,
algorithmic conversation compaction with lossless recall, and local voice
transcription. Remove any package you do not want. Pi Voice's microphone and
local model configuration is machine-specific and is not included here.

pi-vcc creates its own configuration with safe defaults. This repository does
not commit a redundant `pi-vcc-config.json`.

In my setup, models are routed through a self-hosted LiteLLM proxy. This
centralizes model discovery and routing, authentication and SSO, and usage and
cost visibility. Proxy routes also let models or upstream providers change
without changing profiles or the Herdr workflow. Fellowship Pane does not
depend on it.

To use the same provider extension, install it with:

```sh
pi install npm:pi-provider-litellm
```

Then authenticate interactively:

```text
/login litellm
```

Or configure its URL and credentials through the environment as documented by
the extension. Merge and customize this valid settings fragment:

```json
{
  "defaultProvider": "litellm",
  "defaultModel": "<model-id-exposed-by-your-proxy>",
  "litellm": {
    "mcp": {
      "enabled": false
    }
  }
}
```

All local skills in `.pi/agent/skills` use `disable-model-invocation: true`, so
they do not advertise themselves to the model. The Main and Reviewer profiles
provide explicit paths for the skills they must
load, and a user can invoke one directly with `/skill:<name>`.

The Pi setup also includes two source extensions under `.pi/agent/extensions`:

- `custom-footer.ts` shows path, branch, cost, context usage, model, and thinking
  level
- `custom-tool-output.ts` keeps tool output compact until expanded

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
same backend, create `~/.pi/agent/mcp.json` with:

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

The action refuses to run with missing model entries, missing profiles, or an
existing multi-pane layout.

## Stay in touch

- Author - [Andrea Francesco Speziale](https://x.com/andreafspeziale)

## License

fellowship-pane is [MIT licensed](LICENSE).
