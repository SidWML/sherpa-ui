"use client";
import { useState, type ReactNode } from "react";
import { A, useApp } from "@/lib/store";
import { USERS } from "@/lib/data";
import { AREA_NAME, GUIDE, KIND_LABEL, NAMES, OP, PRODUCT, SH, STAGES, TECHS, accountMatches, accountOf, daysTo, dealNbas, inr, isNI, isOpen, offerOf, oppOf, reviewBrief, stagesFor, tasksOfOpp, techFor, tenderOf, visitorFor } from "@/lib/sherpa";
import type { Opp, State, Task } from "@/lib/types";
import { Btn, Card, Empty, Icon, Pill, TierPill, ago } from "../ui";
import { Choice, Input, Textarea } from "@/components/form";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Back, Fold, Label } from "./Action";
import { Page } from "./Common";
import { OfferPill } from "./Offers";
import { CHOICE, Field, Panel, Q } from "./Step";
import { AgreedPanel, ApproveWinPanel, BidConfirmPanel, BidReviewPanel, ConfigNI, FindContactNI, FollowupNI, HandoverPack, JobPanel, LossMemory, OrderPanel, ResearchPanel, TalkPanel, Talks } from "./NewInstall";
import { ContractPill } from "./Contract";
import { Why } from "../Why";
import { leadScore } from "@/lib/scores";

const TEAM_FOR: Record<Opp["kind"], string> = { newbuild: "NI", existing: "EI", renewal: "SC", modernisation: "MOD", project: "NI" };

/** One line that says whose move it is. Copied from guided-buying's "next step" line. */
export function statusLine(s: State, o: Opp, me: string, now: number): { text: string; mine: boolean; late: boolean } {
  if (!isOpen(o)) return { text: o.stage === "won" ? "Won" : o.stage === "lost" ? "Lost" : "Closed", mine: false, late: false };
  const open = tasksOfOpp(s, o.id).sort((a, b) => a.due - b.due);
  const mine = open.find((t) => t.forUser === me);
  if (mine) return { text: `Your move: ${mine.title}`, mine: true, late: mine.due < now };
  const t = open[0];
  if (t) return { text: `Waiting on ${NAMES[t.forUser ?? ""] ?? "someone"} since ${ago(now - t.createdAt)}: ${t.title}`, mine: false, late: t.due < now };
  if (o.stage === "sent") return { text: "Waiting on the customer", mine: false, late: false };
  return { text: "No open step", mine: false, late: false };
}

/* ------------------------------------------------------------------ the list */
export function Opps({ openId, setOpenId, openOffer }: { openId: string | null; setOpenId: (id: string | null) => void; openOffer: (id: string) => void }) {
  const { s, me, now } = useApp();
  const mgr = me!.role === "mgr";
  const [tab, setTab] = useState<"needs" | "waiting" | "active" | "closed" | "exc">("needs");
  if (openId && oppOf(s, openId)) return <OppPage id={openId} onBack={() => setOpenId(null)} openOffer={openOffer} />;
  const involved = (o: Opp) => mgr || o.owner === me!.id || tasksOfOpp(s, o.id, false).some((t) => t.forUser === me!.id) || offerOf(s, o.offerId)?.createdBy === me!.id || o.source.reporter === me!.id;
  const needs = (o: Opp) => isOpen(o) && tasksOfOpp(s, o.id).some((t) => t.forUser === me!.id);
  const waiting = (o: Opp) => isOpen(o) && involved(o) && !needs(o) && (tasksOfOpp(s, o.id).length > 0 || o.stage === "sent");
  const exc = (o: Opp) => isOpen(o) && (!!o.unrouted || tasksOfOpp(s, o.id).some((t) => t.due < now));
  const mineAll = s.sherpa.opps.filter(involved);
  const lists = { needs: mineAll.filter(needs), waiting: mineAll.filter(waiting), active: mineAll.filter(isOpen), closed: mineAll.filter((o) => !isOpen(o)), exc: mineAll.filter(exc) };
  const tabs: [typeof tab, string][] = [["needs", "Needs my action"], ["waiting", "Waiting on others"], ["active", "All active"], ["closed", "Closed"], ...(mgr ? ([["exc", "Exceptions"]] as [typeof tab, string][]) : [])];
  const rows = lists[tab].sort((a, b) => (tasksOfOpp(s, a.id)[0]?.due ?? Infinity) - (tasksOfOpp(s, b.id)[0]?.due ?? Infinity));
  return (
    <Page title="Opportunities" sub="Every lead, tender and offer is one opportunity. Each line says whose move it is and what they are waiting on.">
      <div className="mb-4 flex flex-wrap gap-1.5">{tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-ink/80 ring-1 ring-line hover:bg-surface"}`}>{l} <span className={`num ml-1 text-xs font-medium ${tab === k ? "text-white/60" : k === "needs" && lists.needs.length ? "text-brand" : "text-muted"}`}>{lists[k].length}</span></button>
      ))}</div>
      <div className="space-y-2.5">
        {rows.length === 0 && <Empty text={tab === "needs" ? "Nothing needs you right now." : "Nothing here."} />}
        {rows.map((o) => {
          const st = statusLine(s, o, me!.id, now);
          const stage = STAGES.find((x) => x[0] === o.stage)?.[1] ?? (o.stage === "lost" ? "Lost" : "Closed");
          return (
            <button key={o.id} onClick={() => setOpenId(o.id)} className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition hover:shadow-md" style={{ borderLeftWidth: 3, borderLeftColor: st.late ? "#e3001b" : st.mine ? "#f59e0b" : "#d4d4d8" }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><Pill tone="blue">{KIND_LABEL[o.kind]}</Pill><Pill tone={o.stage === "won" ? "green" : "gray"}>{stage}</Pill>{o.unrouted && <Pill tone="red">No owner</Pill>}{st.late && <Pill tone="red">Overdue</Pill>}</div>
                <div className="mt-1.5 truncate text-[15px] font-semibold">{o.title}</div>
                <div className="truncate text-[12.5px] text-muted">{o.placeName} · {AREA_NAME[o.area] ?? o.area} · owner {NAMES[o.owner] ?? o.owner}</div>
                <div className={`mt-2 flex items-start gap-1.5 text-[12.5px] ${st.mine ? "font-semibold text-brand" : "text-ink/75"}`}><Icon n={st.mine ? "bolt" : "clock"} s={13} /><span>{st.text}</span></div>
              </div>
              {o.value ? <div className="shrink-0 text-right"><div className="num text-sm font-semibold">{inr(o.value)}</div></div> : null}
              <span className="text-muted transition group-hover:translate-x-0.5"><Icon n="chev" s={16} /></span>
            </button>
          );
        })}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ one opportunity */
export function OppPage({ id, onBack, openOffer, embedded }: { id: string; onBack: () => void; openOffer: (id: string) => void; embedded?: boolean }) {
  const { s, me, now } = useApp();
  const o = oppOf(s, id)!;
  const offer = offerOf(s, o.offerId); const tender = tenderOf(s, o.tenderId);
  const st = statusLine(s, o, me!.id, now);
  const open = tasksOfOpp(s, id).sort((a, b) => a.due - b.due);
  const mine = open.filter((t) => t.forUser === me!.id);
  const all = tasksOfOpp(s, id, false);
  const stages = stagesFor(o);
  const stageIdx = Math.max(0, stages.findIndex((x) => x[0] === o.stage));
  const reporter = o.source.reporter ? NAMES[o.source.reporter] : undefined;

  return (
    <div className={`${embedded ? "p-4" : "p-4 @2xl:p-8"}`}>
      {!embedded && <Back onClick={onBack} label="Back to opportunities" />}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span>{o.tier && <TierPill tier={o.tier} />}<Pill tone="blue">{KIND_LABEL[o.kind]}</Pill>{o.unrouted && <Pill tone="red">No owner</Pill>}<Pill>from {o.source.label}</Pill></div>
        {!embedded && <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">{o.title}</h1>}
        <p className="mt-1 text-sm text-muted">{o.placeName} · {AREA_NAME[o.area] ?? o.area} · {o.stage === "review" ? "waiting for the Sales Manager" : `owner ${NAMES[o.owner] ?? o.owner}`}{o.order ? ` · order ${o.order.number}` : ""}{o.technician ? ` · visit by ${NAMES[o.technician]}` : ""}{reporter ? ` · spotted by ${reporter}` : ""}{o.value ? ` · worth ${inr(o.value)}` : ""}</p>
      </header>

      <LossMemory o={o} />
      {/* where it is, and whose move it is */}
      <Card className="mb-5 p-5">
        <ol className="flex items-center gap-0">{stages.map(([k, l], i) => (
          <li key={k} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center"><div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : i <= stageIdx ? "bg-brand" : "bg-line"}`} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${i < stageIdx || o.stage === "won" ? "border-brand bg-brand text-white" : i === stageIdx ? "border-brand bg-white text-brand ring-4 ring-brand/15" : "border-line bg-white"}`}>{(i < stageIdx || o.stage === "won") && <Icon n="check" s={12} w={3} />}</span><div className={`h-0.5 flex-1 ${i === stages.length - 1 ? "opacity-0" : i < stageIdx ? "bg-brand" : "bg-line"}`} /></div>
            <span className={`text-[11px] ${i === stageIdx ? "font-semibold text-ink" : "text-muted"}`}>{l}</span>
          </li>))}</ol>
        <div className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13.5px] ${st.mine ? "bg-amber-50 text-amber-900" : "bg-surface"}`}><Icon n={st.mine ? "bolt" : "clock"} s={15} /><span className="font-medium">{st.text}</span></div>
      </Card>

      {/* what I should do now */}
      {mine.length > 0 && <div className="mb-5 space-y-4">{mine.map((t) => <TaskPanel key={t.id} o={o} t={t} openOffer={openOffer} />)}</div>}
      {mine.length === 0 && isOpen(o) && <Card className="mb-5 p-5 text-sm text-muted">Nothing needs you on this one. {open[0] ? `${NAMES[open[0].forUser ?? ""]} has the next step: ${open[0].title}.` : o.stage === "sent" ? "The customer has the offer." : ""}</Card>}
      {!isOpen(o) && <Card className="mb-5 flex items-center gap-3 p-5"><span className={`grid h-10 w-10 place-items-center rounded-full ${o.stage === "won" ? "bg-emerald-100 text-emerald-700" : "bg-surface text-muted"}`}><Icon n={o.stage === "won" ? "trophy" : "check"} s={20} /></span><div><div className="text-[15px] font-semibold">{o.stage === "won" ? "Won" : o.stage === "lost" ? "Lost" : "Closed"}</div><div className="text-[13px] text-muted">{o.log[o.log.length - 1]?.text}</div></div></Card>}

      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <Label>Contact</Label>
            {o.contact ? <div className="rounded-xl border border-line px-4 text-[13.5px]">{[["Name", o.contact.name], ["Role", o.contact.role], ["Phone", o.contact.phone ?? "Not known"], ["Email", o.contact.email ?? "Not known"], ["Found by", o.contact.via]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line/70 py-2.5 last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div>
              : o.source.type === "snap" && ["review", "visit"].includes(o.stage) ? <div className="rounded-xl bg-surface p-3 text-[13.5px]"><b>No contact yet.</b> {isNI(o) ? "The owner finds the customer after accepting the lead, with help from Sales support if needed." : o.technician ? `${NAMES[o.technician]} meets the person in charge on the site visit and adds them here.` : "The technician the Sales Manager sends will meet the person in charge and add them here."}</div>
              : <div className="rounded-xl bg-amber-50 p-3 text-[13.5px] text-amber-900"><b>No contact yet.</b> The photo only shows a building. Until there is a decision-maker, nobody can call anyone. The owner decides how to find one: ask the person who spotted it, ask Sales support to research it, or walk in.</div>}
          </Card>
          {(tender || offer) && (
            <Card className="p-5">
              <Label>Tender and offer</Label>
              <div className="space-y-3">
                {tender && <div className="rounded-xl border border-line p-3 text-[13.5px]"><div className="flex items-center justify-between gap-2"><b>{tender.id} · {tender.name}</b><Pill tone={tender.stage === "final" ? "green" : "gray"}>{tender.stage === "final" ? "Final bidding" : tender.stage}</Pill></div><div className="mt-1 text-xs text-muted">The customer&apos;s formal call for prices. Bid due in {Math.max(0, daysTo(s, tender.eord))} days. {tender.competitorSpec ? "It names a competitor&apos;s part." : ""}</div><ul className="mt-2 space-y-1 text-[13px]">{tender.checklist.map((c) => <li key={c.t} className="flex gap-2"><span className={c.done ? "text-emerald-600" : "text-muted"}>{c.done ? "✓" : "○"}</span>{c.t}</li>)}</ul><Button variant="outline" onClick={() => openOffer(tender.id)} className="h-auto mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-brand px-3 text-[12.5px] font-semibold text-brand hover:bg-brand-soft">{tender.bid ? "Open the bid" : "Open the bid builder"}</Button></div>}
                {offer && <button onClick={() => openOffer(offer.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left text-[13.5px] hover:bg-surface"><div><b>{offer.id} · {offer.title}</b><div className="text-xs text-muted">{tender ? "Our priced answer to the tender" : "Our offer to the customer"} · {inr(offer.price)} · {offer.discountPct}% off</div></div><span className="flex items-center gap-2"><OfferPill o={offer} /><Icon n="chev" s={14} /></span></button>}
              </div>
            </Card>
          )}
          {!mine.some((t) => t.kind === "job") && <HandoverPack o={o} />}
          <Talks o={o} />
          {o.research?.shared && <Card className="p-5"><Label>Found by Sales support</Label><ul className="space-y-1.5 text-[13px]">{o.research.shared.map((x) => <li key={x} className="flex gap-2"><Icon n="search" s={13} />{x}</li>)}</ul></Card>}
          {o.contractId && <ContractCard id={o.contractId} openOffer={openOffer} />}
          {o.site && <SiteCard o={o} />}
          <Notes o={o} />
          <Card className="px-5 py-2"><Fold title="Timeline" count={`${o.log.length} event${o.log.length === 1 ? "" : "s"}`}><ol className="space-y-3 text-[13px]">{[...o.log].reverse().map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by} · {ago(now - l.t)}</span></span></li>)}</ol></Fold></Card>
        </div>
        <Card className="p-5 @4xl:sticky @4xl:top-4">
          <Label>Who is doing what</Label>
          {all.length === 0 && <div className="text-sm text-muted">No steps yet.</div>}
          <ul className="space-y-3 text-[13px]">{all.slice().sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt).map((t) => (
            <li key={t.id} className="flex gap-2.5"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : t.due < now ? "border-brand" : "border-line"}`}>{t.done && <Icon n="check" s={9} w={4} />}</span><span className={t.done ? "text-muted line-through" : ""}>{t.title}<span className="block text-xs text-muted">{NAMES[t.forUser ?? ""] ?? "Anyone"} · {t.done ? `done ${ago(now - (t.doneAt ?? now))}` : t.due < now ? "overdue" : `due in ${Math.max(0, daysTo(s, t.due))} day${Math.max(0, daysTo(s, t.due)) === 1 ? "" : "s"}`}</span></span></li>
          ))}</ul>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the step in front of me */
function TaskPanel({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const by = me!.id; const iid = o.source.itemId;
  const [f, setF] = useState({ name: "", role: "", phone: "", email: "", note: "", how: "Phone call", route: "" , reason: "Not a real opportunity", days: "30", to: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const offer = offerOf(s, o.offerId);
  const reporterId = o.source.reporter; const canAskReporter = !!reporterId && reporterId !== o.owner;
  const visitor = visitorFor(s, o);

  if (t.kind === "review") return <ReviewPanel o={o} t={t} />;
  if (isNI(o)) {
    if (t.kind === "findContact") return <FindContactNI o={o} />;
    if (t.kind === "research" && by === "shalini") return <ResearchPanel o={o} t={t} />;
    if (t.kind === "contact") return <TalkPanel o={o} t={t} />;
    if (t.kind === "config") return <ConfigNI o={o} t={t} openOffer={openOffer} />;
    if (t.kind === "followup") return <FollowupNI o={o} t={t} openOffer={openOffer} />;
  }
  if (t.kind === "bidReview") return <BidReviewPanel o={o} t={t} openOffer={openOffer} />;
  if (t.kind === "bidConfirm") return <BidConfirmPanel o={o} t={t} openOffer={openOffer} />;
  if (t.kind === "agreed") return <AgreedPanel o={o} t={t} />;
  if (t.kind === "approveWin") return <ApproveWinPanel o={o} t={t} />;
  if (t.kind === "order") return <OrderPanel o={o} t={t} />;
  if (t.kind === "job") return <JobPanel o={o} t={t} />;
  if (t.kind === "siteVisit") return <SitePanel o={o} t={t} />;
  if (t.kind === "dealSetup") return <DealPanel o={o} t={t} />;
  if (t.kind === "tenderDoc" || t.kind === "approveBid") { const tn = tenderOf(s, o.tenderId); return (
    <Panel title={t.title} why={t.kind === "tenderDoc" ? `${t.detail ?? ""}` : `${t.detail ?? ""} You can change the discount and papers before you approve.`} does={t.kind === "tenderDoc" ? "Opens the bid builder: upload the document, answer the open questions, check the draft." : "Opens the draft bid with the price check and every paper."} then={t.kind === "tenderDoc" ? `${NAMES[MANAGER_ID]} approves the bid.` : `${NAMES[o.owner]} sends it to the customer or uploads it to the tender portal.`}>
      {tn && <Btn onClick={() => openOffer(tn.id)}>{t.kind === "tenderDoc" ? (tn.doc ? "Continue the draft bid" : "Upload the tender document") : "Review the bid"}</Btn>}
    </Panel>); }
  if (t.kind === "quoteBrief") return <QuotePanel o={o} t={t} />;
  if (t.kind?.startsWith("contract") && o.contractId) { const step = CONTRACT_STEP[t.kind as keyof typeof CONTRACT_STEP]; return (
    <Panel title={t.title} why={t.detail ?? ""} does={step.does} then={step.then}>
      <Btn onClick={() => openOffer(o.contractId!)}>{step.cta}</Btn>
    </Panel>); }
  if (t.kind === "accept") return (
    <Panel title={`Accept this ${KIND_LABEL[o.kind].toLowerCase()} lead`} why={`${t.detail ?? o.title} Accepting makes you the owner. If nobody accepts within a day, the manager sees it as an exception.`} does={`Makes you the owner${o.source.reporter ? ` and tells ${NAMES[o.source.reporter]} it was accepted (+20 points for them)` : ""}.`} then={o.contact ? `You contact ${o.contact.name}.` : "You decide how to find a decision-maker, because we have no contact yet."}>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => mutate((st) => { const i = iid ? st.reports.flatMap((r) => r.items).find((x) => x.id === iid) : undefined; if (i && i.status === "new") A.accept(st, i.id, by); OP.accepted(st, o.id, by); })}><Icon n="check" s={15} /> Accept</Btn>
        <Choice value={f.reason} onChange={set("reason")} options={["Wrong area", "Not our product", "Duplicate", "Already in progress"]} aria-label="Reason" className="w-auto" />
        <Btn v="ghost" onClick={() => mutate((st) => { if (iid) A.decline(st, iid, by, f.reason); OP.declined(st, o.id, by, f.reason); })}>Not mine: send back</Btn>
      </div>
    </Panel>
  );

  if (t.kind === "findContact") return (
    <Panel title="Find a decision-maker" why={`We have no contact for ${o.placeName}. Nobody can be called until we know who decides. Pick the way that fits.`} does="The person you pick gets a to-do. You get the contact back, then you call or email." then="You contact the customer.">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
        <button disabled={!canAskReporter} onClick={() => mutate((st) => OP.askReporter(st, o.id, by))} className="rounded-xl border border-line p-3 text-left text-[13px] hover:bg-surface disabled:opacity-50"><b className="block text-[13.5px]">1. Ask {canAskReporter ? NAMES[reporterId!] : "the reporter"}</b>{canAskReporter ? "They saw the site. They check the hoarding for a developer name and phone." : "You spotted it yourself, so there is nobody else to ask."}</button>
        <button onClick={() => mutate((st) => OP.research(st, o.id, by))} className="rounded-xl border border-line p-3 text-left text-[13px] hover:bg-surface"><b className="block text-[13.5px]">2. Ask Sales support</b>They research the developer from the building permit and the company register.</button>
        <button onClick={() => set("route")("walk")} className={`rounded-xl border p-3 text-left text-[13px] hover:bg-surface ${f.route === "walk" ? "border-brand" : "border-line"}`}><b className="block text-[13.5px]">3. Walk in yourself</b>Go to the site office. This also counts as your first visit.</button>
      </div>
      {f.route === "walk" && (
        <div className="pop mt-3 space-y-2 rounded-xl border border-line p-3">
          <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3"><Field v={f.name} set={set("name")} ph="Name of the person you met" /><Field v={f.role} set={set("role")} ph="Role, e.g. Project head" /><Field v={f.phone} set={set("phone")} ph="Phone" /></div>
          <Field v={f.note} set={set("note")} ph="What did you learn? For example: 3 towers, structure at floor 8, lift supplier not chosen" area />
          <Btn disabled={!f.name || !f.role} onClick={() => mutate((st) => { if (iid) A.visit(st, iid, by, `Walk-in at ${o.placeName}: met ${f.name}${f.note ? `. ${f.note}` : ""}`); OP.walkIn(st, o.id, by, { name: f.name, role: f.role, phone: f.phone || undefined }, f.note); })}>Save the walk-in</Btn>
        </div>
      )}
    </Panel>
  );

  if (t.kind === "research") return (
    <Panel title={t.title} why={t.detail ?? ""} does="Saves the contact on the opportunity so the owner can call." then={`${NAMES[o.owner]} gets a to-do to contact them.`}>
      {by === "shalini" && <div className="mb-3 rounded-xl bg-brand-soft p-3 text-[13px]"><b className="text-brand">Project Lead Finder (simulated) suggests:</b> the building permit for {o.placeName} lists a developer. Check it, then fill the fields.</div>}
      <div className="space-y-2"><div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2"><Field v={f.name} set={set("name")} ph="Name of the decision-maker or company" /><Field v={f.role} set={set("role")} ph="Role, e.g. Project head" /><Field v={f.phone} set={set("phone")} ph="Phone" /><Field v={f.email} set={set("email")} ph="Email (optional)" /></div>
        <Btn disabled={!f.name || !f.role} onClick={() => mutate((st) => OP.provideContact(st, t.id, by, { name: f.name, role: f.role, phone: f.phone || undefined, email: f.email || undefined }))}>Send the contact to {NAMES[o.owner]?.split(" ")[0]}</Btn></div>
    </Panel>
  );

  if (t.kind === "contact") return (
    <Panel title={`Contact ${o.contact?.name ?? "the customer"}`} why={`Introduce Schindler and learn about the timeline${o.contact ? `. ${o.contact.name} is ${o.contact.role}` : ""}. Say what you spoke about so the next person knows.`} does="Saves your call or email on the lead and moves it to the visit step." then={`${NAMES[visitor]} gets a to-do to visit${visitor !== o.owner ? ` (${o.kind === "modernisation" ? "technical survey" : "existing-installation rep for the area"})` : ", because this is your territory"}.`}>
      <div className="space-y-2"><Choice value={f.how} onChange={set("how")} options={["Phone call", "Email", "Phone call and email"]} aria-label="How" className="w-auto" />
        <Field v={f.note} set={set("note")} ph="What was said? For example: Spoke to the project head, happy to meet next week" area />
        <Btn onClick={() => mutate((st) => { if (iid) A.contact(st, iid, by, `${f.how}${f.note ? `: ${f.note}` : " (no note)"}`); OP.contacted(st, o.id, by); })}>Save call or email</Btn></div>
    </Panel>
  );

  if (t.kind === "visit") return (
    <Panel title={t.title} why={t.detail ?? "Go to the customer, see the site, and record what you find."} does="Saves your visit note and moves the opportunity to qualify." then={`${NAMES[o.owner]} decides: formal tender or direct quote.`}>
      <div className="space-y-2"><Field v={f.note} set={set("note")} ph="What did you see? For example: 6 lifts, two over 20 years old, structure at floor 8" area />
        <Btn onClick={() => mutate((st) => { if (iid) A.visit(st, iid, by, f.note); OP.visited(st, o.id, by, f.note); })}>Save the visit</Btn></div>
    </Panel>
  );

  if (t.kind === "qualify") return (
    <Panel title="Qualify: tender or direct quote?" why="Is the customer asking several companies for a price in a formal tender, with a last date? Or can you simply send a quote to one customer? This decides what happens next." does="Formal tender: starts a bid. Direct quote: starts a quote. Or closes it if it is not a fit." then="Formal tender: Sales Support fills the lift details and the Sales Manager creates the bid. You send it to the customer. Direct quote: you price it and send it.">
      <div className="flex flex-wrap items-center gap-2">
        <Choice value={f.days} onChange={set("days")} options={["14", "30", "45", "60"].map((d) => ({ value: d, label: `Bid due in ${d} days` }))} aria-label="Bid due" className="w-auto" />
        <Btn onClick={() => mutate((st) => OP.qualify(st, o.id, by, "tender", Number(f.days)))}>Formal tender</Btn>
        <Btn v="ghost" onClick={() => mutate((st) => OP.qualify(st, o.id, by, "direct"))}>Direct quote</Btn>
        <Choice value={f.reason} onChange={set("reason")} options={["Not a real opportunity", "Customer not interested", "Already served by us"]} aria-label="Reason" className="w-auto" />
        <Btn v="ghost" onClick={() => mutate((st) => { if (iid) A.notRelevant(st, iid, by, f.reason); OP.qualify(st, o.id, by, "notfit"); })}>Not a fit: close</Btn>
      </div>
    </Panel>
  );

  if (t.kind === "config") return (
    <Panel title={t.title} why={`${t.detail ?? ""} ${NAMES[o.owner]} cannot send the offer for approval until these are filled.`} does="Fills the missing fields from the tender spec and tells the owner." then={`${NAMES[o.owner]} gets a to-do to price and submit the offer.`}>
      <div className="space-y-3"><div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-[13px]"><thead className="bg-surface text-left text-xs text-muted"><tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Suggested</th><th className="px-3 py-2 font-medium">From</th></tr></thead><tbody>{[["Rated load", "1,350 kg (20 persons)", "Tender spec"], ["Number of floors", "34 stops", "Building height"], ["Door type", "Centre-opening, 2 panels", "Drawing note"]].map((r) => <tr key={r[0]} className="border-t border-line">{r.map((c, i) => <td key={i} className="px-3 py-2">{c}</td>)}</tr>)}</tbody></table></div>
        {offer && <Btn onClick={() => mutate((st) => SH.apply(st, by, { t: "offerFix", id: offer.id }))}>Complete the configuration</Btn>}</div>
    </Panel>
  );

  if (t.kind === "bid") { const tn = tenderOf(s, o.tenderId); return (
    <Panel title={t.title} why={`${t.detail ?? ""} The tender, lift details, earlier prices and every bid paper are in one place.`} does="Opens the bid builder." then={`When you create the bid, ${NAMES[o.owner]} sends it to the customer.`}>
      {tn && <Btn onClick={() => openOffer(tn.id)}>Open the bid builder</Btn>}
    </Panel>); }

  if (t.kind === "compliance") return (
    <Panel title={t.title} why="The tender needs a signed technical compliance sheet with the bid." does="Ticks the compliance item on the tender checklist." then="The bid moves on to pricing and approval.">
      <Btn onClick={() => mutate((st) => OP.tickCompliance(st, o.id, by))}>Compliance sheet is filled</Btn>
    </Panel>
  );

  if (t.kind === "approve") return (
    <Panel title={t.title} why={`${t.detail ?? ""} ${offer && offer.discountPct > GUIDE.manager ? `This is above the ${GUIDE.manager}% a manager can approve.` : ""}`} does="Opens the one-page brief with the price, the area check and your options." then={`${NAMES[offer?.createdBy ?? o.owner]} is told your decision. If you approve, they send it.`}>
      {offer && <Btn onClick={() => openOffer(offer.id)}>Review and decide</Btn>}
    </Panel>
  );

  if (t.kind === "revise" || t.kind === "send" || t.kind === "followup") return (
    <Panel title={t.title} why={t.detail ?? ""} does={t.kind === "send" ? "Opens the email to edit and send." : t.kind === "followup" ? "Opens the offer with a follow-up email ready." : "Opens the offer so you can change the price or discount and submit it."} then={t.kind === "send" && o.tenderId && isNI(o) ? "The bid goes as a PDF attachment. You can also download it for the tender portal from the bid." : t.kind === "send" ? "The quotation goes as a PDF attachment. You can keep talking to the customer in the chat on the offer." : t.kind === "followup" ? "Log the result when the customer answers: won or lost." : s.cfg.approveAll ? "It goes to the Sales Manager for approval." : "It goes to the manager if the discount is above 10%."}>
      <div className="flex flex-wrap gap-2">{offer && <Btn onClick={() => openOffer(offer.id)}>Open {offer.id}</Btn>}{t.kind === "send" && o.tenderId && isNI(o) && <Btn v="ghost" onClick={() => openOffer(o.tenderId!)}>Open the bid</Btn>}</div>
    </Panel>
  );

  if (t.kind === "assign") return (
    <Panel title={t.title} why={t.detail ?? ""} does="Makes the person the owner and gives them an accept to-do." then="They accept within a day.">
      <div className="flex flex-wrap gap-2"><Choice value={f.to} onChange={set("to")} placeholder="Choose an owner" options={USERS.filter((u) => !u.hidden && u.team === TEAM_FOR[o.kind]).map((u) => ({ value: u.id, label: `${u.name} · ${u.title.split("·")[0]}` }))} aria-label="Owner" className="w-auto min-w-56" />
        <Btn disabled={!f.to} onClick={() => mutate((st) => { if (iid) A.reassign(st, [iid], f.to, by); OP.reassign(st, o.id, by, f.to); })}>Assign</Btn></div>
      {!USERS.some((u) => !u.hidden && u.team === TEAM_FOR[o.kind] && (u.areas ?? []).includes(o.area)) && <p className="mt-2 text-xs text-amber-800">No {TEAM_FOR[o.kind]} rep covers {AREA_NAME[o.area] ?? o.area}. Pick someone from a neighbouring area.</p>}
    </Panel>
  );

  return (
    <Panel title={t.title} why={t.detail ?? ""}>
      <div className="space-y-2"><Field v={f.note} set={set("note")} ph="What did you do? (optional)" area /><Btn onClick={() => mutate((st) => OP.completeTask(st, t.id, by, f.note))}>Mark done</Btn></div>
    </Panel>
  );
}

const MANAGER_ID = "marc";
const CONTRACT_STEP = {
  contractDraft: { cta: "Open the contract draft", does: "Opens the contract SHERPA drafted from the offer. You can change the start date and the optional terms.", then: "Sales support checks price, payment and terms." },
  contractCheck: { cta: "Check the contract", does: "Opens the contract with SHERPA's flags next to it.", then: "The Sales Manager approves it, or it goes back to the owner with your note." },
  contractApprove: { cta: "Review the contract", does: "Opens the checked contract.", then: "The owner sends it to the customer for e-signature." },
  contractSign: { cta: "Send for e-signature", does: "Opens the approved contract with the signing step.", then: "When the customer signs, the deal is won and the handover starts." },
};
const RANKED = <R extends { pts: number }>(r: R[]) => [...r].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));

function ReviewPanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const by = me!.id; const iid = o.source.itemId;
  const brief = reviewBrief(s, o);
  const team = TEAM_FOR[o.kind];
  const reps = USERS.filter((u) => !u.hidden && u.team === team);
  const [owner, setOwner] = useState(o.suggested ?? reps.find((u) => u.areas?.includes(o.area))?.id ?? reps[0]?.id ?? "");
  const [tech, setTech] = useState(techFor(o.area) ?? "");
  const ni = isNI(o);
  const [note, setNote] = useState(""); const [reason, setReason] = useState("Not a real opportunity"); const [all, setAll] = useState(false);
  const r = s.reports.find((x) => x.id === o.source.reportId);
  const reasons = RANKED(o.reasons ?? []);
  return (
    <Panel title={`Pursue this ${KIND_LABEL[o.kind].toLowerCase()} lead?`} why={t.detail ?? ""} does={ni ? `Pursue: ${NAMES[owner]?.split(" ")[0] ?? "the rep"} gets the lead to accept. Not pursue: it is closed with your reason.` : "Pursue: makes the owner responsible and sends the technician to the site. Not pursue: it is closed with your reason."} then={ni ? `${NAMES[owner]?.split(" ")[0] ?? "The rep"} accepts, finds the contact and talks to the customer.` : `The technician files a site-visit report. Then ${NAMES[owner]?.split(" ")[0] ?? "the owner"} sets up the deal.`}>
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2"><Why title="Lead score" e={leadScore(o.reasons ?? [], s.cfg)}><span className="t-label">Score</span></Why>{o.tier && <TierPill tier={o.tier} />}</div>
          <div className="num mt-1 text-[28px] font-semibold leading-none">{o.score ?? "–"}<span className="text-[13px] font-normal text-muted"> / 100</span></div>
          <ul className="mt-3 space-y-1.5 text-[13px]">{(all ? reasons : reasons.slice(0, 5)).map((x) => <li key={x.label} className="flex justify-between gap-3"><span className={x.label.startsWith("History") ? "text-brand" : ""}>{x.label}</span><span className="num shrink-0 font-semibold">{x.pts > 0 ? "+" : ""}{x.pts}</span></li>)}</ul>
          {reasons.length > 5 && <button onClick={() => setAll(!all)} className="mt-2 text-[12.5px] font-medium text-brand">{all ? "Show fewer" : `Show all ${reasons.length} reasons`}</button>}
        </div>
        <div className="rounded-xl bg-brand-soft p-3 text-[13px]">
          <div className="flex items-center gap-1.5 font-semibold text-brand"><Icon n="sparkle" s={14} /> SHERPA insight</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">{brief.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <div className="mt-3 rounded-lg bg-white p-2.5"><div className="t-label">Next best action</div><div className="mt-0.5 font-semibold">{brief.nba.title}</div><div className="mt-0.5 text-muted">{brief.nba.why}</div></div>
        </div>
      </div>
      {r && r.answers.length > 0 && <div className="mt-3 rounded-xl border border-line px-3 py-2 text-[13px]"><div className="t-label mb-1">What {NAMES[r.reporterId]?.split(" ")[0] ?? "the reporter"} told us</div>{r.answers.slice(0, 6).map((a) => <div key={a.q} className="flex justify-between gap-3 border-b border-line/60 py-1.5 last:border-0"><span className="text-muted">{a.q}</span><span className="text-right font-medium">{a.a}</span></div>)}</div>}
      <div className="mt-4 grid grid-cols-1 gap-2 @2xl:grid-cols-2">
        <label className="text-[12.5px] font-medium text-muted">Owner ({team})<Choice value={owner} onChange={setOwner} options={reps.map((u) => ({ value: u.id, label: `${u.name}${u.areas?.includes(o.area) ? "" : " (other area)"}` }))} className="mt-1 text-ink" /></label>
        {!ni && <label className="text-[12.5px] font-medium text-muted">Site visit by<Choice value={tech} onChange={setTech} options={TECHS.map((u) => ({ value: u.id, label: `${u.name}${u.areas?.includes(o.area) ? "" : " (other area)"}` }))} className="mt-1 text-ink" /></label>}
      </div>
      <div className="mt-2"><Field v={note} set={setNote} ph={ni ? "Note for the rep (optional)" : "Note for the owner and technician (optional)"} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn disabled={!owner || (!ni && !tech)} onClick={() => mutate((st) => { if (iid) { A.reassign(st, [iid], owner, by); if (!ni) A.accept(st, iid, owner); } OP.review(st, o.id, by, { owner, technician: ni ? undefined : tech, note }); })}><Icon n="check" s={15} /> Pursue{ni ? ` with ${NAMES[owner]?.split(" ")[0] ?? "the rep"}` : " and assign"}</Btn>
        <Choice value={reason} onChange={setReason} options={["Not a real opportunity", "Duplicate of an open deal", "Outside our territory", "Customer already declined"]} aria-label="Reason" className="w-auto" />
        <Btn v="ghost" onClick={() => mutate((st) => { if (iid) A.notRelevant(st, iid, by, reason); OP.reviewClose(st, o.id, by, reason); })}>Not pursue</Btn>
      </div>
    </Panel>
  );
}

function SitePanel({ o, t }: { o: Opp; t: Task }) {
  const { me, mutate } = useApp();
  const [f, setF] = useState({ name: o.contact?.name ?? "", role: o.contact?.role ?? "", phone: o.contact?.phone ?? "", lifts: "", floors: "", condition: "", decision: "", timeline: "", competitor: "", note: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const site = o.kind === "newbuild" || o.kind === "project";
  const ok = f.name && f.role && f.condition && f.decision && f.timeline;
  return (
    <Panel title={t.title} why={`${t.detail ?? ""}`} does="Files your report on the lead. The owner and the Sales Manager see it." then={`${NAMES[o.owner]} confirms the customer and sets up the deal.`}>
      <div className="space-y-4">
        <Q label="Who did you meet?"><div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3"><Field v={f.name} set={set("name")} ph="Name" /><Field v={f.role} set={set("role")} ph="Role, e.g. Facility manager" /><Field v={f.phone} set={set("phone")} ph="Phone" /></div></Q>
        <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2"><Q label={site ? "Lifts the building will need" : "Lifts in the building"}><Field v={f.lifts} set={set("lifts")} ph="e.g. 4" /></Q><Q label="Floors"><Field v={f.floors} set={set("floors")} ph="e.g. G+12" /></Q></div>
        <Q label={site ? "Site readiness" : "Condition of the lifts"}>{CHOICE("condition", site ? ["Early, no shafts yet", "Shafts ready", "Finishing, lifts needed soon"] : ["Good", "Wear and small faults", "Frequent breakdowns", "Out of service"], f.condition, set("condition"))}</Q>
        <Q label="Who decides?">{CHOICE("decision", ["The person I met", "Owner or board", "Developer or contractor", "Not known yet"], f.decision, set("decision"))}</Q>
        <Q label="When do they want to act?">{CHOICE("timeline", ["Now", "Within 3 months", "This year", "No plan yet"], f.timeline, set("timeline"))}</Q>
        <Q label={site ? "Any lift supplier on site?" : "Who services them today?"}><Field v={f.competitor} set={set("competitor")} ph={site ? "e.g. none, or a competitor's name" : "e.g. a local firm, contract ends in March"} /></Q>
        <Q label="Notes"><Field v={f.note} set={set("note")} ph="What else should the owner know?" area /></Q>
        <Btn disabled={!ok} onClick={() => mutate((st) => { const iid = o.source.itemId; if (iid) A.visit(st, iid, me!.id, f.note || `Site visit: met ${f.name}`); OP.siteVisit(st, o.id, me!.id, { met: { name: f.name, role: f.role, phone: f.phone || undefined }, lifts: f.lifts, floors: f.floors, condition: f.condition, decision: f.decision, timeline: f.timeline, competitor: f.competitor, note: f.note }); })}>File the site-visit report</Btn>
        {!ok && <p className="t-small">Fill who you met, the condition, who decides and the timeline.</p>}
      </div>
    </Panel>
  );
}

function DealPanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const matches = accountMatches(s, o);
  const [acc, setAcc] = useState(matches[0]?.id ?? "new");
  const [days, setDays] = useState("30");
  const by = me!.id;
  const newbuild = o.kind === "newbuild" || o.kind === "project";
  const nbas = newbuild ? [] : dealNbas(s, o);
  const go = (path: "tender" | "direct" | "notfit", extra: { product?: Parameters<typeof OP.setupDeal>[3]["product"]; term?: number; discountPct?: number; nba?: string } = {}) => mutate((st) => OP.setupDeal(st, o.id, by, { accountId: acc, path, eordDays: Number(days), ...extra }));
  return (
    <Panel title={t.title} why={`${t.detail ?? ""}`} does={newbuild ? "Tender: SHERPA reads the tender document and drafts the bid. Quotation: a few questions, then a draft quotation." : "Drafts the offer you pick. It goes to the Sales Manager for approval."} then="The Sales Manager approves, then you send it to the customer.">
      <div className="space-y-4">
        <Q label="Customer">
          <RadioGroup value={acc} onValueChange={(v) => setAcc(String(v))} className="gap-1.5">
            {matches.map((a) => <label key={a.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-[13px] ${acc === a.id ? "border-brand bg-brand-soft" : "border-line"}`}><RadioGroupItem value={a.id} /><span><b>{a.name}</b><span className="block text-muted">Existing customer · {AREA_NAME[a.area] ?? a.area} · {a.contact.name}</span></span></label>)}
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-[13px] ${acc === "new" ? "border-brand bg-brand-soft" : "border-line"}`}><RadioGroupItem value="new" /><span><b>Create a new customer: {o.placeName}</b><span className="block text-muted">Contact {o.contact?.name ?? "to be confirmed"}{o.contact?.role ? `, ${o.contact.role}` : ""}</span></span></label>
          </RadioGroup>
        </Q>
        {newbuild ? (
          <Q label="How does the customer buy?">
            <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
              <div className="rounded-xl border border-line p-3 text-[13px]"><b className="block text-[14px]">Formal tender</b><span className="text-muted">Several companies bid by a last date. Upload the tender document next.</span>
                <div className="mt-2 flex flex-wrap gap-2"><Choice value={days} onChange={setDays} options={["14", "30", "45", "60"].map((d) => ({ value: d, label: `Due in ${d} days` }))} aria-label="Bid due" className="w-auto" /><Btn onClick={() => go("tender")}>Start the bid</Btn></div></div>
              <div className="rounded-xl border border-line p-3 text-[13px]"><b className="block text-[14px]">Quotation</b><span className="text-muted">We quote the customer directly. SHERPA asks a few questions and drafts it.</span><div className="mt-2"><Btn v="ghost" onClick={() => go("direct")}>Start the quotation</Btn></div></div>
            </div>
          </Q>
        ) : o.kind === "modernisation" ? (
          <Q label="Modernisation quotation">
            <div className="rounded-xl border border-line p-3 text-[13px]"><span className="text-muted">SHERPA asks about floors, load, speed and scope, then drafts the quotation{o.site ? ` using ${NAMES[o.site.by]}'s survey` : ""}.</span><div className="mt-2"><Btn onClick={() => go("direct")}>Start the quotation</Btn></div></div>
          </Q>
        ) : (
          <Q label="Next best actions">
            <div className="space-y-2">{nbas.map((n) => (
              <div key={n.key} className="flex flex-col gap-2 rounded-xl border border-line p-3 text-[13px] @2xl:flex-row @2xl:items-center">
                <div className="min-w-0 flex-1"><b className="block text-[14px]">{n.title}</b><span className="text-muted">{n.why}</span><span className="mt-0.5 block t-small">{PRODUCT[n.product].label}{PRODUCT[n.product].yearly ? `, ${n.term} year${n.term > 1 ? "s" : ""}` : ""}{n.discountPct ? `, ${n.discountPct}% off` : ""}</span></div>
                <Btn v="ghost" onClick={() => go("direct", { product: n.product, term: n.term, discountPct: n.discountPct, nba: n.title })}>Draft this offer</Btn>
              </div>))}</div>
          </Q>
        )}
        <button onClick={() => go("notfit")} className="text-[13px] font-medium text-muted underline-offset-2 hover:underline">Not a fit: close the lead</button>
      </div>
    </Panel>
  );
}

function QuotePanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const mod = o.kind === "modernisation"; const talk = o.talks?.at(-1);
  const [f, setF] = useState({ floors: (o.site?.floors ?? talk?.wants.floors ?? "").replace(/\D+/g, ""), load: "", speed: "", finish: "", timeline: o.site?.timeline ?? talk?.wants.when ?? "", extras: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.floors && f.load && f.speed && f.finish && f.timeline;
  return (
    <Panel title={t.title} why={`${t.detail ?? ""}${o.site ? ` Some answers come from ${NAMES[o.site.by]}'s site visit.` : talk ? " Some answers come from your conversation with the customer." : ""}`} does="SHERPA prices the draft quotation from your answers and the prices we won with in this area." then={s.cfg.approveAll ? "You check the draft and send it to the Sales Manager." : `You check the draft. The Sales Manager approves it only if the discount is above ${GUIDE.seller}%.`}>
      <div className="space-y-4">
        <Q label="Floors served"><Field v={f.floors} set={set("floors")} ph="e.g. 13" /></Q>
        <Q label="Rated load">{CHOICE("load", ["630 kg (8 persons)", "1,000 kg (13 persons)", "1,350 kg (20 persons)"], f.load, set("load"))}</Q>
        <Q label="Speed">{CHOICE("speed", ["1.0 m/s", "1.75 m/s", "2.5 m/s"], f.speed, set("speed"))}</Q>
        <Q label={mod ? "Scope" : "Cabin finish"}>{CHOICE("finish", mod ? ["Controller and drive", "Full replacement", "Doors and cabin"] : ["Stainless steel", "Mirror steel", "Painted"], f.finish, set("finish"))}</Q>
        <Q label="When does the customer need it?">{CHOICE("timeline", ["Now", "Within 3 months", "This year", "No plan yet"], f.timeline, set("timeline"))}</Q>
        <Q label="Anything else to include?"><Field v={f.extras} set={set("extras")} ph="e.g. 2 years free maintenance, destination control" /></Q>
        <Btn disabled={!ok} onClick={() => mutate((st) => OP.quoteBrief(st, o.id, me!.id, f))}><Icon n="sparkle" s={15} /> Draft the quotation</Btn>
      </div>
    </Panel>
  );
}

function ContractCard({ id, openOffer }: { id: string; openOffer: (id: string) => void }) {
  const { s } = useApp();
  const c = s.sherpa.contracts.find((x) => x.id === id); if (!c) return null;
  return (
    <Card className="p-5">
      <Label>Contract</Label>
      <button onClick={() => openOffer(c.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left text-[13.5px] hover:bg-surface"><div><b>{c.id} · {c.title}</b><div className="text-xs text-muted">{inr(c.value)} · {c.payment.map((p) => `${p.pct}%`).join(" / ")} · starts {new Date(c.start).toLocaleDateString("en-IN")}</div></div><span className="flex items-center gap-2"><ContractPill c={c} /><Icon n="chev" s={14} /></span></button>
    </Card>
  );
}

function SiteCard({ o }: { o: Opp }) {
  const v = o.site!;
  const rows: [string, string][] = [["Met", `${v.met.name}, ${v.met.role}${v.met.phone ? ` · ${v.met.phone}` : ""}`], ["Lifts", v.lifts || "–"], ["Floors", v.floors || "–"], ["Condition", v.condition], ["Who decides", v.decision], ["Timeline", v.timeline], ["Supplier or servicer", v.competitor || "–"]];
  return (
    <Card className="p-5">
      <Label>Site visit by {NAMES[v.by] ?? v.by}</Label>
      <div className="rounded-xl border border-line px-4 text-[13.5px]">{rows.map(([k, x]) => <div key={k} className="flex justify-between gap-4 border-b border-line/70 py-2.5 last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{x}</span></div>)}</div>
    </Card>
  );
}

function Notes({ o }: { o: Opp }) {
  const { me, now, mutate } = useApp();
  const [text, setText] = useState("");
  const notes = [...(o.notes ?? [])].reverse();
  return (
    <Card className="p-5">
      <Label>Notes</Label>
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; mutate((st) => OP.note(st, o.id, me!.id, text)); setText(""); }} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for everyone on this deal" aria-label="Add a note" className="min-w-0 flex-1" />
        <Btn type="submit" disabled={!text.trim()}>Add</Btn>
      </form>
      {notes.length > 0 && <ol className="mt-3 space-y-2.5 text-[13px]">{notes.map((n, k) => <li key={k} className="rounded-lg bg-surface px-3 py-2">{n.text}<span className="block text-xs text-muted">{n.by} · {ago(now - n.t)}</span></li>)}</ol>}
    </Card>
  );
}
