import { LEVELS } from "./data";
import { DAY, nowS, isOpen } from "./sherpa";
import { pointsOf } from "./store";
import type { State } from "./types";

/** Fun layer: XP, level, streak, daily quests and badges. All derived from real records, nothing is stored. */
export interface Badge { id: string; label: string; hint: string; icon: string; got: boolean }
export interface Quest { label: string; done: boolean; xp: number }

const dayKey = (t: number) => Math.floor(t / DAY);

export function gameOf(s: State, userId: string) {
  const now = nowS(s);
  const myReports = s.reports.filter((r) => r.reporterId === userId && r.status === "sent");
  const myTasksDone = s.sherpa.tasks.filter((t) => t.done && t.forUser === userId);
  const myOpps = s.sherpa.opps.filter((o) => o.owner === userId || o.source.reporter === userId);
  const wins = myOpps.filter((o) => o.stage === "won");
  const leadPts = pointsOf(s, userId).confirmed;
  const xp = leadPts + myTasksDone.length * 10 + wins.length * 200;

  let i = 0; LEVELS.forEach((l, k) => { if (xp >= l.from) i = k; });
  const next = LEVELS[i + 1];
  const pct = next ? Math.min(100, ((xp - LEVELS[i].from) / (next.from - LEVELS[i].from)) * 100) : 100;

  const days = new Set<number>();
  myReports.forEach((r) => days.add(dayKey(r.createdAt)));
  myTasksDone.forEach((t) => t.doneAt && days.add(dayKey(t.doneAt)));
  let streak = 0; let d = dayKey(now); if (!days.has(d)) d -= 1;
  while (days.has(d)) { streak++; d--; }

  const today = dayKey(now);
  const accepted = myTasksDone.filter((t) => t.kind === "accept");
  const acceptedToday = accepted.some((t) => t.doneAt && dayKey(t.doneAt) === today);
  const doneToday = myTasksDone.filter((t) => t.doneAt && dayKey(t.doneAt) === today).length;
  const open = s.sherpa.tasks.filter((t) => !t.done && t.forUser === userId);
  const quests: Quest[] = [
    { label: "Accept a new lead", done: acceptedToday, xp: 30 },
    { label: "Finish 3 to-dos", done: doneToday >= 3, xp: 20 },
    { label: "Clear everything overdue", done: open.every((t) => t.due >= now), xp: 20 },
  ];

  const badges: Badge[] = [
    { id: "first", label: "First lead", hint: "Accept your first lead", icon: "flag", got: accepted.length >= 1 },
    { id: "five", label: "Sharp eye", hint: "Accept 5 leads", icon: "star", got: accepted.length >= 5 },
    { id: "fast", label: "Quick hands", hint: "Finish 5 to-dos", icon: "bolt", got: myTasksDone.length >= 5 },
    { id: "win", label: "Deal closer", hint: "Win an opportunity", icon: "trophy", got: wins.length >= 1 },
    { id: "streak", label: "On a roll", hint: "3 days in a row", icon: "flag", got: streak >= 3 },
  ];
  return { xp, level: LEVELS[i].name, next, pct, streak, quests, badges, leads: myReports.length, wins: wins.length, openOpps: myOpps.filter(isOpen).length, doneTasks: myTasksDone.length, pending: pointsOf(s, userId).pending };
}
