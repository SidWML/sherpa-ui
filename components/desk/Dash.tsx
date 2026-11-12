"use client";
import type { ReactNode } from "react";
import { A, H, effTier, exceptions, itemsFor, nowOf, useApp } from "@/lib/store";
import type { Item, Report } from "@/lib/types";
import { Btn, Card, Icon } from "../ui";
import { nbaFor } from "./Action";

type Tone = "red" | "green" | "amber" | "blue";
type Row = { r: Report; it: Item };

/* ------------------------------------------------------------ building blocks */
export function Stat({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: string; tone?: Tone; icon?: string }) {
  const text = tone === "red" ? "text-brand" : tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "blue" ? "text-sky-600" : "text-ink";
  const chip = tone === "red" ? "bg-red-50 text-brand" : tone === "green" ? "bg-emerald-50 text-emerald-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : tone === "blue" ? "bg-sky-50 text-sky-600" : "bg-surface text-muted";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2"><div className="text-[12px] font-medium text-muted">{label}</div>{icon && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${chip}`}><Icon n={icon} s={15} /></span>}</div>
      <div className={`num mt-2 text-[28px] font-semibold leading-none tracking-tight ${text}`}>{value}</div>
      {sub && <div className="mt-1.5 truncate text-[11.5px] text-muted">{sub}</div>}
    </Card>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-2 gap-3 @4xl:grid-cols-4">{children}</div>;
}

export function Bars({ title, rows, note }: { title: string; rows: [string, number, Tone?][]; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const col = { red: "bg-brand", green: "bg-emerald-500", amber: "bg-amber-400", blue: "bg-sky-500" };
  return (
    <Card className="p-4">
      <div className="mb-3 t-label">{title}</div>
      <div className={`grid grid-cols-1 gap-x-8 gap-y-3 ${rows.length > 3 ? "@2xl:grid-cols-2" : ""}`}>
        {rows.map(([k, v, t]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink/80">{k}</span><b className="num">{v}</b></div>
            <div className="h-2 rounded-full bg-surface"><div className={`h-2 rounded-full transition-all ${col[t ?? "red"]}`} style={{ width: `${Math.max(v ? 4 : 0, (v / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      {note && <p className="mt-3 text-[11px] text-muted">{note}</p>}
    </Card>
  );
}

export interface Act { label: string; icon?: string; run: () => void; disabled?: boolean; hint?: string; tone?: "primary" | "ghost" }
export function QuickActions({ actions }: { actions: Act[] }) {
  const live = actions.filter((a) => !a.disabled);
  return (
    <Card className="p-4">
      <div className="mb-3 t-label">Quick actions</div>
      {live.length === 0 && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-[13px] font-medium text-emerald-800"><Icon n="check" s={16} /> You are all caught up. Nothing needs doing right now.</div>}
      <div className="space-y-2">
        {live.map((a) => (
          <div key={a.label}>
            <Btn full sm v={a.tone === "primary" ? "primary" : "ghost"} disabled={a.disabled} onClick={a.run} className="justify-start!">{a.icon && <Icon n={a.icon} s={15} />}{a.label}</Btn>
            {a.hint && <div className="mt-0.5 px-1 text-[11px] text-muted">{a.hint}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Stats on the left, one chart and the quick actions beside it. */
export function Overview({ stats, chart, actions, side }: { stats: ReactNode; chart: { title: string; rows: [string, number, Tone?][]; note?: string }; actions: Act[]; side?: ReactNode }) {
  return (
    <div className="mb-6">
      <StatGrid>{stats}</StatGrid>
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[1fr_20rem]"><Bars {...chart} />{side ?? <QuickActions actions={actions} />}</div>
    </div>
  );
}

const hrs = (ms: number) => Math.round(ms / H);
function avgAccept(items: Item[]) {
  const a = items.filter((i) => i.acceptedAt);
  return a.length ? hrs(a.reduce((t, i) => t + (i.acceptedAt! - i.createdAt), 0) / a.length) : null;
}

/** SHERPA-style prompts: the few things worth doing next, ranked, one click each. */
export function NbaList({ rows, openLead }: { rows: Row[]; openLead: (id: string) => void }) {
  const { me, mutate } = useApp();
  const rank = { Hot: 0, Warm: 1, Cold: 2, Info: 3 };
  const items = rows.filter((x) => x.it.status !== "closed" && !x.it.silent).map((x) => ({ ...x, nba: nbaFor(x.r, x.it, me!.role) })).filter((x) => x.nba)
    .sort((p, q) => rank[effTier(p.it)] - rank[effTier(q.it)] || p.it.createdAt - q.it.createdAt).slice(0, 4);
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Next best actions</div>
      {items.length === 0 && <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-[13px] font-medium text-emerald-800"><Icon n="check" s={16} /> You are all caught up.</div>}
      {items.map(({ r, it, nba }) => (
        <div key={it.id} className="flex items-center gap-3 border-t border-line py-3 first:border-0">
          <button onClick={() => openLead(it.id)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13.5px] font-semibold">{nba!.title}</div>
            <div className="truncate text-xs text-muted">{it.title} · {r.placeName}</div>
          </button>
          {nba!.options ? <Btn sm v="ghost" onClick={() => openLead(it.id)}>Open</Btn> : <Btn sm onClick={() => mutate((st) => nba!.run(st, me!.id))}>{nba!.cta}</Btn>}
        </div>
      ))}
    </Card>
  );
}

/* ------------------------------------------------------------ per-role overviews */
export function SalesOverview({ all, openLead }: { all: Row[]; openLead: (id: string) => void }) {
  const live = all.filter((x) => !x.it.silent);
  const hotNew = live.filter((x) => x.it.status === "new" && effTier(x.it) === "Hot");
  const prog = live.filter((x) => x.it.status === "accepted");
  const won = live.filter((x) => x.it.outcome === "Won");
  const avg = avgAccept(live.map((x) => x.it));
  return (
    <Overview
      stats={<>
        <Stat label="Hot leads waiting" value={hotNew.length} sub={hotNew.length ? "Accept within one working day" : "All caught up"} tone={hotNew.length ? "red" : "green"} icon="bolt" />
        <Stat label="In progress" value={prog.length} sub={`${live.filter((x) => x.it.quoted).length} with a quote out`} icon="list" />
        <Stat label="Won" value={won.length} sub={won.length ? "Great work" : "None yet"} tone="green" icon="trophy" />
        <Stat label="Avg. time to accept" value={avg === null ? "-" : `${avg} h`} sub="Target: under 24 h for Hot" icon="clock" />
      </>}
      chart={{ title: "My pipeline", rows: [["New", live.filter((x) => x.it.status === "new").length, "red"], ["In progress", prog.length, "blue"], ["Quote out", live.filter((x) => x.it.quoted && x.it.status !== "closed").length, "amber"], ["Won", won.length, "green"]] }}
      actions={[]}
      side={<NbaList rows={all} openLead={openLead} />}
    />
  );
}

export function ManagerOverview() {
  const { s, me, mutate } = useApp();
  const ex = exceptions(s);
  const leads = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "lead" && !i.silent && i.team !== "AM"));
  const hotWait = leads.filter((i) => i.status === "new" && effTier(i) === "Hot");
  const merges = ex.filter((x) => x.it.flags.includes("mergePending"));
  const buckets: [string, string][] = [["Unrouted", "No owner"], ["No action", "No action"], ["Declined", "Declined"], ["Duplicates", "duplicate"], ["Merges", "Merge"], ["Stuck records", "Records task"]];
  return (
    <Overview
      stats={<>
        <Stat label="Open exceptions" value={ex.length} sub={ex.length ? "Needs a decision" : "Nothing stuck"} tone={ex.length ? "red" : "green"} icon="flag" />
        <Stat label="Unrouted" value={ex.filter((x) => x.why.includes("No owner") || x.why.includes("paused")).length} sub="No owner for area and team" tone="amber" icon="users" />
        <Stat label="Hot waiting" value={hotWait.length} sub="Across the team" tone={hotWait.length ? "red" : undefined} icon="bolt" />
        <Stat label="Avg. time to accept" value={avgAccept(leads) === null ? "-" : `${avgAccept(leads)} h`} sub="All owners" icon="clock" />
      </>}
      chart={{ title: "Exceptions by type", rows: buckets.map(([l, m]) => [l, ex.filter((x) => x.why.toLowerCase().includes(m.toLowerCase())).length, "amber"] as [string, number, Tone]) }}
      actions={[
        { label: `Nudge owners of waiting Hot leads (${hotWait.filter((i) => i.ownerId).length})`, icon: "bell", tone: "primary", disabled: !hotWait.some((i) => i.ownerId), run: () => mutate((st) => hotWait.filter((i) => i.ownerId).forEach((i) => A.nudge(st, i.id, me!.id))) },
        { label: `Approve all merges (${merges.length})`, icon: "check", disabled: !merges.length, run: () => mutate((st) => merges.forEach((x) => A.approveMerge(st, x.it.id, me!.id))) },
      ]}
    />
  );
}

export function RecordsOverview({ rows, openOldest }: { rows: Row[]; openOldest: () => void }) {
  const { now } = useApp();
  const open = rows.filter((x) => x.it.status !== "closed");
  const done = rows.length - open.length;
  const oldest = open[0] ? Math.floor((now - open[0].it.createdAt) / H) : 0;
  return (
    <Overview
      stats={<>
        <Stat label="Open tasks" value={open.length} sub="Oldest first" tone={open.length ? "red" : "green"} icon="layers" />
        <Stat label="Done" value={done} sub="Resolved so far" tone="green" icon="check" />
        <Stat label="Oldest waiting" value={open.length ? `${oldest} h` : "-"} sub="Target: under 48 h" tone={oldest > 48 ? "red" : undefined} icon="clock" />
        <Stat label="New places" value={open.filter((x) => x.it.flags.includes("newPlace")).length} sub="Building not in our records" tone="amber" icon="pin" />
      </>}
      chart={{ title: "Tasks by status", rows: [["New", open.filter((x) => x.it.status === "new").length, "red"], ["In progress", open.filter((x) => x.it.status === "accepted").length, "blue"], ["Done", done, "green"]] }}
      actions={[{ label: "Open the oldest task", icon: "chev", tone: "primary", run: openOldest, disabled: !open.length }]}
    />
  );
}

export function EmergencyOverview({ rows, openNewest }: { rows: Row[]; openNewest: () => void }) {
  const { s, me, mutate } = useApp();
  const open = rows.filter((x) => x.it.status !== "closed");
  const fresh = open.filter((x) => x.it.status === "new");
  const late = fresh.filter((x) => nowOf(s) - x.it.createdAt > 10 * 60000);
  return (
    <Overview
      stats={<>
        <Stat label="Open alerts" value={open.length} tone={open.length ? "red" : "green"} sub="Unsafe-lift alerts" icon="warn" />
        <Stat label="Not acknowledged" value={fresh.length} tone={fresh.length ? "red" : "green"} sub="Target: 10 minutes" icon="bell" />
        <Stat label="Overdue" value={late.length} tone={late.length ? "red" : undefined} sub="Over 10 minutes" icon="clock" />
        <Stat label="Closed" value={rows.length - open.length} tone="green" sub="Handled" icon="check" />
      </>}
      chart={{ title: "Alerts by state", rows: [["Not acknowledged", fresh.length, "red"], ["Acknowledged", open.length - fresh.length, "amber"], ["Closed", rows.length - open.length, "green"]] }}
      actions={[
        { label: `Acknowledge all new (${fresh.length})`, icon: "check", tone: "primary", disabled: !fresh.length, run: () => mutate((st) => fresh.forEach((x) => A.ack(st, x.it.id, me!.id))) },
        { label: "Open the newest alert", icon: "chev", run: openNewest, disabled: !open.length },
      ]}
    />
  );
}

export function ServiceOverview({ rows, openNext }: { rows: Row[]; openNext: () => void }) {
  const { me, mutate } = useApp();
  const open = rows.filter((x) => x.it.status !== "closed");
  const fresh = open.filter((x) => x.it.status === "new" && x.it.kind !== "emergency");
  return (
    <Overview
      stats={<>
        <Stat label="Open tickets" value={open.length} tone={open.length ? "red" : "green"} icon="gear" sub="Lifts we maintain" />
        <Stat label="New" value={fresh.length} sub="Not yet ticketed" tone={fresh.length ? "amber" : undefined} icon="bell" />
        <Stat label="Urgent" value={open.filter((x) => x.it.flags.includes("Urgent")).length} tone="red" sub="Dispatch same day" icon="bolt" />
        <Stat label="Closed" value={rows.length - open.length} tone="green" sub="Resolved" icon="check" />
      </>}
      chart={{ title: "Tickets by state", rows: [["New", fresh.length, "red"], ["With an engineer", open.filter((x) => x.it.engineer).length, "blue"], ["Closed", rows.length - open.length, "green"]] }}
      actions={[
        { label: `Create tickets for all new (${fresh.length})`, icon: "check", tone: "primary", disabled: !fresh.length, run: () => mutate((st) => fresh.forEach((x) => A.svcAccept(st, x.it.id, me!.id))) },
        { label: "Open the next ticket", icon: "chev", run: openNext, disabled: !open.length },
      ]}
    />
  );
}

export function AccountOverview() {
  const { s, me, mutate } = useApp();
  const mine = itemsFor(s, me!).filter((x) => x.it.team === "AM");
  const fresh = mine.filter((x) => x.it.status === "new");
  const sites = new Set(s.reports.filter((r) => r.status === "sent" && r.items.some((i) => i.team === "AM")).map((r) => r.placeId)).size;
  return (
    <Overview
      stats={<>
        <Stat label="New sightings" value={fresh.length} tone={fresh.length ? "red" : "green"} sub="At key-customer sites" icon="flag" />
        <Stat label="Sites with activity" value={sites} sub="Key customers" icon="pin" />
        <Stat label="Coordinating" value={mine.filter((x) => x.it.status === "accepted").length} sub="With the local rep" icon="users" />
        <Stat label="In account plan" value={mine.filter((x) => x.it.status === "closed").length} tone="green" sub="Closed" icon="check" />
      </>}
      chart={{ title: "Sightings", rows: [["New", fresh.length, "red"], ["Coordinating", mine.filter((x) => x.it.status === "accepted").length, "blue"], ["In account plan", mine.filter((x) => x.it.status === "closed").length, "green"]] }}
      actions={[{ label: `Coordinate all new (${fresh.length})`, icon: "check", tone: "primary", disabled: !fresh.length, run: () => mutate((st) => fresh.forEach((x) => A.coordinate(st, x.it.id, me!.id))) }]}
    />
  );
}

export function AdminOverview() {
  const { s, me, mutate, reset } = useApp();
  const ex = exceptions(s).length;
  const toggle = () => mutate((st) => { st.cfg.paused = !st.cfg.paused; st.audit.unshift({ t: nowOf(st), by: me!.name, text: `Routing ${st.cfg.paused ? "paused" : "resumed"}` }); });
  return (
    <Overview
      stats={<>
        <Stat label="Routing" value={s.cfg.paused ? "Paused" : "Live"} tone={s.cfg.paused ? "red" : "green"} sub="New leads go to owners" icon="bolt" />
        <Stat label="Leads created" value={s.reports.length} sub={`${s.reports.filter((r) => r.status === "queued").length} waiting to send`} icon="list" />
        <Stat label="Exceptions" value={ex} tone={ex ? "amber" : "green"} sub="On the manager list" icon="flag" />
        <Stat label="Audit entries" value={s.audit.length} sub="Kept 24 months" icon="doc" />
      </>}
      chart={{ title: "Leads by state", rows: [["Queued (offline)", s.reports.filter((r) => r.status === "queued").length, "amber"], ["In progress", s.reports.filter((r) => r.status === "sent" && r.items.some((i) => !i.silent && i.status !== "closed")).length, "blue"], ["Done", s.reports.filter((r) => r.status === "sent" && r.items.filter((i) => !i.silent).every((i) => i.status === "closed")).length, "green"]] }}
      actions={[
        { label: s.cfg.paused ? "Resume routing" : "Pause routing now", icon: "bolt", tone: "primary", run: toggle },
        { label: "Reset demo data", icon: "swap", run: () => { if (confirm("Reset all demo data?")) reset(); }, hint: "Restores the seeded leads" },
      ]}
    />
  );
}
