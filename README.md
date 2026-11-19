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
  - **`[reset-tasks heading: Morning]`:** the section of the heading named Morning (ignoring case), wherever the button is. If several headings have that name, all of them are reset. `[reset-tasks: Morning]` is short for the same thing. After typing `heading: ` (or `[reset-tasks: `), the note's headings pop up to pick from, as they do for links.

  The button says what it resets: **Reset tasks**, **Reset all tasks**, **Reset H2 tasks**, **Reset Morning**.

- **Options:** any button can also take `icon:` and `label:`, in any order, after `all`, `##` or the other options:

  - **`icon: sun`:** a different icon, by its [Lucide](https://lucide.dev/icons) name. After typing `icon: `, matching icons pop up to pick from.
  - **`label: Morning chores`:** different text on the button. It shows even when **Hide the button label** is on.

  For example: `[reset-tasks heading: Evening icon: moon label: Evening chores]` or `[reset-tasks ## icon: list-checks]`.

## Examples

| You type | The button | What it resets |
|---|---|---|
| `[reset-tasks]` | Reset tasks | The section it's on or under; the whole note when it's above any heading |
| `## Morning [reset-tasks]` | Reset tasks | The Morning section, subheadings included |
| `[reset-tasks all]` | Reset all tasks | The whole note |
| `[reset-tasks ##]` | Reset H2 tasks | Every H2 section, subheadings included |
| `[reset-tasks ###]` | Reset H3 tasks | Every H3 section |
| `[reset-tasks heading: Morning]` | Reset Morning | Every heading named Morning, wherever the button is |
| `[reset-tasks: Morning]` | Reset Morning | The same, written short |
| `[reset-tasks icon: sunrise]` | Reset tasks, with a sunrise icon | Its own section |
| `[reset-tasks label: Reset me]` | Reset me | Its own section |
| `[reset-tasks all icon: list-restart label: Start over]` | Start over, with a list-restart icon | The whole note |
| `[reset-tasks ## icon: list-checks]` | Reset H2 tasks, with a list-checks icon | Every H2 section |

With every option at once:

```
[reset-tasks heading: Evening icon: moon label: Evening chores]
```

A button reading **Evening chores** with a moon icon, which resets every heading named Evening, wherever it sits in the note. The options can go in any order.

A whole note:

```markdown
Every H2 section: [reset-tasks ##]
Start the week over: [reset-tasks all icon: list-restart label: Start over]

# Weekdays [reset-tasks icon: briefcase label: Reset the week]

## Morning [reset-tasks icon: sunrise]

- [x] Make coffee
- [x] Feed the cat

### Extras

- [x] Stretch

## Evening [reset-tasks heading: Evening icon: moon label: Evening chores]

- [x] Dishes
- [x] Set an alarm

# Weekend

## Morning

- [x] Long walk

## Errands [reset-tasks: Errands]

- [x] Groceries
```

Here **Reset the week** clears all of Weekdays, the sunrise button clears Morning and its Extras, **Evening chores** clears Evening, **Reset H2 tasks** clears every H2 section in both weeks, and **Start over** clears everything.

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
