"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { oppOf, tasksOfOpp } from "@/lib/sherpa";
import type { Opp, Tier } from "@/lib/types";
import { ago } from "../ui";
import { Drawer, Stat2, StatRow, T } from "../shared";
import { OppPage } from "./Opps";
import { OppBrowser } from "./OppBrowser";
import { Why } from "../Why";
import { leadScore } from "@/lib/scores";


export function LeadReview({ openOffer, onAsk }: { openOffer: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const [tier, setTier] = useState<Tier | "all">("all");
  const [show, setShow] = useState<"review" | "approvals" | "approved">("review");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? oppOf(s, openId) : undefined;
  const all = s.sherpa.opps.filter((o) => o.stage === "review").sort((a, b) => b.createdAt - a.createdAt);
  const approved = s.sherpa.opps.filter((o) => ["snap", "campaign", "account"].includes(o.source.type) && o.stage !== "review").sort((a, b) => Math.max(...b.log.map((l) => l.t), b.createdAt) - Math.max(...a.log.map((l) => l.t), a.createdAt));
  const approvals = s.sherpa.opps.filter((o) => o.stage !== "review" && tasksOfOpp(s, o.id).some((x) => x.forUser === me!.id)).sort((a, b) => Math.max(...b.log.map((l) => l.t), b.createdAt) - Math.max(...a.log.map((l) => l.t), a.createdAt));
  const rows = show === "approvals" ? approvals : show === "approved" ? approved : all.filter((o) => tier === "all" || o.tier === tier);
  const count = (t: Tier) => all.filter((o) => o.tier === t).length;
  const oldest = all.reduce((m, o) => Math.min(m, o.createdAt), now);
  const done = approved.length;
  return (
    <div className="@container w-full p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Lead review</h1>
      <p className="t-small mt-0.5">New leads from Snap & Lead, marketing and account plans, scored by the rules and our history. Qualify each one: pick the owner and the technician who visits.</p>
      <StatRow>
        <Stat2 icon="warn" label="Waiting for review" value={all.length} tone={T.orange} active={show === "review" && tier === "all"} onClick={() => { setShow("review"); setTier("all"); }} />
        <Stat2 icon="bolt" label="Hot" value={count("Hot")} tone={T.red} active={show === "review" && tier === "Hot"} onClick={() => { setShow("review"); setTier("Hot"); }} />
        <Stat2 icon="clock" label="Warm" value={count("Warm")} tone={T.gold} active={show === "review" && tier === "Warm"} onClick={() => { setShow("review"); setTier("Warm"); }} />
        <Stat2 icon="layers" label="Cold" value={count("Cold")} tone={T.blue} active={show === "review" && tier === "Cold"} onClick={() => { setShow("review"); setTier("Cold"); }} />
        <Stat2 icon="flag" label="Needs my approval" value={approvals.length} tone={T.purple} active={show === "approvals"} onClick={() => setShow("approvals")} />
        <Stat2 icon="check" label="Approved" value={done} tone={T.green} active={show === "approved"} onClick={() => setShow("approved")} />
      </StatRow>
      {all.length > 0 && <p className="t-small mt-3">Oldest waiting {ago(now - oldest)}.</p>}
      <OppBrowser key={show} rows={rows} onOpen={setOpenId} onAsk={onAsk} empty={show === "approvals" ? "Nothing is waiting for your approval." : show === "approved" ? "No approved leads yet." : all.length ? "No leads in this tier." : "Every lead is reviewed. New ones land here as soon as they are reported."} />
      {open && <Drawer label={`Lead review · ${open.id}`} title={open.placeName} onClose={() => setOpenId(null)}><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></Drawer>}
    </div>
  );
}
