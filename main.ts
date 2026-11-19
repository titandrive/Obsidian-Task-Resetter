import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, setIcon, TFile } from "obsidian";

/*
 * Reset Tasks: uncheck the tasks in a note, so a checklist can be used again.
 *
 * - The "Reset tasks in this note" command (give it a hotkey) and a sidebar button do the whole note.
 * - A reset-tasks code block puts a button in the note that resets just the list under it, down to
 *   the next heading. Write `all` inside the block to make it reset the whole note instead.
 *
 * When the note is open in the editor, the reset is one edit, so Ctrl/Cmd+Z puts every check back.
 */

interface Settings {
	/** Also clear other task markers ([-], [/], [>]...), not just checked boxes. */
	clearOtherMarkers: boolean;
}

const DEFAULTS: Settings = { clearOtherMarkers: false };

/** A task line: indentation, a list marker, then [ ] with something in the box. */
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([^\]])(\])/;

/** A Markdown heading line (outside code blocks; callers skip fenced code). */
const HEADING = /^#{1,6}\s/;

export default class ResetTasks extends Plugin {
	settings: Settings = DEFAULTS;

	async onload(): Promise<void> {
		this.settings = { ...DEFAULTS, ...((await this.loadData()) ?? {}) };
		this.addSettingTab(new ResetTasksSettings(this.app, this));

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

		this.addRibbonIcon("list-restart", "Reset tasks in this note", () => {
			const file = this.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") { new Notice("Open a note to reset its tasks."); return; }
			void this.reset(file);
		});

		// ```reset-tasks``` in a note: a button that resets the list under it (or the whole note with "all").
		this.registerMarkdownCodeBlockProcessor("reset-tasks", (source, el, ctx) => {
			const whole = source.trim().toLowerCase() === "all";
			const button = el.createEl("button", { cls: "reset-tasks-button" });
			setIcon(button.createSpan({ cls: "reset-tasks-icon" }), "list-restart");
			button.createSpan({ text: whole ? "Reset all tasks" : "Reset tasks" });
			// Keep the click from moving the editor's cursor into the code block.
			button.addEventListener("mousedown", (e) => e.stopPropagation());
			button.onclick = () => {
				const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
				if (!(file instanceof TFile)) return;
				// Where the block is now (the note may have changed since it was drawn).
				const info = ctx.getSectionInfo(el);
				void this.reset(file, whole || !info ? undefined : info.lineEnd + 1);
			};
		});
	}

	/** The box's mark, if this line is a task that should be cleared. */
	private clears(line: string): boolean {
		const m = TASK.exec(line);
		if (!m || m[2] === " ") return false;
		return this.settings.clearOtherMarkers || m[2] === "x" || m[2] === "X";
	}

	/**
	 * Lines to clear: the whole note, or (from `start`) the lines down to the next heading. Fenced code
	 * is skipped, so task-like lines in code examples are left alone.
	 */
	private targets(lines: string[], start?: number): number[] {
		const out: number[] = [];
		let fence = false;
		for (let i = start ?? 0; i < lines.length; i++) {
			if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
			if (fence) continue;
			if (start !== undefined && HEADING.test(lines[i])) break;
			if (this.clears(lines[i])) out.push(i);
		}
		return out;
	}

	/** Uncheck the tasks: through the editor when the note is open there (so it's one undo), else in the file. */
	async reset(file: TFile, start?: number): Promise<void> {
		const editor = this.editorFor(file);
		let count = 0;
		if (editor) {
			const lines = editor.getValue().split("\n");
			const hits = this.targets(lines, start);
			count = hits.length;
			if (count) {
				editor.transaction({
					changes: hits.map((line) => {
						const m = TASK.exec(lines[line]) as RegExpExecArray;
						const ch = m[1].length;
						return { from: { line, ch }, to: { line, ch: ch + 1 }, text: " " };
					}),
				});
			}
		} else {
			await this.app.vault.process(file, (text) => {
				const lines = text.split("\n");
				const hits = this.targets(lines, start);
				count = hits.length;
				for (const line of hits) lines[line] = lines[line].replace(TASK, "$1 $3");
				return lines.join("\n");
			});
		}
		new Notice(count ? `Unchecked ${count} task${count === 1 ? "" : "s"}.` : "Nothing to uncheck.");
	}

	/** The editor showing this note, if it's open in editing view in the active pane. */
	private editorFor(file: TFile): Editor | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view && view.file === file && view.getMode() === "source" ? view.editor : null;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class ResetTasksSettings extends PluginSettingTab {
	constructor(app: App, private plugin: ResetTasks) {
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
		new Setting(containerEl).setName("Button in a note").setHeading();
		new Setting(containerEl).setDesc(createFragment((f) => {
			f.appendText("Add a code block named reset-tasks anywhere in a note. Its button unchecks the list under it, down to the next heading. Write ");
			f.createEl("code", { text: "all" });
			f.appendText(" inside the block to reset the whole note instead.");
		}));
	}
}
