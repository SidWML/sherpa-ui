"use client";
import { useState } from "react";
import { A, useApp } from "@/lib/store";
import { AREA_NAME, BID_PAPERS, DAY, MANAGER, NAMES, OP, SH, SUPPORT, accountOf, daysTo, inr, lastLoss, offerOf, researchFindings, tenderOf } from "@/lib/sherpa";
import type { Opp, Task, TalkOutcome } from "@/lib/types";
import { Btn, Card, Icon, ago } from "../ui";
import { Check, Choice, Input } from "@/components/form";
import { Label } from "./Action";
import { CHOICE, Field, Panel, Q, Rows } from "./Step";

const day = (t: number) => new Date(t).toLocaleDateString("en-IN");
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const fromIso = (v: string) => new Date(`${v}T09:00:00`).getTime();
const WANTS = ["Contact details", "Tender document", "Project owner"];

export function FindContactNI({ o }: { o: Opp }) {
  const { me, mutate } = useApp();
  const by = me!.id; const reporter = o.source.reporter; const canAsk = !!reporter && reporter !== o.owner;
  const [want, setWant] = useState<string[]>(["Contact details"]);
  const toggle = (w: string) => setWant((x) => (x.includes(w) ? x.filter((y) => y !== w) : [...x, w]));
  return (
    <Panel title="Find the customer" why={`We have no contact for ${o.placeName}. Pick how to find one.`} does="Sales support searches the building permit, the company register and our customer records. They never call the customer." then="You get the contact back and record your conversation with the customer.">
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        <div className="rounded-xl border border-brand/40 p-3 text-[13px]">
          <b className="block text-[13.5px]">Ask Sales support</b>
          <span className="text-muted">What should they find?</span>
          <div className="mt-2 flex flex-col gap-1.5">{WANTS.map((w) => <Check key={w} checked={want.includes(w)} onChange={() => toggle(w)}>{w}</Check>)}</div>
          <Btn sm className="mt-3" disabled={!want.length} onClick={() => mutate((st) => OP.research(st, o.id, by, want))}>Ask {NAMES[SUPPORT]?.split(" ")[0]}</Btn>
        </div>
        <button disabled={!canAsk} onClick={() => mutate((st) => OP.askReporter(st, o.id, by))} className="rounded-xl border border-line p-3 text-left text-[13px] hover:bg-surface disabled:opacity-50"><b className="block text-[13.5px]">Ask {canAsk ? NAMES[reporter!] : "the person who spotted it"}</b>{canAsk ? "They saw the site. They check the hoarding for a developer name and phone." : "You spotted it yourself, so there is nobody else to ask."}</button>
        <button onClick={() => mutate((st) => OP.selfContact(st, o.id, by))} className="rounded-xl border border-line p-3 text-left text-[13px] hover:bg-surface"><b className="block text-[13.5px]">I will find them myself</b>Walk in or call the site office, then record the conversation.</button>
      </div>
    </Panel>
  );
}

export function ResearchPanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const found = researchFindings(s, o);
  const [pick, setPick] = useState<string[]>(() => found.filter((f) => f.id === "permit" || f.kind === "tender").map((f) => f.id));
  const toggle = (id: string) => setPick((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const hasContact = found.some((f) => f.contact && pick.includes(f.id));
  const bySource = [...new Set(found.map((f) => f.source))];
  return (
    <Panel title={t.title} why={t.detail ?? ""} does={`Shares the findings you tick with ${NAMES[o.owner]}. The first contact you tick becomes the deal's contact.`} then={`${NAMES[o.owner]} calls or visits the customer.`}>
      {o.research && <div className="mb-3 flex flex-wrap gap-1.5 text-[12.5px]"><span className="text-muted">Asked for:</span>{o.research.want.map((w) => <span key={w} className="rounded-md bg-surface px-2 py-0.5 font-medium">{w}</span>)}</div>}
      <div className="space-y-3">{bySource.map((src) => (
        <div key={src}>
          <div className="t-label mb-1.5 flex items-center gap-1.5"><Icon n="search" s={12} />{src}</div>
          <div className="space-y-1.5">{found.filter((f) => f.source === src).map((f) => (
            <label key={f.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-[13px] ${pick.includes(f.id) ? "border-brand bg-brand-soft" : "border-line"}`}>
              <input type="checkbox" checked={pick.includes(f.id)} onChange={() => toggle(f.id)} className="mt-0.5 accent-[#d42a2a]" />
              <span className="min-w-0 flex-1"><b className="block">{f.title}</b><span className="text-muted">{f.detail}</span>{f.contact && <span className="mt-0.5 block t-small">{[f.contact.phone, f.contact.email].filter(Boolean).join(" · ")}</span>}{f.file && <span className="mt-0.5 flex items-center gap-1 t-small"><Icon n="doc" s={12} />{f.file}</span>}</span>
              <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[11.5px] font-semibold text-muted">{f.kind === "contact" ? "Contact" : f.kind === "tender" ? "Tender" : "Owner"}</span>
            </label>))}</div>
        </div>))}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn disabled={!hasContact} onClick={() => mutate((st) => OP.shareResearch(st, t.id, me!.id, pick))}>Share with {NAMES[o.owner]?.split(" ")[0]}</Btn>
        {!hasContact && <span className="t-small">Tick at least one contact.</span>}
      </div>
    </Panel>
  );
}

const OUTCOMES: { k: TalkOutcome; title: string; text: string }[] = [
  { k: "quote", title: "Wants a quote", text: "We quote the customer directly." },
  { k: "tender", title: "Has a formal tender", text: "Attach the tender document. Sales support fills in the lift details." },
  { k: "callback", title: "Call back later", text: "No answer, or not the right time. A reminder is set." },
  { k: "notInterested", title: "Not interested", text: "The lead is closed with a reason." },
];

export function TalkPanel({ o, t }: { o: Opp; t: Task }) {
  const { me, mutate } = useApp();
  const last = o.talks?.at(-1);
  const [f, setF] = useState({ how: "Phone call", name: o.contact?.name ?? "", role: o.contact?.role ?? "", phone: o.contact?.phone ?? "", said: "", lifts: last?.wants.lifts ?? "", floors: last?.wants.floors ?? "", when: last?.wants.when ?? "", outcome: "" as TalkOutcome | "", days: "7", reason: "Already chose a supplier", eord: "30", file: o.research?.tenderFile ?? "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.said.trim() && f.outcome && (f.outcome !== "tender" || f.file) && (f.outcome === "callback" || f.name);
  const save = () => mutate((st) => {
    const iid = o.source.itemId;
    if (iid) A.contact(st, iid, me!.id, `${f.how}: ${f.said}`);
    OP.talk(st, o.id, me!.id, { how: f.how, with: { name: f.name, role: f.role, phone: f.phone || undefined }, said: f.said, wants: { lifts: f.lifts, floors: f.floors, when: f.when }, outcome: f.outcome as TalkOutcome, callbackDays: Number(f.days), reason: f.reason, tenderFile: f.file || undefined, eordDays: Number(f.eord) });
    if (iid && f.outcome === "notInterested") A.outcome(st, iid, me!.id, "notinterested");
  });
  return (
    <Panel title={t.title} why={`${t.detail ?? "Call or visit the customer."} Record how you spoke, what was said and what the customer wants.`} does="Saves the conversation on the deal. What the customer wants decides the next step." then="Quote: you answer a few questions and SHERPA drafts it. Tender: Sales support fills in the lift details, then the Sales Manager prepares the bid.">
      <div className="space-y-4">
        <Q label="How did you speak?">{CHOICE("how", ["Phone call", "Site visit", "Meeting at their office", "Email"], f.how, set("how"))}</Q>
        <Q label="Who did you speak to?"><div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3"><Field v={f.name} set={set("name")} ph="Name" /><Field v={f.role} set={set("role")} ph="Role, e.g. Project director" /><Field v={f.phone} set={set("phone")} ph="Phone" /></div></Q>
        <Q label="What was said?"><Field v={f.said} set={set("said")} ph="e.g. Structure at floor 8, they want lifts installed by March" area /></Q>
        <Q label="What does the customer want?"><div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3"><Field v={f.lifts} set={set("lifts")} ph="Lifts, e.g. 4" /><Field v={f.floors} set={set("floors")} ph="Floors, e.g. G+12" /><Choice value={f.when} onChange={set("when")} placeholder="When" aria-label="When" options={["Now", "Within 3 months", "This year", "No plan yet"]} /></div></Q>
        <Q label="What happens next?">
          <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">{OUTCOMES.map((x) => (
            <button key={x.k} type="button" aria-pressed={f.outcome === x.k} onClick={() => set("outcome")(x.k)} className={`rounded-xl border p-3 text-left text-[13px] ${f.outcome === x.k ? "border-brand bg-brand-soft" : "border-line hover:bg-surface"}`}><b className="block text-[13.5px]">{x.title}</b><span className="text-muted">{x.text}</span></button>))}</div>
        </Q>
        {f.outcome === "tender" && (
          <div className="pop grid grid-cols-1 gap-2 rounded-xl border border-line p-3 @2xl:grid-cols-[1fr_auto]">
            {f.file ? <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[13px]"><Icon n="doc" s={15} /><span className="min-w-0 flex-1 truncate"><b>{f.file}</b></span><button onClick={() => set("file")("")} className="text-[12.5px] font-semibold text-brand">Change</button></div>
              : <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-line px-3 py-2 text-[13px] hover:bg-surface"><Icon n="upload" s={15} /><span>Attach the tender document</span><input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => set("file")(e.target.files?.[0]?.name ?? "")} /></label>}
            <Choice value={f.eord} onChange={set("eord")} aria-label="Bid due" options={["14", "30", "45", "60"].map((d) => ({ value: d, label: `Bid due in ${d} days` }))} />
          </div>)}
        {f.outcome === "callback" && <div className="pop"><Choice value={f.days} onChange={set("days")} aria-label="Remind me" className="w-auto" options={["2", "7", "14", "30"].map((d) => ({ value: d, label: `Remind me in ${d} days` }))} /></div>}
        {f.outcome === "notInterested" && <div className="pop"><Choice value={f.reason} onChange={set("reason")} aria-label="Reason" className="w-auto" options={["Already chose a supplier", "Project on hold", "Price expectations too low", "Wants a local firm", "No lifts planned"]} /></div>}
        <Btn disabled={!ok} onClick={save}>Save the conversation</Btn>
        {!ok && <p className="t-small">Write what was said and pick what happens next{f.outcome === "tender" ? ", and attach the tender document" : ""}.</p>}
      </div>
    </Panel>
  );
}

export function ConfigNI({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s } = useApp();
  const tn = tenderOf(s, o.tenderId);
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Opens the bid builder. Read the tender document and answer what it leaves open." then={`${NAMES[MANAGER]} prepares the bid: price, papers and any competitor part named in the tender.`}>
      {tn && <Btn onClick={() => openOffer(tn.id)}>{tn.doc ? "Fill in the lift details" : "Upload the tender document"}</Btn>}
    </Panel>
  );
}

const TERMS = ["Payment terms match our standard (10 / 60 / 30)", "Delivery date and late-delivery penalty are acceptable", "Warranty and free maintenance period are clear", "Liability is capped at the order value"];

export function BidReviewPanel({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const tn = tenderOf(s, o.tenderId); const of = offerOf(s, o.offerId);
  const [ok, setOk] = useState<string[]>([]); const [note, setNote] = useState("");
  if (!tn) return null;
  const papers = tn.checklist.filter((c) => c.done).length;
  return (
    <Panel title={t.title} why={t.detail ?? ""} does={`Passes the bid to ${NAMES[o.owner]} to confirm, or sends it back to ${NAMES[MANAGER]} with your note.`} then={`${NAMES[o.owner]} checks it against what the customer asked, then sends it.`}>
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        <div className="rounded-xl border border-line p-3"><div className="t-label mb-2">Contract terms</div><div className="flex flex-col gap-1.5">{TERMS.map((x) => <Check key={x} checked={ok.includes(x)} onChange={() => setOk((v) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x]))}>{x}</Check>)}</div></div>
        <div className="rounded-xl border border-line p-3"><div className="t-label mb-2">Papers · {papers} of {BID_PAPERS.length} ready</div><ul className="space-y-1 text-[13px]">{tn.checklist.map((c) => <li key={c.t} className="flex gap-2"><span className={c.done ? "text-emerald-600" : "text-brand"}>{c.done ? "✓" : "○"}</span>{c.t}</li>)}</ul></div>
      </div>
      {of && <p className="mt-3 text-[13px] text-muted">Bid price <b className="text-ink">{inr(of.price)}</b> after {of.discountPct}% off · due in {Math.max(0, daysTo(s, tn.eord))} days</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn disabled={ok.length < TERMS.length || papers < BID_PAPERS.length} onClick={() => mutate((st) => OP.bidReviewed(st, o.id, me!.id, true))}><Icon n="check" s={15} /> Terms and papers are fine</Btn>
        <Btn v="ghost" onClick={() => openOffer(tn.id)}>Open the bid</Btn>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the Sales Manager change?" aria-label="What should change" className="min-w-0 flex-1" /><Btn v="ghost" disabled={!note.trim()} onClick={() => mutate((st) => OP.bidReviewed(st, o.id, me!.id, false, note.trim()))}>Send back</Btn></div>
    </Panel>
  );
}

export function BidConfirmPanel({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const tn = tenderOf(s, o.tenderId); const of = offerOf(s, o.offerId); const ask = o.talks?.at(-1);
  const [note, setNote] = useState("");
  if (!tn) return null;
  const docSays = (k: RegExp) => tn.doc?.found.find((x) => k.test(x.label))?.value;
  const rows: [string, string, string][] = [
    ["Lifts", ask?.wants.lifts || docSays(/lift/i) || "–", String(tn.lifts)],
    ["Floors", ask?.wants.floors || docSays(/floor|stop/i) || "–", docSays(/floor|stop/i) ?? "As in the tender"],
    ["When", ask?.wants.when || "–", docSays(/deliver|complet|month/i) ?? "As in the tender"],
    ["Price", "–", of ? `${inr(of.price)} (${of.discountPct}% off)` : "–"],
  ];
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Confirms the bid, or sends it back to the Sales Manager with what does not match." then="You send it to the customer, or download it for the tender portal.">
      <div className="overflow-hidden rounded-xl border border-line text-[13px]">
        <div className="grid grid-cols-[7rem_1fr_1fr] gap-2 bg-surface px-3 py-2 t-label"><span /><span>Customer asked</span><span>The bid</span></div>
        {rows.map((r) => <div key={r[0]} className="grid grid-cols-[7rem_1fr_1fr] gap-2 border-t border-line px-3 py-2"><span className="text-muted">{r[0]}</span><span>{r[1]}</span><span className="font-medium">{r[2]}</span></div>)}
      </div>
      {ask && <p className="mt-2 t-small">From your {ask.how.toLowerCase()} with {ask.with.name || "the customer"}, {ago(now - ask.at)}: “{ask.said}”</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn onClick={() => mutate((st) => OP.bidConfirmed(st, o.id, me!.id, true))}><Icon n="check" s={15} /> It matches</Btn>
        <Btn v="ghost" onClick={() => openOffer(tn.id)}>Open the bid</Btn>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What does not match?" aria-label="What does not match" className="min-w-0 flex-1" /><Btn v="ghost" disabled={!note.trim()} onClick={() => mutate((st) => OP.bidConfirmed(st, o.id, me!.id, false, note.trim()))}>Send back</Btn></div>
    </Panel>
  );
}

export function AgreedForm({ o, onDone }: { o: Opp; onDone?: () => void }) {
  const { s, me, now, mutate } = useApp();
  const of = offerOf(s, o.offerId);
  const [f, setF] = useState({ price: String(o.agreed?.price ?? of?.price ?? o.value ?? ""), start: iso(o.agreed?.start ?? now + 60 * DAY), how: o.agreed?.how ?? "Signed letter of intent", proof: o.agreed?.proof ?? "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const price = Number(f.price.replace(/[^\d]/g, ""));
  const ok = price > 0 && f.start && f.proof;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3">
        <label className="text-[12.5px] font-medium text-muted">Agreed price (₹)<Input value={f.price} onChange={(e) => set("price")(e.target.value)} inputMode="numeric" className="mt-1 text-ink" /></label>
        <label className="text-[12.5px] font-medium text-muted">Start date<Input type="date" value={f.start} onChange={(e) => set("start")(e.target.value)} className="mt-1 text-ink" /></label>
        <label className="text-[12.5px] font-medium text-muted">How they agreed<Choice value={f.how} onChange={set("how")} options={["Signed letter of intent", "Purchase order", "Email", "Verbal on a call"]} className="mt-1 text-ink" /></label>
      </div>
      {of && price > 0 && price !== of.price && <p className="t-small">{price < of.price ? `${inr(of.price - price)} below` : `${inr(price - of.price)} above`} the price we sent ({inr(of.price)}).</p>}
      {f.proof ? <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[13px]"><Icon n="doc" s={15} /><span className="min-w-0 flex-1 truncate">The customer&apos;s yes: <b>{f.proof}</b></span><button onClick={() => set("proof")("")} className="text-[12.5px] font-semibold text-brand">Change</button></div>
        : <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-line px-3 py-2.5 text-[13px] hover:bg-surface"><Icon n="upload" s={15} /><span>Attach the customer&apos;s yes (letter, purchase order, email or call note)</span><input type="file" className="sr-only" onChange={(e) => set("proof")(e.target.files?.[0]?.name ?? "")} /></label>}
      <Btn disabled={!ok} onClick={() => { mutate((st) => OP.agreed(st, o.id, me!.id, { price, start: fromIso(f.start), how: f.how, proof: f.proof })); onDone?.(); }}><Icon n="check" s={15} /> Send to the Sales Manager</Btn>
    </div>
  );
}

export function AgreedPanel({ o, t }: { o: Opp; t: Task }) {
  return (
    <Panel title={t.title} why={t.detail ?? "Record what the customer agreed to."} does="Records the agreed price, start date and how they agreed, with the customer's yes attached." then={`${NAMES[MANAGER]} approves the win, then Sales support creates the order.`}>
      <AgreedForm o={o} />
    </Panel>
  );
}

export function FollowupNI({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const of = offerOf(s, o.offerId); const tn = tenderOf(s, o.tenderId);
  const [mode, setMode] = useState<"" | "agreed" | "no">(""); const [why, setWhy] = useState("Price");
  const late = tn ? daysTo(s, tn.eord) <= 7 : false;
  return (
    <Panel title={t.title} why={`${t.detail ?? ""}${tn ? ` Bid due ${tn.stage === "final" ? "and marked final" : `in ${Math.max(0, daysTo(s, tn.eord))} days`}.` : ""}`} does="Send a reminder or a changed quote, or record the customer's answer." then="When the customer agrees, the Sales Manager approves the win and Sales support creates the order.">
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setMode(mode === "agreed" ? "" : "agreed")}><Icon n="check" s={15} /> Customer agreed</Btn>
        {of && <Btn v="ghost" onClick={() => openOffer(of.id)}>Send a reminder</Btn>}
        {of && <Btn v="ghost" onClick={() => openOffer(tn?.id ?? of.id)}>Send a changed {tn ? "bid" : "quote"}</Btn>}
        {tn && tn.stage !== "final" && <Btn v={late ? "soft" : "ghost"} onClick={() => mutate((st) => OP.markFinal(st, o.id, me!.id))}>Mark the bid final</Btn>}
        <Btn v="ghost" onClick={() => setMode(mode === "no" ? "" : "no")}>Customer said no</Btn>
      </div>
      {late && tn?.stage !== "final" && <p className="mt-2 text-[12.5px] text-amber-800">The order deadline is near. Mark the bid final when nothing will change.</p>}
      {mode === "agreed" && <div className="pop mt-4 rounded-xl border border-line p-3"><AgreedForm o={o} /></div>}
      {mode === "no" && of && (
        <div className="pop mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
          <Choice value={why} onChange={setWhy} aria-label="Reason" className="w-auto" options={["Price", "Competitor offer", "Customer postponed", "Specification not met", "No reply"]} />
          <Btn v="danger" onClick={() => mutate((st) => { SH.outcome(st, of.id, me!.id, "lost", why); if (of.source) A.outcome(st, of.source.itemId, me!.id, "lost"); })}>Close as lost</Btn>
          <span className="t-small">The reason is shown the next time we deal with this customer.</span>
        </div>)}
    </Panel>
  );
}

export function ApproveWinPanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const of = offerOf(s, o.offerId); const a = o.agreed; const [note, setNote] = useState("");
  if (!a) return null;
  const diff = of ? a.price - of.price : 0;
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Approves the win so Sales support can create the order, or sends it back to the rep." then="Sales support creates the order. That is the win.">
      <Rows rows={[
        ["Customer", accountOf(s, o.accountId)?.name ?? o.placeName],
        ["Agreed price", <span key="p">{inr(a.price)}{of && diff !== 0 && <span className={`ml-1.5 text-[12px] ${diff < 0 ? "text-brand" : "text-emerald-700"}`}>{diff < 0 ? "−" : "+"}{inr(Math.abs(diff))} vs sent</span>}</span>],
        ["Discount sent", of ? `${of.discountPct}%` : "–"],
        ["Start", day(a.start)],
        ["How they agreed", a.how],
        ["Proof", <span key="f" className="inline-flex items-center gap-1"><Icon n="doc" s={13} />{a.proof}</span>],
        ["Recorded by", `${NAMES[a.by] ?? a.by}`],
      ]} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn onClick={() => mutate((st) => OP.winDecision(st, o.id, me!.id, true))}><Icon n="check" s={15} /> Approve the win</Btn>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" aria-label="What should change" className="min-w-0 flex-1" />
        <Btn v="ghost" disabled={!note.trim()} onClick={() => mutate((st) => OP.winDecision(st, o.id, me!.id, false, note.trim()))}>Ask for a change</Btn>
      </div>
    </Panel>
  );
}

export function OrderPanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, now, mutate } = useApp();
  const a = o.agreed;
  const [f, setF] = useState({ number: `SO-${new Date(now).getFullYear()}-${String(4000 + s.sherpa.seq).slice(-4)}`, delivery: iso((a?.start ?? now) + 120 * DAY), payment: "10% advance, 60% on delivery, 30% on handover" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  if (!a) return null;
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Creates the order in NewCRM. The deal counts as won now." then="The service lead for the area gets the handover pack and accepts the job.">
      <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3">
        <label className="text-[12.5px] font-medium text-muted">Order number<Input value={f.number} onChange={(e) => set("number")(e.target.value)} className="mt-1 font-mono text-ink" /></label>
        <label className="text-[12.5px] font-medium text-muted">Delivery date<Input type="date" value={f.delivery} onChange={(e) => set("delivery")(e.target.value)} className="mt-1 text-ink" /></label>
        <label className="text-[12.5px] font-medium text-muted">Payment terms<Choice value={f.payment} onChange={set("payment")} options={["10% advance, 60% on delivery, 30% on handover", "20% advance, 50% on delivery, 30% on handover", "Letter of credit, 100% on delivery"]} className="mt-1 text-ink" /></label>
      </div>
      <p className="mt-2 t-small">{inr(a.price)} · start {day(a.start)} · agreed by {a.how.toLowerCase()}</p>
      <Btn className="mt-3" disabled={!f.number.trim() || !f.delivery} onClick={() => mutate((st) => OP.createOrder(st, o.id, me!.id, { number: f.number.trim(), delivery: fromIso(f.delivery), payment: f.payment }))}><Icon n="check" s={15} /> Create the order</Btn>
    </Panel>
  );
}

export function HandoverPack({ o }: { o: Opp }) {
  const { s } = useApp();
  if (!o.order || !o.agreed) return null;
  const acc = accountOf(s, o.accountId); const tn = tenderOf(s, o.tenderId); const ask = o.talks?.at(-1);
  const papers = [o.agreed.proof, ...(tn?.doc ? [tn.doc.name] : []), ...(tn ? BID_PAPERS.map((p) => p.title) : []), ...(offerOf(s, o.offerId)?.attachment ? [offerOf(s, o.offerId)!.attachment!] : [])];
  return (
    <Card className="p-5">
      <Label>Handover pack</Label>
      <Rows rows={[
        ["Customer", acc?.name ?? o.placeName],
        ["Site", `${o.placeName}, ${AREA_NAME[o.area] ?? o.area}`],
        ["Contact", o.contact ? `${o.contact.name}, ${o.contact.role}${o.contact.phone ? ` · ${o.contact.phone}` : ""}` : "–"],
        ["Lifts", `${tn?.lifts ?? ask?.wants.lifts ?? "–"} lift${Number(tn?.lifts ?? ask?.wants.lifts) === 1 ? "" : "s"}${ask?.wants.floors ? `, ${ask.wants.floors}` : ""}`],
        ["Order", `${o.order.number} · delivery ${day(o.order.delivery)}`],
        ["Price", inr(o.agreed.price)],
        ["Payment terms", o.order.payment],
        ...(o.job?.acceptedAt ? [["Job", `Accepted by ${NAMES[o.job.lead]} · start ${day(o.job.start!)} · site contact ${o.job.siteContact?.name}`] as [string, string]] : o.job ? [["Job", `With ${NAMES[o.job.lead]} to accept`] as [string, string]] : []),
      ]} />
      <div className="mt-3 t-label">Attached papers</div>
      <ul className="mt-1 space-y-1 text-[13px]">{papers.map((p) => <li key={p} className="flex items-center gap-1.5"><Icon n="doc" s={13} />{p}</li>)}</ul>
    </Card>
  );
}

export function JobPanel({ o, t }: { o: Opp; t: Task }) {
  const { me, now, mutate } = useApp();
  const [f, setF] = useState({ start: iso(o.agreed?.start ?? now + 30 * DAY), name: o.contact?.name ?? "", phone: o.contact?.phone ?? "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Accepts the job. The rep and the customer's contact are told the planned start." then="Your team plans the installation.">
      <div className="space-y-3">
        <HandoverPack o={o} />
        <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-3">
          <label className="text-[12.5px] font-medium text-muted">Planned start<Input type="date" value={f.start} onChange={(e) => set("start")(e.target.value)} className="mt-1 text-ink" /></label>
          <label className="text-[12.5px] font-medium text-muted">Site contact<Input value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="Name" className="mt-1 text-ink" /></label>
          <label className="text-[12.5px] font-medium text-muted">Phone<Input value={f.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="Phone" className="mt-1 text-ink" /></label>
        </div>
        <Btn disabled={!f.start || !f.name.trim()} onClick={() => mutate((st) => OP.acceptJob(st, o.id, me!.id, { start: fromIso(f.start), siteContact: { name: f.name.trim(), phone: f.phone.trim() || undefined } }))}><Icon n="check" s={15} /> Accept the job</Btn>
      </div>
    </Panel>
  );
}

export function LossMemory({ o }: { o: Opp }) {
  const { s, now } = useApp();
  const l = lastLoss(s, o);
  if (!l) return null;
  return <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-[13.5px] text-amber-900"><Icon n="warn" s={16} /><span><b>Why we lost here last time:</b> {l.reason}<span className="block text-[12px] opacity-80">{l.title} · {ago(now - l.at)}</span></span></div>;
}

export function Talks({ o }: { o: Opp }) {
  const { now } = useApp();
  if (!o.talks?.length) return null;
  const OUT: Record<TalkOutcome, string> = { quote: "Wants a quote", tender: "Has a formal tender", callback: "Call back later", notInterested: "Not interested" };
  return (
    <Card className="p-5">
      <Label>Conversations with the customer</Label>
      <ol className="space-y-3">{[...o.talks].reverse().map((t, k) => (
        <li key={k} className="rounded-xl border border-line p-3 text-[13px]">
          <div className="flex flex-wrap items-center justify-between gap-2"><b>{t.how} with {t.with.name || "the customer"}{t.with.role ? `, ${t.with.role}` : ""}</b><span className="rounded-md bg-surface px-2 py-0.5 text-[12px] font-semibold">{OUT[t.outcome]}</span></div>
          <p className="mt-1">{t.said}</p>
          {(t.wants.lifts || t.wants.floors || t.wants.when) && <p className="mt-1 t-small">Wants: {[t.wants.lifts && `${t.wants.lifts} lifts`, t.wants.floors, t.wants.when].filter(Boolean).join(" · ")}</p>}
          {t.reason && t.outcome === "notInterested" && <p className="mt-1 t-small">Reason: {t.reason}</p>}
          <p className="mt-1 t-small">{NAMES[t.by] ?? t.by} · {ago(now - t.at)}</p>
        </li>))}</ol>
    </Card>
  );
}
