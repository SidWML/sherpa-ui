"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, KIND_LABEL, NAMES, oppOf, reviewBrief } from "@/lib/sherpa";
import type { Opp, Tier } from "@/lib/types";
import { Icon, Pill, TierPill, ago } from "../ui";
import { Drawer, Stat2, StatRow, T } from "../shared";
import { OppPage } from "./Opps";
import { Why } from "../Why";
import { leadScore } from "@/lib/scores";


export function LeadReview({ openOffer }: { openOffer: (id: string) => void }) {
  const { s, now } = useApp();
  const [tier, setTier] = useState<Tier | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? oppOf(s, openId) : undefined;
  const all = s.sherpa.opps.filter((o) => o.stage === "review").sort((a, b) => b.createdAt - a.createdAt);
  const rows = all.filter((o) => tier === "all" || o.tier === tier);
  const count = (t: Tier) => all.filter((o) => o.tier === t).length;
  const oldest = all.reduce((m, o) => Math.min(m, o.createdAt), now);
  const done = s.sherpa.opps.filter((o) => ["snap", "campaign", "account"].includes(o.source.type) && o.stage !== "review" && now - o.createdAt < 7 * 86400000).length;
  return (
    <div className="@container w-full p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Lead review</h1>
      <p className="t-small mt-0.5">New leads from Snap & Lead, marketing and account plans, scored by the rules and our history. Qualify each one: pick the owner and the technician who visits.</p>
      <StatRow>
        <Stat2 icon="warn" label="Waiting for review" value={all.length} tone={T.orange} active={tier === "all"} onClick={() => setTier("all")} />
        <Stat2 icon="bolt" label="Hot" value={count("Hot")} tone={T.red} active={tier === "Hot"} onClick={() => setTier("Hot")} />
        <Stat2 icon="clock" label="Warm" value={count("Warm")} tone={T.gold} active={tier === "Warm"} onClick={() => setTier("Warm")} />
        <Stat2 icon="layers" label="Cold" value={count("Cold")} tone={T.blue} active={tier === "Cold"} onClick={() => setTier("Cold")} />
        <Stat2 icon="check" label="Qualified this week" value={done} tone={T.green} />
      </StatRow>
      {all.length > 0 && <p className="t-small mt-3">Oldest waiting {ago(now - oldest)}.</p>}
      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && <div className="sheet p-8 text-center text-sm text-muted">{all.length ? "No leads in this tier." : "Every lead is reviewed. New ones land here as soon as they are reported."}</div>}
        {rows.map((o) => <Row key={o.id} o={o} onOpen={() => setOpenId(o.id)} />)}
      </div>
      {open && <Drawer label={`Lead review · ${open.id}`} title={open.placeName} onClose={() => setOpenId(null)}><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></Drawer>}
    </div>
  );
}

function Row({ o, onOpen }: { o: Opp; onOpen: () => void }) {
  const { s, now } = useApp();
  const brief = reviewBrief(s, o);
  const top = [...(o.reasons ?? [])].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)).slice(0, 3);
  return (
    <button onClick={onOpen} className="sheet group flex w-full flex-col gap-3 p-4 text-left transition hover:bg-surface @2xl:flex-row @2xl:items-start">
      <div className="flex shrink-0 items-center gap-2 @2xl:w-28 @2xl:flex-col @2xl:items-start">
        {o.tier && <TierPill tier={o.tier} />}
        <Why title="Lead score" e={leadScore(o.reasons ?? [], s.cfg)}><span className="num text-[22px] font-semibold leading-none">{o.score ?? "–"}<span className="text-[12px] font-normal text-muted"> / 100</span></span></Why>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><Pill tone="blue">{KIND_LABEL[o.kind]}</Pill>{!o.suggested && <Pill tone="red">No rep in area</Pill>}</div>
        <div className="mt-1 truncate text-[15px] font-semibold">{o.placeName}</div>
        <div className="truncate t-small">{AREA_NAME[o.area] ?? o.area} · {o.source.type === "snap" ? `spotted by ${NAMES[o.source.reporter ?? ""] ?? "a colleague"}` : `from ${o.source.label}`} {ago(now - o.createdAt)}{o.suggested ? ` · suggested owner ${NAMES[o.suggested]}` : ""}</div>
        {top.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{top.map((r) => <li key={r.label} className="rounded-md bg-surface px-2 py-1 text-[12px]"><span className={`num font-semibold ${r.pts < 0 ? "text-muted" : "text-ink"}`}>{r.pts > 0 ? "+" : ""}{r.pts}</span> {r.label}</li>)}</ul>}
        <div className="mt-2 flex items-start gap-1.5 text-[12.5px] text-brand"><Icon n="sparkle" s={13} /><span className="font-medium">{brief.nba.title}</span></div>
      </div>
      <span className="hidden self-center text-muted transition group-hover:translate-x-0.5 @2xl:block"><Icon n="chev" s={16} /></span>
    </button>
  );
}
