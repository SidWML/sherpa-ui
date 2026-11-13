"use client";
import { useApp } from "@/lib/store";
import { gameOf } from "@/lib/game";
import { NAMES, STAGES, computeNbas, daysTo, inr, isOpen, oppOf, tasksOfOpp, DAY, SH, type NbaCard } from "@/lib/sherpa";
import type { Opp, State } from "@/lib/types";
import { Btn, Icon, Pill } from "../ui";

/** Opportunities a person is part of. The manager sees the whole team. */
export function involvedOpps(s: State, id: string, role: string) {
  return s.sherpa.opps.filter((o) => role === "mgr" || o.owner === id || tasksOfOpp(s, o.id, false).some((t) => t.forUser === id) || o.source.reporter === id);
}

export function statsOf(s: State, id: string, role: string, now: number) {
  const mine = s.sherpa.tasks.filter((t) => !t.done && t.forUser === id);
  const opps = involvedOpps(s, id, role).filter(isOpen);
  const needsIds = new Set(mine.map((t) => t.oppId));
  const waiting = opps.filter((o) => !needsIds.has(o.id) && (tasksOfOpp(s, o.id).length > 0 || o.stage === "sent"));
  const late = mine.filter((t) => t.due < now).length;
  const won = involvedOpps(s, id, role).filter((o) => o.stage === "won");
  return { mine, opps, waiting, late, won, value: opps.reduce((a, o) => a + (o.value ?? 0), 0) };
}

export function Kpi({ label, value, sub, tone, onClick }: { label: string; value: React.ReactNode; sub?: string; tone?: "red" | "green" | "amber"; onClick?: () => void }) {
  const c = tone === "red" ? "text-brand" : tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-ink";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 text-left">
      <div className="truncate text-[11px] font-medium text-muted">{label}</div>
      <div className={`num mt-0.5 truncate text-[22px] font-semibold leading-tight tracking-tight ${c}`}>{value}</div>
      {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
    </Tag>
  );
}

/** A compact table of to-dos. Same rows in the chat and on the My work tab. */
export function TaskTable({ onOpen, limit = 5 }: { onOpen: (id: string) => void; limit?: number }) {
  const { s, me, now, mutate } = useApp();
  const rows = s.sherpa.tasks.filter((t) => !t.done && t.forUser === me!.id).sort((a, b) => b.createdAt - a.createdAt);
  if (!rows.length) return <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3.5 text-[13px] text-emerald-800"><Icon n="check" s={15} /> Nothing is waiting on you. Nice work.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="hidden grid-cols-[1fr_8rem_6rem_5.5rem] gap-3 border-b border-line bg-surface px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted @xl:grid"><span>Your next step</span><span>From</span><span>Due</span><span /></div>
      {rows.slice(0, limit).map((t) => {
        const o = oppOf(s, t.oppId); const late = t.due < now; const d = Math.max(0, Math.round((t.due - now) / DAY));
        return (
          <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-line/70 px-3.5 py-2.5 last:border-0 @xl:grid-cols-[1fr_8rem_6rem_5.5rem]">
            <div className="min-w-0"><div className="truncate text-[13.5px] font-semibold">{t.title}</div><div className="truncate text-[12px] text-muted">{o ? `${o.id} · ${o.placeName}` : "Task"}<span className="@xl:hidden"> · {late ? "overdue" : `${d}d`}</span></div></div>
            <span className="hidden truncate text-[12.5px] text-muted @xl:block">{NAMES[t.by] ?? t.by}</span>
            <span className={`hidden text-[12.5px] @xl:block ${late ? "font-semibold text-brand" : "text-muted"}`}>{late ? "Overdue" : d === 0 ? "Today" : `${d} day${d > 1 ? "s" : ""}`}</span>
            <div className="justify-self-end">{o ? <Btn sm onClick={() => onOpen(o.id)}>Open</Btn> : <Btn sm v="ghost" onClick={() => mutate((st) => { const x = st.sherpa.tasks.find((q) => q.id === t.id); if (x) { x.done = true; x.doneAt = Date.now() + st.clock; } })}>Done</Btn>}</div>
          </div>
        );
      })}
      {rows.length > limit && <div className="border-t border-line bg-surface px-3.5 py-2 text-[12px] text-muted">+ {rows.length - limit} more on the My work tab</div>}
    </div>
  );
}

const URG: Record<string, "red" | "amber" | "gray"> = { high: "red", med: "amber", low: "gray" };

/** Suggested actions from SHERPA, as rows with one button each. */
export function SuggestTable({ onDo, limit = 4 }: { onDo: (c: NbaCard) => void; limit?: number }) {
  const { s, me, mutate } = useApp();
  const cards = computeNbas(s, me!).slice(0, limit);
  if (!cards.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {cards.map((c) => (
        <div key={c.key} className="flex items-center gap-3 border-b border-line/70 px-3.5 py-2.5 last:border-0">
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><Pill tone={URG[c.urgency]}>{c.urgency === "high" ? "Today" : c.urgency === "med" ? "This week" : "Later"}</Pill></div><div className="mt-1 truncate text-[13.5px] font-semibold">{c.title}</div><div className="truncate text-[12px] text-muted">{c.why}</div><div className="truncate text-[11.5px] text-muted/80">via {c.agent}</div></div>
          <div className="flex shrink-0 items-center gap-1"><Btn sm onClick={() => onDo(c)}>{c.cta.length > 16 ? "Do it" : c.cta}</Btn><button aria-label="Not relevant" onClick={() => mutate((st) => SH.setNba(st, c.key, "dismissed"))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface">×</button></div>
        </div>
      ))}
    </div>
  );
}

/** First message of the chat: a small dashboard. */
export function DashCard({ onOpen, onDo, go }: { onOpen: (id: string) => void; onDo: (c: NbaCard) => void; go: (v: string) => void }) {
  const { s, me, now } = useApp();
  const st = statsOf(s, me!.id, me!.role, now);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <Kpi label="Needs my action" value={st.mine.length} tone={st.mine.length ? "red" : "green"} sub={st.late ? `${st.late} overdue` : "On time"} onClick={() => go("work")} />
        <Kpi label="Waiting on others" value={st.waiting.length} tone={st.waiting.length ? "amber" : undefined} sub="Nothing for you to do" onClick={() => go("work")} />
        <Kpi label="Open pipeline" value={inr(st.value)} sub={`${st.opps.length} opportunities`} />
        <Kpi label="Won" value={st.won.length} tone="green" sub={st.won.length ? inr(st.won.reduce((a, o) => a + (o.value ?? 0), 0)) : "None yet"} />
      </div>
      <div className="t-label">Needs my action</div>
      <TaskTable onOpen={onOpen} limit={4} />
      <div className="t-label">Suggested by SHERPA</div>
      <SuggestTable onDo={onDo} limit={3} />
    </div>
  );
}

/** Right-hand panel: quick analytics and the daily game. */
export function Insights({ go }: { go: (v: string) => void }) {
  const { s, me, now } = useApp();
  const g = gameOf(s, me!.id); const st = statsOf(s, me!.id, me!.role, now);
  const byStage = STAGES.map(([k, l]) => [l, st.opps.filter((o: Opp) => o.stage === k).length] as const).filter((x) => x[1] > 0);
  const max = Math.max(1, ...byStage.map((x) => x[1]));
  const stuck = st.opps.map((o) => ({ o, t: tasksOfOpp(s, o.id).sort((a, b) => a.due - b.due)[0] })).filter((x) => x.t && x.t.due < now).slice(0, 3);
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-ink p-4 text-white">
        <div className="flex items-center justify-between"><div><div className="text-[11px] uppercase tracking-[.1em] text-white/60">Level</div><div className="text-xl font-semibold">{g.level}</div></div><div className="text-right"><div className="num text-2xl font-semibold">{g.xp}</div><div className="text-[11px] text-white/60">XP</div></div></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${g.pct}%` }} /></div>
        <div className="mt-1.5 text-[11.5px] text-white/70">{g.next ? `${g.next.from - g.xp} XP to ${g.next.name}` : "Top level reached"}{g.streak > 0 ? ` · ${g.streak}-day streak` : ""}</div>
      </div>
      <div>
        <div className="mb-1.5 t-label">Today&apos;s quests</div>
        <div className="space-y-1.5">{g.quests.map((q) => <div key={q.label} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] ${q.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-line bg-white"}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${q.done ? "bg-emerald-500 text-white" : "border border-line"}`}>{q.done && <Icon n="check" s={12} />}</span><span className="flex-1">{q.label}</span><b className="num text-xs text-muted">+{q.xp}</b></div>)}</div>
      </div>
      <div>
        <div className="mb-1.5 t-label">Pipeline by stage</div>
        {byStage.length === 0 ? <div className="text-[13px] text-muted">Nothing open yet.</div> : <div className="space-y-1.5">{byStage.map(([l, n]) => <div key={l} className="flex items-center gap-2 text-[12.5px]"><span className="w-14 shrink-0 text-muted">{l}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} /></div><b className="num w-4 text-right">{n}</b></div>)}</div>}
      </div>
      {stuck.length > 0 && <div>
        <div className="mb-1.5 t-label">Running late</div>
        <div className="space-y-1.5">{stuck.map(({ o, t }) => <button key={o.id} onClick={() => go("work:" + o.id)} className="block w-full rounded-xl border border-line bg-white px-3 py-2 text-left text-[12.5px]"><div className="truncate font-semibold">{o.placeName}</div><div className="truncate text-muted">{NAMES[t!.forUser ?? ""] ?? "Someone"}: {t!.title} · {Math.abs(daysTo(s, t!.due))}d late</div></button>)}</div>
      </div>}
    </div>
  );
}

