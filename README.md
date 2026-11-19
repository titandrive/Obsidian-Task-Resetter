# Task Resetter

Uncheck the tasks in a note, so a checklist can be used again.

## Three ways to reset

- **Command:** **Reset tasks in this note**. Give it a hotkey in Settings → Hotkeys, or add it to the mobile toolbar.
- **Sidebar button:** resets the note that's open.
- **A button in the note:** add a `reset-tasks` code block anywhere in a note:

  ````
  ```reset-tasks
  ```
  ````

  Or type `[reset-tasks]` anywhere, even at the end of a heading (`## Morning [reset-tasks]`); it shows as the same button. `[reset-tasks all]` resets the whole note. In editing view it shows as text while your cursor is on it, so you can edit or delete it. Or run **Insert reset button** from the command palette to add a block at the cursor.

  It shows a **Reset tasks** button. Where you put it decides what it resets:

  - **Under a heading:** that heading's section, from the button down to the next heading of the same or a higher level. Subheadings are included, so a button under `## Morning` also resets a `### Extras` inside it. A note with several lists can have a button for each.
  - **Above any heading:** the whole note.
  - **With `all` written inside the block:** the whole note, wherever it is.

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
