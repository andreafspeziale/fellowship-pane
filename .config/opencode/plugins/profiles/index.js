import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// OpenCode agent id -> profile appended to the system prompt, like `pi --append-system-prompt`.
const PROFILES = { main: "main.md" }

export default {
  id: "profiles",
  async setup(ctx) {
    await ctx.session.hook("context", (event) => {
      const file = PROFILES[event.agent]
      if (!file) return
      const profile = readFileSync(join(homedir(), ".config/opencode/profiles", file), "utf8")
      // OpenCode joins system parts with a single newline; wrap like Pi's <addendum> so the profile stands apart.
      event.system.push({ type: "text", text: `\n<addendum>\n${profile}\n</addendum>\n` })
    })
  },
}
