"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AGENTS, AREA_NAME, CATALOG, DAY, HOUR, NAMES, SH, accountOf, daysTo, inr, type NbaCard } from "@/lib/sherpa";
import { Btn, Card, Empty, Icon, Pill } from "../ui";
import { Page } from "./Common";
import { Stat, StatGrid } from "./Dash";
import { OfferPill } from "./Offers";

export type Ask = (prompt: string, ctx?: Partial<NbaCard>) => void;

const healthTone = (h: number) => (h < 45 ? "red" : h < 70 ? "amber" : "green") as "red" | "amber" | "green";
const Tabs = ({ items, value, set }: { items: [string, string][]; value: string; set: (v: string) => void }) => (
  <div className="mb-4 flex gap-1.5">{items.map(([k, l]) => <button key={k} onClick={() => set(k)} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${value === k ? "bg-ink text-white" : "bg-white text-ink/80 ring-1 ring-line hover:bg-surface"}`}>{l}</button>)}</div>
);

/* ------------------------------------------------------------------ portfolio: my units */
export function Portfolio({ onAsk }: { onAsk: Ask }) {
  const { s, me, now } = useApp();
  const all = ["mgr", "lead", "am"].includes(me!.role);
  const units = s.sherpa.assets.filter((a) => all || a.owner === me!.id || a.sc === me!.id || a.mod === me!.id).sort((a, b) => a.health - b.health);
  return (
    <Page title="Portfolio" sub={all ? "All units in your area, weakest first." : "The units you look after, weakest first. Ask SHERPA for a brief or an offer on any of them."}>
      <StatGrid>
        <Stat label="Units" value={units.length} icon="layers" />
        <Stat label="At risk" value={units.filter((a) => a.health < 45).length} tone="red" icon="warn" sub="Health below 45" />
        <Stat label="Contracts ending" value={units.filter((a) => a.contractEnd && a.contractEnd - now < 90 * DAY).length} tone="amber" icon="clock" sub="Within 90 days" />
        <Stat label="Annual contract value" value={inr(units.reduce((t, a) => t + (a.contractValue ?? 0), 0))} icon="chart" />
      </StatGrid>
      <div className="space-y-2.5">
        {units.length === 0 && <Empty text="No units assigned to you." />}
        {units.map((a) => {
          const acc = accountOf(s, a.accountId);
          return (
            <Card key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <div className="min-w-0 flex-1 basis-[16rem]"><div className="flex flex-wrap items-center gap-1.5"><Pill tone={healthTone(a.health)}>Health {a.health}</Pill>{acc?.key && <Pill tone="amber">Key account</Pill>}{a.handedOver && <Pill tone="blue">New unit</Pill>}</div>
                <div className="mt-1.5 text-[15px] font-semibold">{acc?.name}</div><div className="text-[12.5px] text-muted">{a.label} · {a.ageYears ? `${a.ageYears} yrs` : "new"} · {a.contractEnd ? `contract ends in ${daysTo(s, a.contractEnd)} days` : "no contract"} · {a.callbacks90d} callbacks in 90 days</div></div>
              <div className="flex gap-2"><Btn sm v="ghost" onClick={() => onAsk(`Brief me on lift ${a.id.slice(1)}`, { assetId: a.id, accountId: a.accountId })}>Brief me</Btn><Btn sm onClick={() => onAsk(a.contractEnd ? `Draft the renewal for lift ${a.id.slice(1)}` : `Draft a maintenance offer for lift ${a.id.slice(1)}`, { assetId: a.id, accountId: a.accountId })}>{a.contractEnd ? "Draft renewal" : "Offer maintenance"}</Btn></div>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">Contract, callbacks and health come from mock NewCRM and SAP data. Health is a fixed rule.</p>
    </Page>
  );
}

/* ------------------------------------------------------------------ tenders */
const STAGES = ["matched", "qualifying", "bidding", "final", "submitted"] as const;
export function Tenders({ onAsk }: { onAsk: Ask }) {
  const { s, me, mutate } = useApp();
  const all = ["mgr", "lead"].includes(me!.role);
  const list = s.sherpa.tenders.filter((t) => all || t.owner === me!.id);
  return (
    <Page title="Tenders and projects" sub="Projects matched to your territory, with their end of order date and bid checklist.">
      <div className="space-y-2.5">
        {list.length === 0 && <Empty text="No tenders assigned to you." />}
        {list.map((t) => {
          const left = daysTo(s, t.eord);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{t.id}</span><Pill tone={t.stage === "matched" ? "blue" : t.stage === "final" ? "green" : "gray"}>{t.stage === "final" ? "Final bidding" : t.stage}</Pill>{t.competitorSpec && <Pill tone="amber">Competitor spec</Pill>}{t.lossNote && <Pill tone="red">Lost here before</Pill>}</div>
                  <div className="mt-1.5 text-[15px] font-semibold">{t.name}</div><div className="text-[12.5px] text-muted">{accountOf(s, t.accountId)?.name} · {AREA_NAME[t.area]} · {inr(t.value)} · order date in {left} days ({NAMES[t.owner]})</div></div>
                <select value={t.stage} onChange={(e) => mutate((st) => SH.apply(st, me!.id, { t: "tenderStage", id: t.id, stage: e.target.value as typeof t.stage }))} className="min-h-9 rounded-lg border border-line bg-white px-2 text-[13px]">{[...STAGES, "won", "lost"].map((x) => <option key={x} value={x}>{x === "final" ? "final bidding" : x}</option>)}</select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><Btn sm v="ghost" onClick={() => onAsk(`Summarize ${t.id}`, { tenderId: t.id, accountId: t.accountId })}>Summarize</Btn><Btn sm v="ghost" onClick={() => onAsk(`Open the bid checklist for ${t.id}`, { tenderId: t.id, accountId: t.accountId })}>Bid checklist</Btn>{t.competitorSpec && <Btn sm v="ghost" onClick={() => onAsk(`Prepare the counter-argument for ${t.id}`, { tenderId: t.id })}>Counter-argument</Btn>}{t.line === "ni" && <Btn sm onClick={() => onAsk(`Draft the offer for ${t.id}`, { tenderId: t.id, accountId: t.accountId })}>Draft the offer</Btn>}</div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ sales support queue */
export function Support({ onAsk, openOffer }: { onAsk: Ask; openOffer: (id: string) => void }) {
  const { s, now } = useApp();
  const missing = s.sherpa.offers.filter((o) => o.missing?.length);
  const blocked = s.sherpa.offers.filter((o) => o.status === "awaiting");
  return (
    <Page title="Support queue" sub="Quotes that cannot move: missing configuration data, and approvals that are holding a deal up.">
      <StatGrid><Stat label="Missing data" value={missing.length} tone={missing.length ? "red" : "green"} icon="doc" /><Stat label="Awaiting approval" value={blocked.length} tone={blocked.length ? "amber" : "green"} icon="clock" /><Stat label="Blocking over 48h" value={blocked.filter((o) => now - o.lastActivity > 48 * HOUR).length} tone="red" icon="warn" /><Stat label="Completed today" value={s.sherpa.crm.filter((c) => /completed|escalat/i.test(c.text)).length} tone="green" icon="check" /></StatGrid>
      <div className="mb-2 t-label">Quotes missing data</div>
      <div className="mb-6 space-y-2.5">{missing.length === 0 && <Empty text="No quotes are missing data." />}{missing.map((o) => <Card key={o.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><OfferPill o={o} /></div><div className="mt-1 text-[15px] font-semibold">{accountOf(s, o.accountId)?.name} · {o.title}</div><div className="text-[12.5px] text-muted">Missing: {o.missing!.join(", ")} · for {NAMES[o.createdBy]}</div></div><Btn sm onClick={() => onAsk(`Complete the configuration for ${o.id}`, { offerId: o.id })}>Complete with SHERPA</Btn></Card>)}</div>
      <div className="mb-2 t-label">Approvals in progress</div>
      <div className="space-y-2.5">{blocked.length === 0 && <Empty text="No approvals waiting." />}{blocked.map((o) => <Card key={o.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><OfferPill o={o} /><Pill tone="amber">{o.discountPct}% off</Pill></div><div className="mt-1 text-[15px] font-semibold">{accountOf(s, o.accountId)?.name} · {inr(o.price)}</div><div className="text-[12.5px] text-muted">Waiting {Math.round((now - o.lastActivity) / HOUR)} h for {o.approvals.filter((x) => x.status === "pending").map((x) => NAMES[x.by]).join(", ")}</div></div><div className="flex gap-2"><Btn sm v="ghost" onClick={() => openOffer(o.id)}>Open</Btn><Btn sm onClick={() => onAsk(`Escalate ${o.id} with context`, { offerId: o.id })}>Escalate</Btn></div></Card>)}</div>
    </Page>
  );
}

/* ------------------------------------------------------------------ marketing */
export function Campaigns({ onAsk }: { onAsk: Ask }) {
  const { s, me, mutate, now } = useApp();
  const [tab, setTab] = useState("leads");
  const owner = (area: string) => (area === "HYW" ? "ethan" : "elias");
  return (
    <Page title="Campaigns and leads" sub="Build audiences from the installed base, send campaigns, and make sure no lead goes cold." >
      <StatGrid><Stat label="Live campaigns" value={s.sherpa.campaigns.filter((c) => c.status === "live").length} icon="send" /><Stat label="Leads from campaigns" value={s.sherpa.mleads.length} icon="list" /><Stat label="Waiting over 48h" value={s.sherpa.mleads.filter((l) => l.status === "new" && now - l.createdAt > 48 * HOUR).length} tone="red" icon="clock" /><Stat label="Converted" value={s.sherpa.mleads.filter((l) => l.status === "converted").length} tone="green" icon="trophy" /></StatGrid>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><Tabs value={tab} set={setTab} items={[["leads", "Leads"], ["camp", "Campaigns"]]} /><Btn sm onClick={() => onAsk("Build an audience for Hyderabad Central ageing lifts")}><Icon n="plus" s={14} /> Build an audience</Btn></div>
      {tab === "leads" ? (
        <div className="space-y-2.5">{s.sherpa.mleads.map((l) => { const h = Math.round((now - l.createdAt) / HOUR); return (
          <Card key={l.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{l.id}</span><Pill tone={l.status === "new" ? (h > 48 ? "red" : "amber") : "green"}>{l.status === "new" ? `Waiting ${h} h` : l.status}</Pill><Pill>Score {l.score}</Pill></div><div className="mt-1 text-[15px] font-semibold">{l.name}</div><div className="text-[12.5px] text-muted">{l.interest} · {l.source} · {AREA_NAME[l.area]} · owner {l.owner ? NAMES[l.owner] : "none"}</div></div>
            {!l.owner && l.status === "new" && <Btn sm onClick={() => mutate((st) => SH.apply(st, me!.id, { t: "assign", mleadId: l.id, to: owner(l.area) }))}>Assign to {NAMES[owner(l.area)].split(" ")[0]}</Btn>}</Card>); })}</div>
      ) : (
        <div className="space-y-2.5">{s.sherpa.campaigns.map((c) => <Card key={c.id} className="p-4"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{c.id}</span><Pill tone={c.status === "live" ? "green" : "gray"}>{c.status}</Pill></div><div className="mt-1 text-[15px] font-semibold">{c.name}</div><div className="text-[12.5px] text-muted">{c.segment} · {c.size} contacts · {c.leads} leads · created by {NAMES[c.createdBy]}</div>{c.message && <div className="mt-2 rounded-xl bg-surface p-3 text-[12.5px]"><b>{c.message.subject}</b></div>}</Card>)}</div>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ manager: team */
export function TeamPipeline({ onAsk, openOffer }: { onAsk: Ask; openOffer: (id: string) => void }) {
  const { s, now } = useApp();
  const stalled = s.sherpa.offers.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY);
  const open = s.sherpa.offers.filter((o) => ["draft", "awaiting", "changes", "approved", "sent"].includes(o.status));
  const won = s.sherpa.offers.filter((o) => o.status === "won");
  const byArea = Object.keys(AREA_NAME).filter((a) => a !== "OUT").map((a) => ({ a, n: open.filter((o) => o.area === a).length, v: open.filter((o) => o.area === a).reduce((t, o) => t + o.price, 0) }));
  return (
    <Page title="Team pipeline" sub="Totals by area and deal. This page never ranks people.">
      <StatGrid><Stat label="Open pipeline" value={inr(open.reduce((t, o) => t + o.price, 0))} sub={`${open.length} offers`} icon="chart" /><Stat label="Stalled 21+ days" value={stalled.length} tone={stalled.length ? "red" : "green"} icon="warn" /><Stat label="Awaiting approval" value={open.filter((o) => o.status === "awaiting").length} tone="amber" icon="clock" /><Stat label="Won" value={won.length} tone="green" icon="trophy" /></StatGrid>
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <Card className="p-4"><div className="mb-3 t-label">Pipeline by area</div>{byArea.map((x) => <div key={x.a} className="flex items-center justify-between border-b border-line/70 py-2.5 text-[13.5px] last:border-0"><span>{AREA_NAME[x.a]}</span><span className="text-muted">{x.n} offers</span><b className="num">{inr(x.v)}</b></div>)}</Card>
        <Card className="p-4"><div className="mb-3 flex items-center justify-between"><div className="t-label">Stalled deals</div><Btn sm onClick={() => onAsk("Summarize pipeline risk for my team")}>Ask SHERPA</Btn></div>{stalled.length === 0 && <div className="text-sm text-muted">Nothing stalled.</div>}{stalled.map((o) => <button key={o.id} onClick={() => openOffer(o.id)} className="flex w-full items-center justify-between border-b border-line/70 py-2.5 text-left text-[13.5px] last:border-0"><span>{accountOf(s, o.accountId)?.name}</span><span className="text-muted">idle {Math.floor((now - o.lastActivity) / DAY)} d</span><b className="num">{inr(o.price)}</b></button>)}</Card>
      </div>
      <Card className="mt-4 p-4"><div className="mb-3 t-label">Open tasks created by SHERPA</div>{s.sherpa.tasks.filter((t) => !t.done).length === 0 && <div className="text-sm text-muted">No open tasks.</div>}{s.sherpa.tasks.filter((t) => !t.done).slice(0, 8).map((t) => <div key={t.id} className="flex items-center justify-between border-b border-line/70 py-2 text-[13.5px] last:border-0"><span>{t.title}</span><span className="text-xs text-muted">{t.forUser ? NAMES[t.forUser] : NAMES[t.by]} · due in {Math.max(0, daysTo(s, t.due))} d</span></div>)}</Card>
      <p className="mt-4 text-xs text-muted">Coaching prompts stay off until the works council has reviewed them. Admin can switch them on.</p>
    </Page>
  );
}

/* ------------------------------------------------------------------ admin */
export function Catalogue() {
  const { s, me, mutate } = useApp();
  const live = CATALOG.filter((c) => c.status === "live").length;
  return (
    <Page title="NBA catalogue" sub={`${live} of 27 Next Best Actions are working in this prototype. Number 20 stays off until the works council has reviewed it.`}>
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">Coaching prompts (NBA 20)</div><div className="text-xs text-muted">Team-level only. Needs works-council review before it is switched on.</div></div><Btn v={s.sherpa.flags.coaching ? "primary" : "ghost"} onClick={() => mutate((st) => { st.sherpa.flags.coaching = !st.sherpa.flags.coaching; st.audit.unshift({ t: Date.now() + st.clock, by: me!.name, text: `Coaching prompts ${st.sherpa.flags.coaching ? "switched on" : "switched off"}` }); })}>{s.sherpa.flags.coaching ? "On: switch off" : "Off: switch on"}</Btn></Card>
      <Card className="divide-y divide-line">
        {CATALOG.map((c) => {
          const status = c.no === 20 ? (s.sherpa.flags.coaching ? "live" : "off") : c.status;
          return <div key={c.no} className="flex items-start gap-3 p-3.5"><span className="num w-8 pt-0.5 text-sm font-semibold text-muted">{c.no}</span><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{c.title}</div><div className="text-xs text-muted">{c.persona} · Trigger: {c.trigger}</div><div className="text-xs text-muted">Agents: {c.agent}</div></div><Pill tone={status === "live" ? "green" : "amber"}>{status === "live" ? "Working" : "Off until review"}</Pill></div>;
        })}
      </Card>
    </Page>
  );
}
export function AgentRegistry() {
  const groups = Array.from(new Set(AGENTS.map((a) => a.group)));
  return (
    <Page title="Agent registry" sub="17 specialist agents behind one front door. 6 live in the deck, 2 on hold, 9 new. In this prototype every agent is simulated.">
      <div className="space-y-5">{groups.map((g) => <div key={g}><div className="mb-2 t-label">{g}</div><Card className="divide-y divide-line">{AGENTS.filter((a) => a.group === g).map((a) => <div key={a.name} className="flex items-center gap-3 p-3.5"><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{a.name}</div><div className="text-xs text-muted">{a.does} · serves {a.serves}</div></div><Pill tone={a.status === "live" ? "green" : a.status === "hold" ? "amber" : "red"}>{a.status === "live" ? "Live in the deck" : a.status === "hold" ? "On hold" : "New"}</Pill><Pill tone="blue">Simulated here</Pill></div>)}</Card></div>)}</div>
    </Page>
  );
}
export function CrmLog() {
  const { s } = useApp();
  return (
    <Page title="NewCRM write-backs" sub="Everything SHERPA wrote back to the mock NewCRM after a person pressed a button. Nothing is written without a click.">
      <Card className="divide-y divide-line">{s.sherpa.crm.length === 0 && <div className="p-6 text-center text-sm text-muted">Nothing written yet.</div>}{s.sherpa.crm.map((c, k) => <div key={k} className="flex gap-3 p-3 text-sm"><span className="w-36 shrink-0 text-xs text-muted">{new Date(c.t).toLocaleString("en-IN")}</span><span className="w-36 shrink-0 font-medium">{c.by}</span><span>{c.text}</span></div>)}</Card>
    </Page>
  );
}
