# Snap & Lead: working proof of concept

A front-end working model of the Snap & Lead PRD (`Snap & Lead Product Requirements Document.md`).
Everything runs in the browser. State is stored in `localStorage`; nothing is sent anywhere.

```bash
npm install
npm run dev        # http://localhost:3000
```

## How to explore

There are two separate apps. They share data, but no screen or flow appears in both.

| URL | App | Opens as |
| --- | --- | --- |
| `/` | **SHERPA**, for sellers, managers and admin | Madhav Reddy, Sales manager |
| `/snap` | **Snap & Lead**, the lead generator app | Arjun Rao, lead generator |

1. Open `/snap` and tap *Take or upload photos*, or use **Demo → case atlas** to run one of the PRD scenarios.
2. Create the report. It is routed to the right owner, and the opportunity appears in SHERPA at `/`.
3. In SHERPA, use **Switch role** (bottom left, or the avatar menu) to work the lead as another role. The same panel opens Snap & Lead, and Snap & Lead's opens SHERPA. The reporter's progress and points update in Snap & Lead.
4. Pause routing is in the Admin view.

## Roles (all 12)

Reporter, SC / EI / MOD / NI sales, account manager, sales manager, records steward, emergency desk, service team, leadership, administrator.

## Where things live

| Path | What |
| --- | --- |
| `lib/engine.ts` | Business rules: situation, score and reasons, tier, teams, tracks, points. No AI decides tier, owner or safety. |
| `lib/store.tsx` | State, routing by team and area, follow-up clock, every desk action, seed data, offline queue. |
| `lib/data.ts` | Users, areas, places, progress tracks, default config, the 145-case catalogue and scenario presets. |
| `app/(sherpa)/`, `app/(snap)/snap/` | The two apps, each with its own root layout. |
| `components/reporter/` | Snap & Lead: Snap flow, My leads, report detail, rewards. |
| `components/desk/` | Sales, account, manager, records, emergency, service, leadership, admin desks. |

## Not built (stubs or out of scope)

Real photo reading, Salesforce / SAP, push notifications, SSO, languages, face blur, batch mode, escalator-owner rules beyond the PRD placeholders.
All numbers are the PRD's Proposed values and are editable in the Administrator view.

## Mock server and saved data

The app keeps its data on a small mock server: `app/api/state/route.ts` reads and writes one JSON file, `.data/db.json`. Reloading the page keeps your changes, and two browser windows (for example a seller and a manager) see each other's changes within a few seconds. Who is signed in is stored per browser, not on the server.

- Start over: use **Reset demo data** (Admin, or Demo controls), or delete `.data/db.json`.
- If the saved data has an older shape, it is ignored and fresh seed data is loaded. The seed itself lives in `lib/sherpa.ts` (SHERPA data) and `lib/store.tsx` (Snap & Lead).
- It is a demo backend: no login, no database, last write wins.
