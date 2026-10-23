/**
 * Compact tool rows: while collapsed each built-in tool shows a short summary;
 * ctrl+o expands everything back to Pi's own rendering.
 *
 *   bash, powershell   call: first command line …   result: "Took 1.2s · ctrl+o to expand"
 *   edit               call: "edit <path>"          result: a few diff lines around the first change
 *   other built-ins    result: "ctrl+o to expand"
 *   codemode           result: "... (N output lines hidden, ctrl+o to expand)"
 */

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
import { Container, Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type TimingState = {
  startedAt?: number;
  endedAt?: number;
  interval?: ReturnType<typeof setInterval>;
};

type Tool = ToolDefinition<any, any, TimingState>;
type RenderCall = NonNullable<Tool["renderCall"]>;
type RenderResult = NonNullable<Tool["renderResult"]>;
type ToolResult = Parameters<RenderResult>[0];
type RenderTheme = Parameters<RenderResult>[2];
type RenderContext = Parameters<RenderResult>[3];

const BUILTIN_TOOLS = [
  createReadToolDefinition,
  createBashToolDefinition,
  createPowerShellToolDefinition,
  createEditToolDefinition,
  createWriteToolDefinition,
  createGrepToolDefinition,
  createFindToolDefinition,
  createLsToolDefinition,
];

const SHELL_TOOLS = new Set(["bash", "powershell"]);

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    registerCompactCodemode(pi);
    const active = new Set(pi.getActiveTools());
    for (const create of BUILTIN_TOOLS) {
      const tool = create(ctx.cwd) as Tool;
      if (active.has(tool.name)) pi.registerTool(compact(tool));
    }
  });
}

/** The same tool with collapsed renderers; expanded rows keep Pi's originals. */
function compact(tool: Tool): Tool {
  if (tool.name === "edit") return { ...tool, renderCall: renderEditCall, renderResult: renderEditResult };

  const isShell = SHELL_TOOLS.has(tool.name);
  const renderExpanded = tool.renderResult;
  return {
    ...tool,
    ...(isShell && tool.renderCall ? { renderCall: oneLineCall(tool.renderCall) } : {}),
    renderResult(result, options, theme, context) {
      if (options.expanded && renderExpanded) {
        return renderExpanded(result, options, theme, { ...context, lastComponent: undefined });
      }
      return isShell ? renderTiming(options, theme, context) : expandHint();
    },
  };
}

function expandHint() {
  return new Text(keyHint("app.tools.expand", "to expand"), 0, 0);
}

// ── Shell: one-line command, elapsed time ──────────────────────────────────

function oneLineCall(renderFull: RenderCall): RenderCall {
  return (args, theme, context) => {
    // Fresh component each time: the wrapper below can't be reused via lastComponent.
    const full = renderFull(args, theme, { ...context, lastComponent: undefined });
    if (context.expanded) return full;
    return {
      render(width: number) {
        // Render unwrapped so line 0 is the command's real first line, then clip it to one row.
        const [first = "", ...rest] = full.render(1000).map((line) => line.trimEnd());
        if (!rest.length && visibleWidth(first) <= width) return [first];
        return [truncateToWidth(first, Math.max(1, width - 2), "") + theme.fg("muted", " …")];
      },
      invalidate: () => full.invalidate(),
    };
  };
}

/** "Elapsed 3.0s" while running (ticking every second), "Took 3.0s" once done. */
function renderTiming(options: ToolRenderResultOptions, theme: RenderTheme, context: RenderContext) {
  const state = context.state;
  if (state.startedAt === undefined) return new Container();

  if (options.isPartial && !state.interval) state.interval = setInterval(context.invalidate, 1000);
  if (!options.isPartial || context.isError) {
    state.endedAt ??= Date.now();
    if (state.interval) clearInterval(state.interval);
    state.interval = undefined;
  }

  const label = options.isPartial ? "Elapsed" : "Took";
  const elapsed = ((state.endedAt ?? Date.now()) - state.startedAt) / 1000;
  return new Text(theme.fg("muted", `${label} ${elapsed.toFixed(1)}s · `) + keyHint("app.tools.expand", "to expand"), 0, 0);
}

// ── Edit: path only, a few lines of diff ───────────────────────────────────

function renderEditCall(args: any, theme: RenderTheme) {
  const path = args?.path ?? args?.file_path ?? "...";
  return new Text(`${theme.fg("toolTitle", theme.bold("edit"))} ${theme.fg("accent", path)}`, 0, 0);
}

function renderEditResult(result: ToolResult, options: ToolRenderResultOptions, theme: RenderTheme, context: RenderContext) {
  const diff = result.details?.diff;
  if (typeof diff !== "string") {
    const error = context.isError && result.content.find((item) => item.type === "text");
    const prefix = error?.type === "text" ? `${theme.fg("error", error.text.split("\n")[0])}\n` : "";
    return new Text(prefix + keyHint("app.tools.expand", "to expand"), 0, 0);
  }
  if (options.expanded) return new Text(renderDiff(diff), 0, 0);

  // Up to 5 lines starting one line above the first change.
  const lines = diff.split("\n");
  const start = Math.max(0, lines.findIndex((line) => /^[+-]/.test(line)) - 1);
  const end = Math.min(lines.length, start + 5);
  const ellipsis = start > 0 || end < lines.length ? `\n${theme.fg("muted", "…")}` : "";
  return new Text(`${renderDiff(lines.slice(start, end).join("\n"))}${ellipsis}\n${keyHint("app.tools.expand", "to expand")}`, 0, 0);
}

// ── Codemode: hide script output behind a line count ───────────────────────

/** Load Pi's codemode extension, compacting the tool it registers. */
function registerCompactCodemode(pi: ExtensionAPI) {
  const interceptRegisterTool = new Proxy(pi, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property === "registerTool") return (tool: ToolDefinition<any, any, any>) => pi.registerTool(compactCodemode(tool));
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  createCodemodeExtension()(interceptRegisterTool);
}

function compactCodemode(tool: ToolDefinition<any, any, any>): ToolDefinition<any, any, any> {
  const renderResult = tool.renderResult!;
  return {
    ...tool,
    renderResult(result, options, theme, context) {
      if (options.expanded || context.isError) return renderResult(result, options, theme, context);

      // The first content item is codemode's own summary; the rest is script output.
      const hidden = hiddenLineCount(result.content.slice(1));
      const hint = `${theme.fg("muted", `... (${hidden} output lines hidden,`)} ${keyHint("app.tools.expand", "to expand")}${theme.fg("muted", ")")}`;
      return renderResult({ ...result, content: hidden ? [{ type: "text", text: hint }] : [] }, options, theme, context);
    },
  };
}

function hiddenLineCount(content: ToolResult["content"]): number {
  let count = 0;
  for (const item of content) {
    if (item.type === "text" && item.text.trim()) count += item.text.trim().split("\n").length;
  }
  return count;
}
