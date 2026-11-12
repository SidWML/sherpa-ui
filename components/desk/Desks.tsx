"use client";
import { useMemo, useState } from "react";
import { A, H, effTier, exceptions, itemsFor, nowOf, stepsOf, useApp, userOf } from "@/lib/store";
import { AREAS, GROUPS, PLACES, ROLE_LABEL, TEAM_NAME, TRACKS, USERS } from "@/lib/data";
import type { Item, Report, Role, Team, Tier } from "@/lib/types";
import { TerritoryMap } from "../hub/TerritoryMap";
import { BidPage } from "./Bid";
import { Shell, type NavItem } from "../Shell";
import { Frame } from "../hub/Frame";
import { Alerts } from "../reporter/ReporterApp";
import { Btn, Card, Empty, Field, Icon, PhotoTile, Pill, Section, TierPill, ago } from "../ui";
import { ClockBadge, ItemPanel, Kpi, Page, Sel, StatusPill } from "./Common";
import { Back, Label, NbaCard, nbaFor } from "./Action";
import { AgentRegistry, Campaigns, Catalogue, CrmLog, Portfolio, TeamPipeline, type Ask } from "./Work";
import { OfferPage } from "./Offers";
import { ChatHome, MyWork } from "../hub/Hub";
import type { Seed } from "./Sherpa";
import type { NbaCard as NbaItem } from "@/lib/sherpa";
import { Bars, QuickActions } from "./Dash";
import { AccountOverview, AdminOverview, EmergencyOverview, ManagerOverview, RecordsOverview, SalesOverview, ServiceOverview } from "./Dash";

type Row = { r: Report; it: Item };

const SELLER_ROLES = ["ni", "ei", "sc", "mod", "ss", "am", "mkt", "mgr"];

export function DeskApp({ onDemo, framed }: { onDemo: () => void; framed?: boolean }) {
  const { s, me } = useApp();
  const role = me!.role;
  const sherpa = SELLER_ROLES.includes(role);
  const [view, setView] = useState(sherpa ? "work" : "rules");
  const [seed, setSeed] = useState<Seed | null>(null);
  const [oppId, setOppId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null); const [bidId, setBidId] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const unread = s.alerts.filter((a) => a.userId === me!.id && !a.read).length;
  const mine = s.sherpa.tasks.filter((t) => !t.done && t.forUser === me!.id).length;
  const N = (id: string, label: string, icon: string, badge?: number, narrowOnly?: boolean): NavItem => ({ id, label, icon, badge: badge || undefined, narrowOnly });
  const front = sherpa ? [N("work", "My work", "list", mine), N("map", "Map", "map"), N("chat", "Chat", "sparkle", undefined, true)] : [];
  const byRole: Record<string, NavItem[]> = {
    ni: [], ei: [N("portfolio", "Portfolio", "layers")], sc: [N("portfolio", "Portfolio", "layers")], mod: [N("portfolio", "Portfolio", "layers")], ss: [],
    am: [N("accounts", "Key accounts", "users"), N("portfolio", "Portfolio", "layers")], mkt: [N("campaigns", "Campaigns and leads", "send")],
    mgr: [N("team", "Team pipeline", "chart")],
    admin: [N("rules", "Rules and routing", "gear"), N("nba", "NBA catalogue", "sparkle"), N("agents", "Agent registry", "bolt"), N("crmlog", "NewCRM write-backs", "doc"), N("audit", "Audit log", "list"), N("users", "Users and areas", "users")],
  };
  const nav: NavItem[] = [...front, ...(byRole[role] ?? []), N("alerts", "Alerts", "bell", unread)];

  const openOpp = (id: string) => { setOppId(id); setView("work"); };
  /** An id that starts with T- is a tender: it opens the bid builder. */
  const openOffer = (id: string) => { if (id.startsWith("T-")) { setBidId(id); setView("bid"); } else { setOfferId(id); setView("offer"); } };
  const startAsk = (card: NbaItem) => { setSeed({ id: Date.now(), card }); if (!wide) setView("chat"); };
  const ask: Ask = (prompt, c) => startAsk({ key: "ASK:" + Date.now(), no: 0, title: "", why: "", sources: [], urgency: "low", agent: "", cta: "", prompt, kind: "doc", ...c });
  const offer = s.sherpa.offers.find((o) => o.id === offerId);
  const goTo = (v: string) => {
    if (v.startsWith("work:")) return openOpp(v.slice(5));
    if (v === "work" || v === "opps" || v === "offers") setOppId(null);
    const d = v === "today" || v === "me" || v === "home" ? "work" : v === "snap" || v === "ask" ? "chat" : v === "opps" || v === "offers" ? "work" : v;
    if (d === "chat" && wide) return;
    setView(d);
  };
  const body = (w: boolean) => {
    const v = w && view === "chat" ? "work" : view;
    return (
      <>
        {!w && sherpa && <div className={v === "chat" ? "absolute inset-0" : "hidden"}><ChatHome seed={seed} openOpp={openOpp} openOffer={openOffer} go={goTo} /></div>}
        {v === "work" && <MyWork openId={oppId} setOpenId={setOppId} openOffer={openOffer} onAsk={(o) => ask(`Where is ${o.id} (${o.placeName})?`)} />}
        {v === "map" && <TerritoryMap onOpenOpp={openOpp} onAsk={(p) => ask(p)} />}
        {v === "bid" && bidId && <BidPage id={bidId} onBack={() => { const op = s.sherpa.tenders.find((x) => x.id === bidId)?.oppId; if (op) setOppId(op); setView("work"); }} openOpp={openOpp} />}
        {v === "offer" && offerId && <OfferPage id={offerId} onBack={() => { if (offer?.oppId) setOppId(offer.oppId); setView("work"); }} />}
        {v === "portfolio" && <Portfolio onAsk={ask} />}
        {v === "campaigns" && <Campaigns onAsk={ask} />}
        {v === "team" && <TeamPipeline onAsk={ask} openOffer={openOffer} />}
        {v === "accounts" && <AccountDesk />}
        {v === "nba" && <Catalogue />}
        {v === "agents" && <AgentRegistry />}
        {v === "crmlog" && <CrmLog />}
        {v === "alerts" && <Alerts onOpen={() => {}} />}
        {v === "rules" && <AdminRules />}
        {v === "audit" && <AuditLog />}
        {v === "users" && <AdminUsers />}
      </>
    );
  };
  const tabView = view === "offer" || view === "bid" ? "work" : view;
  const setTab = (v: string) => { if (v === "work") setOppId(null); setView(v); };
  if (sherpa) return (
    <Frame framed={framed} agent="SHERPA" tabs={nav} view={wide && tabView === "chat" ? "work" : tabView} setView={setTab} onDemo={onDemo} onWide={setWide} xp={false}
      side={<>
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4"><span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white"><Icon n="sparkle" s={15} /></span><div><div className="text-[14px] font-semibold leading-tight">SHERPA</div><div className="t-small leading-tight">Ask anything or act on a lead</div></div></div>
        <div className="relative min-h-0 flex-1"><ChatHome compact seed={seed} openOpp={openOpp} openOffer={openOffer} go={goTo} /></div>
      </>}>
      {body}
    </Frame>
  );
  return (
    <Shell framed={framed} nav={nav} view={tabView} setView={setTab} onDemo={onDemo}>
      {body(false)}
    </Shell>
  );
}

function useSel(rows: Row[]) {
  const [id, setId] = useState<string | null>(null);
  const cur = rows.find((x) => x.it.id === id) ?? null;
  return { cur, id, setId };
}

/* ---------------- Sales (SC, EI, MOD, NI) ---------------- */
const TIER_RANK = { Hot: 0, Warm: 1, Cold: 2, Info: 3 } as const;
const TIER_COLOR = { Hot: "#e3001b", Warm: "#f59e0b", Cold: "#38bdf8", Info: "#d4d4d8" } as const;

function Tabs<T extends string>({ value, set, items }: { value: T; set: (v: T) => void; items: [T, string, number][] }) {
  return (
    <div className="mb-4 flex gap-1.5">{items.map(([k, l, n]) => (
      <button key={k} onClick={() => set(k)} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${value === k ? "bg-ink text-white" : "bg-white text-ink/80 ring-1 ring-line hover:bg-surface"}`}>{l} <span className={`num ml-1 text-xs font-medium ${value === k ? "text-white/60" : "text-muted"}`}>{n}</span></button>
    ))}</div>
  );
}

function SalesDesk() {
  const { s, me } = useApp();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const all = itemsFor(s, me!).filter((x) => x.it.kind !== "note");
  const open = all.filter((x) => x.it.status !== "closed").sort((a, b) => TIER_RANK[effTier(a.it)] - TIER_RANK[effTier(b.it)] || b.it.createdAt - a.it.createdAt);
  const closed = all.filter((x) => x.it.status === "closed");
  const rows = tab === "open" ? open : closed;
  const { cur, setId } = useSel(all);
  if (cur) return <ItemPanel r={cur.r} it={cur.it} role={me!.role} onClose={() => setId(null)} />;
  return (
    <Page title="My leads" sub={`NewCRM view · ${ROLE_LABEL[me!.role]}${me!.areas ? " · " + me!.areas.map((a) => AREAS.find((x) => x.id === a)?.name).join(", ") : ""}`}>
      <SalesOverview all={all} openLead={setId} />
      <Tabs value={tab} set={setTab} items={[["open", "Open", open.length], ["closed", "Closed", closed.length]]} />
      <div className="space-y-2.5">
        {rows.length === 0 && <Empty text="No leads here. Add one from the reporter app and it lands with the right owner." />}
        {rows.map(({ r, it }) => <LeadRow key={it.id} r={r} it={it} role={me!.role} onClick={() => setId(it.id)} />)}
      </div>
    </Page>
  );
}

function LeadRow({ r, it, role, onClick }: { r: Report; it: Item; role: Role; onClick: () => void }) {
  const { now } = useApp();
  const nba = nbaFor(r, it, role);
  return (
    <button onClick={onClick} style={{ borderLeftWidth: 3, borderLeftColor: it.kind === "emergency" ? "#dc2626" : TIER_COLOR[effTier(it)] }} className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">{it.kind === "emergency" ? <Pill tone="red">Emergency</Pill> : <TierPill tier={effTier(it)} />}{it.silent && <Pill tone="blue">Heads-up</Pill>}<StatusPill it={it} /><ClockBadge it={it} /></div>
        <div className="mt-1.5 truncate text-[15px] font-semibold">{it.title}</div>
        <div className="truncate text-[12.5px] text-muted">{r.placeName} · {userOf(r.reporterId)?.name} · {ago(now - it.createdAt)}</div>
        {nba && <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-brand"><Icon n="sparkle" s={12} /> Next: {nba.title}</div>}
      </div>
      <div className="shrink-0 text-right"><div className="num text-xl font-semibold leading-none">{it.kind === "emergency" ? "!" : it.score}</div><div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">score</div></div>
      <span className="text-muted transition group-hover:translate-x-0.5"><Icon n="chev" s={16} /></span>
    </button>
  );
}

/* ---------------- Account manager ---------------- */
function AccountDesk() {
  const { s, me } = useApp();
  const mine = itemsFor(s, me!).filter((x) => x.it.team === "AM");
  const { cur, setId } = useSel(mine);
  const sites = PLACES.filter((p) => p.key);
  if (cur) return <ItemPanel r={cur.r} it={cur.it} role="am" onClose={() => setId(null)} />;
  return (
    <Page title="Key accounts" sub="All sites of a customer, which teams are active, and the new sighting. You coordinate; the local rep owns the lead.">
      <AccountOverview />
      <Section title="New sightings for you">
        {mine.length === 0 && <Empty text="No key-customer sightings yet. Add one at Tech Park, Tower 2." />}
        <div className="space-y-2.5">{mine.map(({ r, it }) => <LeadRow key={it.id} r={r} it={it} role="am" onClick={() => setId(it.id)} />)}</div>
      </Section>
      <Section title="Key-customer sites">
        <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
          {sites.map((p) => {
            const reps = s.reports.filter((r) => r.placeId === p.id && r.status === "sent");
            return (
              <Card key={p.id} className="p-4"><div className="flex items-center justify-between"><div><div className="text-[15px] font-semibold">{p.key}</div><div className="text-xs text-muted">{p.name} · {p.addr}</div></div><Pill tone="amber">Key customer</Pill></div>
                <div className="mt-3 space-y-1.5">{reps.length === 0 && <div className="text-sm text-muted">No sightings yet.</div>}
                  {reps.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm"><b>{r.id}</b><span className="text-muted">{r.headline}</span><span className="ml-auto flex flex-wrap gap-1">{r.items.filter((x) => x.team && !x.silent).map((x) => <Pill key={x.id} tone={x.status === "closed" ? "green" : "blue"}>{x.team}: {stepsOf(x)[x.step]}</Pill>)}</span></div>)}</div></Card>
            );
          })}
        </div>
      </Section>
    </Page>
  );
}

/* ---------------- Manager ---------------- */
function ManagerDesk() {
  const { s, me, mutate } = useApp();
  const ex = exceptions(s);
  const [sel, setSel] = useState<string[]>([]);
  const [to, setTo] = useState("");
  const [ov, setOv] = useState<{ id: string; tier: Tier; reason: string } | null>(null);
  const rows = ex.map((x) => ({ ...x, key: x.it.id + x.why }));
  const cands = USERS.filter((u) => ["sc", "ei", "mod", "ni"].includes(u.role));
  const groups: [string, string][] = [["No owner found", "Unrouted"], ["No action", "No action"], ["Declined", "Declined leads"], ["Possible duplicate", "Possible duplicates"], ["Merge waiting", "Merges to approve"], ["Records task stuck", "Stuck records tasks"], ["Invalid", "Invalid leads"], ["Routing paused", "Routing paused"]];
  return (
    <Page title="Exceptions" sub="Only what is stuck: unrouted, no action in 48 hours, possible duplicates, declined leads, merges to approve." right={<Pill tone={ex.length ? "red" : "green"}>{ex.length} open</Pill>}>
      <ManagerOverview />
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
        <span className="text-sm font-semibold">Reassign {sel.length || "selected"}</span>
        <Sel v={to} set={setTo} ph="Choose owner" options={cands.map((u) => ({ v: u.id, t: `${u.name} · ${u.team}` }))} />
        <Btn sm disabled={!sel.length || !to} onClick={() => { mutate((st) => A.reassign(st, sel, to, me!.id)); setSel([]); }}>Reassign</Btn>
        <span className="ml-auto text-xs text-muted">Every change is logged.</span>
      </div>
      {rows.length === 0 && <Empty text="Nothing stuck. Move the clock in Demo controls (+48h) or report a Warangal building site to see exceptions." />}
      {groups.map(([m, label]) => {
        const g = rows.filter((x) => x.why.includes(m));
        if (!g.length) return null;
        return (
          <div key={m} className="mb-5"><h3 className="mb-2 text-sm font-bold">{label} <span className="text-muted">({g.length})</span></h3>
            <div className="space-y-2">{g.map(({ r, it, why, key }) => (
              <Card key={key} className="p-3">
                <div className="flex flex-wrap items-start gap-3">
                  {(it.kind === "lead" || it.kind === "ticket") && <input aria-label="Select" type="checkbox" className="mt-1.5 h-4 w-4 accent-[#e3001b]" checked={sel.includes(it.id)} onChange={(e) => setSel(e.target.checked ? [...sel, it.id] : sel.filter((x) => x !== it.id))} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-[11px] font-bold text-muted">{it.caseId}</span>{(it.kind === "lead" || it.kind === "ticket") && <TierPill tier={effTier(it)} />}<Pill tone="amber">{why}</Pill>{it.override && <Pill tone="blue">Overridden to {it.override.to}</Pill>}</div>
                    <div className="text-sm font-bold">{it.title} <span className="font-normal text-muted">· {it.team ? TEAM_NAME[it.team] : ""}</span></div>
                    <div className="text-xs text-muted">{r.placeName} · {r.id} · owner {userOf(it.ownerId)?.name ?? "none"} · reporter {userOf(r.reporterId)?.name}{it.declineReason ? ` · reason: ${it.declineReason}` : ""}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {it.flags.includes("mergePending") && <Btn sm onClick={() => mutate((st) => A.approveMerge(st, it.id, me!.id))}>Approve merge</Btn>}
                    {(it.kind === "lead" || it.kind === "ticket") && <><Btn sm v="ghost" disabled={!it.ownerId} onClick={() => mutate((st) => A.nudge(st, it.id, me!.id))}>Nudge</Btn><Btn sm v="ghost" onClick={() => setOv({ id: it.id, tier: effTier(it), reason: "" })}>Override tier</Btn></>}
                    {it.flags.some((f) => f.startsWith("Invalid")) && <Btn sm v="ghost" onClick={() => mutate((st) => { A.releasePoints(st, r.id, me!.id, true); })}>Confirm valid</Btn>}
                  </div>
                </div>
                {ov?.id === it.id && <div className="pop mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface p-2.5"><Sel v={ov.tier} set={(v) => setOv({ ...ov, tier: v as Tier })} options={["Hot", "Warm", "Cold", "Info"]} /><input value={ov.reason} onChange={(e) => setOv({ ...ov, reason: e.target.value })} placeholder="Reason (required)" className="min-h-9 min-w-48 flex-1 rounded-lg border border-line bg-white px-2 text-[13px]" /><Btn sm disabled={!ov.reason} onClick={() => { mutate((st) => A.override(st, it.id, me!.id, ov.tier, ov.reason)); setOv(null); }}>Save override</Btn><Btn sm v="ghost" onClick={() => setOv(null)}>Cancel</Btn></div>}
                {(it.kind === "lead" || it.kind === "ticket" || it.kind === "records") && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="text-muted">Reassign to</span><Sel v="" set={(v) => v && mutate((st) => A.reassign(st, [it.id], v, me!.id))} ph="Choose…" options={cands.map((u) => ({ v: u.id, t: `${u.name} · ${u.team}` }))} /></div>}
              </Card>
            ))}</div></div>
        );
      })}
      <Section title="Owner response (manager visibility)">
        <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-left text-xs text-muted"><tr><th className="p-3">Owner</th><th>Team</th><th>Open</th><th>Accepted</th><th>Hot waiting</th><th>Avg. time to accept</th></tr></thead><tbody>
          {cands.map((u) => {
            const its = s.reports.flatMap((r) => r.items).filter((i) => i.ownerId === u.id && !i.silent && i.kind === "lead");
            const acc = its.filter((i) => i.acceptedAt); const avg = acc.length ? Math.round(acc.reduce((a, i) => a + (i.acceptedAt! - i.createdAt), 0) / acc.length / H) : null;
            return <tr key={u.id} className="border-t border-line"><td className="p-3 font-medium">{u.name}</td><td>{u.team}</td><td>{its.filter((i) => i.status !== "closed").length}</td><td>{acc.length}</td><td>{its.filter((i) => i.status === "new" && effTier(i) === "Hot").length}</td><td>{avg === null ? "-" : `${avg} h`}</td></tr>;
          })}</tbody></table></Card>
      </Section>
    </Page>
  );
}

function Board() {
  const { s } = useApp();
  const items = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "lead" && !i.silent && i.team !== "AM").map((it) => ({ r, it })));
  const cols: [string, (i: Item) => boolean][] = [["New", (i) => i.status === "new"], ["Accepted", (i) => i.status === "accepted" && i.step < stepsOf(i).length - 2], ["Late stage", (i) => i.status === "accepted" && i.step >= stepsOf(i).length - 2], ["Closed", (i) => i.status === "closed"]];
  return (
    <Page title="Team board" sub="Leads in your area by stage.">
      <div className="grid gap-3 @2xl:grid-cols-4">{cols.map(([t, f]) => <div key={t}><div className="mb-2 text-sm font-bold">{t} <span className="text-muted">{items.filter((x) => f(x.it)).length}</span></div><div className="space-y-2">{items.filter((x) => f(x.it)).map(({ r, it }) => <Card key={it.id} className="p-3"><div className="flex items-center gap-1.5"><TierPill tier={effTier(it)} /><span className="font-mono text-[11px] text-muted">{it.caseId}</span></div><div className="mt-1 text-sm font-semibold">{it.title}</div><div className="text-xs text-muted">{r.placeName}</div><div className="mt-1 text-xs">{userOf(it.ownerId)?.name ?? "unassigned"} · {it.outcome ?? stepsOf(it)[it.step]}</div></Card>)}</div></div>)}</div>
    </Page>
  );
}

function PointsCheck() {
  const { s, me, mutate } = useApp();
  const held = s.reports.filter((r) => r.points.some((p) => p.status === "held"));
  const rev = s.reports.filter((r) => r.fake);
  return (
    <Page title="Points check" sub="Spot-check held points: old gallery photos, mismatched locations. Release or reject.">
      {held.length === 0 && <Empty text="No held points right now." />}
      <div className="space-y-2">{held.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="w-14">{r.photos[0] && <PhotoTile p={r.photos[0]} className="!rounded-lg" />}</div>
          <div className="min-w-0 flex-1"><div className="text-sm font-bold">{r.id} · {r.placeName}</div><div className="text-xs text-muted">Reporter {userOf(r.reporterId)?.name} · trust {r.trusted ? "normal" : "low"} · {r.cases.filter((c) => ["E10", "F7", "F8"].includes(c)).join(", ")}</div></div>
          <Btn sm onClick={() => mutate((st) => A.releasePoints(st, r.id, me!.id, true))}>Release points</Btn><Btn sm v="danger" onClick={() => mutate((st) => A.releasePoints(st, r.id, me!.id, false))}>Reject as junk</Btn>
        </Card>))}</div>
      {rev.length > 0 && <Section title="Rejected reports"><div className="space-y-1 text-sm">{rev.map((r) => <div key={r.id}>{r.id} · {r.placeName} · points reversed · reporter trust lowered</div>)}</div></Section>}
    </Page>
  );
}

/* ---------------- Records steward ---------------- */
function RecordsDesk() {
  const { s } = useApp();
  const rows = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.team === "RS" && i.kind !== "note").map((it) => ({ r, it }))).sort((a, b) => a.it.createdAt - b.it.createdAt);
  const open = rows.filter((x) => x.it.status !== "closed");
  const done = rows.filter((x) => x.it.status === "closed");
  const [tab, setTab] = useState<"open" | "done">("open");
  const list = tab === "open" ? open : done;
  const { cur, setId } = useSel(rows);
  if (cur) {
    const { r, it } = cur;
    return (
      <div className="mx-auto max-w-5xl p-4 @2xl:p-8">
        <Back onClick={() => setId(null)} label="Back to the queue" />
        <header className="mb-5"><div className="flex items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{it.caseId}</span><StatusPill it={it} />{it.flags.includes("mergePending") && <Pill tone="amber">Merge pending</Pill>}</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">{it.title}</h1><p className="mt-1 text-sm text-muted">{r.placeName} · {r.id} · reported by {userOf(r.reporterId)?.name}</p></header>
        <div className="mb-5"><NbaCard r={r} it={it} role="rs" /></div>
        <p className="mb-5 max-w-2xl text-[15px] leading-relaxed">{it.summary}</p>
        <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
          <Card className="p-5"><Label>New photo and reading</Label><div className="mb-3 grid grid-cols-3 gap-2">{r.photos.slice(0, 3).map((p) => <PhotoTile key={p.id} p={p} />)}</div>
            <div className="rounded-xl border border-line px-3">{[["Unit number", r.input.number ?? "Not read", r.input.number ? 94 : 0], ["Brand", r.input.brand === "ours" ? "Schindler" : r.input.brand === "other" ? "OtherLift" : "Unclear", 96], ["Estimated age", `~${r.input.age} y`, 78], ["Place", r.placeName, 100]].map(([k, v, c]) => <Field key={String(k)} k={String(k)} v={<span>{v} <span className={`text-xs ${Number(c) < 70 ? "text-amber-700" : "text-emerald-600"}`}>{Number(c) ? `${c}%` : "missing"}</span></span>} />)}</div>
            {r.corrections.length > 0 && <p className="mt-2 text-xs text-muted">Reporter corrections: {r.corrections.join("; ")}</p>}</Card>
          <Card className="p-5"><Label>Candidate record</Label>
            <div className="rounded-xl border border-line px-3">
              {r.input.records === "missing" || it.caseId === "F5" ? <div className="py-4 text-sm text-muted">No record found by number. Nearest in the same building: <b>Lift 74820</b>. {it.caseId === "F5" ? "The building itself is also new." : ""}</div> : <>
                <Field k="Unit number" v={r.input.number ?? "74821 (by place and brand)"} />
                <Field k="Brand and model" v={<span className={r.input.records === "wrong" ? "rounded bg-amber-100 px-1" : ""}>{r.input.records === "wrong" ? "Schindler 3100 (differs)" : "Schindler 3300"}</span>} />
                <Field k="Address" v={<span className={r.input.records === "wrong" ? "rounded bg-amber-100 px-1" : ""}>{r.input.records === "wrong" ? "Road No. 12, Banjara Hills (differs)" : r.placeName}</span>} />
                <Field k="Lifts in building" v={r.input.records === "wrong" ? "2 (reporter saw 3)" : "1"} />
                <Field k="Status" v={r.input.records === "scrapped" ? <Pill tone="red">Marked scrapped</Pill> : r.input.records === "multiple" ? "3 candidates share this number" : "Active"} /></>}
            </div>
            <p className="mt-3 text-[11.5px] text-muted">Every fix updates the installed base through the agreed process. Nothing here is edited directly in SAP.</p></Card>
        </div>
      </div>
    );
  }
  return (
    <Page title="Records queue" sub="Unmatched, mismatched, duplicate and new-place leads. Oldest first.">
      <RecordsOverview rows={rows} openOldest={() => { setTab("open"); if (open[0]) setId(open[0].it.id); }} />
      <Tabs value={tab} set={setTab} items={[["open", "Open", open.length], ["done", "Done", done.length]]} />
      <div className="space-y-2.5">{list.length === 0 && <Empty text="Queue is empty." />}{list.map(({ r, it }) => <LeadRow key={it.id} r={r} it={it} role="rs" onClick={() => setId(it.id)} />)}</div>
    </Page>
  );
}

/* ---------------- Emergency desk ---------------- */
function EmergencyDesk() {
  const { s } = useApp();
  const rows = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "emergency").map((it) => ({ r, it }))).sort((a, b) => b.it.createdAt - a.it.createdAt);
  const open = rows.filter((x) => x.it.status !== "closed"); const closed = rows.filter((x) => x.it.status === "closed");
  const [tab, setTab] = useState<"open" | "closed">("open");
  const list = tab === "open" ? open : closed;
  const { cur, setId } = useSel(rows);
  const mins = (it: Item) => Math.floor((nowOf(s) - it.createdAt) / 60000);
  if (cur) {
    const { r, it } = cur;
    const notOurs = r.input.brand === "other" || !r.input.inArea;
    const pl = PLACES.find((p) => p.id === r.placeId);
    return (
      <div className="mx-auto max-w-5xl p-4 @2xl:p-8">
        <Back onClick={() => setId(null)} label="Back to the inbox" />
        <header className="mb-5"><div className="flex items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{it.caseId}</span><Pill tone="red">Emergency</Pill><Pill tone={it.status === "new" && mins(it) > 10 ? "red" : "gray"}>{mins(it)} min since alert</Pill></div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-red-700">{it.title}</h1><p className="mt-1 text-sm text-muted">{r.placeName} · {r.id}</p></header>
        <div className="mb-5"><NbaCard r={r} it={it} role="ed" /></div>
        {notOurs && <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-[13px] text-amber-900"><b>Not our lift or outside our area.</b> Standard message to the building owner: <i>&ldquo;A lift in your building was reported as unsafe. Please take it out of service and have it inspected by its maintenance company.&rdquo;</i>{!r.input.inArea && " Record the local rules."}</div>}
        <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
          <Card className="p-5"><Label>Where</Label><div className="mb-3 grid grid-cols-3 gap-2">{r.photos.slice(0, 3).map((p) => <PhotoTile key={p.id} p={p} />)}{r.photos.length === 0 && <div className="col-span-3 rounded-xl bg-surface p-3 text-xs text-muted">No photo. Location only.</div>}</div>
            <div className="grid h-32 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 text-center text-xs text-ink/70"><div><span className="text-red-600"><Icon n="pin" s={26} /></span><div className="font-semibold">{pl?.addr ?? r.placeName}</div><div>{pl?.lat ?? "47.38"}, {pl?.lng ?? "8.52"}</div></div></div></Card>
          <Card className="p-5"><Label>Facts</Label><div className="rounded-xl border border-line px-3"><Field k="Trapped or hurt" v={r.input.hurt === "yes" ? <b className="text-red-700">Yes</b> : r.input.hurt === "no" ? "No" : "Not sure"} /><Field k="Reporter" v={userOf(r.reporterId)?.name} /><Field k="Reporter contact" v="+91 98480 55501" /><Field k="Unit" v={r.input.number ?? "Not known"} /><Field k="Ours" v={r.input.brand === "ours" ? "Yes. Service team also told" : r.input.brand === "other" ? "No" : "Unknown"} /><Field k="Service order" v={it.serviceOrder ?? "None yet"} /></div></Card>
        </div>
      </div>
    );
  }
  return (
    <Page title="Emergency inbox" sub="Unsafe-lift alerts. Target: acknowledge within 10 minutes. No sales action is created until the emergency is closed.">
      <EmergencyOverview rows={rows} openNewest={() => { setTab("open"); if (open[0]) setId(open[0].it.id); }} />
      <Tabs value={tab} set={setTab} items={[["open", "Open", open.length], ["closed", "Closed", closed.length]]} />
      <div className="space-y-2.5">{list.length === 0 && <Empty text="No emergencies. Use Something unsafe in the reporter app." />}{list.map(({ r, it }) => {
        const late = it.status === "new" && mins(it) > 10;
        return (
          <button key={it.id} onClick={() => setId(it.id)} className={`flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left transition hover:shadow-md ${late ? "border-red-300" : "border-line"}`} style={{ borderLeftWidth: 3, borderLeftColor: "#dc2626" }}>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><Pill tone="red">{it.flags[0] ?? "Emergency"}</Pill>{it.flags.includes("Sent late, no signal") && <Pill tone="amber">Sent late</Pill>}<StatusPill it={it} /></div>
              <div className="mt-1.5 text-[15px] font-semibold">{r.placeName}</div><div className="text-[12.5px] text-muted">{it.status === "new" ? "Not acknowledged" : it.outcome ?? stepsOf(it)[it.step]} · {r.id}</div></div>
            <div className={`num shrink-0 text-right text-lg font-semibold ${late ? "text-red-700" : ""}`}>{mins(it)}<div className="text-[10px] font-normal uppercase tracking-wide text-muted">min</div></div>
            <span className="text-muted"><Icon n="chev" s={16} /></span>
          </button>);
      })}</div>
    </Page>
  );
}

/* ---------------- Service team ---------------- */
function ServiceDesk() {
  const { s } = useApp();
  const rows = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => (i.team === "SVC" && i.kind !== "emergency") || (i.kind === "emergency" && i.also.includes("SVC"))).map((it) => ({ r, it })));
  const open = rows.filter((x) => x.it.status !== "closed"); const closed = rows.filter((x) => x.it.status === "closed");
  const [tab, setTab] = useState<"open" | "closed">("open");
  const list = tab === "open" ? open : closed;
  const { cur, setId } = useSel(rows);
  if (cur) {
    return (
      <>
        <ItemPanel r={cur.r} it={cur.it} role="svc" onClose={() => setId(null)} />
        {cur.it.kind === "emergency" && <div className="mx-auto -mt-2 max-w-5xl px-4 pb-8 @2xl:px-8"><div className="rounded-xl bg-red-50 p-3 text-sm text-red-900">Emergency on a lift we maintain. The emergency desk leads. Dispatch arrives as a service order{cur.it.serviceOrder ? `: ${cur.it.serviceOrder}` : ""}.</div></div>}
      </>
    );
  }
  return (
    <Page title="Service tickets" sub="Faults on lifts we maintain. Hand back to sales if there is a renewal chance.">
      <ServiceOverview rows={rows} openNext={() => { setTab("open"); if (open[0]) setId(open[0].it.id); }} />
      <Tabs value={tab} set={setTab} items={[["open", "Open", open.length], ["closed", "Closed", closed.length]]} />
      <div className="space-y-2.5">{list.length === 0 && <Empty text="No tickets. Add a lift with minor issues to create one." />}{list.map(({ r, it }) => <LeadRow key={it.id} r={r} it={it} role="svc" onClick={() => setId(it.id)} />)}</div>
    </Page>
  );
}

/* ---------------- Leadership ---------------- */
function Leadership() {
  const { s } = useApp();
  const m = useMemo(() => {
    const reps = s.reports.filter((r) => r.status === "sent");
    const items = reps.flatMap((r) => r.items);
    const leads = items.filter((i) => i.kind === "lead" && !i.silent && i.team !== "AM");
    const accepted = leads.filter((i) => i.acceptedAt);
    const quoted = leads.filter((i) => i.quoted);
    const won = leads.filter((i) => i.outcome === "Won");
    const hot = leads.filter((i) => effTier(i) === "Hot");
    const hotAcc = hot.filter((i) => i.acceptedAt && i.acceptedAt - i.createdAt <= 24 * H);
    const junk = reps.filter((r) => r.fake).length;
    const matched = reps.filter((r) => r.verdict === "ours" || r.verdict === "notours").length;
    const added = items.filter((i) => i.kind === "records" && i.outcome === "Added to our records").length;
    const reporters = new Set(reps.map((r) => r.reporterId)).size;
    const byGroup: Record<string, number> = {}; reps.forEach((r) => { const g = r.cases[0]?.[0] ?? "K"; byGroup[g] = (byGroup[g] ?? 0) + 1; });
    return { reps: reps.length, matched, leads: leads.length, accepted: accepted.length, quoted: quoted.length, won: won.length, hot: hot.length, hotAcc: hotAcc.length, junk, added, reporters, byGroup, emerg: items.filter((i) => i.kind === "emergency").length, ackd: items.filter((i) => i.kind === "emergency" && i.step >= 1).length };
  }, [s]);
  const funnel: [string, number][] = [["Reports", m.reps], ["Matched", m.matched], ["Leads", m.leads], ["Accepted", m.accepted], ["Quoted", m.quoted], ["Won", m.won]];
  const max = Math.max(1, ...funnel.map((f) => f[1]));
  return (
    <Page title="Programme dashboard" sub="Totals only. No individual contact or contract details." right={<Btn sm v="ghost" onClick={() => alert("Weekly digest subscribed (demo).")}><Icon n="bell" s={14} /> Subscribe to digest</Btn>}>
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <Kpi k="Reports" v={m.reps} sub={`${m.reporters} reporters active`} />
        <Kpi k="Quality (valid)" v={`${m.reps ? Math.round(((m.reps - m.junk) / m.reps) * 100) : 0}%`} sub="Target 85% or more" tone="green" />
        <Kpi k="Junk rate" v={`${m.reps ? Math.round((m.junk / m.reps) * 100) : 0}%`} sub="Target 5% or less" />
        <Kpi k="Hot accepted in 24h" v={m.hot ? `${Math.round((m.hotAcc / m.hot) * 100)}%` : "-"} sub={`${m.hotAcc} of ${m.hot} Hot leads · target 80%`} tone="red" />
        <Kpi k="Lifts added to installed base" v={m.added} sub="Target set after week 4" />
        <Kpi k="Emergencies acknowledged" v={`${m.ackd}/${m.emerg}`} sub="Within 10 min target" />
        <Kpi k="Quotes" v={m.quoted} sub="Target set after week 8" />
        <Kpi k="Wins" v={m.won} tone="green" />
      </div>
      <div className="mt-5 grid gap-4 @2xl:grid-cols-2">
        <Card className="p-4"><Section title="Funnel">{funnel.map(([k, v]) => <div key={k} className="mb-2"><div className="mb-0.5 flex justify-between text-sm"><span>{k}</span><b>{v}</b></div><div className="h-3 rounded-full bg-line"><div className="h-3 rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></div></div>)}</Section></Card>
        <Card className="p-4"><Section title="Reports by situation group">{Object.entries(GROUPS).filter(([k]) => m.byGroup[k]).map(([k, n]) => <div key={k} className="mb-2"><div className="mb-0.5 flex justify-between text-sm"><span>{k} · {n}</span><b>{m.byGroup[k]}</b></div><div className="h-3 rounded-full bg-line"><div className="h-3 rounded-full bg-ink" style={{ width: `${(m.byGroup[k] / Math.max(...Object.values(m.byGroup))) * 100}%` }} /></div></div>)}</Section></Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 @2xl:grid-cols-2"><Bars title="Lead outcomes" rows={[["Won", m.won, "green"], ["Quote out", m.quoted - m.won, "amber"], ["In progress", Math.max(0, m.accepted - m.quoted), "blue"], ["Waiting", Math.max(0, m.leads - m.accepted), "red"]]} note="Counts of leads by where they are now." />
        <QuickActions actions={[{ label: "Download leads as CSV", icon: "doc", tone: "primary", run: () => exportCsv(s.reports) }, { label: "Subscribe to the weekly digest", icon: "bell", run: () => alert("Weekly digest subscribed (demo).") }]} /></div>
      <p className="mt-4 text-xs text-muted">Reporting data is never used to rate individuals. Leaderboards need HR and works-council review before they are shown.</p>
    </Page>
  );
}

function exportCsv(reps: Report[]) {
  const rows = [["Lead", "Place", "Area", "Status", "Headline", "Created"], ...reps.map((r) => [r.id, r.placeName, r.area, r.status, r.headline, new Date(r.createdAt).toISOString()])];
  const csv = rows.map((x) => x.map((c) => `"${String(c).split(String.fromCharCode(34)).join(String.fromCharCode(34, 34))}"`).join(",")).join(String.fromCharCode(10));
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const el = document.createElement("a"); el.href = url; el.download = "snap-and-lead-leads.csv"; el.click(); URL.revokeObjectURL(url);
}

/* ---------------- Admin ---------------- */
function AdminRules() {
  const { s, me, mutate } = useApp();
  const c = s.cfg;
  const set = (label: string, fn: (c: typeof s.cfg) => void) => mutate((st) => { fn(st.cfg); st.audit.unshift({ t: nowOf(st), by: me!.name, text: label }); });
  const num = (v: number, on: (n: number) => void) => <input type="number" defaultValue={v} onBlur={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n) && n !== v) on(n); }} className="min-h-9 w-20 rounded-lg border border-line px-2 text-right text-sm" />;
  const BASE: [keyof typeof c.base, string][] = [["ourOther", "Our lift, another company services it"], ["site", "Building site with no lift yet"], ["ended", "Our lift, contract ended"], ["ourMissingProblem", "Our lift, not in records, with a problem"], ["keyCustomer", "Another site of a key customer"], ["ourProblem", "Our lift under contract with a problem"], ["otherLocal", "Another company's lift, local firm / staff / nobody"], ["veryOld", "Very old lift (modernisation)"], ["otherMaker", "Another company's lift, serviced by its own maker"]];
  return (
    <Page title="Rules and routing" sub="Pilot: configuration files. Every change is written to the audit log." right={
      <button onClick={() => set(`Routing ${c.paused ? "resumed" : "paused"}`, (x) => { x.paused = !x.paused; })} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${c.paused ? "bg-emerald-600" : "bg-red-700"}`}>{c.paused ? "Resume routing" : "Pause routing now"}</button>}>
      <AdminOverview />
      {c.paused && <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">Routing is paused. New reports are accepted and sent to the manager exception list.</div>}
      <div className="grid gap-4 @4xl:grid-cols-2">
        <Card className="p-4"><Section title="Tier thresholds (score)">{([["hot", "Hot: act within one working day"], ["warm", "Warm: three working days"], ["cold", "Cold: reviewed weekly"]] as const).map(([k, l]) => <div key={k} className="flex items-center justify-between py-1 text-sm"><span>{l}</span>{num(c.tiers[k], (n) => set(`Tier threshold ${k} set to ${n}`, (x) => { x.tiers[k] = n; }))}</div>)}</Section>
          <Section title="Follow-up clock (hours)">{([["hot", "Hot"], ["warm", "Warm"]] as const).map(([k, l]) => <div key={k} className="py-1 text-sm"><div className="mb-1 font-medium">{l}: reminder, manager told, manager reassigns</div><div className="flex gap-2">{[0, 1, 2].map((i) => <span key={i}>{num(c.followUp[k][i], (n) => set(`Follow-up ${k}[${i}] set to ${n}h`, (x) => { x.followUp[k][i] = n; }))}</span>)}</div></div>)}
            <div className="flex items-center justify-between py-1 text-sm"><span>Daily limit of paid reports</span>{num(c.dailyLimit, (n) => set(`Daily limit set to ${n}`, (x) => { x.dailyLimit = n; }))}</div></Section></Card>
        <Card className="p-4"><Section title="Starting scores">{BASE.map(([k, l]) => <div key={k} className="flex items-center justify-between py-1 text-sm"><span>{l}</span>{num(c.base[k], (n) => set(`Base score ${k} set to ${n}`, (x) => { x.base[k] = n; }))}</div>)}</Section></Card>
        <Card className="p-4 @4xl:col-span-2"><Section title="Owners by area and team (backup: the area manager)"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted"><tr><th className="py-2">Area</th>{(["SC", "EI", "MOD", "NI"] as Team[]).map((t) => <th key={t}>{t}</th>)}</tr></thead><tbody>
          {Object.keys(c.owners).map((a) => <tr key={a} className="border-t border-line"><td className="py-2 font-medium">{AREAS.find((x) => x.id === a)?.name}</td>{(["SC", "EI", "MOD", "NI"] as Team[]).map((t) => <td key={t}><Sel v={c.owners[a][t] ?? ""} ph="No owner" set={(v) => set(`Owner for ${a}/${t} set to ${userOf(v)?.name ?? "none"}`, (x) => { if (v) x.owners[a][t] = v; else delete x.owners[a][t]; })} options={USERS.filter((u) => u.team === t).map((u) => ({ v: u.id, t: u.name }))} /></td>)}</tr>)}</tbody></table></div>
          <p className="mt-2 text-xs text-muted">Remove an owner (choose No owner), then report a lead for that team and area. It lands on the manager exception list.</p></Section></Card>
      </div>
    </Page>
  );
}
function AuditLog() {
  const { s } = useApp();
  return <Page title="Audit log" sub="Rule changes, tier overrides, merges, reassignments, exports. Kept 24 months."><Card className="divide-y divide-line">{s.audit.length === 0 && <div className="p-6 text-center text-sm text-muted">No entries yet.</div>}{s.audit.map((a, k) => <div key={k} className="flex gap-3 p-3 text-sm"><span className="w-40 shrink-0 text-xs text-muted">{new Date(a.t).toLocaleString()}</span><span className="w-32 shrink-0 font-medium">{a.by}</span><span>{a.text}</span></div>)}</Card></Page>;
}
function AdminUsers() {
  return <Page title="Users and areas" sub="Role-based access limited by sales area, from single sign-on."><Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-left text-xs text-muted"><tr><th className="p-3">Name</th><th>Role</th><th>Team</th><th>Areas</th></tr></thead><tbody>{USERS.map((u) => <tr key={u.id} className="border-t border-line"><td className="p-3 font-medium">{u.name}<div className="text-xs font-normal text-muted">{u.title}</div></td><td>{ROLE_LABEL[u.role]}</td><td>{u.team ?? "-"}</td><td>{u.areas?.map((a) => AREAS.find((x) => x.id === a)?.name).join(", ") ?? "All"}</td></tr>)}</tbody></table></Card></Page>;
}
export { TRACKS };
