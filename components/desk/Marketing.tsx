"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AREAS } from "@/lib/data";
import { DEFAULT_AUDIENCE, MK, describe, draftMessage, targetsOf } from "@/lib/marketing";
import { AREA_NAME, KIND_LABEL, NAMES } from "@/lib/sherpa";
import type { Audience, BuildingType, Campaign, Opp } from "@/lib/types";
import { Btn, Card, Empty, Icon, Pill, ago } from "../ui";
import { Drawer, Stat2, StatRow, T } from "../shared";
import { Label } from "./Action";
import { Page } from "./Common";
import { Check, Input, Textarea } from "@/components/form";
import { Why } from "../Why";
import { marketingScore } from "@/lib/scores";

const GOALS: Opp["kind"][] = ["modernisation", "existing", "renewal", "newbuild"];
const TYPES: [BuildingType, string][] = [["office", "Offices"], ["mall", "Malls"], ["hospital", "Hospitals"], ["residential", "Residential"], ["gov", "Government"], ["industrial", "Industrial"]];
const QUALIFY = 60;
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-medium ${on ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:bg-surface"}`;

export function Marketing({ openOpp }: { openOpp: (id: string) => void }) {
  const { s, now } = useApp();
  const [tab, setTab] = useState<"leads" | "campaigns">("leads"); const [building, setBuilding] = useState(false);
  const live = s.sherpa.campaigns.filter((c) => c.status === "live");
  const fresh = s.sherpa.mleads.filter((l) => l.status === "new");
  const sent = s.sherpa.mleads.filter((l) => l.oppId);
  const won = sent.filter((l) => s.sherpa.opps.find((o) => o.id === l.oppId)?.stage === "won").length;
  return (
    <Page title="Marketing" sub="Pick an audience from the installed base and Snap & Lead sightings, send a campaign, and pass the warm replies to the Sales Manager.">
      <StatRow>
        <Stat2 icon="send" label="Live campaigns" value={live.length} tone={T.blue} active={tab === "campaigns"} onClick={() => setTab("campaigns")} />
        <Stat2 icon="list" label="Leads to qualify" value={fresh.length} tone={T.orange} active={tab === "leads"} onClick={() => setTab("leads")} />
        <Stat2 icon="clock" label="Waiting over 48 h" value={fresh.filter((l) => now - l.createdAt > 48 * 3600000).length} tone={T.red} />
        <Stat2 icon="flag" label="Sent to sales" value={sent.length} tone={T.purple} />
        <Stat2 icon="trophy" label="Won from marketing" value={won} tone={T.green} />
      </StatRow>
      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">{([["leads", "Leads"], ["campaigns", "Campaigns"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={chip(tab === k)}>{l}</button>)}</div>
        <Btn sm onClick={() => setBuilding(true)}><Icon n="plus" s={14} /> New campaign</Btn>
      </div>
      {tab === "leads" && <Leads openOpp={openOpp} />}
      {tab === "campaigns" && <div className="space-y-3">{s.sherpa.campaigns.length === 0 && <Empty text="No campaigns yet." />}{[...s.sherpa.campaigns].sort((a, b) => (b.launchedAt ?? b.createdAt) - (a.launchedAt ?? a.createdAt)).map((c) => <CampaignCard key={c.id} c={c} />)}</div>}
      {building && <Drawer wide label="Marketing" title="New campaign" onClose={() => setBuilding(false)}><div className="p-4 @2xl:p-6"><Builder done={() => { setBuilding(false); setTab("campaigns"); }} /></div></Drawer>}
    </Page>
  );
}

function Leads({ openOpp }: { openOpp: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const rows = [...s.sherpa.mleads].sort((a, b) => b.createdAt - a.createdAt);
  if (!rows.length) return <Empty text="No leads yet. Send a campaign and simulate the replies." />;
  return (
    <div className="space-y-2.5">{rows.map((l) => {
      const h = Math.round((now - l.createdAt) / 3600000); const o = s.sherpa.opps.find((x) => x.id === l.oppId);
      const why = [...(l.scoreWhy ?? [])].sort((a, b) => b.pts - a.pts).slice(0, 3);
      return (
        <Card key={l.id} className="flex flex-col gap-3 p-4 @2xl:flex-row @2xl:items-center">
          <div className="flex shrink-0 items-center gap-2 @2xl:w-24 @2xl:flex-col @2xl:items-start">
            <Why title="Marketing lead score" e={marketingScore(l.scoreWhy, l.score)}><span className="num text-[22px] font-semibold leading-none">{l.score}<span className="text-[12px] font-normal text-muted"> / 100</span></span></Why>
            {l.score >= QUALIFY && l.status === "new" && <Pill tone="green">Ready for sales</Pill>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{l.id}</span>
              {l.status === "new" ? <Pill tone={h > 48 ? "red" : "amber"}>Waiting {h < 1 ? "under an hour" : `${h} h`}</Pill> : l.status === "review" ? <Pill tone="blue">With {NAMES.marc.split(" ")[0]}</Pill> : <Pill>{l.status === "nurture" ? "Nurture" : l.status}</Pill>}
              {o && o.stage !== "review" && <Pill tone={o.stage === "won" ? "green" : "gray"}>{o.stage === "won" ? "Won" : `Deal: ${o.stage}`}</Pill>}</div>
            <div className="mt-1 truncate text-[15px] font-semibold">{l.name}</div>
            <div className="truncate text-[12.5px] text-muted">{l.interest} · {l.source} · {AREA_NAME[l.area] ?? l.area}{l.contact ? ` · ${l.contact.name}` : ""}</div>
            {why.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{why.map((r) => <li key={r.label} className="rounded-md bg-surface px-2 py-1 text-[12px]"><span className="num font-semibold">+{r.pts}</span> {r.label}</li>)}</ul>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {l.status === "new" || l.status === "nurture" ? <>
              <Btn sm v={l.score >= QUALIFY ? "primary" : "ghost"} onClick={() => mutate((st) => MK.toReview(st, l.id, me!.id))}>Send to the Sales Manager</Btn>
              {l.status === "new" && <Btn sm v="ghost" onClick={() => mutate((st) => MK.nurture(st, l.id, me!.id))}>Nurture</Btn>}
            </> : o ? <Btn sm v="ghost" onClick={() => openOpp(o.id)}>Open the deal</Btn> : null}
          </div>
        </Card>
      );
    })}</div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const { now, mutate, me } = useApp();
  const f = c.funnel;
  const steps: [string, number][] = f ? [["Sent", f.sent], ["Opened", f.opened], ["Clicked", f.clicked], ["Replied", f.replied]] : [];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{c.id}</span><Pill tone={c.status === "live" ? "green" : c.status === "draft" ? "amber" : "gray"}>{c.status === "live" ? "Live" : c.status === "draft" ? "Draft" : "Ended"}</Pill>{c.goal && <Pill tone="blue">{KIND_LABEL[c.goal]}</Pill>}</div>
      <div className="mt-1 text-[15px] font-semibold">{c.name}</div>
      <div className="text-[12.5px] text-muted">{c.segment} · {c.size} contacts · {c.leads} lead{c.leads === 1 ? "" : "s"} · by {NAMES[c.createdBy] ?? c.createdBy} {ago(now - (c.launchedAt ?? c.createdAt))}</div>
      {c.message && <div className="mt-2 rounded-xl bg-surface p-3 text-[12.5px]"><b>{c.message.subject}</b></div>}
      {f && <div className="mt-3 grid grid-cols-4 gap-2">{steps.map(([k, n]) => <div key={k}><div className="text-[11px] text-muted">{k}</div><div className="num text-[17px] font-semibold">{n}</div><span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-line"><span className="block h-full rounded-sm bg-brand" style={{ width: `${f.sent ? Math.round((n / f.sent) * 100) : 0}%` }} /></span></div>)}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {c.status === "draft" && <Btn sm disabled={!c.size} onClick={() => mutate((st) => MK.launch(st, c.id, me!.id))}><Icon n="send" s={14} /> Send to {c.size} contacts</Btn>}
        {c.status === "live" && c.audience && <Btn sm v="ghost" onClick={() => mutate((st) => MK.simulate(st, c.id))}>Simulate a day of replies (demo)</Btn>}
        {c.status === "live" && <Btn sm v="ghost" onClick={() => mutate((st) => MK.end(st, c.id))}>End the campaign</Btn>}
      </div>
    </Card>
  );
}

function Builder({ done }: { done: () => void }) {
  const { s, me, mutate } = useApp();
  const [a, setA] = useState<Audience>(DEFAULT_AUDIENCE);
  const [goal, setGoal] = useState<Opp["kind"]>("modernisation");
  const [msg, setMsg] = useState<{ name: string; subject: string; body: string } | null>(null);
  const targets = targetsOf(s, a);
  const set = <K extends keyof Audience>(k: K, v: Audience[K]) => { setA((x) => ({ ...x, [k]: v })); setMsg(null); };
  const toggle = <V,>(list: V[], v: V) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <Card className="p-5">
          <Label>1. Audience</Label>
          <div className="space-y-4 text-[13px]">
            <div><div className="mb-1.5 font-semibold">Areas</div><div className="flex flex-wrap gap-1.5">{AREAS.filter((x) => x.id !== "OUT").map((x) => <button key={x.id} onClick={() => set("areas", toggle(a.areas, x.id))} className={chip(a.areas.includes(x.id))}>{x.name}</button>)}</div></div>
            <div><div className="mb-1.5 font-semibold">Lift age</div><div className="flex flex-wrap gap-1.5">{[0, 10, 15, 20, 25].map((n) => <button key={n} onClick={() => set("minAge", n)} className={chip(a.minAge === n)}>{n ? `${n}+ years` : "Any age"}</button>)}</div></div>
            <div><div className="mb-1.5 font-semibold">Brand</div><div className="flex flex-wrap gap-1.5">{([["any", "Any"], ["ours", "Schindler"], ["other", "Other brands"]] as const).map(([k, l]) => <button key={k} onClick={() => set("brand", k)} className={chip(a.brand === k)}>{l}</button>)}</div></div>
            <div><div className="mb-1.5 font-semibold">Building type</div><div className="flex flex-wrap gap-1.5">{TYPES.map(([k, l]) => <button key={k} onClick={() => set("buildingTypes", toggle(a.buildingTypes, k))} className={chip(a.buildingTypes.includes(k))}>{l}</button>)}</div><p className="mt-1 text-xs text-muted">None picked means all types.</p></div>
            <Check checked={a.contractEnding} onChange={(v) => set("contractEnding", v)}>Contract ends in the next 6 months</Check>
            <Check checked={a.snapped} onChange={(v) => set("snapped", v)}>Include buildings spotted in Snap & Lead</Check>
          </div>
        </Card>
        <Card className="p-5">
          <Label>2. Goal and message</Label>
          <div className="flex flex-wrap gap-1.5">{GOALS.map((g) => <button key={g} onClick={() => { setGoal(g); setMsg(null); }} className={chip(goal === g)}>{KIND_LABEL[g]}</button>)}</div>
          {!msg ? <div className="mt-4"><Btn v="ghost" disabled={!targets.length} onClick={() => setMsg(draftMessage(a, goal))}><Icon n="sparkle" s={14} /> Draft the message with SHERPA</Btn></div> : (
            <div className="mt-4 space-y-2">
              <Input value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} aria-label="Campaign name" className="font-semibold" />
              <Input value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} aria-label="Subject" />
              <Textarea value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} aria-label="Message" className="min-h-48 leading-relaxed" />
              <div className="flex flex-wrap gap-2"><Btn onClick={() => { mutate((st) => { MK.create(st, me!.id, { ...msg, audience: a, goal }); }); done(); }}>Save the campaign</Btn><Btn v="ghost" onClick={() => setMsg(draftMessage(a, goal))}>Start over</Btn></div>
              <p className="text-xs text-muted">Saved as a draft. You send it from the campaign list.</p>
            </div>
          )}
        </Card>
      </div>
      <Card className="p-5 @4xl:sticky @4xl:top-4">
        <Label>Who gets it</Label>
        <div className="num text-[28px] font-semibold leading-none">{targets.length}<span className="text-[13px] font-normal text-muted"> contacts</span></div>
        <p className="mt-1 text-xs text-muted">{describe(a)}</p>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-[13px]">{targets.length === 0 && <li className="text-muted">Nobody matches. Widen the audience.</li>}
          {targets.slice(0, 12).map((t) => <li key={t.key} className="rounded-lg bg-surface px-3 py-2"><b>{t.name}</b>{t.accountId ? <span className="ml-1.5 text-xs text-muted">customer</span> : <span className="ml-1.5 text-xs text-brand">spotted</span>}<span className="block text-xs text-muted">{AREA_NAME[t.area] ?? t.area} · {t.why}</span></li>)}</ul>
        {targets.length > 12 && <p className="mt-2 text-xs text-muted">And {targets.length - 12} more.</p>}
      </Card>
    </div>
  );
}
