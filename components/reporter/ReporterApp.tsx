"use client";
import { useEffect, useRef, useState } from "react";
import { A, pointsOf, stepsOf, useApp, userOf } from "@/lib/store";
import { AREAS, LEVELS, ROLE_LABEL, TEAM_NAME, TRACKS } from "@/lib/data";
import type { Preset, Report } from "@/lib/types";
import { levelOf, type NavItem } from "../Shell";
import { Frame } from "../hub/Frame";
import { Assistant } from "./Assistant";
import { reportStatus as status } from "./status";
import { Btn, Card, Empty, Icon, PhotoTile, Pill, Section, Track, TrackList, ago } from "../ui";

export function ReporterApp({ launch, clearLaunch, onDemo, framed }: { launch: Preset | null; clearLaunch: () => void; onDemo: () => void; framed?: boolean }) {
  const { s, me, mutate } = useApp();
  const [view, setView] = useState("snap");
  const [snapKey, setSnapKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(launch);
  const [started, setStarted] = useState(true);
  if (!me) return null;
  const mine = s.reports.filter((r) => r.reporterId === me.id);
  const unread = s.alerts.filter((a) => a.userId === me.id && !a.read).length;
  const needs = mine.filter((r) => status(r).grp === "needs").length;
  const nav: NavItem[] = [
    { id: "snap", label: "Chat", icon: "sparkle" }, { id: "reports", label: "My leads", icon: "list", badge: needs || undefined },
    { id: "rewards", label: "Rewards", icon: "trophy" }, { id: "alerts", label: "Alerts", icon: "bell", badge: unread || undefined },
  ];
  const go = (v: string) => { if (v === "me") v = "rewards"; setOpenId(null); if (v === "snap") setStarted(true); setView(v); if (v !== "snap") { setPreset(null); clearLaunch(); } };
  const open = (id: string) => { setOpenId(id); setView("reports"); setPreset(null); clearLaunch(); };

  return (
    <Frame agent="Snap & Lead" sub="Lead generator app" framed={framed} tabs={nav} view={view === "report" ? "reports" : view} setView={go} onDemo={onDemo}>
      {started && <div className={view === "snap" ? "absolute inset-0" : "hidden"}><Assistant key={snapKey} preset={preset} onOpen={open} onNew={() => setSnapKey((k) => k + 1)} /></div>}
      {view === "reports" && <Leads openId={openId} setOpenId={setOpenId} onSnap={() => go("snap")} />}
      {view === "alerts" && <Alerts onOpen={open} />}
      {view === "rewards" && <Rewards />}
      <span className="hidden">{String(mutate.length)}</span>
    </Frame>
  );
}


/** Palette for tags and states. Same hue family for background and text, so every tag reads at a glance. */
export const T = {
  red: { bg: "#fde6e6", fg: "#c02626" }, orange: { bg: "#fdeed8", fg: "#b45309" }, blue: { bg: "#e3effb", fg: "#1b5aa6" }, green: { bg: "#e2f4ea", fg: "#1d7a45" },
  purple: { bg: "#ece9fb", fg: "#4b36b8" }, pink: { bg: "#fbe6f0", fg: "#b02a66" }, grey: { bg: "#eeeef1", fg: "#4a4a55" }, gold: { bg: "#fdf0cf", fg: "#9a6a00" },
} as const;
type Tone = (typeof T)[keyof typeof T];
const DOT = { needs: "var(--color-st-attention)", progress: "var(--color-st-progress)", done: "var(--color-st-done)" } as const;
type Grp = keyof typeof DOT;
const dotOf = (st: { t: string; grp: string }) => (st.t === "Records update" ? "var(--color-st-records)" : DOT[st.grp as Grp]);
const stTone = (st: { t: string; grp: string }): Tone => (st.t === "Records update" ? T.purple : st.grp === "done" ? T.green : st.grp === "needs" ? T.orange : T.blue);

/** Table status: a dot and a label. */
function StatePill({ r }: { r: Report }) {
  const st = status(r);
  return <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: dotOf(st) }} />{st.t}</span>;
}
/** Drawer status: a tinted chip. */
function StateChip({ r }: { r: Report }) {
  const st = status(r); const t = stTone(st);
  return <span style={{ background: t.bg, color: t.fg }} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] font-semibold"><Icon n={st.grp === "done" ? "check" : st.grp === "needs" ? "warn" : "clock"} s={13} w={2.6} />{st.t}</span>;
}
/** One thin line in the state colour. */
export function Line({ total, at, closed, color }: { total: number; at: number; closed: boolean; color: string }) {
  const pct = closed ? 100 : Math.min(96, Math.round(((at + 0.5) / Math.max(total, 2)) * 100));
  return <span className="block h-1.5 w-full overflow-hidden rounded-sm bg-line"><span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: closed ? "var(--color-st-done)" : color }} /></span>;
}
function Stepper({ steps, at, closed, dates }: { steps: string[]; at: number; closed: boolean; dates?: string[] }) {
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const done = closed || i < at; const cur = !closed && i === at;
        return (
          <li key={i} className="relative flex-1 text-center">
            {i > 0 && <span className="absolute right-1/2 top-[12px] h-0.5 w-full" style={{ background: closed || i <= at ? "var(--color-st-done)" : "var(--color-line)" }} />}
            <span className={`relative z-10 mx-auto grid h-[26px] w-[26px] place-items-center rounded-full text-white ${done ? "" : "border-2 bg-white"}`} style={done ? { background: "var(--color-st-done)" } : { borderColor: cur ? "var(--color-st-progress)" : "var(--color-line)" }}>{done ? <Icon n="check" s={14} w={3} /> : cur ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-st-progress)" }} /> : null}</span>
            <span className={`mt-2 block px-1 text-[12px] leading-tight ${cur ? "font-semibold text-ink" : done ? "text-ink/80" : "text-muted"}`}>{s}</span>
            {dates?.[i] && <span className="mt-0.5 block text-[11px] text-muted">{dates[i]}</span>}
          </li>
        );
      })}
    </ol>
  );
}
const OPP: Record<string, { label: string; icon: string; t: Tone }> = {
  winback: { label: "Win-back", icon: "swap", t: T.purple }, project: { label: "New installation", icon: "flag", t: T.blue }, sales: { label: "New installation", icon: "flag", t: T.blue },
  renewal: { label: "Renewal", icon: "doc", t: T.green }, modernisation: { label: "Modernisation", icon: "edit", t: T.pink }, records: { label: "Records", icon: "layers", t: T.grey },
  fault: { label: "Service", icon: "gear", t: T.red }, noted: { label: "Noted", icon: "check", t: T.grey }, account: { label: "Account", icon: "users", t: T.blue },
  emergency: { label: "Emergency", icon: "warn", t: T.red }, info: { label: "Info", icon: "list", t: T.grey }, merge: { label: "Merged", icon: "link", t: T.grey },
  retake: { label: "Retake", icon: "camera", t: T.orange }, queued: { label: "Queued", icon: "wifi", t: T.grey },
};
const TIER: Record<string, { label: string; icon: string; t: Tone }> = {
  Hot: { label: "Hot", icon: "flame", t: T.red }, Warm: { label: "Warm", icon: "flame", t: T.orange }, Cold: { label: "Cold", icon: "snow", t: T.blue }, Info: { label: "Info only", icon: "list", t: T.grey },
};
function OppTag({ track }: { track?: string }) {
  const o = OPP[track ?? "info"] ?? OPP.info;
  return <span style={{ background: o.t.bg, color: o.t.fg }} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold"><Icon n={o.icon} s={13} />{o.label}</span>;
}
function TierTag({ tier }: { tier?: string }) {
  const o = tier ? TIER[tier] : undefined;
  if (!o) return <span className="text-muted">–</span>;
  return <span style={{ background: o.t.bg, color: o.t.fg }} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold"><Icon n={o.icon} s={13} />{o.label}</span>;
}
const AVATAR = [T.pink, T.blue, T.green, T.purple, T.orange];
export function OwnerDot({ id, size = 30 }: { id?: string; size?: number }) {
  const u = userOf(id);
  if (!u) return <span title="Not assigned yet" style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full border border-dashed border-line text-[11px] text-muted">–</span>;
  const t = AVATAR[(u.id.charCodeAt(0) + u.id.length) % AVATAR.length];
  return <span title={u.name} style={{ width: size, height: size, background: t.bg, color: t.fg }} className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold">{u.initials}</span>;
}
export function Stat2({ icon, label, value, tone, active, onClick, chevron, extra }: { icon: string; label: string; value: React.ReactNode; tone: Tone; active?: boolean; onClick?: () => void; chevron?: boolean; extra?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="sheet flex items-center gap-3 px-4 py-3.5 text-left transition hover:shadow-md" style={active ? { background: tone.bg, borderColor: tone.fg } : undefined}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md" style={{ background: active ? "#fff" : tone.bg, color: tone.fg }}><Icon n={icon} s={21} /></span>
      <span className="min-w-0 flex-1"><span className="t-small block">{label}</span><span className="flex items-baseline gap-2"><span className="num text-[28px] font-semibold leading-tight tracking-tight">{value}</span>{extra}</span></span>
      {chevron && <span className="text-muted"><Icon n="chev" s={15} /></span>}
    </button>
  );
}
function Thumb({ r, size = 40 }: { r: Report; size?: number }) {
  const p = r.photos.find((x) => x.url);
  return p?.url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={p.url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-md object-cover" />
    : <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-md bg-surface text-muted"><Icon n={r.input.subject === "site" ? "layers" : "camera"} s={Math.round(size * 0.45)} /></span>;
}
function leadInfo(r: Report) {
  const live = r.items.filter((i) => !i.silent); const main = live.find((i) => i.status !== "closed") ?? live[0]; const steps = main ? stepsOf(main) : [];
  const step = r.status === "queued" ? "Waiting to send" : main?.status === "closed" ? (main.outcome ?? "Done") : main ? steps[main.step] : "Submitted";
  const units = r.input.units && r.input.units > 1 ? ` · ${r.input.units} lifts` : "";
  const where = (r.input.number ? `Lift ${r.input.number}` : r.input.subject === "site" ? "Building site" : r.input.subject === "notice" ? "Notice" : "Number not read") + units;
  const pts = r.points.filter((p) => p.status === "confirmed").reduce((x, p) => x + p.pts, 0);
  const stx = status(r); return { color: dotOf(stx), main, steps, track: r.status === "queued" ? "queued" : main?.track, tier: main?.tier as string | undefined, owner: main?.ownerId, total: Math.max(steps.length, 3), at: r.status === "queued" ? 0 : main?.step ?? 0, closed: main?.status === "closed", step, where, pts, st: status(r) };
}

function ReportRow({ r, onOpen, active }: { r: Report; onOpen: () => void; active?: boolean }) {
  const { now } = useApp(); const x = leadInfo(r);
  return (
    <button onClick={onOpen} className={`flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left transition last:border-0 hover:bg-surface ${active ? "bg-surface" : ""}`}>
      <Thumb r={r} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[14.5px] font-semibold">{r.placeName}</span><span className="num shrink-0 text-[13px] font-semibold">{x.pts > 0 ? `+${x.pts}` : ""}</span></span>
        <span className="mt-0.5 block truncate t-small">{x.where} · {r.id} · {ago(now - (r.timeline[r.timeline.length - 1]?.t ?? r.createdAt))}</span>
        <span className="mt-2 flex items-center justify-between gap-3"><StatePill r={r} /><span className="truncate text-[12.5px] text-muted">{x.step}</span></span>
        <span className="mt-2 block"><Line total={x.total} at={x.at} closed={x.closed} color={x.color} /></span>
      </span>
    </button>
  );
}

const OPP_SUB: Record<string, string> = { winback: "Competitor servicing", fault: "Service call", records: "Records check", project: "Building site", sales: "Sales lead", renewal: "Contract ending", modernisation: "Ageing unit" };
const TIER_ORDER: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2, Info: 3 };
export function pageList(cur: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, cur - 1, cur, cur + 1, pages - 1, pages].filter((p) => p >= 1 && p <= pages));
  const arr = Array.from(set).sort((x, y) => x - y); const out: (number | "…")[] = [];
  arr.forEach((p, i) => { if (i && p - arr[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
}

/** My leads: metric cards, search and filters, one table (list or grid), a pager. The selected lead opens in a drawer on the right. */
function Leads({ openId, setOpenId, onSnap }: { openId: string | null; setOpenId: (id: string | null) => void; onSnap: () => void }) {
  const { s, me, now } = useApp();
  const [f, setF] = useState("all"); const [q, setQ] = useState(""); const [oppF, setOppF] = useState("all"); const [tierF, setTierF] = useState("all"); const [areaF, setAreaF] = useState("all"); const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: "updated", d: -1 });
  const [vis, setVis] = useState({ opp: true, tier: true, status: true, progress: true, owner: true, updated: true }); const [panel, setPanel] = useState(false);
  const [checked, setChecked] = useState<string[]>([]); const [view, setView] = useState<"list" | "grid">("list"); const [menu, setMenu] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setWide(el.clientWidth >= 900)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mine = s.reports.filter((r) => r.reporterId === me!.id);
  const n = (k: string) => mine.filter((r) => status(r).grp === k).length;
  const oppLabel = (r: Report) => OPP[leadInfo(r).track ?? "info"]?.label ?? "Info";
  const opps = Array.from(new Set(mine.map(oppLabel)));
  const areas = Array.from(new Set(mine.map((r) => r.area)));
  const areaName = (id: string) => AREAS.find((x) => x.id === id)?.name ?? id;
  const upd = (r: Report) => r.timeline[r.timeline.length - 1]?.t ?? r.createdAt;
  const match = (r: Report) => {
    const x = leadInfo(r); const lc = q.trim().toLowerCase();
    return (f === "all" || x.st.grp === f) && (oppF === "all" || oppLabel(r) === oppF) && (tierF === "all" || x.tier === tierF) && (areaF === "all" || r.area === areaF)
      && (!lc || `${r.placeName} ${r.id} ${r.input.number ?? ""}`.toLowerCase().includes(lc));
  };
  const key = (r: Report): string | number => sort.k === "lead" ? r.placeName : sort.k === "opp" ? oppLabel(r) : sort.k === "tier" ? TIER_ORDER[leadInfo(r).tier ?? "Info"] ?? 9 : upd(r);
  const list = mine.filter(match).sort((x, y) => { const p = key(x), q2 = key(y); return (p < q2 ? -1 : p > q2 ? 1 : 0) * sort.d; });
  const per = 6; const pages = Math.max(1, Math.ceil(list.length / per)); const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * per, cur * per);
  const sel = openId && mine.some((r) => r.id === openId) ? openId : null;
  const totalPts = mine.reduce((x, r) => x + leadInfo(r).pts, 0);
  const todayPts = mine.reduce((x, r) => x + r.points.filter((p) => p.status === "confirmed" && now - p.at < 86400000).reduce((y, p) => y + p.pts, 0), 0);
  const widths = { opp: "9.5rem", tier: "5.5rem", status: "8.5rem", progress: "minmax(0,1.5fr)", owner: "3rem", updated: "5.5rem" } as const;
  const colKeys = Object.keys(widths) as (keyof typeof widths)[];
  const cols = ["2rem", "minmax(0,2.2fr)", ...colKeys.filter((k) => vis[k]).map((k) => widths[k]), "2rem"].join(" ");
  const colLabel: Record<string, string> = { opp: "Opportunity", tier: "Tier", status: "Status", progress: "Progress", owner: "Owner", updated: "Updated" };
  const resetAll = () => { setF("all"); setQ(""); setOppF("all"); setTierF("all"); setAreaF("all"); setPage(1); setVis({ opp: true, tier: true, status: true, progress: true, owner: true, updated: true }); };
  const sortBy = (k: string) => setSort((p) => ({ k, d: p.k === k ? (p.d === 1 ? -1 : 1) : 1 }));
  const th = (k: string | undefined, children: React.ReactNode) => k ? <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 text-left t-label hover:text-ink">{children}<span className={sort.k === k ? "text-ink" : "opacity-50"}>⇅</span></button> : <span className="t-label">{children}</span>;
  const sel2 = "min-h-10 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand";
  const allChecked = shown.length > 0 && shown.every((r) => checked.includes(r.id));
  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <div ref={box} className="@container absolute inset-0 bg-surface">
      <div className="scroll-thin h-full overflow-y-auto">
        <div className="w-full p-4 @3xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3"><span className="mt-0.5 text-brand"><Icon n="camera" s={30} w={1.6} /></span><div><h1 className="text-[28px] font-semibold leading-tight tracking-tight">My leads</h1><p className="t-small mt-0.5">Turn lift sightings into opportunities, service action and better records.</p></div></div>
            <button onClick={onSnap} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-brand px-4 text-[13.5px] font-semibold text-white hover:bg-brand-dark"><Icon n="plus" s={15} w={2.4} /> New lead</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 @3xl:grid-cols-5">
            <Stat2 icon="layers" label="All leads" value={mine.length} tone={T.red} active={f === "all"} onClick={() => { setF("all"); setPage(1); }} />
            <Stat2 icon="clock" label="In progress" value={n("progress")} tone={T.blue} active={f === "progress"} onClick={() => { setF("progress"); setPage(1); }} />
            <Stat2 icon="warn" label="Needs you" value={n("needs")} tone={T.orange} chevron active={f === "needs"} onClick={() => { setF("needs"); setPage(1); }} />
            <Stat2 icon="check" label="Done / won" value={n("done")} tone={T.green} active={f === "done"} onClick={() => { setF("done"); setPage(1); }} />
            <Stat2 icon="star" label="Points earned" value={totalPts} tone={T.gold} extra={todayPts > 0 ? <span className="text-[12px] font-semibold" style={{ color: "var(--color-st-done)" }}>↑ +{todayPts} today</span> : undefined} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex min-h-10 min-w-[14rem] flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-muted focus-within:border-brand"><Icon n="search" s={15} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by building, lift number or lead ID…" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" /></label>
            <select aria-label="Status" value={f} onChange={(e) => { setF(e.target.value); setPage(1); }} className={sel2}><option value="all">Status</option><option value="progress">In progress</option><option value="needs">Needs you</option><option value="done">Done / won</option></select>
            <select aria-label="Opportunity" value={oppF} onChange={(e) => { setOppF(e.target.value); setPage(1); }} className={sel2}><option value="all">Opportunity</option>{opps.map((o) => <option key={o} value={o}>{o}</option>)}</select>
            <select aria-label="Tier" value={tierF} onChange={(e) => { setTierF(e.target.value); setPage(1); }} className={sel2}><option value="all">Tier</option><option value="Hot">Hot</option><option value="Warm">Warm</option><option value="Cold">Cold</option></select>
            <select aria-label="My area" value={areaF} onChange={(e) => { setAreaF(e.target.value); setPage(1); }} className={sel2}><option value="all">My Area</option>{areas.map((x) => <option key={x} value={x}>{areaName(x)}</option>)}</select>
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
          {list.length === 0 ? <div className="sheet mt-4 p-8 text-center text-sm text-muted">{mine.length ? "No leads match." : "Nothing yet. Snap a lift in Chat and your lead shows up here."}</div> : view === "grid" || !wide ? (
            view === "grid" ? (
              <div className="mt-4 grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
                {shown.map((r) => { const x = leadInfo(r); return (
                  <button key={r.id} onClick={() => setOpenId(r.id)} className="sheet p-4 text-left transition hover:shadow-md" style={r.id === sel ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : undefined}>
                    <div className="flex items-start gap-3"><Thumb r={r} size={52} /><div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{r.placeName}</div><div className="t-small">{r.id} · {x.where}</div></div><OwnerDot id={x.owner} /></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><OppTag track={x.track} /><TierTag tier={x.tier} /><StatePill r={r} /></div>
                    <div className="mt-3"><div className="mb-1.5 flex justify-between text-[12.5px]"><span>{x.step}</span><span className="text-muted">{ago(now - upd(r))}</span></div><Line total={x.total} at={x.at} closed={x.closed} color={x.color} /></div>
                  </button>); })}
              </div>
            ) : <div className="sheet mt-4 overflow-hidden">{shown.map((r) => <ReportRow key={r.id} r={r} active={r.id === sel} onOpen={() => setOpenId(r.id)} />)}</div>
          ) : (
            <div className="sheet mt-4 overflow-visible">
              <div className="grid items-center gap-4 border-b border-line px-5 py-3" style={{ gridTemplateColumns: cols }}>
                <span role="checkbox" aria-checked={allChecked} onClick={() => setChecked(allChecked ? [] : shown.map((r) => r.id))} className={`grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-sm border ${allChecked ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{allChecked && <Icon n="check" s={12} w={3} />}</span>
                {th("lead", "Lead / Building")}{vis.opp && th("opp", "Opportunity")}{vis.tier && th("tier", "Tier")}{vis.status && th(undefined, "Status")}{vis.progress && th(undefined, "Progress")}{vis.owner && th(undefined, "Owner")}{vis.updated && <span className="text-right">{th("updated", "Updated")}</span>}<span />
              </div>
              {shown.map((r) => { const x = leadInfo(r); const on = checked.includes(r.id) || r.id === sel; return (
                <div key={r.id} role="button" tabIndex={0} onClick={() => setOpenId(r.id)} className={`relative grid w-full cursor-pointer items-center gap-4 border-b border-line px-5 py-3 text-left transition hover:bg-surface ${on ? "!bg-brand-soft" : ""}`} style={{ gridTemplateColumns: cols, ...(on ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : {}) }}>
                  <span role="checkbox" aria-checked={checked.includes(r.id)} onClick={(e) => { e.stopPropagation(); toggle(r.id); }} className={`grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-sm border ${checked.includes(r.id) ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{checked.includes(r.id) && <Icon n="check" s={12} w={3} />}</span>
                  <span className="flex min-w-0 items-center gap-3"><Thumb r={r} size={48} /><span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{r.placeName}</span><span className="block truncate t-small">{r.id} · {x.where}</span></span></span>
                  {vis.opp && <span><OppTag track={x.track} /></span>}
                  {vis.tier && <span><TierTag tier={x.tier} /></span>}
                  {vis.status && <span><StatePill r={r} /></span>}
                  {vis.progress && <span className="min-w-0"><span className="mb-1.5 block truncate text-[13px]">{x.step}</span><Line total={x.total} at={x.at} closed={x.closed} color={x.color} /></span>}
                  {vis.owner && <span><OwnerDot id={x.owner} /></span>}
                  {vis.updated && <span className="text-right t-small">{ago(now - upd(r))}</span>}
                  <span className="relative text-right">
                    <button aria-label="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id); }} className="px-1 text-[18px] leading-none text-muted hover:text-ink">⋯</button>
                    {menu === r.id && <span className="float absolute right-0 top-7 z-40 w-40 overflow-hidden rounded-md border border-line bg-white text-left text-[13px]"><button onClick={(e) => { e.stopPropagation(); setMenu(null); setOpenId(r.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Open lead</button><button onClick={(e) => { e.stopPropagation(); setMenu(null); void navigator.clipboard?.writeText(r.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Copy lead ID</button></span>}
                  </span>
                </div>); })}
            </div>
          )}
          {list.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
              <span>Showing {(cur - 1) * per + 1}–{Math.min(cur * per, list.length)} of {list.length} leads{checked.length > 0 && <span> · {checked.length} selected</span>}</span>
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
      </div>
      {sel && (
        <>
          <button aria-label="Close" onClick={() => setOpenId(null)} className="fixed inset-0 z-40 bg-ink/35" />
          <aside className="pop float fixed inset-y-0 right-0 z-50 w-full max-w-[29rem] border-l border-line bg-white"><ReportDetail key={sel} id={sel} onClose={() => setOpenId(null)} /></aside>
        </>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 t-label">{children}</div>;
}
function Fold({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line py-3 first:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}{count && <span className="ml-2 text-xs font-normal text-muted">{count}</span>}</span>
        <span className="text-muted transition group-open:rotate-90"><Icon n="chev" s={15} /></span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function ReportDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, mutate, now } = useApp();
  const r = s.reports.find((x) => x.id === id);
  const [num, setNum] = useState(""); const [form, setForm] = useState<"" | "contact" | "note">(""); const [txt, setTxt] = useState("");
  const [tab, setTab] = useState<"overview" | "details" | "activity" | "photos">("overview"); const [note, setNote] = useState(""); const [more, setMore] = useState(false);
  if (!r) return <Empty text="Lead not found." />;
  const x = leadInfo(r); const main = x.main; const steps = x.steps;
  const live = r.items.filter((i) => !i.silent);
  const needsInfo = r.items.some((i) => i.flags.includes("needsInfo"));
  const retake = r.items.some((i) => i.kind === "retake");
  const emerg = r.items.some((i) => i.kind === "emergency");
  const sum = (k: string) => r.points.filter((p) => p.status === k).reduce((a, p) => a + p.pts, 0);
  const teamTold = Array.from(new Set(live.map((i) => (i.team ? TEAM_NAME[i.team] : "")).filter(Boolean)));
  const now_ = main ? steps[main.step] : "";
  const next = main && main.status !== "closed" ? steps[main.step + 1] : undefined;
  const headline = r.status === "queued" ? "Saved on your phone. It sends when you are back online."
    : main?.status === "closed" ? (/Won/.test(main.outcome ?? "") ? "Won. Your lead became a deal." : `Closed: ${main.outcome ?? "done"}.`)
    : emerg ? "The emergency desk has been alerted."
    : main && main.step === 0 ? `Sent to ${teamTold[0] ?? "the right team"}. Waiting for an owner to pick it up.`
    : main ? `${now_}. ${next ? `Next: ${next}.` : ""}` : "Submitted.";
  const log = [...r.timeline].reverse();
  const canAdd = r.status === "sent" && !emerg;
  const lastHistory = r.timeline[r.timeline.length - 1]?.t ?? r.createdAt;
  const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const stepList = main ? steps : r.status === "queued" ? ["Waiting to send", "Submitted"] : ["Submitted", "Seen", "Done"];
  const dates = stepList.map((_, i) => i === 0 ? fmt(r.createdAt) : (x.closed ? i === stepList.length - 1 : i === (main?.step ?? 0)) ? fmt(lastHistory) : "");
  const hero = r.photos.find((p) => p.url); const owner = userOf(x.owner);
  const opp = OPP[x.track ?? "info"] ?? OPP.info;
  const tabs: [typeof tab, string][] = [["overview", "Overview"], ["details", "Details"], ["activity", "Activity"], ["photos", "Photos"]];
  const row = (icon: string, k: string, v: React.ReactNode) => <div className="flex items-center gap-4 py-3.5"><span className="text-ink/70"><Icon n={icon} s={18} /></span><span className="w-16 shrink-0 text-[14px] text-ink/80">{k}</span><span className="min-w-0 flex-1 text-[14px] font-medium">{v}</span></div>;
  return (
    <div className="@container flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-line px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-[20px] font-semibold leading-tight tracking-tight">{r.placeName}</h2><div className="t-small mt-1.5 flex items-center gap-1.5"><Icon n="pin" s={13} />{r.id} · {x.where}</div></div>
          <div className="flex shrink-0 items-center gap-3"><StateChip r={r} /><button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={16} /></button></div>
        </div>
        <nav className="mt-4 flex gap-6">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`relative pb-3 text-[13.5px] transition ${tab === k ? "font-semibold text-brand" : "text-muted hover:text-ink"}`}>{l}{tab === k && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}</button>)}</nav>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-surface"><div className="w-full space-y-4 p-5">
        {(needsInfo || retake) && (
          <div className="sheet p-4" style={{ borderLeft: "3px solid var(--color-st-attention)" }}>
            <div className="text-sm font-semibold">We need one thing from you</div>
            <p className="mt-1 text-sm text-muted">{retake ? "A clearer photo of the plate or button panel would let us continue." : "I could not read the servicing firm. Can you add it? Check the sticker from a public area."}</p>
            <div className="mt-3 flex gap-2">{retake ? <Btn sm onClick={() => mutate((z) => A.resumeRetake(z, r.id))}><Icon n="camera" s={14} /> Send a clearer photo</Btn> : <><input value={num} onChange={(e) => setNum(e.target.value)} placeholder="e.g. OtherLift" className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm" /><Btn sm disabled={!num} onClick={() => { mutate((z) => A.extra(z, r.id, "detail", num)); setNum(""); }}>Add</Btn></>}</div>
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1.75fr_1fr] gap-2.5">
              <div className="flex items-center gap-3 rounded-md p-3.5" style={{ background: opp.t.bg }}>
                <span style={{ color: opp.t.fg }}><Icon n={opp.icon} s={24} /></span>
                <div className="min-w-0"><div className="text-[12.5px] text-ink/70">Opportunity</div><div className="text-[13.5px] font-semibold leading-snug" style={{ color: opp.t.fg }}>{opp.label}{OPP_SUB[x.track ?? ""] ? ` (${OPP_SUB[x.track ?? ""]})` : ""}</div></div>
              </div>
              {x.tier && TIER[x.tier]
                ? <div className="rounded-md p-3.5" style={{ background: TIER[x.tier].t.bg }}><div className="text-[11px] text-ink/60">Tier</div><div className="mt-1 flex items-center gap-1.5 text-[17px] font-bold" style={{ color: TIER[x.tier].t.fg }}><Icon n={TIER[x.tier].icon} s={19} />{TIER[x.tier].label}</div></div>
                : <div className="rounded-md bg-surface p-3.5"><div className="text-[11px] text-ink/60">Tier</div><div className="mt-1 text-[15px] font-semibold text-muted">Not rated</div></div>}
            </div>
            <div className="sheet flex items-start gap-2.5 p-4">
              <span className="mt-0.5" style={{ color: "#d9a300" }}><Icon n="sparkle" s={17} /></span>
              <div><div className="text-[14px] font-semibold">Our finding (AI)</div><p className="mt-1.5 text-[14px] leading-relaxed">{r.plain.length ? r.plain.join(" ") : r.headline}</p></div>
            </div>
            <div className="sheet p-5">
              <h3 className="text-[18px] font-semibold tracking-tight">Progress</h3>
              <div className="mt-5"><Stepper steps={stepList} at={main ? main.step : 0} closed={x.closed} dates={dates} /></div>
              <p className="mt-4 text-[12.5px] text-muted">{headline} Last update {ago(now - lastHistory)}.</p>
              {live.length > 1 && <p className="mt-1 text-xs text-muted">{live.length - 1} more {live.length === 2 ? "track" : "tracks"} run in parallel: {live.filter((i) => i.id !== main?.id).map((i) => TRACKS[i.track].label).join(", ")}.</p>}
            </div>
            <div className="sheet divide-y divide-line px-4">
              {row("user", "Owner", owner ? <span className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><OwnerDot id={x.owner} size={26} /><span className="truncate">{owner.name} <span className="font-normal text-muted">({ROLE_LABEL[owner.role]})</span></span></span><span className="text-ink/70"><Icon n="phone" s={16} /></span></span> : <span className="font-normal text-muted">Not assigned yet</span>)}
              {row("star", "Points", <span><b className="num" style={{ color: "var(--color-st-done)" }}>+{sum("confirmed")}</b> <span className="font-normal text-muted">(Confirmed)</span>{sum("pending") > 0 && <span className="font-normal text-muted"> · +{sum("pending")} pending</span>}{sum("held") > 0 && <span className="font-normal text-muted"> · {sum("held")} held</span>}</span>)}
              {row("layers", "Lead ID", <span className="font-mono text-[13.5px]">{r.id}</span>)}
            </div>
          </div>
        )}

        {tab === "details" && (<>
          <div className="sheet divide-y divide-line">
            {[["Place", r.placeName], ["Area", r.area], ["Equipment", r.input.equip === "lift" ? "Lift" : r.input.equip === "escalator" ? "Escalator" : "Moving walk"], ["Unit number", r.input.number ?? "Not read"], ["Sent to", teamTold.join(", ") || "Not routed yet"]].map(([k, v]) => <div key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-[13.5px]"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}
          </div>
          {r.answers.length > 0 && <div className="sheet p-4"><div className="t-label mb-1">Your answers</div><dl className="divide-y divide-line">{r.answers.map((z, k) => <div key={k} className="flex items-start justify-between gap-3 py-2.5 text-[13.5px]"><dt className="capitalize text-muted">{z.q}</dt><dd className="text-right font-medium">{z.a}</dd></div>)}</dl></div>}
          {canAdd && (
            <div className="sheet p-4">
              <div className="t-label mb-3">Add an update for bonus points</div>
              <div className="grid grid-cols-3 gap-2 text-[13px] font-medium">
                <button disabled={!!r.extras.contact} onClick={() => { setForm(form === "contact" ? "" : "contact"); setTxt(""); }} className="rounded-lg border border-line px-2 py-3 hover:bg-surface disabled:opacity-50">{r.extras.contact ? "Contact ✓" : "Contact +5"}</button>
                <button disabled={!!r.extras.note} onClick={() => { setForm(form === "note" ? "" : "note"); setTxt(""); }} className="rounded-lg border border-line px-2 py-3 hover:bg-surface disabled:opacity-50">{r.extras.note ? "Note ✓" : "Note +5"}</button>
                <button disabled={r.extras.photos >= 3} onClick={() => mutate((z) => A.extra(z, r.id, "photo", ""))} className="rounded-lg border border-line px-2 py-3 hover:bg-surface disabled:opacity-50">Photo +3 <span className="font-normal text-muted">{r.extras.photos}/3</span></button>
              </div>
              {form && <div className="pop mt-3 flex gap-2"><input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={form === "contact" ? "Name and role, e.g. Facility manager" : "Anything the owner should know?"} className="min-h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm" /><Btn sm disabled={!txt} onClick={() => { mutate((z) => A.extra(z, r.id, form, txt)); setForm(""); setTxt(""); }}>Add</Btn></div>}
              <p className="mt-3 text-[11.5px] text-muted">Visible only to the lead&apos;s owner and the sales manager. Never record competitor prices or contract terms. Contract, price and customer details are never shown to reporters.</p>
            </div>
          )}
        </>)}

        {tab === "activity" && (
          <div className="sheet p-5">
            <ol className="relative space-y-5 border-l border-line pl-5">{log.map((t, k) => <li key={k} className="relative"><span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${k === 0 ? "bg-brand" : "bg-zinc-300"}`} /><div className="text-[13.5px] leading-snug">{t.text}</div><div className="t-small mt-0.5">{t.by} · {new Date(t.t).toLocaleString()}</div></li>)}</ol>
          </div>
        )}

        {tab === "photos" && (
          r.photos.length ? <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">{r.photos.map((p) => <PhotoTile key={p.id} p={p} className="!rounded-lg" />)}</div> : <div className="sheet p-8 text-center text-sm text-muted">No photos.</div>
        )}
      </div></div>
      <div className="relative shrink-0 border-t border-line bg-white px-5 py-4">
        {note && <div className="pop absolute -top-9 left-5 rounded-md bg-ink px-3 py-1.5 text-[12px] text-white">{note}</div>}
        {more && <><button aria-label="Close" className="fixed inset-0 z-10" onClick={() => setMore(false)} /><div className="float absolute bottom-16 right-5 z-20 w-44 overflow-hidden rounded-md border border-line bg-white text-[13px]"><button onClick={() => { void navigator.clipboard?.writeText(r.id); setMore(false); setNote("Lead ID copied"); setTimeout(() => setNote(""), 1800); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Copy lead ID</button><button onClick={() => { setMore(false); setTab("activity"); }} className="block w-full px-3 py-2 text-left hover:bg-surface">View activity</button></div></>}
        <div className="flex items-center gap-2.5">
          <button onClick={() => { setNote("NewCRM is simulated in this demo"); setTimeout(() => setNote(""), 2200); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-[13.5px] font-medium hover:bg-surface">Open in NewCRM <Icon n="link" s={15} /></button>
          <button disabled={!canAdd} onClick={() => setTab("details")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand bg-white px-3 text-[13.5px] font-semibold text-brand hover:bg-brand-soft disabled:opacity-40"><Icon n="edit" s={16} /> Add update</button>
          <button aria-label="More" onClick={() => setMore(!more)} className="grid h-11 w-11 place-items-center rounded-md border border-line bg-white text-[18px] hover:bg-surface">⋯</button>
        </div>
      </div>
    </div>
  );
}

export function Alerts({ onOpen }: { onOpen: (id: string) => void }) {
  const { s, me, mutate, now } = useApp();
  const list = s.alerts.filter((a) => a.userId === me!.id);
  return (
    <div className="mx-auto max-w-2xl p-4 @3xl:p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Alerts</h1><Btn sm v="ghost" onClick={() => mutate((st) => { st.alerts.forEach((a) => { if (a.userId === me!.id) a.read = true; }); })}>Mark all read</Btn></div>
      <div className="mt-3 space-y-2">{list.length === 0 && <Empty text="No alerts yet." />}
        {list.map((a) => (
          <button key={a.id} onClick={() => { mutate((st) => { const x = st.alerts.find((y) => y.id === a.id); if (x) x.read = true; }); if (a.reportId && me!.role === "reporter") onOpen(a.reportId); }} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${a.read ? "border-line bg-white" : "border-brand/30 bg-brand-soft"}`}>
            <span className="mt-0.5 text-brand"><Icon n="bell" s={16} /></span><div className="flex-1 text-sm">{a.text}<div className="text-xs text-muted">{ago(now - a.t)}</div></div>
          </button>
        ))}</div>
    </div>
  );
}

function Rewards() {
  const { s, me } = useApp();
  const { confirmed, pending } = pointsOf(s, me!.id); const lv = levelOf(confirmed);
  const mine = s.reports.filter((r) => r.reporterId === me!.id);
  const events = mine.flatMap((r) => r.points.map((p) => ({ ...p, rid: r.id }))).sort((a, b) => b.at - a.at);
  const badges = [
    { n: "First lead", on: mine.length > 0, d: "You sent your first lead" },
    { n: "Missing lift found", on: mine.some((r) => r.points.some((p) => p.key.startsWith("added") && p.status === "confirmed")), d: "A lift you found was added to our records" },
    { n: "Safety first", on: mine.some((r) => r.points.some((p) => p.key === "safety" && p.status === "confirmed")), d: "A valid safety report. Never ranked" },
    { n: "Deal maker", on: mine.some((r) => r.impact), d: "A lead became a win" },
  ];
  return (
    <div className="mx-auto max-w-3xl p-4 @3xl:p-6">
      <h1 className="text-2xl font-bold">Rewards</h1>
      <Card className="mt-3 p-5">
        <div className="flex items-end justify-between"><div><div className="text-xs text-muted">Confirmed points</div><div className="text-4xl font-bold">{confirmed}</div><div className="text-xs text-muted">+{pending} pending checks</div></div><div className="text-right"><Pill tone="red">{lv.name}</Pill><div className="mt-1 text-xs text-muted">{lv.next ? `${lv.next.from - confirmed} pts to ${lv.next.name}` : "Top level"}</div></div></div>
        <div className="mt-3 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-brand" style={{ width: `${lv.pct}%` }} /></div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">{LEVELS.map((l) => <span key={l.name}>{l.name} {l.from}</span>)}</div>
      </Card>
      <div className="mt-4 grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Card className="p-4"><Section title="Badges"><div className="space-y-2">{badges.map((b) => <div key={b.n} className={`flex items-center gap-3 rounded-xl border p-2.5 ${b.on ? "border-emerald-200 bg-emerald-50" : "border-line opacity-55"}`}><span className={b.on ? "text-emerald-600" : "text-muted"}><Icon n="trophy" s={18} /></span><div><div className="text-sm font-semibold">{b.n}</div><div className="text-xs text-muted">{b.d}</div></div></div>)}</div></Section></Card>
        <Card className="p-4"><Section title="How points work"><ul className="space-y-1 text-sm">{[["Lead sent", "+10"], ["Missing lift added to records", "+30"], ["Lead accepted by the owner", "+20"], ["Quote sent", "+50"], ["Won", "+200"], ["Valid safety report", "+30 · badge"], ["Contact, note, extra photo", "+5, +5, +3"], ["Duplicate of a reported lift", "+2"]].map(([a, b]) => <li key={a} className="flex justify-between"><span className="text-muted">{a}</span><b>{b}</b></li>)}</ul><p className="mt-2 text-[11.5px] text-muted">Paid mostly on verified results. Daily limit of 5 paid leads. No cash per lead. Safety reports are never ranked.</p></Section></Card>
      </div>
      <Card className="mt-4 p-4"><Section title="History">{events.length === 0 ? <div className="text-sm text-muted">No points yet.</div> : <div className="space-y-1 text-sm">{events.slice(0, 20).map((p) => <div key={p.id} className="flex justify-between"><span>{p.label} <span className="text-xs text-muted">· {p.rid}</span></span><span className="font-semibold">{p.pts > 0 ? "+" : ""}{p.pts} <span className="text-xs font-normal text-muted">{p.status}</span></span></div>)}</div>}</Section></Card>
      <LiftLookup />
    </div>
  );
}

function LiftLookup() {
  const [n, setN] = useState(""); const [res, setRes] = useState<string | null>(null);
  return (
    <Card className="mt-5 p-4">
      <div className="text-sm font-bold">Quick lookup: is this lift ours?</div>
      <div className="mt-2 flex gap-2"><input value={n} onChange={(e) => { setN(e.target.value); setRes(null); }} placeholder="Lift number, e.g. 74821" className="min-h-10 flex-1 rounded-lg border border-line px-3 text-sm" /><Btn sm disabled={!n} onClick={() => setRes(/^7\d+/.test(n) ? "Ours. This lift is in our records." : /^ol/i.test(n) ? "Not ours." : "Not found in our records. Snap it to add it.")}>Check</Btn></div>
      {res && <div className="mt-2 text-sm font-semibold">{res} <span className="text-xs font-normal text-muted">(Only ours or not ours is shown. No contract details.)</span></div>}
    </Card>
  );
}

export { stepsOf };
