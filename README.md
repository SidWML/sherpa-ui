# Snap & Lead: working proof of concept

A front-end working model of the Snap & Lead PRD (`Snap & Lead Product Requirements Document.md`).
Everything runs in the browser. State is stored in `localStorage`; nothing is sent anywhere.

```bash
npm install
npm run dev        # http://localhost:3000
```

## How to explore

1. Sign in as **Alex Reyes** (reporter) and tap *Start a new report*.
2. On the photos step, pick a **Demo scenario** (for example `B5` contract ended, `D1` building site, `A2` unsafe). It loads sample photos and tells you which answers to give.
3. Create the report, then use **Demo controls** (top right) or the avatar menu to switch to the owner, manager, records, emergency or service role and act on it. The reporter's progress track and points update.
4. **Demo controls** also jump the follow-up clock (+24h / +48h / +72h), go offline, take the photo reader down, or pause routing.
5. **Case atlas** lists all 145 PRD cases. About 80 have a runnable scenario.

## Roles (all 12)

Reporter, SC / EI / MOD / NI sales, account manager, sales manager, records steward, emergency desk, service team, leadership, administrator.

## Where things live

| Path | What |
| --- | --- |
| `lib/engine.ts` | Business rules: situation, score and reasons, tier, teams, tracks, points. No AI decides tier, owner or safety. |
| `lib/store.tsx` | State, routing by team and area, follow-up clock, every desk action, seed data, offline queue. |
| `lib/data.ts` | Users, areas, places, progress tracks, default config, the 145-case catalogue and scenario presets. |
| `components/reporter/` | Reporter home, Snap flow, My reports, report detail, alerts, rewards. |
| `components/desk/` | Sales, account, manager, records, emergency, service, leadership, admin desks. |

## Not built (stubs or out of scope)

Real photo reading, maps, Salesforce / SAP, push notifications, SSO, languages, face blur, batch mode, escalator-owner rules beyond the PRD placeholders.
All numbers are the PRD's Proposed values and are editable in the Administrator view.

## Mock server and saved data

The app keeps its data on a small mock server: `app/api/state/route.ts` reads and writes one JSON file, `.data/db.json`. Reloading the page keeps your changes, and two browser windows (for example a seller and a manager) see each other's changes within a few seconds. Who is signed in is stored per browser, not on the server.

- Start over: use **Reset demo data** (Admin, or Demo controls), or delete `.data/db.json`.
- If the saved data has an older shape, it is ignored and fresh seed data is loaded. The seed itself lives in `lib/sherpa.ts` (SHERPA data) and `lib/store.tsx` (Snap & Lead).
- It is a demo backend: no login, no database, last write wins.
