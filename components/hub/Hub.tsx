"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { gameOf } from "@/lib/game";
import { AREA_NAME, KIND_LABEL, STAGES, inr, isOpen, oppOf, tasksOfOpp, offerOf } from "@/lib/sherpa";
import type { NbaCard } from "@/lib/sherpa";
import type { Opp } from "@/lib/types";
import { Btn, Icon, Pill, ago } from "../ui";
import { Sherpa, type Seed } from "../desk/Sherpa";
import { OppPage, statusLine } from "../desk/Opps";
import { Assistant } from "../reporter/Assistant";
import { involvedOpps } from "./parts";
import { OwnerDot, Stat2, T, Line, pageList } from "../reporter/ReporterApp";

/* ------------------------------------------------------------------ Chat: the home screen */
export function ChatHome({ snapReq, seed, openOpp, openOffer, go, compact }: { compact?: boolean; snapReq?: number; seed: Seed | null; openOpp: (id: string) => void; openOffer: (id: string) => void; go: (v: string) => void }) {
  const { s } = useApp();
  const [snap, setSnap] = useState(false); const [snapUsed, setSnapUsed] = useState(false); const [snapKey, setSnapKey] = useState(0);
  const open = () => { setSnap(true); setSnapUsed(true); };
  useEffect(() => { if (snapReq) { setSnap(true); setSnapUsed(true); } }, [snapReq]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-w-0 flex-1">
        <Sherpa seed={seed} onOpenOffer={openOffer} onOpenOpp={openOpp} onOpenLead={() => go("work")} onSnap={open} noDash={compact} go={go} />
        {snapUsed && (
          <div className={`absolute inset-0 z-10 flex-col bg-surface ${snap ? "flex" : "hidden"}`}>
            <div className="relative min-h-0 flex-1">
              <Assistant key={snapKey} direct onBack={() => setSnap(false)} onOpen={(rid) => { setSnap(false); const o = s.sherpa.opps.find((x) => x.source.reportId === rid); if (o) openOpp(o.id); else go("work"); }} onNew={() => setSnapKey((k) => k + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ My work: one table of opportunities */
/** ₹11.76 Cr, ₹42.5 L: short enough for a card. */
const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L` : inr(n));
type Tab = "needs" | "waiting" | "active" | "closed";
const KIND_T = { newbuild: T.blue, existing: T.purple, renewal: T.green, modernisation: T.pink, project: T.blue } as const;
export function MyWork({ openId, setOpenId, openOffer, onAsk }: { openId: string | null; setOpenId: (id: string | null) => void; openOffer: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const [tab, setTab] = useState<Tab>("needs"); const [q, setQ] = useState(""); const [kindF, setKindF] = useState("all"); const [stageF, setStageF] = useState("all"); const [areaF, setAreaF] = useState("all"); const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: "due", d: 1 });
  const ALL_COLS = { type: true, stage: true, move: true, value: true, owner: true, updated: true };
  const [vis, setVis] = useState(ALL_COLS); const [panel, setPanel] = useState(false);
  const [checked, setChecked] = useState<string[]>([]); const [view, setView] = useState<"list" | "grid">("list"); const [menu, setMenu] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null); const [wide, setWide] = useState(false);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setWide(el.clientWidth >= 1200)); ro.observe(el); return () => ro.disconnect(); }, []);
  const all = involvedOpps(s, me!.id, me!.role);
  const needs = (o: Opp) => isOpen(o) && tasksOfOpp(s, o.id).some((t) => t.forUser === me!.id);
  const lists: Record<Tab, Opp[]> = {
    needs: all.filter(needs),
    waiting: all.filter((o) => isOpen(o) && !needs(o) && (tasksOfOpp(s, o.id).length > 0 || o.stage === "sent")),
    active: all.filter(isOpen), closed: all.filter((o) => !isOpen(o)),
  };
  const stageOf = (o: Opp) => STAGES.find((x) => x[0] === o.stage)?.[1] ?? (o.stage === "lost" ? "Lost" : "Closed");
  const stageDot = (o: Opp) => (o.stage === "won" ? "var(--color-st-done)" : o.stage === "lost" || o.stage === "closed" ? "var(--color-muted)" : "var(--color-st-progress)");
  const upd = (o: Opp) => o.log[o.log.length - 1]?.t ?? 0;
  const due = (o: Opp) => tasksOfOpp(s, o.id)[0]?.due ?? Infinity;
  const lc = q.trim().toLowerCase();
  const key = (o: Opp): string | number => sort.k === "title" ? o.title : sort.k === "type" ? KIND_LABEL[o.kind] : sort.k === "stage" ? STAGES.findIndex((x) => x[0] === o.stage) : sort.k === "value" ? o.value ?? 0 : sort.k === "updated" ? upd(o) : due(o);
  const rows = lists[tab].filter((o) => (kindF === "all" || o.kind === kindF) && (stageF === "all" || o.stage === stageF) && (areaF === "all" || o.area === areaF) && (!lc || `${o.title} ${o.id} ${o.placeName}`.toLowerCase().includes(lc)))
    .sort((a, b) => { const p = key(a), r = key(b); return (p < r ? -1 : p > r ? 1 : 0) * sort.d; });
  const pipeline = lists.active.reduce((x, o) => x + (o.value ?? 0), 0);
  const per = 8; const pages = Math.max(1, Math.ceil(rows.length / per)); const cur = Math.min(page, pages); const shown = rows.slice((cur - 1) * per, cur * per);
  const kinds = Array.from(new Set(all.map((o) => o.kind))); const areas = Array.from(new Set(all.map((o) => o.area)));
  const stagesUsed = STAGES.filter(([k]) => all.some((o) => o.stage === k));
  const open = openId ? oppOf(s, openId) : undefined;
  const widths = { type: "9.5rem", stage: "7.5rem", move: "minmax(9rem,1.6fr)", value: "6.5rem", owner: "3rem", updated: "5.5rem" } as const;
  const colKeys = Object.keys(widths) as (keyof typeof widths)[];
  const colLabel: Record<string, string> = { type: "Type", stage: "Stage", move: "Whose move", value: "Value", owner: "Owner", updated: "Updated" };
  const cols = ["1.5rem", "minmax(12rem,2.2fr)", ...colKeys.filter((k) => vis[k]).map((k) => widths[k]), "7.5rem"].join(" ");
  const resetAll = () => { setTab("needs"); setQ(""); setKindF("all"); setStageF("all"); setAreaF("all"); setPage(1); setVis(ALL_COLS); };
  const sortBy = (k: string) => setSort((p) => ({ k, d: p.k === k ? (p.d === 1 ? -1 : 1) : 1 }));
  const th = (k: string | undefined, children: React.ReactNode) => k ? <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 text-left t-label hover:text-ink">{children}<span className={sort.k === k ? "text-ink" : "opacity-50"}>⇅</span></button> : <span className="t-label">{children}</span>;
  const sel2 = "min-h-10 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand";
  const allChecked = shown.length > 0 && shown.every((o) => checked.includes(o.id));
  const tick = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const go = (t: Tab) => { setTab(t); setPage(1); };
  const area = (id: string) => AREA_NAME[id] ?? id;
  const askBtn = (o: Opp) => <button onClick={(e) => { e.stopPropagation(); onAsk(o); }} className="inline-flex items-center gap-1.5 rounded-md border border-brand bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={13} /> Ask</button>;
  const kindTag = (o: Opp) => { const kt = KIND_T[o.kind]; return <span style={{ background: kt.bg, color: kt.fg }} className="inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold">{KIND_LABEL[o.kind]}</span>; };
  const stageTag = (o: Opp) => <span className="inline-flex items-center gap-2 text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: stageDot(o) }} />{stageOf(o)}</span>;
  const tile = (o: Opp) => { const kt = KIND_T[o.kind]; return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md" style={{ background: kt.bg, color: kt.fg }}><Icon n={o.kind === "newbuild" || o.kind === "project" ? "layers" : o.kind === "renewal" ? "shield" : o.kind === "modernisation" ? "gear" : "pin"} s={18} /></span>; };
  const check = (on: boolean, fn: (e: React.MouseEvent) => void) => <span role="checkbox" aria-checked={on} onClick={fn} className={`grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-sm border ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{on && <Icon n="check" s={12} w={3} />}</span>;
  return (
    <div ref={box} className="w-full p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">My work</h1>
      <p className="t-small mt-0.5">Every lead, tender and offer is one opportunity. Click a row for the full detail, or press Ask to work on it with SHERPA.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 @3xl:grid-cols-5">
        <Stat2 icon="warn" label="Needs my action" value={lists.needs.length} tone={T.orange} active={tab === "needs"} onClick={() => go("needs")} />
        <Stat2 icon="clock" label="Waiting on others" value={lists.waiting.length} tone={T.blue} active={tab === "waiting"} onClick={() => go("waiting")} />
        <Stat2 icon="layers" label="All active" value={lists.active.length} tone={T.red} active={tab === "active"} onClick={() => go("active")} />
        <Stat2 icon="check" label="Closed" value={lists.closed.length} tone={T.green} active={tab === "closed"} onClick={() => go("closed")} />
        <Stat2 icon="star" label="Open pipeline" value={<span className="whitespace-nowrap text-[19px]" title={inr(pipeline)}>{short(pipeline)}</span>} tone={T.gold} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 min-w-[14rem] flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-muted focus-within:border-brand"><Icon n="search" s={15} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by place, opportunity or ID…" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" /></label>
        <select aria-label="Status" value={tab} onChange={(e) => go(e.target.value as Tab)} className={sel2}><option value="needs">Needs my action</option><option value="waiting">Waiting on others</option><option value="active">All active</option><option value="closed">Closed</option></select>
        <select aria-label="Type" value={kindF} onChange={(e) => { setKindF(e.target.value); setPage(1); }} className={sel2}><option value="all">Type</option>{kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
        <select aria-label="Stage" value={stageF} onChange={(e) => { setStageF(e.target.value); setPage(1); }} className={sel2}><option value="all">Stage</option>{stagesUsed.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select aria-label="My area" value={areaF} onChange={(e) => { setAreaF(e.target.value); setPage(1); }} className={sel2}><option value="all">My Area</option>{areas.map((x) => <option key={x} value={x}>{area(x)}</option>)}</select>
        <div className="relative">
          <button aria-label="Columns and filters" onClick={() => setPanel(!panel)} className={`grid h-10 w-10 place-items-center rounded-md border bg-white ${panel ? "border-brand text-brand" : "border-line text-ink/70 hover:bg-surface"}`}><Icon n="sliders" s={17} /></button>
          {panel && <>
            <button aria-label="Close" className="fixed inset-0 z-30" onClick={() => setPanel(false)} />
            <div className="float pop absolute right-0 top-12 z-40 w-60 rounded-md border border-line bg-white p-3">
              <div className="t-label mb-2">Columns</div>
              <div className="space-y-1">{colKeys.map((k) => <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded px-1 py-1.5 text-[13.5px] hover:bg-surface"><input type="checkbox" checked={vis[k]} onChange={() => setVis({ ...vis, [k]: !vis[k] })} className="h-4 w-4 accent-[#d42a2a]" />{colLabel[k]}</label>)}</div>
              <button onClick={() => { resetAll(); setPanel(false); }} className="mt-3 w-full rounded-md border border-line px-3 py-2 text-[13px] font-medium hover:bg-surface">Reset filters and columns</button>
            </div>
          </>}
        </div>
        <div className="flex overflow-hidden rounded-md border border-line bg-white">
          {([["list", "list"], ["grid", "layers"]] as const).map(([v, ic]) => <button key={v} aria-label={v} onClick={() => setView(v)} className={`grid h-10 w-11 place-items-center ${view === v ? "bg-brand-soft text-brand" : "text-ink/60 hover:bg-surface"}`} style={view === v ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : undefined}><Icon n={ic} s={17} /></button>)}
        </div>
      </div>
      {menu && <button aria-label="Close menu" className="fixed inset-0 z-30" onClick={() => setMenu(null)} />}
      {rows.length === 0 ? <div className="sheet mt-4 p-8 text-center text-sm text-muted">{tab === "needs" && !q && kindF === "all" && stageF === "all" && areaF === "all" ? "Nothing needs you right now." : "No opportunities match."}</div> : view === "grid" || !wide ? (
        <div className={view === "grid" ? "mt-4 grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3" : "sheet mt-4 overflow-hidden"}>
          {shown.map((o) => { const sl = statusLine(s, o, me!.id, now); const on = o.id === openId; return (
            <div key={o.id} role="button" tabIndex={0} onClick={() => setOpenId(o.id)} className={`cursor-pointer text-left transition hover:bg-surface ${view === "grid" ? "sheet p-4" : "border-b border-line px-4 py-3.5 last:border-0"} ${on ? "!bg-brand-soft" : ""}`} style={on ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : undefined}>
              <div className="flex items-start gap-3">{tile(o)}<div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{o.title}</div><div className="truncate t-small">{o.id} · {o.placeName} · {area(o.area)}</div></div><OwnerDot id={o.owner} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2">{kindTag(o)}{stageTag(o)}{o.value ? <span className="num ml-auto text-[13px] font-semibold">{short(o.value)}</span> : null}</div>
              <div className={`mt-2 text-[12.5px] ${sl.mine ? "font-semibold" : "text-muted"}`}>{sl.mine && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--color-st-attention)" }} />}{sl.text}</div>
              <div className="mt-2.5 flex items-center gap-3"><span className="min-w-0 flex-1"><Line total={STAGES.length} at={Math.max(0, STAGES.findIndex((x) => x[0] === o.stage))} closed={o.stage === "won"} color={stageDot(o)} /></span>{askBtn(o)}</div>
            </div>); })}
        </div>
      ) : (
        <div className="sheet mt-4 overflow-visible">
          <div className="grid items-center gap-4 border-b border-line px-5 py-3" style={{ gridTemplateColumns: cols }}>
            {check(allChecked, () => setChecked(allChecked ? [] : shown.map((o) => o.id)))}
            {th("title", "Opportunity")}{vis.type && th("type", "Type")}{vis.stage && th("stage", "Stage")}{vis.move && th("due", "Whose move")}{vis.value && <span className="text-right">{th("value", "Value")}</span>}{vis.owner && th(undefined, "Owner")}{vis.updated && <span className="text-right">{th("updated", "Updated")}</span>}<span />
          </div>
          {shown.map((o) => { const sl = statusLine(s, o, me!.id, now); const on = checked.includes(o.id) || o.id === openId; return (
            <div key={o.id} role="button" tabIndex={0} onClick={() => setOpenId(o.id)} className={`relative grid w-full cursor-pointer items-center gap-4 border-b border-line px-5 py-3 text-left transition hover:bg-surface ${on ? "!bg-brand-soft" : ""}`} style={{ gridTemplateColumns: cols, ...(on ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : {}) }}>
              {check(checked.includes(o.id), (e) => { e.stopPropagation(); tick(o.id); })}
              <span className="flex min-w-0 items-center gap-3">{tile(o)}<span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{o.title}</span><span className="block truncate t-small">{o.id} · {o.placeName} · {area(o.area)}</span></span></span>
              {vis.type && <span>{kindTag(o)}</span>}
              {vis.stage && <span>{stageTag(o)}</span>}
              {vis.move && <span className="min-w-0"><span className={`block truncate text-[13px] ${sl.mine ? "font-semibold" : "text-ink/80"}`}>{sl.mine && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--color-st-attention)" }} />}{sl.text}</span></span>}
              {vis.value && <span className="num text-right text-[13.5px] font-semibold">{o.value ? short(o.value) : <span className="font-normal text-muted">–</span>}</span>}
              {vis.owner && <span><OwnerDot id={o.owner} /></span>}
              {vis.updated && <span className="text-right t-small">{upd(o) ? ago(now - upd(o)) : "–"}</span>}
              <span className="relative flex items-center justify-end gap-1.5">
                {askBtn(o)}
                <button aria-label="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === o.id ? null : o.id); }} className="px-1 text-[18px] leading-none text-muted hover:text-ink">⋯</button>
                {menu === o.id && <span className="float absolute right-0 top-8 z-40 w-44 overflow-hidden rounded-md border border-line bg-white text-left text-[13px]"><button onClick={(e) => { e.stopPropagation(); setMenu(null); setOpenId(o.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Open opportunity</button><button onClick={(e) => { e.stopPropagation(); setMenu(null); void navigator.clipboard?.writeText(o.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Copy ID</button></span>}
              </span>
            </div>); })}
        </div>
      )}
      {rows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>Showing {(cur - 1) * per + 1}–{Math.min(cur * per, rows.length)} of {rows.length} opportunities{checked.length > 0 && <span> · {checked.length} selected</span>}</span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><Icon n="back" s={14} /></button>
              {pageList(cur, pages).map((p, i) => p === "…" ? <span key={i} className="px-1">…</span> : <button key={i} onClick={() => setPage(p)} className={`num grid h-9 min-w-9 place-items-center rounded-md border px-2 text-[13px] ${cur === p ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-surface"}`}>{p}</button>)}
              <button aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><Icon n="chev" s={14} /></button>
            </div>
          )}
        </div>
      )}
      {open && (
        <>
          <button aria-label="Close" onClick={() => setOpenId(null)} className="fixed inset-0 z-40 bg-ink/35" />
          <aside className="pop float fixed inset-y-0 right-0 z-50 flex w-full max-w-[40rem] flex-col border-l border-line bg-white">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0"><div className="t-label">Opportunity · {open.id}</div><div className="truncate text-[17px] font-semibold leading-tight">{open.title}</div></div>
              <button aria-label="Close" onClick={() => setOpenId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={16} /></button>
            </div>
            <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto bg-surface"><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></div>
            <div className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-5 py-3"><span className="mr-auto t-small">Want a hand with this one?</span><button onClick={() => { setOpenId(null); onAsk(open); }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-brand bg-white px-4 text-[13.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={15} /> Ask SHERPA about this</button></div>
          </aside>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Rewards: the fun page */
export function Rewards({ go }: { go: (v: string) => void }) {
  const { s, me, now } = useApp();
  const g = gameOf(s, me!.id);
  const events = s.reports.filter((r) => r.reporterId === me!.id).flatMap((r) => r.points.filter((p) => p.pts > 0).map((p) => ({ ...p, rid: r.id }))).sort((a, b) => b.at - a.at).slice(0, 6);
  const tile = (n: number, l: string) => <div className="rounded-xl border border-line bg-white p-3 text-center"><div className="num text-2xl font-semibold">{n}</div><div className="text-[11.5px] text-muted">{l}</div></div>;
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-3 @xl:p-6">
      <div className="rounded-3xl bg-ink p-5 text-white @xl:p-6">
        <div className="flex items-start justify-between"><div><div className="text-[11px] uppercase tracking-[.12em] text-white/60">Your level</div><div className="text-3xl font-semibold tracking-tight">{g.level}</div></div><div className="text-right"><div className="num text-4xl font-semibold">{g.xp}</div><div className="text-xs text-white/60">XP</div></div></div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand transition-all duration-1000" style={{ width: `${Math.max(4, g.pct)}%` }} /></div>
        <div className="mt-2 flex justify-between text-[12.5px] text-white/75"><span>{g.next ? `${g.next.from - g.xp} XP to ${g.next.name}` : "Top level reached"}</span><span>{g.streak > 0 ? `${g.streak}-day streak` : "Start a streak today"}</span></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">{tile(g.leads, "Leads sent")}{tile(g.doneTasks, "To-dos done")}{tile(g.wins, "Deals won")}</div>
      <h2 className="mb-2 mt-6 t-label">Today&apos;s quests</h2>
      <div className="space-y-2">{g.quests.map((q) => <div key={q.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[14px] ${q.done ? "border-emerald-200 bg-emerald-50" : "border-line bg-white"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${q.done ? "bg-emerald-500 text-white" : "border border-line"}`}>{q.done && <Icon n="check" s={14} />}</span><span className="flex-1 font-medium">{q.label}</span><b className="num text-sm text-muted">+{q.xp} XP</b></div>)}</div>
      <Btn full className="mt-3" onClick={() => go("chat")}><Icon n="camera" s={16} /> Snap a lift now</Btn>
      <h2 className="mb-2 mt-6 t-label">Badges</h2>
      <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-5">{g.badges.map((b) => <div key={b.id} className={`rounded-2xl border p-3 text-center ${b.got ? "border-brand/30 bg-brand-soft" : "border-line bg-white opacity-60"}`}><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${b.got ? "bg-brand text-white" : "bg-surface text-muted"}`}><Icon n={b.icon} s={18} /></span><div className="mt-2 text-[13px] font-semibold">{b.label}</div><div className="text-[11px] text-muted">{b.got ? "Earned" : b.hint}</div></div>)}</div>
      <h2 className="mb-2 mt-6 t-label">How you earn XP</h2>
      <div className="rounded-xl border border-line bg-white px-4 py-1 text-[13px]">{[["Send a lead with a photo", "up to 50"], ["Lead accepted by the owner", "+20"], ["Finish a to-do", "+10"], ["Your lead becomes a won deal", "+200"]].map(([k, v]) => <div key={k} className="flex justify-between border-b border-line/70 py-2.5 last:border-0"><span>{k}</span><b className="num">{v}</b></div>)}</div>
      {events.length > 0 && <><h2 className="mb-2 mt-6 t-label">Recent points</h2>
        <div className="rounded-xl border border-line bg-white px-4 py-1 text-[13px]">{events.map((e) => <div key={e.id} className="flex justify-between gap-3 border-b border-line/70 py-2.5 last:border-0"><span className="min-w-0 truncate">{e.label} <span className="text-muted">· {e.rid} · {ago(now - e.at)} ago</span></span><b className="num text-emerald-700">+{e.pts}</b></div>)}</div></>}
      <div className="h-6" />
    </div>
  );
}
void offerOf;
