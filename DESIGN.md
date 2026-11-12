# Design system

All values live in `app/globals.css`. Components use the tokens and the classes below, never raw colours or sizes.

## Palette

| Role | Token | Value | Use |
|---|---|---|---|
| Brand | `brand` | #d42a2a | Primary button, the current step, the user's own chat bubble. Nothing else. |
| Ink | `ink` | #1b1b20 | Text, progress lines, completed steps |
| Muted | `muted` | #6b6b76 | Secondary text |
| Line | `line` | #e3e3e8 | Hairline borders, empty progress |
| Canvas | `surface` | #f3f3f5 | Page background |
| Sheet | `sheet` | #ffffff | Every card, panel and table |
| In progress | `st-progress` | #2f6db5 | A small dot beside a label |
| Needs attention | `st-attention` | #b7791f | A small dot beside a label |
| Done | `st-done` | #2f855a | A small dot beside a label, and a finished progress line |

Rules
- Table status is a dot and a label; the drawer shows it as a tinted chip.
- Red is for one action and one "you are here". It is never used to mean "in progress".
- No gradients and no shadows on cards. Icon tiles use the tag hues above. Only pop-ups and drawers float.

## Tags and states

Tags use a tinted background with text of the same hue. Status in tables is a coloured dot and a label.

| Hue | Background | Text | Used for |
|---|---|---|---|
| Red | #fde6e6 | #c02626 | Service, Hot, Emergency, All leads |
| Orange | #fdeed8 | #b45309 | Warm, Needs you |
| Blue | #e3effb | #1b5aa6 | New installation, Cold, In progress |
| Green | #e2f4ea | #1d7a45 | Renewal, Done / won |
| Purple | #ece9fb | #4b36b8 | Win-back, Records update |
| Pink | #fbe6f0 | #b02a66 | Modernisation |
| Grey | #eeeef1 | #4a4a55 | Records, Noted, Info |
| Gold | #fdf0cf | #9a6a00 | Points |

Tags and chips are square-ish (6px). No pills, no fully round shapes except avatars and status dots.

## Shape and type

- Radius: 4 / 6 / 8 px. Cards and buttons are 8.
- Type: `t-display` 24, `t-title` 17, `t-body` 14, `t-small` 12.5 (muted), `t-label` 11 uppercase.
- Cards: `sheet` = white, 1px `line` border.
- Tables: header in `t-label`, rows separated by hairlines, selected row outlined in brand red on a soft red wash.

## Patterns

- Counts that act as filters: `Stat` (label, number, optional status dot).
- Progress: one thin line (`Line`) in lists, a numbered `Stepper` in detail.
- Detail view: right-hand drawer, 60% wide, page dimmed behind.
- Chat: bot messages are sheets, the user's message is a brand block, quick replies are bordered buttons inside the conversation.

## Territory map

- Real street map (OpenStreetMap tiles, pan/zoom/pinch, no map library). Pins: Leads (red, flame), Schindler clients (blue, shield), Other clients (grey, flag). An amber dot means needs attention.
- Filters: layer toggles with counts, area, search, My patch, Key accounts. Nearby pins merge into a square count bubble with a colour strip showing the mix.
- Side panel lists the places in view, hot first. Selecting one shows why now, facts and three actions: open it, ask SHERPA, directions. A competitor-served building offers Add as a lead.
