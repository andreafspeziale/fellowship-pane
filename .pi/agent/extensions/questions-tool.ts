/**
 * Questionnaire tool: ask the user one or more questions.
 *
 * One question shows a plain option list; several questions show a tab bar
 * with a final Submit tab. Any question can offer "Type your own answer".
 *
 * Sections: schema → tool → result text → interactive view.
 */

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import {
  type Component,
  Editor,
  type EditorTheme,
  Key,
  matchesKey,
  Text,
  type TUI,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Type } from "typebox";

// ── Schema: what the model sends ────────────────────────────────────────────

const OptionSchema = Type.Object({
  value: Type.String({ description: "The value returned when selected" }),
  label: Type.String({ description: "Display label for the option" }),
  description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionSchema = Type.Object({
  id: Type.String({ description: "Unique identifier for this question" }),
  label: Type.Optional(
    Type.String({
      description: "Short contextual label for tab bar, e.g. 'Scope', 'Priority' (defaults to Q1, Q2)",
    }),
  ),
  prompt: Type.String({ description: "The full question text to display" }),
  options: Type.Array(OptionSchema, {
    description: "Real answers the user can pick. Use [] for a free-text question; never use options to explain the question",
  }),
  allowOther: Type.Optional(
    Type.Boolean({ description: "Allow 'Type something' option (default: true). Set false for closed choices" }),
  ),
});

const Params = Type.Object({
  questions: Type.Array(QuestionSchema, { description: "Questions to ask the user" }),
});

interface Option {
  value: string;
  label: string;
  description?: string;
  isOther?: boolean;
}

interface Question {
  id: string;
  label: string;
  prompt: string;
  options: Option[];
  allowOther: boolean;
}

interface Answer {
  id: string;
  value: string;
  label: string;
  wasCustom: boolean;
  index?: number;
}

interface QuestionnaireResult {
  questions: Question[];
  answers: Answer[];
  cancelled: boolean;
}

// ── Tool ────────────────────────────────────────────────────────────────────

export default function questionnaire(pi: ExtensionAPI) {
  pi.registerTool({
    name: "questionnaire",
    label: "Questionnaire",
    description:
      "Ask the user one or more questions. Use for clarifying requirements, getting preferences, or confirming decisions. For single questions, shows a simple option list. For multiple questions, shows a tab-based interface.",
    parameters: Params,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (ctx.mode !== "tui") return errorResult("Error: UI not available (running in non-interactive mode)");
      if (params.questions.length === 0) return errorResult("Error: No questions provided");

      const questions: Question[] = params.questions.map((q, i) => ({
        ...q,
        label: q.label || `Q${i + 1}`,
        // A question without options can only be answered by typing.
        allowOther: q.allowOther !== false || q.options.length === 0,
      }));

      const result = await ctx.ui.custom<QuestionnaireResult>(
        (tui, theme, _kb, done) => new QuestionnaireView(tui, theme, questions, done),
      );
      return { content: [{ type: "text", text: resultText(result) }], details: result };
    },

    renderCall(args, theme) {
      const qs = (args.questions as Question[]) || [];
      const labels = qs.map((q) => q.label || q.id).join(", ");
      let text = theme.fg("toolTitle", theme.bold("questionnaire "));
      text += theme.fg("muted", `${qs.length} question${qs.length !== 1 ? "s" : ""}`);
      if (labels) text += theme.fg("dim", ` (${labels})`);
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as QuestionnaireResult | undefined;
      if (!details) {
        const first = result.content[0];
        return new Text(first?.type === "text" ? first.text : "", 0, 0);
      }
      if (details.cancelled) return new Text(theme.fg("warning", "Cancelled"), 0, 0);

      const check = theme.fg("success", "✓ ");
      const lines = details.answers.map((a) => {
        const id = theme.fg("accent", a.id);
        if (a.wasCustom) return `${check}${id}: ${theme.fg("muted", "(wrote) ")}${a.label}`;
        return `${check}${id}: ${a.index ? `${a.index}. ${a.label}` : a.label}`;
      });
      return new Text(lines.join("\n"), 0, 0);
    },
  });
}

// ── Result text: what the model reads back ─────────────────────────────────

function resultText({ questions, answers, cancelled }: QuestionnaireResult): string {
  if (cancelled) return "User cancelled the questionnaire";
  return answers
    .map((a) => {
      const label = questions.find((q) => q.id === a.id)?.label || a.id;
      return a.wasCustom ? `${label}: user wrote: ${a.label}` : `${label}: user selected: ${a.index}. ${a.label}`;
    })
    .join("\n");
}

function errorResult(message: string) {
  const details: QuestionnaireResult = { questions: [], answers: [], cancelled: true };
  return { content: [{ type: "text" as const, text: message }], details };
}

// ── Interactive view ────────────────────────────────────────────────────────

const OTHER: Option = { value: "__other__", label: "Type your own answer", isOther: true };

class QuestionnaireView implements Component {
  private tab = 0; // index into questions; questions.length is the Submit tab
  private option = 0;
  private typing = false; // editing a custom answer for the current question
  private readonly answers = new Map<string, Answer>();
  private readonly editor: Editor;
  private cache?: string[];

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly questions: Question[],
    private readonly done: (result: QuestionnaireResult) => void,
  ) {
    this.editor = new Editor(tui, editorTheme(theme));
    this.editor.onSubmit = (value) => this.submitTyped(value);
  }

  // State helpers

  private get isMulti() {
    return this.questions.length > 1;
  }

  private get onSubmitTab() {
    return this.tab === this.questions.length;
  }

  private get question(): Question | undefined {
    return this.questions[this.tab];
  }

  private get options(): Option[] {
    const q = this.question;
    if (!q) return [];
    return q.allowOther ? [...q.options, OTHER] : q.options;
  }

  private allAnswered() {
    return this.questions.every((q) => this.answers.has(q.id));
  }

  private refresh() {
    this.cache = undefined;
    this.tui.requestRender();
  }

  private finish(cancelled: boolean) {
    this.done({ questions: this.questions, answers: [...this.answers.values()], cancelled });
  }

  private save(answer: Omit<Answer, "id">) {
    const q = this.question;
    if (!q) return;
    this.answers.set(q.id, { id: q.id, ...answer });
    if (!this.isMulti) return this.finish(false);
    this.tab++; // next question, or the Submit tab after the last one
    this.option = 0;
    this.refresh();
  }

  private submitTyped(value: string) {
    if (!this.typing) return;
    const text = value.trim() || "(no response)";
    this.typing = false;
    this.editor.setText("");
    this.save({ value: text, label: text, wasCustom: true });
  }

  // Input

  handleInput(data: string) {
    if (this.typing) return this.handleTyping(data);
    if (this.isMulti && this.handleTabKeys(data)) return;
    if (this.onSubmitTab) return this.handleSubmitTab(data);
    this.handleOptionKeys(data);
  }

  private handleTyping(data: string) {
    if (matchesKey(data, Key.escape)) {
      this.typing = false;
      this.editor.setText("");
    } else {
      this.editor.handleInput(data);
    }
    this.refresh();
  }

  /** Returns true when the key switched tabs. */
  private handleTabKeys(data: string): boolean {
    const total = this.questions.length + 1;
    if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) this.tab = (this.tab + 1) % total;
    else if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) this.tab = (this.tab - 1 + total) % total;
    else return false;
    this.option = 0;
    this.refresh();
    return true;
  }

  private handleSubmitTab(data: string) {
    if (matchesKey(data, Key.enter) && this.allAnswered()) this.finish(false);
    else if (matchesKey(data, Key.escape)) this.finish(true);
  }

  private handleOptionKeys(data: string) {
    if (matchesKey(data, Key.up)) {
      this.option = Math.max(0, this.option - 1);
      this.refresh();
    } else if (matchesKey(data, Key.down)) {
      this.option = Math.min(this.options.length - 1, this.option + 1);
      this.refresh();
    } else if (matchesKey(data, Key.enter)) {
      this.choose(this.options[this.option]);
    } else if (matchesKey(data, Key.escape)) {
      this.finish(true);
    }
  }

  private choose(opt: Option | undefined) {
    if (!opt) return;
    if (!opt.isOther) return this.save({ value: opt.value, label: opt.label, wasCustom: false, index: this.option + 1 });
    this.typing = true;
    this.editor.setText("");
    this.refresh();
  }

  // Rendering

  invalidate() {
    this.cache = undefined;
  }

  render(width: number): string[] {
    if (this.cache) return this.cache;
    const w = Math.max(1, width);
    const t = this.theme;
    const lines: string[] = [t.fg("border", "─".repeat(w))];
    const add: AddLine = (text, prefix = " ") => lines.push(...wrap(prefix, text, w));

    if (this.isMulti) {
      add(this.tabBar());
      lines.push("");
    }

    if (this.typing) this.renderTyping(lines, add, w);
    else if (this.onSubmitTab) this.renderSubmit(add, lines);
    else this.renderQuestion(add, lines);

    lines.push("");
    if (!this.typing) add(t.fg("dim", this.helpText()));
    lines.push(t.fg("border", "─".repeat(w)));

    this.cache = lines;
    return lines;
  }

  private tabBar(): string {
    const t = this.theme;
    const pill = (text: string, active: boolean, color: Parameters<Theme["fg"]>[0]) =>
      active ? t.bg("selectedBg", t.fg("text", text)) : t.fg(color, text);

    const tabs = this.questions.map((q, i) => {
      const answered = this.answers.has(q.id);
      return `${pill(` ${answered ? "■" : "□"} ${q.label} `, i === this.tab, answered ? "success" : "muted")} `;
    });
    const submit = pill(" ✓ Submit ", this.onSubmitTab, this.allAnswered() ? "success" : "dim");
    return `← ${tabs.join("")}${submit} →`;
  }

  private renderQuestion(add: AddLine, lines: string[]) {
    const q = this.question;
    if (!q) return;
    add(this.theme.fg("text", q.prompt));
    lines.push("");
    this.renderOptions(add);
  }

  private renderOptions(add: AddLine) {
    const t = this.theme;
    this.options.forEach((opt, i) => {
      const selected = i === this.option;
      const color = selected || (opt.isOther && this.typing) ? "accent" : "text";
      add(t.fg(color, `${i + 1}. ${opt.label}`), selected ? t.fg("accent", "> ") : "  ");
      if (opt.description) add(t.fg("muted", opt.description), "     ");
    });
  }

  private renderTyping(lines: string[], add: AddLine, w: number) {
    const t = this.theme;
    this.renderQuestion(add, lines);
    lines.push("");
    add(t.fg("muted", "Your answer:"));
    for (const line of this.editor.render(Math.max(1, w - 2))) lines.push(` ${line}`);
    lines.push("");
    add(t.fg("dim", "Enter to submit • Esc to cancel"));
  }

  private renderSubmit(add: AddLine, lines: string[]) {
    const t = this.theme;
    add(t.fg("accent", t.bold("Ready to submit")));
    lines.push("");
    for (const q of this.questions) {
      const a = this.answers.get(q.id);
      if (a) add(`${t.fg("muted", `${q.label}: `)}${t.fg("text", (a.wasCustom ? "(wrote) " : "") + a.label)}`);
    }
    lines.push("");
    if (this.allAnswered()) {
      add(t.fg("success", "Press Enter to submit"));
    } else {
      const missing = this.questions.filter((q) => !this.answers.has(q.id)).map((q) => q.label);
      add(t.fg("warning", `Unanswered: ${missing.join(", ")}`));
    }
  }

  private helpText(): string {
    return this.isMulti
      ? "Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel"
      : "↑↓ navigate • Enter select • Esc cancel";
  }
}

type AddLine = (text: string, prefix?: string) => void;

/** Wrap text to width, putting prefix on the first line and aligning the rest under it. */
function wrap(prefix: string, text: string, width: number): string[] {
  const prefixWidth = visibleWidth(prefix);
  if (prefixWidth >= width) return wrapTextWithAnsi(prefix + text, width);
  const indent = " ".repeat(prefixWidth);
  return wrapTextWithAnsi(text, width - prefixWidth).map((line, i) => (i === 0 ? prefix : indent) + line);
}

function editorTheme(theme: Theme): EditorTheme {
  return {
    borderColor: (s) => theme.fg("accent", s),
    selectList: {
      selectedPrefix: (t) => theme.fg("accent", t),
      selectedText: (t) => theme.fg("accent", t),
      description: (t) => theme.fg("muted", t),
      scrollInfo: (t) => theme.fg("dim", t),
      noMatch: (t) => theme.fg("warning", t),
    },
  };
}
