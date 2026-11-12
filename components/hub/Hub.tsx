"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, KIND_LABEL, STAGES, inr, isOpen, oppOf, tasksOfOpp } from "@/lib/sherpa";
import type { Opp } from "@/lib/types";
import { Icon, ago } from "../ui";
import { Sherpa, type Seed } from "../desk/Sherpa";
import { OppPage, statusLine } from "../desk/Opps";
import { involvedOpps } from "./parts";
import { OwnerDot, Stat2, StatRow, T, Line } from "../shared";

/* ------------------------------------------------------------------ Chat: the home screen */
export function ChatHome({ seed, openOpp, openOffer, go, compact }: { compact?: boolean; seed: Seed | null; openOpp: (id: string) => void; openOffer: (id: string) => void; go: (v: string) => void }) {
  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-w-0 flex-1">
        <Sherpa seed={seed} onOpenOffer={openOffer} onOpenOpp={openOpp} onOpenLead={() => go("work")} noDash={compact} go={go} />
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ My work: one table of opportunities */
type Tab = "needs" | "waiting" | "active" | "closed";
const KIND_T = { newbuild: T.blue, existing: T.purple, renewal: T.green, modernisation: T.pink, project: T.blue } as const;
export function MyWork({ openId, setOpenId, openOffer, onAsk }: { openId: string | null; setOpenId: (id: string | null) => void; openOffer: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const [tab, setTab] = useState<Tab>("needs"); const [q, setQ] = useState(""); const [kindF, setKindF] = useState("all");
  const all = involvedOpps(s, me!.id, me!.role);
  const needs = (o: Opp) => isOpen(o) && tasksOfOpp(s, o.id).some((t) => t.forUser === me!.id);
  const lists: Record<Tab, Opp[]> = {
    needs: all.filter(needs),
    waiting: all.filter((o) => isOpen(o) && !needs(o) && (tasksOfOpp(s, o.id).length > 0 || o.stage === "sent")),
    active: all.filter(isOpen), closed: all.filter((o) => !isOpen(o)),
  };
  const lc = q.trim().toLowerCase();
  const rows = lists[tab].filter((o) => (kindF === "all" || o.kind === kindF) && (!lc || `${o.title} ${o.id} ${o.placeName}`.toLowerCase().includes(lc))).sort((a, b) => (tasksOfOpp(s, a.id)[0]?.due ?? Infinity) - (tasksOfOpp(s, b.id)[0]?.due ?? Infinity));
  const pipeline = lists.active.reduce((x, o) => x + (o.value ?? 0), 0);
  const cols = "minmax(0,2.2fr) 9.5rem 8rem minmax(0,2fr) 7rem 3rem 5rem 5.5rem";
  const stageOf = (o: Opp) => STAGES.find((x) => x[0] === o.stage)?.[1] ?? (o.stage === "lost" ? "Lost" : "Closed");
  const stageDot = (o: Opp) => (o.stage === "won" ? "var(--color-st-done)" : o.stage === "lost" || o.stage === "closed" ? "var(--color-muted)" : "var(--color-st-progress)");
  const upd = (o: Opp) => o.log[o.log.length - 1]?.t ?? 0;
  const kinds = Array.from(new Set(all.map((o) => o.kind)));
  const open = openId ? oppOf(s, openId) : undefined;
  const box = useRef<HTMLDivElement>(null); const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 640)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (open && narrow) box.current?.closest("main")?.scrollTo(0, 0); }, [open, narrow]);
  const askBtn = (o: Opp) => <button onClick={(e) => { e.stopPropagation(); onAsk(o); }} className="inline-flex items-center gap-1.5 rounded-md border border-brand bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={13} /> Ask</button>;
  const askAbout = (o: Opp) => <button onClick={() => { setOpenId(null); onAsk(o); }} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap @md:flex-none rounded-md border border-brand bg-white px-4 text-[13.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={15} /> Ask SHERPA about this</button>;
  if (open && narrow) return (
    <div ref={box} className="@container flex min-h-full w-full flex-col bg-surface">
      <div className="sticky top-0 z-10 shrink-0 border-b border-line bg-white px-4 pb-3 pt-2.5">
        <button onClick={() => setOpenId(null)} className="-ml-1.5 mb-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium text-ink/70 hover:bg-surface hover:text-ink"><Icon n="back" s={15} /> My work</button>
        <div className="t-label">Opportunity · {open.id}</div><div className="text-[18px] font-semibold leading-tight">{open.title}</div>
      </div>
      <div className="@container flex-1"><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></div>
      <div className="sticky bottom-0 flex shrink-0 border-t border-line bg-white px-4 py-3">{askAbout(open)}</div>
    </div>
  );
  return (
    <div ref={box} className="@container w-full"><div className="p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">My work</h1>
      <p className="t-small mt-0.5">Every lead, tender and offer is one opportunity. Open one for the full detail, or press Ask to work on it with SHERPA.</p>
      <StatRow>
        <Stat2 icon="warn" label="Needs my action" value={lists.needs.length} tone={T.orange} active={tab === "needs"} onClick={() => setTab("needs")} />
        <Stat2 icon="clock" label="Waiting on others" value={lists.waiting.length} tone={T.blue} active={tab === "waiting"} onClick={() => setTab("waiting")} />
        <Stat2 icon="layers" label="All active" value={lists.active.length} tone={T.red} active={tab === "active"} onClick={() => setTab("active")} />
        <Stat2 icon="check" label="Closed" value={lists.closed.length} tone={T.green} active={tab === "closed"} onClick={() => setTab("closed")} />
        <Stat2 icon="star" label="Open pipeline" value={<span className="text-[20px]">{inr(pipeline)}</span>} tone={T.gold} />
      </StatRow>
      <div className="mt-4 flex items-center gap-2">
        <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-muted focus-within:border-brand"><Icon n="search" s={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search place, opportunity or ID…" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" /></label>
        <select aria-label="Type" value={kindF} onChange={(e) => setKindF(e.target.value)} className="min-h-10 rounded-md border border-line bg-white px-3 text-[13px] outline-none focus:border-brand"><option value="all">Type</option>{kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
      </div>
      {rows.length === 0 ? <div className="sheet mt-4 p-8 text-center text-sm text-muted">{tab === "needs" ? "Nothing needs you right now." : "Nothing here."}</div> : (
        <>
          <div className="sheet mt-4 hidden overflow-hidden @4xl:block">
            <div className="grid items-center gap-4 border-b border-line px-5 py-3 t-label" style={{ gridTemplateColumns: cols }}><span>Opportunity</span><span>Type</span><span>Stage</span><span>Whose move</span><span className="text-right">Value</span><span>Owner</span><span className="text-right">Updated</span><span /></div>
            {rows.map((o) => { const sl = statusLine(s, o, me!.id, now); const kt = KIND_T[o.kind]; return (
              <div key={o.id} role="button" tabIndex={0} onClick={() => setOpenId(o.id)} className={`grid cursor-pointer items-center gap-4 border-b border-line px-5 py-3 transition last:border-0 hover:bg-surface ${o.id === openId ? "!bg-brand-soft" : ""}`} style={{ gridTemplateColumns: cols, ...(o.id === openId ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : {}) }}>
                <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{o.title}</span><span className="block truncate t-small">{o.id} · {o.placeName} · {AREA_NAME[o.area] ?? o.area}</span></span>
                <span><span style={{ background: kt.bg, color: kt.fg }} className="inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold">{KIND_LABEL[o.kind]}</span></span>
                <span className="inline-flex items-center gap-2 text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: stageDot(o) }} />{stageOf(o)}</span>
                <span className="min-w-0"><span className={`block truncate text-[13px] ${sl.mine ? "font-semibold" : "text-ink/80"}`}>{sl.mine && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--color-st-attention)" }} />}{sl.text}</span></span>
                <span className="num text-right text-[13.5px] font-semibold">{o.value ? inr(o.value) : <span className="font-normal text-muted">–</span>}</span>
                <span><OwnerDot id={o.owner} /></span>
                <span className="text-right t-small">{upd(o) ? ago(now - upd(o)) : "–"}</span>
                <span className="text-right">{askBtn(o)}</span>
              </div>); })}
          </div>
          <div className="sheet mt-4 overflow-hidden @4xl:hidden">
            {rows.map((o) => { const sl = statusLine(s, o, me!.id, now); const kt = KIND_T[o.kind]; return (
              <div key={o.id} role="button" tabIndex={0} onClick={() => setOpenId(o.id)} className="block w-full cursor-pointer border-b border-line px-4 py-3.5 text-left last:border-0 hover:bg-surface">
                <span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-[14.5px] font-semibold">{o.title}</span><span className="block truncate t-small">{o.id} · {o.placeName}</span></span><OwnerDot id={o.owner} /></span>
                <span className="mt-2 flex flex-wrap items-center gap-2"><span style={{ background: kt.bg, color: kt.fg }} className="rounded-md px-2 py-0.5 text-[12px] font-semibold">{KIND_LABEL[o.kind]}</span><span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: stageDot(o) }} />{stageOf(o)}</span>{o.value ? <span className="num ml-auto text-[13px] font-semibold">{inr(o.value)}</span> : null}</span>
                <span className={`mt-2 block text-[12.5px] ${sl.mine ? "font-semibold" : "text-muted"}`}>{sl.text}</span>
                <span className="mt-2 flex items-center gap-3"><span className="min-w-0 flex-1"><Line total={STAGES.length} at={Math.max(0, STAGES.findIndex((x) => x[0] === o.stage))} closed={o.stage === "won"} color={stageDot(o)} /></span>{askBtn(o)}</span>
              </div>); })}
          </div>
        </>
      )}
      {open && (
        <>
          <button aria-label="Close" onClick={() => setOpenId(null)} className="fixed inset-0 z-40 bg-ink/35" />
          <aside className="@container pop float fixed bottom-0 right-0 top-[var(--safe-top,0px)] z-50 flex w-full max-w-[40rem] flex-col border-l border-line bg-white pb-[var(--safe-bottom,0px)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0"><div className="t-label">Opportunity · {open.id}</div><div className="truncate text-[17px] font-semibold leading-tight">{open.title}</div></div>
              <button aria-label="Close" onClick={() => setOpenId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={16} /></button>
            </div>
            <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto bg-surface"><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></div>
            <div className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-5 py-3"><span className="mr-auto hidden t-small @md:inline">Want a hand with this one?</span>{askAbout(open)}</div>
          </aside>
        </>
      )}
    </div></div>
  );
}
