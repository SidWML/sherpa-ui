"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, KIND_LABEL, NAMES, STAGES, dealNbas, inr, isOpen, reviewBrief, tasksOfOpp } from "@/lib/sherpa";
import type { LogEntry, Opp, State } from "@/lib/types";
import { Icon, Pill, TierPill, ago } from "../ui";
import { OwnerDot, pageList } from "../shared";
import { Choice } from "@/components/form";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { statusLine } from "./Opps";

/** Latest activity on an opportunity (newest log entry, or its creation). */
export const oppUpdated = (o: Opp) => o.log.reduce((m, l) => Math.max(m, l.t), o.createdAt);
export const lastLog = (o: Opp): LogEntry | undefined => o.log.reduce<LogEntry | undefined>((m, l) => (!m || l.t > m.t ? l : m), undefined);
const stageName = (o: Opp) => STAGES.find((x) => x[0] === o.stage)?.[1] ?? (o.stage === "lost" ? "Lost" : o.stage === "review" ? "In review" : "Closed");
const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L` : inr(n));

/** The next best action for any opportunity, from the same rules SHERPA uses. */
export function oppNba(s: State, o: Opp, me?: string): { title: string; why: string } {
  const open = tasksOfOpp(s, o.id).sort((a, b) => a.due - b.due);
  const t = open.find((x) => x.forUser === me) ?? open[0];
  if (t) return { title: t.title, why: t.detail ?? `${NAMES[t.forUser ?? ""] ?? "Someone"} has this step.` };
  if (!isOpen(o)) return { title: o.stage === "won" ? "Won: nothing left to do" : "Closed: nothing left to do", why: lastLog(o)?.text ?? "" };
  if (o.stage !== "review" && (o.kind === "existing" || o.kind === "renewal" || o.kind === "modernisation")) { const d = dealNbas(s, o)[0]; if (d) return d; }
  return reviewBrief(s, o).nba;
}
/** What the Ask button sends to SHERPA: the lead, answered with its last status and next best actions. */
export const askPromptFor = (o: Opp) => `Where is ${o.id} (${o.placeName})?`;

function AskBtn({ o, onAsk }: { o: Opp; onAsk: (o: Opp) => void }) {
  return <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onAsk(o); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onAsk(o); } }} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={13} /> Ask</span>;
}

/** One lead, everything that matters at a glance. */
export function OppCard({ o, onOpen, onAsk }: { o: Opp; onOpen: () => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const top = [...(o.reasons ?? [])].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)).slice(0, 3);
  const nba = oppNba(s, o); const last = lastLog(o); const sl = statusLine(s, o, me!.id, now);
  const upd = oppUpdated(o);
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} className="sheet group flex w-full cursor-pointer flex-col gap-3 p-4 text-left transition hover:bg-surface @2xl:flex-row @2xl:items-start">
      <div className="flex shrink-0 items-center gap-2 @2xl:w-28 @2xl:flex-col @2xl:items-start">
        {o.tier && <TierPill tier={o.tier} />}
        {o.score != null && <span className="num text-[22px] font-semibold leading-none">{o.score}<span className="text-[12px] font-normal text-muted"> / 100</span></span>}
        {!o.tier && <Pill tone="gray">{stageName(o)}</Pill>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><Pill tone="blue">{KIND_LABEL[o.kind]}</Pill>{o.tier && <Pill tone="gray">{stageName(o)}</Pill>}{o.unrouted && <Pill tone="red">No owner</Pill>}{sl.late && <Pill tone="red">Overdue</Pill>}</div>
        <div className="mt-1 truncate text-[15px] font-semibold">{o.title}</div>
        <div className="truncate t-small">{AREA_NAME[o.area] ?? o.area} · {o.source.type === "snap" ? `spotted by ${NAMES[o.source.reporter ?? ""] ?? "a colleague"}` : `from ${o.source.label}`} · created {ago(now - o.createdAt)}</div>
        <div className="truncate t-small">Owner {NAMES[o.owner] ?? (o.suggested ? `${NAMES[o.suggested]} (suggested)` : "not set")}{o.value ? ` · ${short(o.value)}` : ""} · last activity {ago(now - upd)}</div>
        {top.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{top.map((r) => <li key={r.label} className="rounded-md bg-surface px-2 py-1 text-[12px]"><span className={`num font-semibold ${r.pts < 0 ? "text-muted" : "text-ink"}`}>{r.pts > 0 ? "+" : ""}{r.pts}</span> {r.label}</li>)}</ul>}
        <div className={`mt-2 flex items-start gap-1.5 text-[12.5px] ${sl.mine ? "font-semibold text-ink" : "text-ink/75"}`}><Icon n={sl.mine ? "bolt" : "clock"} s={13} /><span><span className="text-muted">Last status:</span> {last ? `${last.text} (${ago(now - last.t)})` : sl.text}</span></div>
        <div className="mt-1 flex items-start gap-1.5 text-[12.5px] text-brand"><Icon n="sparkle" s={13} /><span className="font-medium">Next: {nba.title}</span></div>
      </div>
      <div className="flex shrink-0 items-center gap-2 @2xl:flex-col @2xl:items-end @2xl:self-stretch @2xl:justify-between"><AskBtn o={o} onAsk={onAsk} /><span className="hidden text-muted transition group-hover:translate-x-0.5 @2xl:block"><Icon n="chev" s={16} /></span></div>
    </div>
  );
}

const COLS = "minmax(14rem,2.2fr) 7rem 8rem 3rem minmax(12rem,2fr) minmax(12rem,2fr) 6rem 5.5rem";
function OppTable({ rows, onOpen, onAsk }: { rows: Opp[]; onOpen: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, now } = useApp();
  return (
    <div className="sheet mt-4 overflow-x-auto">
      <div className="min-w-[68rem]">
        <div className="grid items-center gap-4 border-b border-line px-4 py-3 t-label" style={{ gridTemplateColumns: COLS }}><span>Lead</span><span>Type</span><span>Area</span><span>Owner</span><span>Last status</span><span>Next best action</span><span>Updated</span><span /></div>
        {rows.map((o) => { const last = lastLog(o); const nba = oppNba(s, o); return (
          <div key={o.id} role="button" tabIndex={0} onClick={() => onOpen(o.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(o.id); }} className="grid cursor-pointer items-center gap-4 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface" style={{ gridTemplateColumns: COLS }}>
            <span className="flex min-w-0 items-center gap-3">
              <span className="w-12 shrink-0">{o.tier ? <TierPill tier={o.tier} /> : <span className="t-small">{stageName(o)}</span>}{o.score != null && <span className="num block text-[13px] font-semibold">{o.score}<span className="text-[11px] font-normal text-muted">/100</span></span>}</span>
              <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{o.title}</span><span className="block truncate t-small">{o.id} · created {ago(now - o.createdAt)}{o.value ? ` · ${short(o.value)}` : ""}</span></span>
            </span>
            <span><Pill tone="blue">{KIND_LABEL[o.kind]}</Pill></span>
            <span className="truncate text-[13px]">{AREA_NAME[o.area] ?? o.area}</span>
            <span><OwnerDot id={o.owner || o.suggested} /></span>
            <span className="min-w-0 text-[12.5px]"><span className="line-clamp-2">{last?.text ?? "No activity yet"}</span></span>
            <span className="min-w-0 text-[12.5px] font-medium text-brand"><span className="line-clamp-2">{nba.title}</span></span>
            <span className="t-small">{ago(now - oppUpdated(o))}</span>
            <span className="text-right"><AskBtn o={o} onAsk={onAsk} /></span>
          </div>); })}
      </div>
    </div>
  );
}

/** Search, filters, card/table toggle and a pager over any list of opportunities. Newest activity first. */
export function OppBrowser({ rows, onOpen, onAsk, empty = "No leads match.", per = 8 }: { rows: Opp[]; onOpen: (id: string) => void; onAsk: (o: Opp) => void; empty?: string; per?: number }) {
  const [q, setQ] = useState(""); const [tier, setTier] = useState("all"); const [kind, setKind] = useState("all"); const [area, setArea] = useState("all"); const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("recent"); const [view, setView] = useState<"cards" | "table">("cards"); const [page, setPage] = useState(1);
  const lc = q.trim().toLowerCase();
  const kinds = Array.from(new Set(rows.map((o) => o.kind))); const areas = Array.from(new Set(rows.map((o) => o.area))); const stages = STAGES.filter(([k]) => rows.some((o) => o.stage === k));
  const list = rows.filter((o) => (tier === "all" || o.tier === tier) && (kind === "all" || o.kind === kind) && (area === "all" || o.area === area) && (stage === "all" || o.stage === stage) && (!lc || `${o.title} ${o.id} ${o.placeName}`.toLowerCase().includes(lc)))
    .sort((a, b) => sort === "score" ? (b.score ?? -1) - (a.score ?? -1) : sort === "value" ? (b.value ?? 0) - (a.value ?? 0) : oppUpdated(b) - oppUpdated(a));
  const pages = Math.max(1, Math.ceil(list.length / per)); const cur = Math.min(page, pages); const shown = list.slice((cur - 1) * per, cur * per);
  const set = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };
  const filtered = tier !== "all" || kind !== "all" || area !== "all" || stage !== "all" || !!lc;
  return (
    <div className="@container">
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <InputGroup className="h-10 min-w-[14rem] flex-1 bg-white"><InputGroupAddon><Icon n="search" s={15} /></InputGroupAddon><InputGroupInput value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by place, lead or ID…" aria-label="Search" /></InputGroup>
        <Choice aria-label="Tier" value={tier} onChange={set(setTier)} className="w-auto" options={[{ value: "all", label: "All tiers" }, "Hot", "Warm", "Cold"]} />
        <Choice aria-label="Type" value={kind} onChange={set(setKind)} className="w-auto" options={[{ value: "all", label: "All types" }, ...kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))]} />
        <Choice aria-label="Stage" value={stage} onChange={set(setStage)} className="w-auto" options={[{ value: "all", label: "All stages" }, ...stages.map(([k, l]) => ({ value: k, label: l }))]} />
        <Choice aria-label="Area" value={area} onChange={set(setArea)} className="w-auto" options={[{ value: "all", label: "All areas" }, ...areas.map((x) => ({ value: x, label: AREA_NAME[x] ?? x }))]} />
        <Choice aria-label="Sort" value={sort} onChange={set(setSort)} className="w-auto" options={[{ value: "recent", label: "Latest activity" }, { value: "score", label: "Highest score" }, { value: "value", label: "Highest value" }]} />
        <div className="flex overflow-hidden rounded-md border border-line">{([["cards", "layers", "Cards"], ["table", "list", "Table"]] as const).map(([v, ic, l]) => <button key={v} onClick={() => setView(v)} className={`flex h-10 items-center gap-1.5 px-3 text-[13px] ${view === v ? "bg-brand-soft font-semibold text-brand" : "bg-white text-ink/70 hover:bg-surface"}`}><Icon n={ic} s={15} />{l}</button>)}</div>
      </div>
      {list.length === 0 ? <div className="sheet mt-4 p-8 text-center text-sm text-muted">{filtered ? "No leads match these filters." : empty}</div>
        : view === "table" ? <OppTable rows={shown} onOpen={onOpen} onAsk={onAsk} />
        : <div className="mt-4 space-y-2.5">{shown.map((o) => <OppCard key={o.id} o={o} onOpen={() => onOpen(o.id)} onAsk={onAsk} />)}</div>}
      {list.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>Showing {(cur - 1) * per + 1}–{Math.min(cur * per, list.length)} of {list.length}</span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><Icon n="back" s={14} /></button>
              {pageList(cur, pages).map((p, i) => p === "…" ? <span key={i} className="px-1">…</span> : <button key={i} onClick={() => setPage(p)} className={`num grid h-9 min-w-9 place-items-center rounded-md border px-2 text-[13px] ${cur === p ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-surface"}`}>{p}</button>)}
              <button aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><Icon n="chev" s={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
