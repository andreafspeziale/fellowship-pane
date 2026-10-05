/**
 * Custom Footer Extension
 *
 * Layout: path · (branch) · $cost · ctx% ··· model (effort)
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { homedir } from "node:os";

const FOLDER_ICON = "\u{F024B}"; // 󰉋 nerd font folder icon

/**
 * Shorten path like oh-my-posh:
 * ~/Repositories/chess/rise-of-champions/piattaforma → ~/.. 󰉋 ../piattaforma
 * Short paths (≤3 segments) are kept as-is.
 */
function shortenPath(fullPath: string): string {
	const home = homedir();
	let display = fullPath.startsWith(home) ? "~" + fullPath.slice(home.length) : fullPath;

	const parts = display.split("/");
	if (parts.length <= 2) return display;

	const head = parts[0]; // ~ or ""
	const last = parts[parts.length - 1];

	return `${head}/.. ${FOLDER_ICON} ../${last}`;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					// Cost
					let cost = 0;
					for (const e of ctx.sessionManager.getBranch()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							cost += m.usage.cost.total;
						}
					}

					// Context %
					const usage = ctx.getContextUsage();
					const pct = usage ? `${Math.round((usage.tokens / usage.contextWindow) * 100)}%` : "—";

					// Path
					const path = shortenPath(ctx.cwd);

					// Git branch
					const branch = footerData.getGitBranch();

					// Model + thinking level
					const model = ctx.model?.id || "no-model";
					const effort = ctx.thinkingLevel;
					const modelStr = effort ? `${model} (${effort})` : model;

					// Build left: path · (branch) · $cost · ctx%
					const leftParts: string[] = [path];
					if (branch) leftParts.push(`(${branch})`);
					leftParts.push(`$${cost.toFixed(2)}`);
					leftParts.push(`ctx ${pct}`);

					const leftText = leftParts.join(" · ");
					const left = theme.fg("dim", leftText);
					const right = theme.fg("dim", modelStr);

					const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
					return [truncateToWidth(left + pad + right, width)];
				},
			};
		});
	});
}
