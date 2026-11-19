import { App, Editor, editorInfoField, editorLivePreviewField, MarkdownView, Notice, Platform, Plugin, PluginSettingTab, Setting, setIcon, TFile } from "obsidian";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";

/*
 * Task Resetter: uncheck the tasks in a note, so a checklist can be used again.
 *
 * - The "Reset tasks in this note" command (give it a hotkey) and a sidebar button do the whole note.
 * - [reset-tasks] typed anywhere in a note, even at the end of a heading, shows as a button. Under a
 *   heading (or on it), it resets that heading's section: subheadings included, up to the next
 *   heading of the same or a higher level. Above any heading it resets the whole note, and
 *   [reset-tasks all] always does. "Insert reset button" adds one at the cursor.
 *
 * When the note is open in the editor, the reset is one edit, so Ctrl/Cmd+Z puts every check back
 * (focus goes back to the text afterwards, so it works straight away). The notice also has an Undo.
 */

interface Settings {
	/** Also clear other task markers ([-], [/], [>]...), not just checked boxes. */
	clearOtherMarkers: boolean;
	/** On phones: a light haptic tap when a reset button or the sidebar button is tapped. */
	haptics: boolean;
	/** Show the in-note buttons as just the icon, without "Reset tasks". */
	hideLabel: boolean;
}

const DEFAULTS: Settings = { clearOtherMarkers: false, haptics: true, hideLabel: false };

/** The buttons' icon. */
const ICON = "rotate-ccw-square";

/** A task line: indentation, a list marker, then [ ] with something in the box. */
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([^\]])(\])/;

/** The short form: [reset-tasks] or [reset-tasks all], typed anywhere in a line. */
const MARKER = /\[reset-tasks( all)?\]/gi;

/** A Markdown heading line (outside code blocks; callers skip fenced code). */
const HEADING = /^(#{1,6})\s/;

export default class TaskResetter extends Plugin {
	settings: Settings = DEFAULTS;

	async onload(): Promise<void> {
		this.settings = { ...DEFAULTS, ...((await this.loadData()) ?? {}) };
		this.addSettingTab(new TaskResetterSettings(this.app, this));
		this.applyLabel();

		this.addCommand({
			id: "reset-note",
			name: "Reset tasks in this note",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) void this.reset(file);
				return true;
			},
		});

		// Put a reset button ([reset-tasks]) at the cursor: on a heading or any line of text, at its end
		// (it then resets that heading's section, or the one the line is under); on an empty line, there.
		this.addCommand({
			id: "insert-button",
			name: "Insert reset button",
			editorCallback: (editor) => {
				const line = editor.getCursor().line;
				const text = editor.getLine(line);
				const insert = text.trim() ? (text.endsWith(" ") ? "" : " ") + "[reset-tasks]" : "[reset-tasks]";
				const ch = text.trim() ? text.length : 0;
				editor.replaceRange(insert, { line, ch }, { line, ch: text.trim() ? ch : text.length });
				// The cursor moves off the line, so the marker shows as a button straight away.
				if (line + 1 >= editor.lineCount()) editor.replaceRange("\n", { line, ch: editor.getLine(line).length });
				editor.setCursor({ line: line + 1, ch: 0 });
			},
		});

		// [reset-tasks] typed in a note: a button in editing view (shown as text while the cursor is on
		// it, so it can be edited) and in reading view.
		this.registerEditorExtension(markerButtons(this));
		this.registerMarkdownPostProcessor((el, ctx) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			const walker = el.doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
			const nodes: Text[] = [];
			for (let n = walker.nextNode(); n; n = walker.nextNode()) {
				if (/\[reset-tasks/i.test(n.textContent ?? "") && !(n.parentElement?.closest("code, pre"))) nodes.push(n as Text);
			}
			for (const node of nodes) {
				const text = node.textContent ?? "";
				const frag = el.doc.createDocumentFragment();
				let last = 0;
				for (const m of text.matchAll(MARKER)) {
					frag.append(text.slice(last, m.index));
					const whole = !!m[1];
					frag.append(this.button(whole, () => {
						// Which line: the section this element came from, at the marker's line in it.
						const info = ctx.getSectionInfo(el);
						void this.resetAtMarker(file, whole, info ? info.lineStart : undefined, info ? info.lineEnd : undefined);
					}));
					last = (m.index ?? 0) + m[0].length;
				}
				frag.append(text.slice(last));
				node.replaceWith(frag);
			}
		});

		this.addRibbonIcon(ICON, "Reset tasks in this note", () => {
			this.tap();
			const file = this.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") { new Notice("Open a note to reset its tasks."); return; }
			void this.reset(file);
		});
	}

	/** A short, light tap on phones (Obsidian routes navigator.vibrate to the phone's haptics). */
	private tap(): void {
		if (Platform.isMobile && this.settings.haptics) navigator.vibrate?.(20);
	}

	/** The Reset button a [reset-tasks] marker shows as. */
	button(whole: boolean, onClick: () => void): HTMLElement {
		const button = createEl("button", { cls: "reset-tasks-button" });
		const label = whole ? "Reset all tasks" : "Reset tasks";
		setIcon(button.createSpan({ cls: "reset-tasks-icon" }), ICON);
		button.createSpan({ cls: "reset-tasks-label", text: label });
		// Named for screen readers and a hover tooltip, which matters when the label is hidden.
		button.setAttr("aria-label", label);
		// Keep the click from moving the editor's cursor onto the button's text.
		button.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
		button.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.tap(); onClick(); });
		return button;
	}

	/** Reading view: find the marker's line within its section (the first line there that has one). */
	async resetAtMarker(file: TFile, whole: boolean, from?: number, to?: number): Promise<void> {
		if (whole || from === undefined || to === undefined) return this.reset(file);
		const lines = (await this.app.vault.cachedRead(file)).split("\n");
		let at = from;
		for (let i = from; i <= to && i < lines.length; i++) if (/\[reset-tasks/i.test(lines[i])) { at = i; break; }
		return this.reset(file, at);
	}

	/** The box's mark, if this line is a task that should be cleared. */
	private clears(line: string): boolean {
		const m = TASK.exec(line);
		if (!m || m[2] === " ") return false;
		return this.settings.clearOtherMarkers || m[2] === "x" || m[2] === "X";
	}

	/**
	 * Lines to clear. Without `at`, the whole note. With it (the line a [reset-tasks] marker is on):
	 * the section of the heading the button sits under, from the button down to the next heading of the
	 * same or a higher level, subheadings included; or the whole note if no heading is above it. Fenced
	 * code is skipped, so task-like lines in code examples are left alone.
	 */
	private targets(lines: string[], at?: number): number[] {
		const fenced: boolean[] = [];
		let fence = false;
		for (const line of lines) {
			const marker = /^\s*(```|~~~)/.test(line);
			if (marker) fence = !fence;
			fenced.push(fence || marker);
		}
		const level = (i: number) => (fenced[i] ? 0 : HEADING.exec(lines[i])?.[1].length ?? 0);
		let from = 0, to = lines.length;
		if (at !== undefined) {
			let own = 0;
			for (let i = at; i >= 0 && !own; i--) own = level(i);
			if (own) {
				from = at + 1;
				for (let i = from; i < lines.length; i++) if (level(i) && level(i) <= own) { to = i; break; }
			}
		}
		const out: number[] = [];
		for (let i = from; i < to; i++) if (!fenced[i] && this.clears(lines[i])) out.push(i);
		return out;
	}

	/** Uncheck the tasks: through the editor when the note is open there (so it's one undo), else in the file. */
	async reset(file: TFile, at?: number): Promise<void> {
		const editor = this.editorFor(file);
		let count = 0;
		let before = "", after = "";
		if (editor) {
			before = editor.getValue();
			const lines = before.split("\n");
			const hits = this.targets(lines, at);
			count = hits.length;
			if (count) {
				editor.transaction({
					changes: hits.map((line) => {
						const m = TASK.exec(lines[line]) as RegExpExecArray;
						const ch = m[1].length;
						return { from: { line, ch }, to: { line, ch: ch + 1 }, text: " " };
					}),
				});
				after = editor.getValue();
			}
			// A click on the in-note button leaves focus on the button, where Ctrl/Cmd+Z doesn't reach
			// the editor: put it back in the text so undo works right away. Not on phones, where that would
			// open the keyboard (the notice's Undo is there instead).
			if (!Platform.isMobile) editor.focus();
		} else {
			await this.app.vault.process(file, (text) => {
				before = text;
				const lines = text.split("\n");
				const hits = this.targets(lines, at);
				count = hits.length;
				for (const line of hits) lines[line] = lines[line].replace(TASK, "$1 $3");
				return (after = lines.join("\n"));
			});
		}
		if (!count) { new Notice("Nothing to uncheck."); return; }
		// The notice has an Undo too (works in reading view, where there's no editor to undo in).
		const notice = new Notice(createFragment((f) => {
			f.appendText(`Unchecked ${count} task${count === 1 ? "" : "s"}. `);
			const undo = f.createEl("a", { text: "Undo", href: "#" });
			undo.onclick = (e) => {
				e.preventDefault();
				notice.hide();
				void this.undo(file, before, after);
			};
		}), 6000);
	}

	/** Put the note back as it was before a reset, unless it has been changed since. */
	private async undo(file: TFile, before: string, after: string): Promise<void> {
		const editor = this.editorFor(file);
		if (editor) {
			if (editor.getValue() !== after) { new Notice("The note has changed since; use Ctrl/Cmd+Z instead."); return; }
			editor.undo();
			if (!Platform.isMobile) editor.focus();
			return;
		}
		let changed = false;
		await this.app.vault.process(file, (text) => {
			if (text !== after) { changed = true; return text; }
			return before;
		});
		new Notice(changed ? "The note has changed since, so it was left as it is." : "Tasks checked again.");
	}

	/** The editor showing this note, if it's open in editing view in the active pane. */
	private editorFor(file: TFile): Editor | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view && view.file === file && view.getMode() === "source" ? view.editor : null;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Icon-only buttons: a class on the page, so buttons already on screen change at once. */
	applyLabel(): void {
		document.body.toggleClass("task-resetter-icon-only", this.settings.hideLabel);
	}

	onunload(): void {
		document.body.removeClass("task-resetter-icon-only");
	}
}

class TaskResetterSettings extends PluginSettingTab {
	constructor(app: App, private plugin: TaskResetter) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Also clear other markers")
			.setDesc("Reset tasks marked with something other than x too, like [-] cancelled or [/] in progress.")
			.addToggle((t) => t.setValue(this.plugin.settings.clearOtherMarkers).onChange(async (v) => {
				this.plugin.settings.clearOtherMarkers = v;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl)
			.setName("Haptic tap (mobile)")
			.setDesc("A light tap when you tap a reset button or the sidebar button.")
			.addToggle((t) => t.setValue(this.plugin.settings.haptics).onChange(async (v) => {
				this.plugin.settings.haptics = v;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl)
			.setName("Hide the button label")
			.setDesc("Show the buttons in notes as just the icon, without \"Reset tasks\".")
			.addToggle((t) => t.setValue(this.plugin.settings.hideLabel).onChange(async (v) => {
				this.plugin.settings.hideLabel = v;
				this.plugin.applyLabel();
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName("Button in a note").setHeading();
		new Setting(containerEl).setDesc(createFragment((f) => {
			f.appendText("Type ");
			f.createEl("code", { text: "[reset-tasks]" });
			f.appendText(" anywhere in a note, even at the end of a heading, or use the \"Insert reset button\" command. Under a heading, its button unchecks that heading's section (subheadings included); above any heading it unchecks the whole note, and ");
			f.createEl("code", { text: "[reset-tasks all]" });
			f.appendText(" always does.");
		}));
	}
}

/** The [reset-tasks] marker drawn as a button in the editor. */
class MarkerWidget extends WidgetType {
	constructor(private plugin: TaskResetter, private whole: boolean, private line: number, private length: number) {
		super();
	}

	eq(other: MarkerWidget): boolean {
		return other.whole === this.whole && other.line === this.line && other.length === this.length;
	}

	toDOM(view: EditorView): HTMLElement {
		return this.plugin.button(this.whole, () => {
			const file = view.state.field(editorInfoField)?.file;
			if (file) void this.plugin.reset(file, this.whole ? undefined : this.line);
		});
	}
}

/**
 * Editing view (Live Preview): each [reset-tasks] marker shows as a button, except while the cursor or
 * a selection is on its line (then it's plain text you can edit), and not inside code.
 */
function markerButtons(plugin: TaskResetter) {
	const build = (view: EditorView): DecorationSet => {
		const builder = new RangeSetBuilder<Decoration>();
		if (!view.state.field(editorLivePreviewField)) return builder.finish();
		const doc = view.state.doc;
		const sel = view.state.selection.ranges;
		// Which lines are inside fenced code (markers there stay text).
		let fence = false;
		const fenced = new Set<number>();
		for (let n = 1; n <= doc.lines; n++) {
			const text = doc.line(n).text;
			const marker = /^\s*(```|~~~)/.test(text);
			if (marker) fence = !fence;
			if (fence || marker) fenced.add(n);
		}
		for (const { from, to } of view.visibleRanges) {
			for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
				if (fenced.has(n)) continue;
				const line = doc.line(n);
				for (const m of line.text.matchAll(MARKER)) {
					const start = line.from + (m.index ?? 0), end = start + m[0].length;
					// Inside `inline code` (an odd number of backticks before it): leave it.
					if (((line.text.slice(0, m.index).match(/`/g) ?? []).length % 2) === 1) continue;
					// The cursor (or a selection) on its line shows it as text, as Obsidian does with other markup.
					if (sel.some((r) => r.from <= line.to && r.to >= line.from)) continue;
					builder.add(start, end, Decoration.replace({ widget: new MarkerWidget(plugin, !!m[1], n - 1, m[0].length) }));
				}
			}
		}
		return builder.finish();
	};
	return ViewPlugin.fromClass(class {
		decorations: DecorationSet;
		constructor(view: EditorView) { this.decorations = build(view); }
		update(u: ViewUpdate) {
			if (u.docChanged || u.selectionSet || u.viewportChanged || u.startState.field(editorLivePreviewField) !== u.state.field(editorLivePreviewField)) {
				this.decorations = build(u.view);
			}
		}
	}, { decorations: (v) => v.decorations });
}
