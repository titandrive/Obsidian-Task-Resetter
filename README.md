# Reset Tasks

Uncheck the tasks in a note, so a checklist can be used again.

## Three ways to reset

- **Command:** **Reset tasks in this note**. Give it a hotkey in Settings → Hotkeys, or add it to the mobile toolbar.
- **Sidebar button:** resets the note that's open.
- **A button in the note:** add a `reset-tasks` code block anywhere in a note:

  ````
  ```reset-tasks
  ```
  ````

  It shows a **Reset tasks** button that unchecks only the list under it, down to the next heading, so a note with several lists can have a button for each. Write `all` inside the block to make it reset the whole note instead.

## Details

- Unchecks `[x]` and `[X]`, including nested and numbered tasks. Tasks inside code blocks are left alone.
- **Also clear other markers** (in settings, off by default) resets markers like `[-]` and `[/]` too.
- Undo: when the note is open in the editor, a reset is one edit, so Ctrl/Cmd+Z puts every check back. The notice that says how many were unchecked also has an **Undo** link, which works in reading view too.

## Install

Not on the community plugin store; install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable BRAT.
2. BRAT → **Add beta plugin** → `titandrive/Obsidian-Reset-Tasks`.
3. Enable **Reset Tasks** under Settings → Community plugins.

Or copy `main.js`, `manifest.json` and `styles.css` into `.obsidian/plugins/reset-tasks/` in your vault.
