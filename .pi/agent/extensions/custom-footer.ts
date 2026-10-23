/**
 * Custom footer, one line:
 *
 *   path · (branch) · $cost · ctx%                         model (effort)
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { homedir } from "node:os";

const FOLDER_ICON = "\u{F024B}"; // 󰉋 nerd font folder icon

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => ({
      dispose: footerData.onBranchChange(() => tui.requestRender()),
      invalidate() {},
      render(width: number): string[] {
        const branch = footerData.getGitBranch();
        const left = [
          shortenPath(ctx.cwd),
          ...(branch ? [`(${branch})`] : []),
          `$${sessionCost(ctx).toFixed(2)}`,
          `ctx ${contextPercent(ctx)}`,
        ].join(" · ");
        return [spread(theme.fg("dim", left), theme.fg("dim", modelLabel(ctx)), width)];
      },
    }));
  });
}

// ── Footer pieces ───────────────────────────────────────────────────────────

/**
 * Shorten a path like oh-my-posh, keeping only the last folder:
 * ~/Repositories/chess/piattaforma → ~/.. 󰉋 ../piattaforma
 * Paths with at most one folder after the root (`~/x`, `/tmp`) stay as-is.
 */
function shortenPath(fullPath: string): string {
  const home = homedir();
  const display = fullPath.startsWith(home) ? `~${fullPath.slice(home.length)}` : fullPath;
  const parts = display.split("/");
  if (parts.length <= 2) return display;
  return `${parts[0]}/.. ${FOLDER_ICON} ../${parts.at(-1)}`;
}

/** Total cost of the assistant messages on the current branch. */
function sessionCost(ctx: ExtensionContext): number {
  let cost = 0;
  for (const e of ctx.sessionManager.getBranch()) {
    if (e.type === "message" && e.message.role === "assistant") cost += (e.message as AssistantMessage).usage.cost.total;
  }
  return cost;
}

function contextPercent(ctx: ExtensionContext): string {
  const usage = ctx.getContextUsage();
  return usage ? `${Math.round((usage.tokens / usage.contextWindow) * 100)}%` : "—";
}

function modelLabel(ctx: ExtensionContext): string {
  const model = ctx.model?.id || "no-model";
  return ctx.thinkingLevel ? `${model} (${ctx.thinkingLevel})` : model;
}

/** Left and right text on one line, pushed to the edges. */
function spread(left: string, right: string, width: number): string {
  const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
  return truncateToWidth(left + pad + right, width);
}
