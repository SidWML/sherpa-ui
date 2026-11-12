"use client";
import { useEffect, useRef, useState } from "react";
import { A, pointsOf, stepsOf, useApp, userOf } from "@/lib/store";
import { AREAS, PLACES, ROLE_LABEL, TEAM_NAME } from "@/lib/data";
import type { Preset, Report } from "@/lib/types";
import { levelOf, type NavItem } from "../Shell";
import { Frame } from "../Frame";
import { Alerts, Line, OwnerDot, Stat2, StatRow, T, type Tone } from "../shared";
import { Assistant } from "./Assistant";
import { QuickAsk } from "./QuickAsk";
import { LeadMap } from "./LeadMap";
import { ChatHistory } from "./ChatHistory";
import { Leaderboard, LevelLadder, useBoard } from "./Leaderboard";
import type { Thread } from "@/lib/chats";
import { reportStatus as status } from "./status";
import { Btn, Empty, Icon, PhotoTile, ago } from "../ui";

export function ReporterApp({ launch, clearLaunch, onDemo, framed }: { launch: Preset | null; clearLaunch: () => void; onDemo: () => void; framed?: boolean }) {
  const { s, me, mutate } = useApp();
  const [view, setView] = useState("snap");
  const [snapKey, setSnapKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(launch);
  const [wide, setWide] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [restore, setRestore] = useState<string | undefined>();
  if (!me) return null;
  const mine = s.reports.filter((r) => r.reporterId === me.id);
  const unread = s.alerts.filter((a) => a.userId === me.id && !a.read).length;
  const needs = mine.filter((r) => status(r).grp === "needs").length;
  const nav: NavItem[] = [
    { id: "snap", label: "Chat", icon: "sparkle", narrowOnly: true }, { id: "reports", label: "My leads", icon: "list", badge: needs || undefined },
    { id: "rewards", label: "Rewards", icon: "trophy", narrowOnly: true }, { id: "alerts", label: "Alerts", icon: "bell", badge: unread || undefined, inBell: true, narrowOnly: true },
  ];
  const go = (v: string) => { if (v === "me") v = "rewards"; setOpenId(null); setView(v); if (v !== "snap") { setPreset(null); clearLaunch(); } };
  const open = (id: string) => { setOpenId(id); setView("reports"); setPreset(null); clearLaunch(); };
  const newLead = () => { setRestore(undefined); if (!wide) return go("snap"); setPreset(null); clearLaunch(); setSnapKey((k) => k + 1); setFresh((n) => n + 1); };
  const pick = (t: Thread) => {
    setRestore(t.id); setPreset(null); clearLaunch(); setSnapKey((k) => k + 1);
    if (wide) { setOpenId(null); setFresh((n) => n + 1); if (view !== "reports") setView("reports"); } else go("snap");
  };
  const assistant = <Assistant key={snapKey} preset={preset} restore={restore} onOpen={open} onNew={() => { setRestore(undefined); setSnapKey((k) => k + 1); }} />;
  const page = (v: string, w: boolean) => {
    if (v === "reports") return <Leads openId={openId} setOpenId={setOpenId} onSnap={newLead} />;
    const body = v === "alerts" ? <Alerts onOpen={open} /> : <Rewards />;
    return (
      <div className="scroll-thin absolute inset-0 overflow-y-auto">
        {w && <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-6 py-2.5 backdrop-blur"><button onClick={() => go("reports")} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-ink/70 hover:bg-surface hover:text-ink"><Icon n="back" s={14} /> My leads</button></div>}
        {body}
      </div>
    );
  };

  return (
    <Frame agent="Snap & Lead" sub="Lead generator app" icon="camera" framed={framed} actions={<ChatHistory onPick={pick} />} tabs={nav} view={view === "snap" && wide ? "reports" : view} setView={go} onDemo={onDemo} onWide={setWide}
      side={<ChatPanel key={fresh} fresh={fresh > 0} onNew={newLead} onRewards={() => go("rewards")}>{assistant}</ChatPanel>}>
      {(w) => {
        const v = w && view === "snap" ? "reports" : view;
        return (
          <>
            {!w && <div className={v === "snap" ? "absolute inset-0" : "hidden"}>{assistant}</div>}
            {v !== "snap" && page(v, w)}
            {!w && v !== "snap" && !(v === "reports" && openId) && <QuickAsk onOpen={open} onChat={() => go("snap")} />}
            <span className="hidden">{String(mutate.length)}</span>
          </>
        );
      }}
    </Frame>
  );
}

function ChatPanel({ fresh, onNew, onRewards, children }: { fresh: boolean; onNew: () => void; onRewards: () => void; children: React.ReactNode }) {
  const { s, me } = useApp();
  const { confirmed, pending } = pointsOf(s, me!.id); const lv = levelOf(confirmed); const { rank, rows } = useBoard();
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white"><Icon n="sparkle" s={15} /></span>
        <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold leading-tight">Lead assistant</div><div className="t-small leading-tight">Snap a lift, ask about a lead</div></div>
        <button onClick={onNew} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-surface"><Icon n="plus" s={13} w={2.4} /> New chat</button>
      </div>
      <button onClick={onRewards} className="group shrink-0 border-b border-line px-4 py-3 text-left hover:bg-surface">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: T.gold.bg, color: T.gold.fg }}><Icon n="trophy" s={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-semibold">{lv.name}</span>
              <span className="text-[13px]"><b className="num text-[15px]">{confirmed}</b> <span className="text-muted">pts</span></span>
            </span>
            <span className="mt-0.5 flex items-baseline justify-between gap-2 text-[12px] text-muted">
              <span className="truncate">#{rank} of {rows.length} · {lv.next ? `${lv.next.from - confirmed} to ${lv.next.name}` : "top level"}</span>
              {pending > 0 && <span className="shrink-0 whitespace-nowrap">+{pending} pending</span>}
            </span>
          </span>
          <span className="text-muted group-hover:text-ink"><Icon n="chev" s={14} /></span>
        </span>
        <span className="mt-2.5 block"><LevelLadder pts={confirmed} /></span>
      </button>
      <div className={`relative min-h-0 flex-1 ${fresh ? "pop" : ""}`}>{children}</div>
    </>
  );
}


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

const TIER_ORDER: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2, Info: 3 };
function pageList(cur: number, pages: number): (number | "…")[] {
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
  const [bw, setBw] = useState(0); const wide = bw >= 860; const narrow = bw > 0 && bw < 640;
  const [showF, setShowF] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setBw(el.clientWidth)); ro.observe(el);
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
  const need = { status: 136, progress: 130, opp: 152, updated: 88, tier: 88, owner: 48 } as const;
  const fit = { ...vis }; let room = bw - 48 - 40 - 64 - 32 - 230;
  (["status", "progress", "opp", "updated", "tier", "owner"] as const).forEach((k) => { if (!vis[k]) return; const w = need[k] + 16; fit[k] = room >= w; if (fit[k]) room -= w; });
  const cols = ["2rem", "minmax(13rem,2.2fr)", ...colKeys.filter((k) => fit[k]).map((k) => widths[k]), "2rem"].join(" ");
  const colLabel: Record<string, string> = { opp: "Opportunity", tier: "Tier", status: "Status", progress: "Progress", owner: "Owner", updated: "Updated" };
  const sortBy = (k: string) => setSort((p) => ({ k, d: p.k === k ? (p.d === 1 ? -1 : 1) : 1 }));
  const th = (k: string | undefined, children: React.ReactNode) => k ? <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 text-left t-label hover:text-ink">{children}<span className={sort.k === k ? "text-ink" : "opacity-50"}>⇅</span></button> : <span className="t-label">{children}</span>;
  const sel2 = "min-h-10 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand";
  const filterSelects = (
    <>
      <select aria-label="Status" value={f} onChange={(e) => { setF(e.target.value); setPage(1); }} className={sel2}><option value="all">Status</option><option value="progress">In progress</option><option value="needs">Needs you</option><option value="done">Done / won</option></select>
      <select aria-label="Opportunity" value={oppF} onChange={(e) => { setOppF(e.target.value); setPage(1); }} className={sel2}><option value="all">Opportunity</option>{opps.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      <select aria-label="Tier" value={tierF} onChange={(e) => { setTierF(e.target.value); setPage(1); }} className={sel2}><option value="all">Tier</option><option value="Hot">Hot</option><option value="Warm">Warm</option><option value="Cold">Cold</option></select>
      <select aria-label="My area" value={areaF} onChange={(e) => { setAreaF(e.target.value); setPage(1); }} className={sel2}><option value="all">My Area</option>{areas.map((x) => <option key={x} value={x}>{areaName(x)}</option>)}</select>
    </>
  );
  const filters = [f, oppF, tierF, areaF].filter((v) => v !== "all").length;
  const allChecked = shown.length > 0 && shown.every((r) => checked.includes(r.id));
  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <div ref={box} className="@container absolute inset-0 bg-surface">
      <div className="scroll-thin h-full overflow-y-auto">
        <div className="w-full p-4 @3xl:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="hidden text-brand @xl:block"><Icon n="camera" s={30} w={1.6} /></span><h1 className="text-[24px] font-semibold leading-tight tracking-tight @xl:text-[28px]">My leads</h1></div>
            <button onClick={onSnap} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-brand px-4 text-[13.5px] font-semibold text-white hover:bg-brand-dark"><Icon n="plus" s={15} w={2.4} /> New lead</button>
          </div>
          <p className="t-small mt-1 @xl:ml-[42px]">Turn lift sightings into opportunities, service action and better records.</p>
          <StatRow>
            <Stat2 icon="layers" label="All leads" value={mine.length} tone={T.red} active={f === "all"} onClick={() => { setF("all"); setPage(1); }} />
            <Stat2 icon="clock" label="In progress" value={n("progress")} tone={T.blue} active={f === "progress"} onClick={() => { setF("progress"); setPage(1); }} />
            <Stat2 icon="warn" label="Needs you" value={n("needs")} tone={T.orange} chevron active={f === "needs"} onClick={() => { setF("needs"); setPage(1); }} />
            <Stat2 icon="check" label="Done / won" value={n("done")} tone={T.green} active={f === "done"} onClick={() => { setF("done"); setPage(1); }} />
            <Stat2 icon="star" label="Points earned" value={totalPts} tone={T.gold} extra={todayPts > 0 ? <span className="whitespace-nowrap text-[12px] font-semibold" style={{ color: "var(--color-st-done)" }}>↑ +{todayPts} today</span> : undefined} />
          </StatRow>
          <div className="mt-4 flex items-center gap-2">
            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-muted focus-within:border-brand"><Icon n="search" s={15} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by building, lift number or lead ID…" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" /></label>
            <button aria-label="Filters" aria-expanded={showF} onClick={() => setShowF(!showF)} className={`relative inline-flex h-10 shrink-0 items-center gap-2 rounded-md border bg-white px-3 text-[13px] font-medium ${showF ? "border-ink/40 bg-surface" : "border-line text-ink/80 hover:bg-surface"}`}><Icon n="sliders" s={16} /><span className="hidden @xl:inline">Filters</span>{filters > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-white">{filters}</span>}</button>
            {wide && view === "list" && <div className="relative">
              <button aria-label="Columns" onClick={() => setPanel(!panel)} className={`inline-flex h-10 items-center gap-1.5 rounded-md border bg-white px-3 text-[13px] font-medium ${panel ? "border-ink/40 bg-surface" : "border-line text-ink/80 hover:bg-surface"}`}>Columns</button>
              {panel && <>
                <button aria-label="Close" className="fixed inset-0 z-30" onClick={() => setPanel(false)} />
                <div className="float pop absolute right-0 top-12 z-40 w-56 rounded-md border border-line bg-white p-3">
                  <div className="t-label mb-2">Columns</div>
                  <div className="space-y-1">{colKeys.map((k) => <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded px-1 py-1.5 text-[13.5px] hover:bg-surface"><input type="checkbox" checked={vis[k]} onChange={() => setVis({ ...vis, [k]: !vis[k] })} className="h-4 w-4 accent-[#d42a2a]" />{colLabel[k]}{vis[k] && !fit[k] && <span className="ml-auto text-[11px] text-muted">no room</span>}</label>)}</div>
                  <button onClick={() => { setVis({ opp: true, tier: true, status: true, progress: true, owner: true, updated: true }); setPanel(false); }} className="mt-3 w-full rounded-md border border-line px-3 py-2 text-[13px] font-medium hover:bg-surface">Show all columns</button>
                </div>
              </>}
            </div>}
            <div className="hidden overflow-hidden rounded-md border border-line bg-white @xl:flex">
              {([["list", "list"], ["grid", "layers"]] as const).map(([v, ic]) => <button key={v} aria-label={v} onClick={() => setView(v)} className={`grid h-10 w-11 place-items-center ${view === v ? "bg-brand-soft text-brand" : "text-ink/60 hover:bg-surface"}`} style={view === v ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : undefined}><Icon n={ic} s={17} /></button>)}
            </div>
          </div>
          {showF && (
            <div className="pop mt-2 grid grid-cols-2 gap-2 rounded-md border border-line bg-white p-2.5 @xl:flex @xl:flex-wrap @xl:items-center">
              {filterSelects}
              {filters > 0 && <button onClick={() => { setF("all"); setOppF("all"); setTierF("all"); setAreaF("all"); setPage(1); }} className="col-span-2 min-h-10 rounded-md px-3 text-[13px] font-medium text-ink/70 hover:bg-surface hover:text-ink @xl:ml-auto">Clear filters</button>}
            </div>
          )}
          {!showF && filters > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([[f, "Status", () => setF("all"), { progress: "In progress", needs: "Needs you", done: "Done / won" } as Record<string, string>], [oppF, "Opportunity", () => setOppF("all"), {}], [tierF, "Tier", () => setTierF("all"), {}], [areaF, "Area", () => setAreaF("all"), Object.fromEntries(areas.map((a) => [a, areaName(a)]))]] as const).filter(([v]) => v !== "all").map(([v, k, clear, names]) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-md border border-line bg-white py-1 pl-2.5 pr-1 text-[12.5px]"><span className="text-muted">{k}:</span> <span className="font-medium">{(names as Record<string, string>)[v] ?? v}</span><button aria-label={`Clear ${k}`} onClick={() => { clear(); setPage(1); }} className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-surface hover:text-ink"><Icon n="x" s={11} /></button></span>
              ))}
            </div>
          )}
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
                {th("lead", "Lead / Building")}{fit.opp && th("opp", "Opportunity")}{fit.tier && th("tier", "Tier")}{fit.status && th(undefined, "Status")}{fit.progress && th(undefined, "Progress")}{fit.owner && th(undefined, "Owner")}{fit.updated && <span className="text-right">{th("updated", "Updated")}</span>}<span />
              </div>
              {shown.map((r) => { const x = leadInfo(r); const on = checked.includes(r.id) || r.id === sel; return (
                <div key={r.id} role="button" tabIndex={0} onClick={() => setOpenId(r.id)} className={`relative grid w-full cursor-pointer items-center gap-4 border-b border-line px-5 py-3 text-left transition hover:bg-surface ${on ? "!bg-brand-soft" : ""}`} style={{ gridTemplateColumns: cols, ...(on ? { boxShadow: "inset 0 0 0 1.5px var(--color-brand)" } : {}) }}>
                  <span role="checkbox" aria-checked={checked.includes(r.id)} onClick={(e) => { e.stopPropagation(); toggle(r.id); }} className={`grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-sm border ${checked.includes(r.id) ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{checked.includes(r.id) && <Icon n="check" s={12} w={3} />}</span>
                  <span className="flex min-w-0 items-center gap-3"><Thumb r={r} size={48} /><span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{r.placeName}</span><span className="block truncate t-small">{r.id} · {x.where}</span></span></span>
                  {fit.opp && <span><OppTag track={x.track} /></span>}
                  {fit.tier && <span><TierTag tier={x.tier} /></span>}
                  {fit.status && <span><StatePill r={r} /></span>}
                  {fit.progress && <span className="min-w-0"><span className="mb-1.5 block truncate text-[13px]">{x.step}</span><Line total={x.total} at={x.at} closed={x.closed} color={x.color} /></span>}
                  {fit.owner && <span><OwnerDot id={x.owner} /></span>}
                  {fit.updated && <span className="text-right t-small">{ago(now - upd(r))}</span>}
                  <span className="relative text-right">
                    <button aria-label="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id); }} className="px-1 text-[18px] leading-none text-muted hover:text-ink">⋯</button>
                    {menu === r.id && <span className="float absolute right-0 top-7 z-40 w-48 overflow-hidden rounded-md border border-line bg-white text-left text-[13px]"><button onClick={(e) => { e.stopPropagation(); setMenu(null); setOpenId(r.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Open lead</button><button onClick={(e) => { e.stopPropagation(); setMenu(null); void navigator.clipboard?.writeText(r.id); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Copy lead ID</button></span>}
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
      {sel && narrow && <div className="absolute inset-0 z-20"><ReportDetail key={sel} id={sel} page onClose={() => setOpenId(null)} /></div>}
      {sel && !narrow && (
        <>
          <button aria-label="Close" onClick={() => setOpenId(null)} className="fixed inset-0 z-40 bg-ink/35" />
          <aside className="pop float fixed bottom-0 right-0 top-[var(--safe-top,0px)] z-50 w-[max(29rem,75vw)] max-w-full border-l border-line bg-white pb-[var(--safe-bottom,0px)]"><ReportDetail key={sel} id={sel} onClose={() => setOpenId(null)} /></aside>
        </>
      )}
    </div>
  );
}

function ReportDetail({ id, onClose, page }: { id: string; onClose: () => void; page?: boolean }) {
  const { s, mutate, now } = useApp();
  const r = s.reports.find((x) => x.id === id);
  const [num, setNum] = useState(""); const [form, setForm] = useState<"" | "contact" | "note">(""); const [txt, setTxt] = useState("");
  const [tab, setTab] = useState<"overview" | "details" | "activity" | "photos">("overview"); const [note, setNote] = useState(""); const [more, setMore] = useState(false);
  const partRef = useRef<HTMLElement>(null);
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
  const log = [...r.timeline].reverse();
  const canAdd = r.status === "sent" && !emerg;
  const lastHistory = r.timeline[r.timeline.length - 1]?.t ?? r.createdAt;
  const stepList = main ? steps : r.status === "queued" ? ["Waiting to send", "Submitted"] : ["Submitted", "Seen", "Done"];
  const owner = userOf(x.owner);
  const tabs: [typeof tab, string][] = [["overview", "Overview"], ["details", "Details"], ["activity", "Activity"], ["photos", "Photos"]];
  const place = PLACES.find((p) => p.id === r.placeId);
  const story = r.status === "queued" ? "Saved on your phone. It sends when you are back online."
    : x.closed ? (/Won/.test(main?.outcome ?? "") ? "Won. Your lead became a deal." : `Closed: ${main?.outcome ?? "done"}.`)
    : emerg ? "The emergency desk has been alerted."
    : !main || main.step === 0 ? "Waiting for an owner to pick it up."
    : `${owner ? owner.name.split(" ")[0] : "The owner"} is at “${now_}”.${next ? ` Next: ${next.toLowerCase()}.` : ""}`;
  const has = (k: string) => r.points.some((p) => p.key.startsWith(k));
  const recordsOnly = ["records", "noted", "info", "merge"].includes(x.track ?? "info");
  const won = /Won/.test(main?.outcome ?? "");
  const ladder = (recordsOnly
    ? [{ l: "Sent", pts: 10, hit: r.status === "sent" }, { l: "Added", pts: 30, hit: has("added-") }]
    : [{ l: "Sent", pts: 10, hit: r.status === "sent" }, { l: "Accepted", pts: 20, hit: has("accept-") }, { l: "Quote", pts: 50, hit: has("quote-") }, { l: "Won", pts: 200, hit: has("won-") }]
  ).map((m) => ({ ...m, lost: !m.hit && x.closed && !won }));
  const open = ladder.filter((m) => !m.hit && !m.lost).reduce((a, m) => a + m.pts, 0);
  const equip = r.input.equip === "lift" ? "Lift" : r.input.equip === "escalator" ? "Escalator" : "Moving walk";
  return (
    <div className="@container relative flex h-full bg-white">
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={`shrink-0 border-b border-line ${page ? "px-4 pt-3" : "px-5 pt-5 @4xl:px-6"}`}>
        {page && <button onClick={onClose} className="-ml-1.5 mb-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium text-ink/70 hover:bg-surface hover:text-ink"><Icon n="back" s={15} /> My leads</button>}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-[20px] font-semibold leading-tight tracking-tight">{r.placeName}</h2><div className="t-small mt-1.5 flex items-center gap-1.5"><Icon n="pin" s={13} />{r.id} · {x.where}</div></div>
          <div className="flex shrink-0 items-center gap-3"><StateChip r={r} />{!page && <button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={16} /></button>}</div>
        </div>
        <nav className={`scroll-hide mt-4 flex overflow-x-auto ${page ? "gap-5" : "gap-6"}`}>{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`relative shrink-0 pb-3 text-[13.5px] transition ${tab === k ? "font-semibold text-brand" : "text-muted hover:text-ink"}`}>{l}{tab === k && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}</button>)}</nav>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-surface"><div className={`w-full space-y-4 ${page ? "p-4" : "p-5 @4xl:p-6"}`}>
        {(needsInfo || retake) && (
          <div className="sheet p-4" style={{ borderLeft: "3px solid var(--color-st-attention)" }}>
            <div className="text-sm font-semibold">We need one thing from you</div>
            <p className="mt-1 text-sm text-muted">{retake ? "A clearer photo of the plate or button panel would let us continue." : "I could not read the servicing firm. Can you add it? Check the sticker from a public area."}</p>
            <div className="mt-3 flex gap-2">{retake ? <Btn sm onClick={() => mutate((z) => A.resumeRetake(z, r.id))}><Icon n="camera" s={14} /> Send a clearer photo</Btn> : <><input value={num} onChange={(e) => setNum(e.target.value)} placeholder="e.g. OtherLift" className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm" /><Btn sm disabled={!num} onClick={() => { mutate((z) => A.extra(z, r.id, "detail", num)); setNum(""); }}>Add</Btn></>}</div>
          </div>
        )}

        {tab === "overview" && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @4xl:gap-4">
            <section className="sheet p-4 @4xl:col-span-2 @4xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: x.color }}><span className="h-2 w-2 rounded-full" style={{ background: x.color }} />{x.st.t}</span>
                <span className="t-small">Updated {ago(now - lastHistory)}</span>
              </div>
              <h3 className="mt-2 text-[18px] font-semibold leading-snug tracking-tight @4xl:text-[21px]">{story}</h3>
              {teamTold.length > 0 && <p className="t-small mt-1">Handled by {teamTold.join(" and ")}{live.length > 1 ? ` · ${live.length - 1} more ${live.length === 2 ? "track" : "tracks"} in parallel` : ""}</p>}
              <ol className="mt-4 flex gap-1">
                {stepList.map((st, i) => { const done = x.closed || i < (main?.step ?? 0); const cur = !x.closed && i === (main?.step ?? 0); return (
                  <li key={i} className="min-w-0 flex-1">
                    <span className="block h-1.5 rounded-sm" style={{ background: done ? "var(--color-st-done)" : cur ? x.color : "var(--color-line)" }} />
                    <span className={`mt-1.5 hidden truncate text-[11.5px] @md:block ${cur ? "font-semibold text-ink" : done ? "text-ink/70" : "text-muted"}`}>{st}</span>
                  </li>); })}
              </ol>
              <p className="mt-2 text-[12.5px] text-muted @md:hidden">{x.closed ? `All ${stepList.length} steps done` : <>Step {(main?.step ?? 0) + 1} of {stepList.length}: <b className="font-semibold text-ink">{stepList[main?.step ?? 0]}</b>{next ? ` · next ${next.toLowerCase()}` : ""}</>}</p>
            </section>

            <div className="min-w-0 space-y-3">
              <section ref={partRef} className="sheet p-4">
                <div className="flex items-baseline justify-between gap-3"><h3 className="text-[15px] font-semibold">Help it along</h3><span className="t-small">Goes straight to the owner</span></div>
                {!canAdd || x.closed ? <p className="mt-2 text-[13.5px] text-muted">{x.closed ? "This lead is closed, so it takes no more updates." : "Updates open once the lead is sent."}</p> : (
                  <div className="mt-2 divide-y divide-line">
                    {([["contact", "user", "Site contact", "Who manages the building or the lifts", r.extras.contact, 5], ["note", "edit", "Note for the owner", "Anything you noticed on site", r.extras.note, 5]] as const).map(([k, ic, l, d, done, pts]) => (
                      <div key={k} className="py-2.5">
                        <button disabled={!!done} onClick={() => { setForm(form === k ? "" : k); setTxt(""); }} className="flex w-full items-center gap-3 text-left disabled:cursor-default">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface text-ink/70"><Icon n={ic} s={15} /></span>
                          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{l}</span><span className="block truncate t-small">{done ? done : d}</span></span>
                          {done ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--color-st-done)" }}><Icon n="check" s={13} w={2.6} />+{pts}</span> : <span className="rounded-md border border-line px-2 py-1 text-[12px] font-semibold">+{pts}</span>}
                        </button>
                        {form === k && <div className="pop mt-2.5 flex gap-2"><input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={k === "contact" ? "Name and role, e.g. Facility manager" : "What should the owner know?"} className="min-h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-brand" /><Btn sm disabled={!txt} onClick={() => { mutate((z) => A.extra(z, r.id, k, txt)); setForm(""); setTxt(""); }}>Add</Btn></div>}
                      </div>
                    ))}
                    <div className="py-2.5">
                      <button disabled={r.extras.photos >= 3} onClick={() => mutate((z) => A.extra(z, r.id, "photo", ""))} className="flex w-full items-center gap-3 text-left disabled:cursor-default">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface text-ink/70"><Icon n="camera" s={15} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">Another photo</span><span className="block t-small">{r.extras.photos}/3 added · plates and panels help most</span></span>
                        <span className="rounded-md border border-line px-2 py-1 text-[12px] font-semibold">{r.extras.photos >= 3 ? "Done" : "+3"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="sheet p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-semibold">What you earn</h3>
                  <span className="text-[13px]"><b className="num text-[16px]" style={{ color: "var(--color-st-done)" }}>+{sum("confirmed")}</b> <span className="text-muted">so far{sum("pending") ? ` · +${sum("pending")} pending` : ""}</span></span>
                </div>
                <ol className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${ladder.length}, minmax(0,1fr))` }}>
                  {ladder.map((m) => (
                    <li key={m.l} className="rounded-md border px-2 py-2 text-center" style={m.hit ? { background: T.green.bg, borderColor: "transparent" } : { borderColor: "var(--color-line)", borderStyle: m.lost ? "solid" : "dashed" }}>
                      <span className={`num block text-[14px] font-semibold ${m.hit ? "" : m.lost ? "text-muted line-through" : "text-ink/80"}`} style={m.hit ? { color: T.green.fg } : undefined}>+{m.pts}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">{m.l}</span>
                    </li>
                  ))}
                </ol>
                {open > 0 && <p className="t-small mt-2.5">Up to <b className="text-ink">+{open}</b> more if it goes all the way.</p>}
              </section>
            </div>

            <div className="min-w-0 space-y-3">
              <section className="sheet p-4">
                <div className="flex items-center gap-2"><span style={{ color: "#d9a300" }}><Icon n="sparkle" s={15} /></span><h3 className="text-[15px] font-semibold">What the AI saw</h3></div>
                <p className="mt-2 text-[13.5px] leading-relaxed">{r.plain.length ? r.plain.join(" ") : r.headline}</p>
                <div className="mt-3 flex flex-wrap gap-1.5"><OppTag track={x.track} /><TierTag tier={x.tier} /><span className="inline-flex items-center rounded-md bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink/70">{equip}{r.input.units && r.input.units > 1 ? ` × ${r.input.units}` : ""}</span></div>
                {r.photos.length > 0 && <div className="mt-3 grid grid-cols-4 gap-1.5">{r.photos.slice(0, 4).map((p) => <PhotoTile key={p.id} p={p} className="!rounded-md" />)}</div>}
              </section>

              <section className="sheet overflow-hidden">
                {place ? <LeadMap lat={place.lat} lng={place.lng} className="h-36 @4xl:h-44" /> : null}
                <div className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 text-ink/60"><Icon n="pin" s={16} /></span>
                  <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium">{place?.addr ?? r.placeName}</div><div className="t-small mt-0.5">{AREAS.find((a) => a.id === r.area)?.name ?? r.area} · Unit {r.input.number ?? "not read"}</div></div>
                </div>
              </section>

              <section className="sheet flex items-center gap-3 p-4">
                {owner ? <OwnerDot id={x.owner} size={36} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"><Icon n="user" s={16} /></span>}
                <div className="min-w-0 flex-1"><div className="t-small">Owner</div><div className="truncate text-[13.5px] font-semibold">{owner ? owner.name : "Not assigned yet"}</div><div className="truncate t-small">{owner ? ROLE_LABEL[owner.role] : `Waiting at ${teamTold[0] ?? "the team"}`}</div></div>
                {owner && <span className="text-ink/60"><Icon n="phone" s={16} /></span>}
              </section>
            </div>
          </div>
        )}

        {tab === "details" && (<>
          <div className="sheet divide-y divide-line">
            {[["Place", r.placeName], ["Area", r.area], ["Equipment", r.input.equip === "lift" ? "Lift" : r.input.equip === "escalator" ? "Escalator" : "Moving walk"], ["Unit number", r.input.number ?? "Not read"], ["Sent to", teamTold.join(", ") || "Not routed yet"]].map(([k, v]) => <div key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-[13.5px]"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}
          </div>
          {r.answers.length > 0 && <div className="sheet p-4"><div className="t-label mb-1">Your answers</div><dl className="divide-y divide-line">{r.answers.map((z, k) => <div key={k} className="flex items-start justify-between gap-3 py-2.5 text-[13.5px]"><dt className="capitalize text-muted">{z.q}</dt><dd className="text-right font-medium">{z.a}</dd></div>)}</dl></div>}
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
      <div className={`relative shrink-0 border-t border-line bg-white ${page ? "px-4 py-3" : "px-5 py-4"}`}>
        {note && <div className="pop absolute -top-9 left-5 rounded-md bg-ink px-3 py-1.5 text-[12px] text-white">{note}</div>}
        {more && <><button aria-label="Close" className="fixed inset-0 z-10" onClick={() => setMore(false)} /><div className="float absolute bottom-16 right-5 z-20 w-48 overflow-hidden rounded-md border border-line bg-white text-[13px]"><button onClick={() => { void navigator.clipboard?.writeText(r.id); setMore(false); setNote("Lead ID copied"); setTimeout(() => setNote(""), 1800); }} className="block w-full px-3 py-2 text-left hover:bg-surface">Copy lead ID</button><button onClick={() => { setMore(false); setTab("activity"); }} className="block w-full px-3 py-2 text-left hover:bg-surface">View activity</button></div></>}
        <div className="flex items-center gap-2.5">
          <button onClick={() => { setNote("NewCRM is simulated in this demo"); setTimeout(() => setNote(""), 2200); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-[13.5px] font-medium hover:bg-surface"><span className="whitespace-nowrap"><span className="hidden @md:inline">Open in </span>NewCRM</span> <Icon n="link" s={15} /></button>
          <button disabled={!canAdd || x.closed} onClick={() => { setTab("overview"); setTimeout(() => partRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-[13.5px] font-medium hover:bg-surface disabled:opacity-40"><Icon n="edit" s={16} /> <span className="whitespace-nowrap">Add update</span></button>
          <button aria-label="More" onClick={() => setMore(!more)} className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-white text-[18px] hover:bg-surface">⋯</button>
        </div>
      </div>
    </div>
    </div>
  );
}


function Rewards() {
  const { s, me, now } = useApp();
  const { confirmed, pending } = pointsOf(s, me!.id); const lv = levelOf(confirmed);
  const { rank, rows } = useBoard();
  const mine = s.reports.filter((r) => r.reporterId === me!.id);
  const events = mine.flatMap((r) => r.points.map((p) => ({ ...p, rid: r.id }))).sort((a, b) => b.at - a.at);
  const badges = [
    { n: "First lead", on: mine.length > 0, d: "You sent your first lead" },
    { n: "Missing lift found", on: mine.some((r) => r.points.some((p) => p.key.startsWith("added") && p.status === "confirmed")), d: "A lift you found was added to our records" },
    { n: "Safety first", on: mine.some((r) => r.points.some((p) => p.key === "safety" && p.status === "confirmed")), d: "A valid safety report" },
    { n: "Deal maker", on: mine.some((r) => r.impact), d: "A lead became a win" },
  ];
  const earn: [string, string][] = [["Lead sent", "+10"], ["Missing lift added to records", "+30"], ["Accepted by the owner", "+20"], ["Quote sent", "+50"], ["Won", "+200"], ["Valid safety report", "+30"], ["Contact · note · extra photo", "+5 · +5 · +3"], ["Duplicate of a reported lift", "+2"]];
  return (
    <div className="mx-auto w-full max-w-6xl p-4 @3xl:p-6">
      <h1 className="text-[24px] font-semibold tracking-tight @xl:text-[28px]">Rewards</h1>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-4 @4xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @4xl:grid-rows-[auto_1fr]">
          <section className="sheet min-w-0 p-4 @4xl:col-start-2 @4xl:row-start-1">
            <div className="flex items-start justify-between gap-3">
              <div><div className="t-small">Confirmed points</div><div className="num text-[34px] font-semibold leading-tight tracking-tight">{confirmed}</div><div className="t-small">{pending > 0 ? `+${pending} waiting for checks` : "Nothing pending"}</div></div>
              <div className="text-right"><span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: T.gold.bg, color: T.gold.fg }}><Icon n="trophy" s={13} />{lv.name}</span><div className="t-small mt-1.5">#{rank} of {rows.length}</div></div>
            </div>
            <div className="mt-4"><LevelLadder pts={confirmed} /></div>
            <p className="t-small mt-2">{lv.next ? `${lv.next.from - confirmed} points to ${lv.next.name}.` : "Top level reached."}</p>
          </section>
        <div className="min-w-0 @4xl:col-start-1 @4xl:row-span-2 @4xl:row-start-1"><Leaderboard /></div>
          <section className="sheet min-w-0 p-4 @4xl:col-start-2 @4xl:row-start-2">
            <h2 className="text-[15px] font-semibold">Badges</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">{badges.map((b) => (
              <div key={b.n} className={`rounded-md border p-2.5 ${b.on ? "border-transparent" : "border-dashed border-line"}`} style={b.on ? { background: T.green.bg } : undefined}>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: b.on ? T.green.fg : "var(--color-muted)" }}><Icon n="trophy" s={14} />{b.n}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{b.d}</div>
              </div>))}</div>
          </section>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 @4xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="sheet p-4">
          <h2 className="text-[15px] font-semibold">Recent points</h2>
          {events.length === 0 ? <p className="t-small mt-2">No points yet.</p> : <ul className="mt-2 divide-y divide-line">{events.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-[13px]"><span className="min-w-0"><span className="block truncate">{p.label}</span><span className="t-small">{p.rid} · {ago(now - p.at)}</span></span><span className="shrink-0 text-right"><b className="num" style={p.status === "confirmed" ? { color: "var(--color-st-done)" } : undefined}>{p.pts > 0 ? "+" : ""}{p.pts}</b>{p.status !== "confirmed" && <span className="block text-[11px] text-muted">{p.status}</span>}</span></li>))}</ul>}
        </section>
        <section className="sheet p-4">
          <h2 className="text-[15px] font-semibold">How points work</h2>
          <ul className="mt-2 divide-y divide-line">{earn.map(([a, b]) => <li key={a} className="flex justify-between gap-3 py-2 text-[13px]"><span className="text-muted">{a}</span><b className="num whitespace-nowrap">{b}</b></li>)}</ul>
          <p className="mt-2 text-[11.5px] text-muted">Paid mostly on verified results. Daily limit of 5 paid leads. No cash per lead.</p>
        </section>
      </div>
    </div>
  );
}

export { stepsOf };
