"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, KIND_LABEL, STAGES, inr, isOpen, oppOf, tasksOfOpp } from "@/lib/sherpa";
import type { Opp } from "@/lib/types";
import { Icon, ago } from "../ui";
import { Sherpa, type Seed } from "../desk/Sherpa";
import { OppPage } from "../desk/Opps";
import { OppBrowser } from "../desk/OppBrowser";
import { involvedOpps } from "./parts";
import { Drawer, FilterBar, FilterField, OwnerDot, Stat2, StatRow, T, Line, pageList } from "../shared";
import { Check, Choice } from "@/components/form";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/* ------------------------------------------------------------------ Chat: the home screen */
export function ChatHome({ seed, openOpp, openOffer, go, compact }: { compact?: boolean; seed: Seed | null; openOpp: (id: string) => void; openOffer: (id: string) => void; go: (v: string) => void }) {
  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-w-0 flex-1">
        <Sherpa seed={seed} onOpenOffer={openOffer} onOpenOpp={openOpp} onOpenLead={() => go("work")} noDash={compact} go={go} />
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ My work: one table of opportunities */
/** ₹11.76 Cr, ₹42.5 L: short enough for a card. */
const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L` : inr(n));
type Tab = "needs" | "waiting" | "active" | "closed";
const KIND_T = { newbuild: T.blue, existing: T.purple, renewal: T.green, modernisation: T.pink, project: T.blue } as const;
export function MyWork({ openId, setOpenId, openOffer, onAsk }: { openId: string | null; setOpenId: (id: string | null) => void; openOffer: (id: string) => void; onAsk: (o: Opp) => void }) {
  const { s, me, now } = useApp();
  const [tab, setTab] = useState<Tab>("needs");
  const all = involvedOpps(s, me!.id, me!.role);
  const needs = (o: Opp) => tasksOfOpp(s, o.id).some((t) => t.forUser === me!.id);
  const lists: Record<Tab, Opp[]> = {
    needs: all.filter(needs),
    waiting: all.filter((o) => isOpen(o) && !needs(o) && (tasksOfOpp(s, o.id).length > 0 || o.stage === "sent")),
    active: all.filter(isOpen), closed: all.filter((o) => !isOpen(o)),
  };
  const pipeline = lists.active.reduce((x, o) => x + (o.value ?? 0), 0);
  const go = (t: Tab) => setTab(t);
  const open = openId ? oppOf(s, openId) : undefined;
  const askAbout = (o: Opp) => <button onClick={() => { setOpenId(null); onAsk(o); }} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap @md:flex-none rounded-md border border-brand bg-white px-4 text-[13.5px] font-semibold text-brand hover:bg-brand-soft"><Icon n="sparkle" s={15} /> Ask SHERPA about this</button>;
  return (
    <div className="@container w-full">
    <div className="p-4 @3xl:p-6">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{me!.role === "tech" ? "My site visits" : me!.role === "sl" ? "My jobs" : "My work"}</h1>
      <p className="t-small mt-0.5">{me!.role === "tech" ? "Sites the Sales Manager sent you to. Open one, meet the person in charge and file the site-visit report." : me!.role === "sl" ? "Won new installations in your area. Open one, read the handover pack and accept the job." : "Every lead, tender and offer is one opportunity. Click a row for the full detail, or press Ask to work on it with SHERPA."}</p>
      <StatRow>
        <Stat2 icon="warn" label="Needs my action" value={lists.needs.length} tone={T.orange} active={tab === "needs"} onClick={() => go("needs")} />
        <Stat2 icon="clock" label="Waiting on others" value={lists.waiting.length} tone={T.blue} active={tab === "waiting"} onClick={() => go("waiting")} />
        <Stat2 icon="layers" label="All active" value={lists.active.length} tone={T.red} active={tab === "active"} onClick={() => go("active")} />
        <Stat2 icon="check" label="Closed" value={lists.closed.length} tone={T.green} active={tab === "closed"} onClick={() => go("closed")} />
        {me!.role !== "tech" && <Stat2 icon="star" label="Open pipeline" value={<span className="whitespace-nowrap text-[19px]" title={inr(pipeline)}>{short(pipeline)}</span>} tone={T.gold} />}
      </StatRow>
      <OppBrowser rows={lists[tab]} onOpen={setOpenId} onAsk={onAsk} empty={tab === "needs" ? "Nothing needs you right now." : "Nothing here."} />
      {open && <Drawer label={`Opportunity · ${open.id}`} title={open.title} onClose={() => setOpenId(null)} footer={<><span className="mr-auto hidden t-small @md:inline">Want a hand with this one?</span>{askAbout(open)}</>}><OppPage embedded id={open.id} onBack={() => setOpenId(null)} openOffer={openOffer} /></Drawer>}
    </div>
    </div>
  );
}
