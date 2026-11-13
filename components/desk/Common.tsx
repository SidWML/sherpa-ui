"use client";
import { Choice } from "@/components/form";
import type { ReactNode } from "react";
import { clockHours, effTier, useApp, userOf } from "@/lib/store";
import { OPENING, facts } from "@/lib/engine";
import { TEAM_NAME, TRACKS } from "@/lib/data";
import type { Item, Report, Role } from "@/lib/types";
import { Btn, Card, Field, Icon, PhotoTile, Pill, Section, TierPill, Track, ago } from "../ui";
import { Stat } from "./Dash";
import { Back, Fold, Label, NbaCard } from "./Action";


export function Sel({ v, set, options, ph }: { v: string; set: (x: string) => void; options: string[] | { v: string; t: string }[]; ph?: string }) {
  return (
    <Choice value={v} onChange={set} size="sm" placeholder={ph} className="w-auto" options={(options as (string | { v: string; t: string })[]).map((o) => typeof o === "string" ? o : { value: o.v, label: o.t })} />
  );
}

/** Summary written for the owner's role (OW-1). Contract and price details appear here only, never for reporters. */
export function summaryFor(role: Role, r: Report, it: Item): [string, ReactNode][] {
  const i = r.input; const f = facts(i);
  const rows: [string, ReactNode][] = [];
  const cond = i.condition === "unsure" ? "Not sure" : i.condition === "out" ? "Out of service" : i.condition === "minor" ? "Minor issues" : i.condition === "unsafe" ? "Unsafe" : "Running fine";
  if (it.kind === "emergency") return [["Unit", i.number ? `${i.equip} ${i.number}` : "Unknown"], ["Ours", i.brand === "ours" ? "Yes" : i.brand === "other" ? "No" : "Unknown"], ["Trapped or hurt", i.hurt === "yes" ? "Yes" : i.hurt === "no" ? "No" : "Not sure"]];
  if (role === "sc") rows.push(["Contract end date", f.contractEnd], ["Last visit", f.lastVisit], ["Breakdown calls (90 days)", i.breakdowns], ["Serviced now by", f.servicing], ["Reporter saw", `${cond}${i.units > 1 ? `, ${i.units} lifts in building` : ""}`], ["Reporter note", r.extras.note ?? "None yet"]);
  else if (role === "ei") rows.push(["Brand and model", `${i.brand === "ours" ? "Schindler" : "OtherLift"} · ${f.model}`], ["Age", `~${i.age} years`], ["Condition", cond], ["Servicing firm", f.servicing], ["Our other lifts in the building", f.otherUnits], ["Service history", i.brand === "ours" ? `${f.lastVisit} · ${i.breakdowns} calls in 90 days` : "Not our lift"], ["Contact the reporter met", r.extras.contact ?? "None"]);
  else if (role === "mod") rows.push(["Age", `~${i.age} years`], ["Faults", cond], ["Breakdown history", `${i.breakdowns} calls in 90 days`], ["Brand", i.brand === "ours" ? "Schindler" : "OtherLift"], ["Parts risk", i.age >= 25 ? "High" : "Medium"], ["Other leads on this unit", r.items.filter((x) => x.id !== it.id && !x.silent && x.team).map((x) => `${x.team}`).join(", ") || "None"]);
  else if (role === "ni") rows.push(["Construction stage", i.stage ?? "Not given"], ["Developer or contractor", "Not visible"], ["Lift already ordered", i.ordered === undefined ? "Not sure" : i.ordered ? "Yes (kept as intel)" : "No"], ["Tender or permit match", "None found (arrives with the SHERPA project finder)"], ["Contact met", r.extras.contact ?? "None"]);
  else if (role === "svc") rows.push(["Fault", cond], ["Unit", i.number ?? "Number not read"], ["Contract", f.contractEnd], ["History", `${f.lastVisit} · ${i.breakdowns} calls in 90 days`], ["Urgency", it.flags.includes("Urgent") ? "Urgent: dispatch same day" : "Normal"], ["Age", `~${i.age} years`]);
  else if (role === "am") rows.push(["Customer", PLACE_CUSTOMER(r)], ["This site", r.placeName], ["Teams active here", r.items.filter((x) => x.team && x.team !== "AM" && !x.silent).map((x) => x.team).join(", ") || "None"], ["New sighting", it.summary]);
  else rows.push(["Summary", it.summary]);
  return rows;
}
const PLACE_CUSTOMER = (r: Report) => (r.placeId === "techpark" ? "Helvetia Tech AG" : "Key customer");

export function ReporterLine({ r, show }: { r: Report; show: boolean }) {
  const u = userOf(r.reporterId);
  return <Field k="Reporter" v={show ? `${u?.name ?? r.reporterId} · ${u?.title ?? ""}` : "Hidden"} />;
}

/** Full-page lead view. One recommended step first, then context, then history. */
export function ItemPanel({ r, it, role, onClose, showContact = true }: { r: Report; it: Item; role: Role; onClose?: () => void; showContact?: boolean }) {
  const { now } = useApp();
  const t = effTier(it);
  const rep = userOf(r.reporterId);
  const others = r.items.filter((x) => x.id !== it.id && x.team && x.team !== "AM" && !x.silent && x.kind !== "info" && x.kind !== "note");
  const hidden = ["needsInfo", "mergePending", "newPlace", "lowCertainty", "possibleDuplicate", "dataFix", "review"];
  return (
    <div className="p-4 @2xl:p-8">
      {onClose && <Back onClick={onClose} label="Back to the list" />}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{it.caseId}</span>{it.kind === "emergency" ? <Pill tone="red">Emergency</Pill> : <TierPill tier={t} />}<StatusPill it={it} />{it.override && <Pill tone="amber">Tier overridden</Pill>}{it.silent && <Pill tone="blue">Heads-up</Pill>}{it.flags.filter((f) => !hidden.includes(f)).map((f) => <Pill key={f} tone="amber">{f}</Pill>)}</div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">{it.title}</h1>
        <p className="mt-1 text-sm text-muted">{r.placeName} · {r.id} · reported by {rep?.name ?? "unknown"} · {ago(now - it.createdAt)}</p>
      </header>

      <div className="mb-5"><NbaCard r={r} it={it} role={role} /></div>

      <Card className="mb-5 p-5"><Label>Progress</Label><Track item={it} label={false} /></Card>

      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <Label>About this lead</Label>
            <p className="mb-3 text-[15px] leading-relaxed">{it.summary}</p>
            <div className="rounded-xl border border-line px-4">{summaryFor(role, r, it).map(([k, v]) => <Field key={k} k={k} v={v} />)}<Field k="Reporter" v={`${rep?.name} · ${rep?.title}`} />{showContact && r.extras.contact && <Field k="Contact" v={r.extras.contact} />}</div>
            {role !== "ed" && it.kind !== "emergency" && OPENING[it.team ?? ""] && <div className="mt-3 rounded-xl bg-brand-soft p-3 text-[13px]"><b className="text-brand">Suggested opening</b><div className="mt-0.5 text-ink/90">{OPENING[it.team ?? ""]}</div></div>}
            {others.length > 0 && <div className="mt-3 rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900">Another team also has a lead from this photo: <b>{others.map((x) => TEAM_NAME[x.team!]).join(", ")}</b>.</div>}
          </Card>
          <Card className="px-5 py-2">
            {it.reasons.length > 0 && it.kind !== "emergency" && (
              <Fold title="Why this lead" count={`score ${it.score}`}>
                <div className="rounded-xl border border-line px-3 py-1">{it.reasons.map((x, k) => <div key={k} className="flex justify-between py-1 text-[13px]"><span>{x.label}</span><b className={x.pts < 0 ? "text-red-600" : x.pts > 0 ? "text-emerald-700" : "text-muted"}>{x.pts > 0 ? "+" : ""}{x.pts}</b></div>)}<div className="flex justify-between border-t border-line py-1 text-[13px] font-bold"><span>Score → {it.tier}{it.override ? ` (overridden to ${it.override.to})` : ""}</span><span>{it.score}</span></div></div>
                {it.override && <p className="mt-1 text-xs text-amber-800">Override by {it.override.by}: {it.override.reason}</p>}
                <p className="mt-1 text-[11px] text-muted">Fixed rules decide this, not AI. The score is a priority, not a win probability.</p>
              </Fold>
            )}
            <Fold title="Photos" count={String(r.photos.length)}><div className="grid grid-cols-4 gap-2">{r.photos.map((p) => <PhotoTile key={p.id} p={p} />)}</div></Fold>
          </Card>
        </div>
        <Card className="p-5 @4xl:sticky @4xl:top-4">
          <Label>Activity</Label>
          <ol className="space-y-3 text-[13px]">{[...it.log].reverse().map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by} · {ago(now - l.t)}</span></span></li>)}</ol>
        </Card>
      </div>
    </div>
  );
}

export function ClockBadge({ it }: { it: Item }) {
  const { s } = useApp();
  const t = effTier(it);
  if (it.kind !== "lead" || it.silent || it.team === "AM" || (t !== "Hot" && t !== "Warm")) return null;
  if (it.status !== "new") return null;
  const th = s.cfg.followUp[t === "Hot" ? "hot" : "warm"]; const h = clockHours(it, s);
  const lvl = it.clockLevel;
  return <Pill tone={lvl >= 2 ? "red" : lvl === 1 ? "amber" : "gray"}><Icon n="clock" s={11} /> {h}h / {th[0]}h</Pill>;
}

export function StatusPill({ it }: { it: Item }) {
  const m = { new: ["New", "red"], accepted: ["In progress", "blue"], declined: ["Declined", "amber"], snoozed: ["Snoozed", "gray"], closed: ["Closed", "green"], waiting: ["Waiting", "gray"] } as const;
  const [t, tone] = m[it.status];
  return <Pill tone={tone}>{t}</Pill>;
}

export function Kpi({ k, v, sub, tone }: { k: string; v: ReactNode; sub?: string; tone?: "red" | "green" }) {
  return <Stat label={k} value={v} sub={sub} tone={tone} />;
}

export function Page({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="p-4 @2xl:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}</div>{right}</div>
      {children}
    </div>
  );
}

export { TRACKS };
