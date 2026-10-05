import {
	createBashToolDefinition,
	createCodemodeExtension,
	createEditToolDefinition,
	createFindToolDefinition,
	createGrepToolDefinition,
	createLsToolDefinition,
	createPowerShellToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
	keyHint,
	renderDiff,
	type ExtensionAPI,
	type ToolDefinition,
	type ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";

type TimingState = {
	startedAt?: number;
	endedAt?: number;
	interval?: ReturnType<typeof setInterval>;
};

const factories = [
	createReadToolDefinition,
	createBashToolDefinition,
	createPowerShellToolDefinition,
	createEditToolDefinition,
	createWriteToolDefinition,
	createGrepToolDefinition,
	createFindToolDefinition,
	createLsToolDefinition,
];

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		registerCompactCodemode(pi);
		const activeTools = new Set(pi.getActiveTools());

		for (const factory of factories) {
			const tool = factory(ctx.cwd) as ToolDefinition<any, any, TimingState>;
			if (!activeTools.has(tool.name)) continue;

			const renderExpanded = tool.renderResult;
			pi.registerTool({
				...tool,
				...(tool.name === "edit" ? { renderCall: renderEditCall } : {}),
				renderResult(result, options, theme, context) {
					if (tool.name === "edit") return renderEditResult(result, options, theme, context);

					if (options.expanded && renderExpanded) {
						return renderExpanded(result, options, theme, { ...context, lastComponent: undefined });
					}

					if (tool.name !== "bash" && tool.name !== "powershell") {
						return new Text(keyHint("app.tools.expand", "to expand"), 0, 0);
					}
					return renderTiming(options, theme, context);
				},
			});
		}
	});
}

function registerCompactCodemode(pi: ExtensionAPI) {
	createCodemodeExtension()(
		new Proxy(pi, {
			get(target, property) {
				const value = Reflect.get(target, property);
				if (property !== "registerTool") return typeof value === "function" ? value.bind(target) : value;
				return (tool: ToolDefinition<any, any, any>) => {
					const renderResult = tool.renderResult!;
					pi.registerTool({
						...tool,
						renderResult(result, options, theme, context) {
							if (options.expanded || context.isError) return renderResult(result, options, theme, context);

							const hiddenLines = result.content.slice(1).reduce(
								(count, item) => count + (item.type === "text" && item.text.trim() ? item.text.trim().split("\n").length : 0),
								0,
							);
							const hint = `${theme.fg("muted", `... (${hiddenLines} output lines hidden,`)} ${keyHint("app.tools.expand", "to expand")}${theme.fg("muted", ")")}`;
							return renderResult(
								{ ...result, content: hiddenLines ? [{ type: "text", text: hint }] : [] },
								options,
								theme,
								context,
							);
						},
					});
				};
			},
		}),
	);
}

type RenderResult = NonNullable<ToolDefinition<any, any, TimingState>["renderResult"]>;
type RenderTheme = Parameters<RenderResult>[2];
type RenderContext = Parameters<RenderResult>[3];

function renderEditCall(args: any, theme: RenderTheme) {
	const path = args?.path ?? args?.file_path ?? "...";
	return new Text(`${theme.fg("toolTitle", theme.bold("edit"))} ${theme.fg("accent", path)}`, 0, 0);
}

function renderEditResult(
	result: Parameters<RenderResult>[0],
	options: ToolRenderResultOptions,
	theme: RenderTheme,
	context: RenderContext,
) {
	const diff = result.details?.diff;
	if (typeof diff !== "string") {
		const error = context.isError && result.content.find((item) => item.type === "text");
		const prefix = error?.type === "text" ? `${theme.fg("error", error.text.split("\n")[0])}\n` : "";
		return new Text(prefix + keyHint("app.tools.expand", "to expand"), 0, 0);
	}

	if (options.expanded) return new Text(renderDiff(diff), 0, 0);

	const lines = diff.split("\n");
	const changedLine = lines.findIndex((line) => /^[+-]/.test(line));
	const start = Math.max(0, changedLine - 1);
	const end = Math.min(lines.length, start + 5);
	const clipped = start > 0 || end < lines.length;
	const ellipsis = clipped ? `\n${theme.fg("muted", "…")}` : "";
	return new Text(`${renderDiff(lines.slice(start, end).join("\n"))}${ellipsis}\n${keyHint("app.tools.expand", "to expand")}`, 0, 0);
}

function renderTiming(
	options: ToolRenderResultOptions,
	theme: RenderTheme,
	context: RenderContext,
) {
	const state = context.state;
	if (state.startedAt === undefined) return new Container();

	if (options.isPartial && !state.interval) {
		state.interval = setInterval(context.invalidate, 1000);
	}
	if (!options.isPartial || context.isError) {
		state.endedAt ??= Date.now();
		if (state.interval) clearInterval(state.interval);
		state.interval = undefined;
	}

	const label = options.isPartial ? "Elapsed" : "Took";
	const elapsed = ((state.endedAt ?? Date.now()) - state.startedAt) / 1000;
	const timing = theme.fg("muted", `${label} ${elapsed.toFixed(1)}s · `);
	return new Text(timing + keyHint("app.tools.expand", "to expand"), 0, 0);
}
