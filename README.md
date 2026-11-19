# Task Resetter

Uncheck the tasks in a note, so a checklist can be used again.

## Three ways to reset

- **Command:** **Reset tasks in this note**. Give it a hotkey in Settings → Hotkeys, or add it to the mobile toolbar.
- **Sidebar buttons:** one resets the note that's open; the other (**Insert reset button**) adds a reset button to the note, like the command below.
- **A button in the note:** type `[reset-tasks]` anywhere in a note, even at the end of a heading (`## Morning [reset-tasks]`), or run **Insert reset button** from the command palette or the sidebar, which adds it at the end of the line you're on (or on an empty line, right there). It shows as a **Reset tasks** button; in editing view it turns back into text while your cursor is on its line, so you can edit or delete it. Where it is decides what it resets:

  - **On or under a heading:** that heading's section, down to the next heading of the same or a higher level. Subheadings are included, so a button on `## Morning` also resets a `### Extras` inside it. A note with several lists can have a button for each.
  - **Above any heading:** the whole note.
  - **`[reset-tasks all]`:** the whole note, wherever it is.
  - **`[reset-tasks ##]`:** every H2 section in the note, subsections included. Works for any level, `#` to `######`.
  - **`[reset-tasks: Morning]`:** the section of the heading named Morning (ignoring case), wherever the button is. If several headings have that name, all of them are reset. After typing `[reset-tasks: `, the note's headings pop up to pick from, as they do for links.

  The button says what it resets: **Reset tasks**, **Reset all tasks**, **Reset H2 tasks**, **Reset Morning**.

## Details

- Unchecks `[x]` and `[X]`, including nested and numbered tasks. Tasks inside code blocks are left alone.
- **Hide the button label** (in settings) shows the buttons in notes as just the icon.
- On phones, tapping a reset button gives a light haptic tap (**Haptic tap** in settings turns it off).
- **Also clear other markers** (in settings, off by default) resets markers like `[-]` and `[/]` too.
- Undo: when the note is open in the editor, a reset is one edit, so Ctrl/Cmd+Z puts every check back. The notice that says how many were unchecked also has an **Undo** link, which works in reading view too.

## Install

Not on the community plugin store; install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable BRAT.
2. BRAT → **Add beta plugin** → `titandrive/Obsidian-Task-Resetter`.
3. Enable **Task Resetter** under Settings → Community plugins.

Or copy `main.js`, `manifest.json` and `styles.css` into `.obsidian/plugins/task-resetter/` in your vault.
