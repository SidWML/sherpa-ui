"use client";
import { NAMES, SH, chf, computeNbas, DAY, daysTo, oppOf, type NbaCard } from "@/lib/sherpa";
import { useApp } from "@/lib/store";
import { Btn, Card, Icon, Pill } from "../ui";
import { Stat } from "./Dash";

const URG = { high: ["Act today", "red"], med: ["This week", "amber"], low: ["When you can", "gray"] } as const;

function Ring({ done, total }: { done: number; total: number }) {
  const r = 26; const c = 2 * Math.PI * r; const pct = total ? done / total : 1;
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90"><circle cx="32" cy="32" r={r} fill="none" stroke="#ececf1" strokeWidth="6" /><circle cx="32" cy="32" r={r} fill="none" stroke="#e3001b" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-700" /></svg>
      <div className="num absolute text-sm font-semibold">{done}/{total}</div>
    </div>
  );
}

/** The seller's day: ranked next best actions, one click each. */
export function Today({ onDo, onOpenOpp }: { onDo: (c: NbaCard) => void; onOpenOpp: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const cards = computeNbas(s, me!);
  const doneToday = Object.values(s.sherpa.nba).filter((x) => (x.status === "done" || x.status === "dismissed") && now - x.at < DAY).length;
  const total = cards.length + doneToday;
  const offers = s.sherpa.offers.filter((o) => me!.role === "mgr" || o.createdBy === me!.id);
  const open = offers.filter((o) => ["draft", "awaiting", "changes", "approved", "sent"].includes(o.status));
  const won = offers.filter((o) => o.status === "won");
  const waiting = s.sherpa.offers.filter((o) => o.status === "awaiting" && (me!.role === "mgr" ? o.approvals.some((x) => x.status === "pending" && x.by === me!.id) : o.createdBy === me!.id));
  const myTasks = s.sherpa.tasks.filter((t) => !t.done && (t.forUser === me!.id || (!t.forUser && t.by === me!.id))).sort((x, y) => y.createdAt - x.createdAt);
  const hour = new Date(now).getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Ring done={doneToday} total={total} />
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{hello}, {me!.name.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-muted">{myTasks.length ? `${myTasks.length} thing${myTasks.length > 1 ? "s" : ""} need${myTasks.length > 1 ? "" : "s"} you` : "Nothing is waiting on you"}{cards.length ? ` · ${cards.length} suggestion${cards.length > 1 ? "s" : ""} from SHERPA` : ""}.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Open offers" value={open.length} sub={`Worth ${chf(open.reduce((a, o) => a + o.price, 0))}`} icon="list" />
        <Stat label={me!.role === "mgr" || me!.role === "lead" ? "Waiting for you" : "Waiting for approval"} value={waiting.length} tone={waiting.length ? "amber" : undefined} icon="clock" sub={waiting.length ? "Discounts above the guideline" : "Nothing blocked"} />
        <Stat label="Won" value={won.length} tone="green" icon="trophy" sub={won.length ? chf(won.reduce((a, o) => a + o.price, 0)) : "None yet"} />
      </div>

      <div className="mb-2 flex items-center gap-2"><h3 className="t-label">Needs my action</h3><span className="num text-[11px] text-muted">{myTasks.length}</span></div>
      <Card className="mb-8 divide-y divide-line">
        {myTasks.length === 0 && <div className="flex items-center gap-2 p-4 text-[13.5px] text-emerald-800"><Icon n="check" s={16} /> Nothing is waiting on you. SHERPA will add a step here when someone hands you work.</div>}
        {myTasks.slice(0, 8).map((t) => {
          const o = oppOf(s, t.oppId); const late = t.due < now;
          return (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${late ? "bg-red-50 text-brand" : "bg-brand-soft text-brand"}`}><Icon n={t.kind === "approve" ? "check" : t.kind === "visit" ? "pin" : t.kind === "accept" ? "bolt" : "list"} s={15} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold leading-snug">{t.title}</div>
                <div className="text-[12.5px] text-muted">{o ? `${o.id} · ${o.title}` : "Task"} · from {NAMES[t.by] ?? t.by} · {late ? <b className="text-brand">overdue</b> : `due in ${Math.max(0, daysTo(s, t.due))} days`}</div>
              </div>
              {o ? <Btn sm onClick={() => onOpenOpp(o.id)}>Open</Btn> : <Btn sm v="ghost" onClick={() => mutate((st) => { const x = st.sherpa.tasks.find((q) => q.id === t.id); if (x) { x.done = true; x.doneAt = Date.now() + st.clock; } })}>Done</Btn>}
            </div>
          );
        })}
      </Card>
      {cards.length > 0 && <div className="mb-2 flex items-center gap-2"><h3 className="t-label">Suggested by SHERPA</h3><span className="num text-[11px] text-muted">{cards.length}</span></div>}
      <div className="space-y-3">
        {cards.map((c, k) => (
          <Card key={c.key} className="pop p-5">
            <div className="flex items-start gap-4">
              <div className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">{k + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><Pill tone={URG[c.urgency][1]}>{URG[c.urgency][0]}</Pill>{c.no > 0 && <span className="text-[11px] font-medium text-muted">NBA {c.no}</span>}{c.value ? <span className="text-[11px] font-medium text-muted">· worth {chf(c.value)}</span> : null}</div>
                <h2 className="mt-1.5 text-[17px] font-semibold leading-snug">{c.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{c.why}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted"><Icon n="sparkle" s={12} /> {c.agent}<span className="mx-1">·</span>Sources: {c.sources.join(", ")}</div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Btn onClick={() => onDo(c)}>{c.cta} <Icon n="chev" s={14} /></Btn>
                  <Btn v="ghost" onClick={() => mutate((st) => SH.setNba(st, c.key, "snoozed", 1))}>Later</Btn>
                  <button onClick={() => mutate((st) => SH.setNba(st, c.key, "dismissed"))} className="px-2 text-[13px] text-muted hover:text-ink">Not relevant</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {cards.length === 0 && (
          <Card className="px-6 py-12 text-center"><div className="text-4xl">🎉</div><div className="mt-2 text-lg font-semibold">You are clear</div><p className="mt-1 text-sm text-muted">SHERPA keeps watching contracts, callbacks, quotes and leads. New actions appear here when something needs you.</p></Card>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">Actions are suggested by fixed rules on mock data. A person always approves. Later hides a card for a day.</p>
    </div>
  );
}

