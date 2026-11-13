"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, KIND_LABEL, STAGES, inr, isOpen, oppOf, tasksOfOpp } from "@/lib/sherpa";
import type { Opp } from "@/lib/types";
import { Icon, ago } from "../ui";
import { Sherpa, type Seed } from "../desk/Sherpa";
import { OppPage, statusLine } from "../desk/Opps";
import { involvedOpps } from "./parts";
import { Drawer, FilterBar, FilterField, OwnerDot, Stat2, StatRow, T, Line, pageList } from "../shared";
import { Check, Choice } from "@/components/form";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

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
/** ₹11.76 Cr, ₹42.5 L: short enough for a card. */
const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L` : inr(n));
type Tab = "needs" | "waiting" | "active" | "closed";
const KIND_T = { newbuild: T.blue, existing: T.purple, renewal: T.green, modernisation: T.pink, project: T.blue } as const;
export function MyWork({ openId, setOpenId, openOffer, onAsk }: { openId: string | null; setOpenId: (id: string | null) => void; openOffer: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const [tab, setTab] = useState<Tab>("needs"); const [q, setQ] = useState(""); const [kindF, setKindF] = useState("all"); const [stageF, setStageF] = useState("all"); const [areaF, setAreaF] = useState("all"); const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: "updated", d: -1 });
  const ALL_COLS = { type: true, stage: true, move: true, value: true, owner: true, updated: true };
  const [vis, setVis] = useState(ALL_COLS);
  const [checked, setChecked] = useState<string[]>([]); const [view, setView] = useState<"list" | "grid">("list"); const [menu, setMenu] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null); const [wide, setWide] = useState(false);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => { setWide(el.clientWidth >= 1200); }); ro.observe(el); return () => ro.disconnect(); }, []);
  const all = involvedOpps(s, me!.id, me!.role);
  const needs = (o: Opp) => tasksOfOpp(s, o.id).some((t) => t.forUser === me!.id);
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
  const allChecked = shown.length > 0 && shown.every((o) => checked.includes(o.id));
  const tick = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const go = (t: Tab) => { setTab(t); setPage(1); };
  const area = (id: string) => AREA_NAME[id] ?? id;
  const askBtn = (o: Opp) => <button onClick={(e) => { e.stopPropagation(); onAsk(o); }} className="inline-flex items-center gap-1.5 rounded-md border border-brand bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={13} /> Ask</button>;
  const kindTag = (o: Opp) => { const kt = KIND_T[o.kind]; return <span style={{ background: kt.bg, color: kt.fg }} className="inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold">{KIND_LABEL[o.kind]}</span>; };
  const stageTag = (o: Opp) => <span className="inline-flex items-center gap-2 text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: stageDot(o) }} />{stageOf(o)}</span>;
  const tile = (o: Opp) => { const kt = KIND_T[o.kind]; return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md" style={{ background: kt.bg, color: kt.fg }}><Icon n={o.kind === "newbuild" || o.kind === "project" ? "layers" : o.kind === "renewal" ? "shield" : o.kind === "modernisation" ? "gear" : "pin"} s={18} /></span>; };
  const check = (on: boolean, fn: (e: React.MouseEvent) => void) => <span role="checkbox" aria-checked={on} onClick={fn} className={`grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-sm border ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{on && <Icon n="check" s={12} w={3} />}</span>;
  const askAbout = (o: Opp) => <button onClick={() => { setOpenId(null); onAsk(o); }} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap @md:flex-none rounded-md border border-brand bg-white px-4 text-[13.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={15} /> Ask SHERPA about this</button>;
  return (
    <div ref={box} className="@container w-full">
    <div className="p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{me!.role === "tech" ? "My site visits" : me!.role === "sl" ? "My jobs" : "My work"}</h1>
      <p className="t-small mt-0.5">{me!.role === "tech" ? "Sites the Sales Manager sent you to. Open one, meet the person in charge and file the site-visit report." : me!.role === "sl" ? "Won new installations in your area. Open one, read the handover pack and accept the job." : "Every lead, tender and offer is one opportunity. Click a row for the full detail, or press Ask to work on it with SHERPA."}</p>
      <StatRow>
        <Stat2 icon="warn" label="Needs my action" value={lists.needs.length} tone={T.orange} active={tab === "needs"} onClick={() => go("needs")} />
        <Stat2 icon="clock" label="Waiting on others" value={lists.waiting.length} tone={T.blue} active={tab === "waiting"} onClick={() => go("waiting")} />
        <Stat2 icon="layers" label="All active" value={lists.active.length} tone={T.red} active={tab === "active"} onClick={() => go("active")} />
        <Stat2 icon="check" label="Closed" value={lists.closed.length} tone={T.green} active={tab === "closed"} onClick={() => go("closed")} />
        {me!.role !== "tech" && <Stat2 icon="star" label="Open pipeline" value={<span className="whitespace-nowrap text-[19px]" title={inr(pipeline)}>{short(pipeline)}</span>} tone={T.gold} />}
      </StatRow>
      <div className={`mt-4 flex-wrap items-center gap-2 ${me!.role === "tech" ? "hidden" : "flex"}`}>
        <InputGroup className="h-10 min-w-[14rem] flex-1 bg-white"><InputGroupAddon><Icon n="search" s={15} /></InputGroupAddon><InputGroupInput value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by place, opportunity or ID…" aria-label="Search" /></InputGroup>
        <FilterBar alignRight onReset={resetAll} active={[
          ...(kindF !== "all" ? [{ label: "Type", value: KIND_LABEL[kindF as Opp["kind"]], clear: () => setKindF("all") }] : []),
          ...(stageF !== "all" ? [{ label: "Stage", value: STAGES.find((x) => x[0] === stageF)?.[1] ?? stageF, clear: () => setStageF("all") }] : []),
          ...(areaF !== "all" ? [{ label: "Area", value: area(areaF), clear: () => setAreaF("all") }] : []),
        ]}>
          <FilterField label="Type"><Choice value={kindF} onChange={(v) => { setKindF(v); setPage(1); }} options={[{ value: "all", label: "All types" }, ...kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))]} aria-label="Type" /></FilterField>
          <FilterField label="Stage"><Choice value={stageF} onChange={(v) => { setStageF(v); setPage(1); }} options={[{ value: "all", label: "All stages" }, ...stagesUsed.map(([k, l]) => ({ value: k, label: l }))]} aria-label="Stage" /></FilterField>
          <FilterField label="Area"><Choice value={areaF} onChange={(v) => { setAreaF(v); setPage(1); }} options={[{ value: "all", label: "All areas" }, ...areas.map((x) => ({ value: x, label: area(x) }))]} aria-label="Area" /></FilterField>
          <div><span className="t-label mb-1 block">View</span><div className="flex overflow-hidden rounded-md border border-line">{([["list", "list", "List"], ["grid", "layers", "Cards"]] as const).map(([v, ic, l]) => <button key={v} onClick={() => setView(v)} className={`flex h-9 flex-1 items-center justify-center gap-1.5 text-[13px] ${view === v ? "bg-brand-soft font-semibold text-brand" : "text-ink/70 hover:bg-surface"}`}><Icon n={ic} s={15} />{l}</button>)}</div></div>
          {wide && view === "list" && <div><span className="t-label mb-1 block">Columns</span><div className="grid grid-cols-2 gap-x-2">{colKeys.map((k) => <Check key={k} checked={vis[k]} onChange={() => setVis({ ...vis, [k]: !vis[k] })} className="rounded px-1 py-1.5 text-[13px] hover:bg-surface">{colLabel[k]}</Check>)}</div></div>}
        </FilterBar>
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
      {open && <Drawer label={`Opportunity · ${open.id}`} title={open.title} onClose={() => setOpenId(null)} footer={<><span className="mr-auto hidden t-small @md:inline">Want a hand with this one?</span>{askAbout(open)}</>}><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></Drawer>}
    </div>
    </div>
  );
}
