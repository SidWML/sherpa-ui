"use client";
import { useState } from "react";
import { A, useApp } from "@/lib/store";
import { AREA_NAME, BID_PAPERS, DAY, MANAGER, NAMES, OP, PRODUCT, SH, SUPPORT, accountOf, daysTo, inr, lastLoss, listPrice, offerOf, researchFindings, tenderOf } from "@/lib/sherpa";
import type { Opp, ProductKey, Task, TalkOutcome } from "@/lib/types";
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
      <div className="space-y-3">
        <div className="rounded-xl border border-brand/40 bg-brand-soft/40 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white"><Icon n="search" s={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><b className="text-[14px]">Ask Sales support</b><span className="rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white">Recommended</span></div>
              <p className="mt-0.5 text-[13px] text-muted">Pick what they should look for. You can choose more than one.</p>
              <div className="mt-3 flex flex-wrap gap-2">{WANTS.map((w) => { const on = want.includes(w); return <button key={w} type="button" aria-pressed={on} onClick={() => toggle(w)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-surface"}`}>{on && <Icon n="check" s={12} w={3} />}{w}</button>; })}</div>
              <button type="button" disabled={!want.length} onClick={() => mutate((st) => OP.research(st, o.id, by, want))} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[13.5px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto"><Icon n="send" s={14} /> Send to {NAMES[SUPPORT]?.split(" ")[0]}{want.length ? ` (${want.length})` : ""}</button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-ink"><Icon n="users" s={18} /></span>
            <div className="min-w-0 flex-1">
              <b className="text-[14px]">Ask {canAsk ? NAMES[reporter!] : "the person who spotted it"}</b>
              <p className="mt-0.5 text-[13px] text-muted">{canAsk ? "They saw the site. They check the hoarding for a developer name and phone." : "You spotted it yourself, so there is nobody else to ask."}</p>
              <button type="button" disabled={!canAsk} onClick={() => mutate((st) => OP.askReporter(st, o.id, by))} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[13.5px] font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto">Ask {canAsk ? NAMES[reporter!]?.split(" ")[0] : "reporter"}</button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-ink"><Icon n="pin" s={18} /></span>
            <div className="min-w-0 flex-1">
              <b className="text-[14px]">I will find them myself</b>
              <p className="mt-0.5 text-[13px] text-muted">Walk in or call the site office, then record the conversation.</p>
              <button type="button" onClick={() => mutate((st) => OP.selfContact(st, o.id, by))} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[13.5px] font-semibold text-ink transition hover:bg-surface @md:w-auto">Start myself</button>
            </div>
          </div>
        </div>
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

const OUTCOMES: { k: TalkOutcome; title: string; text: string; icon: string; tone: string; soft: string; cta: string }[] = [
  { k: "quote", title: "Wants a quote", text: "We quote the customer directly.", icon: "doc", tone: "#1d4ed8", soft: "#e6effd", cta: "Save and start the quote" },
  { k: "tender", title: "Has a formal tender", text: "Attach the document. Sales support fills in the lift details.", icon: "layers", tone: "#7c3aed", soft: "#ece9fb", cta: "Save and send to Sales support" },
  { k: "callback", title: "Call back later", text: "No answer, or not the right time. A reminder is set.", icon: "clock", tone: "#9a6a00", soft: "#fdf0cf", cta: "Save and set the reminder" },
  { k: "notInterested", title: "Not interested", text: "The lead is closed with a reason.", icon: "x", tone: "#b4121f", soft: "#fdecee", cta: "Save and close the lead" },
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
          <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">{OUTCOMES.map((x) => { const on = f.outcome === x.k; return (
            <button key={x.k} type="button" aria-pressed={on} onClick={() => set("outcome")(x.k)} className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${on ? "border-brand bg-brand-soft/60 shadow-sm" : "border-line bg-white hover:bg-surface"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: x.soft, color: x.tone }}><Icon n={x.icon} s={18} /></span>
              <span className="min-w-0 flex-1 pr-6"><b className="block text-[13.5px]">{x.title}</b><span className="text-[12.5px] leading-snug text-muted">{x.text}</span></span>
              <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border-2 ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{on && <Icon n="check" s={11} w={3.5} />}</span>
            </button>); })}</div>
        </Q>
        {f.outcome === "tender" && (
          <div className="pop overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[12.5px] font-semibold"><span className="text-violet-700"><Icon n="layers" s={14} /></span>Tender details</div>
            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1.5 text-[13px] font-semibold">Tender document</div>
                {f.file
                  ? <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-700"><Icon n="doc" s={17} /></span><span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{f.file}</b><span className="text-xs text-emerald-800">Attached</span></span><button type="button" onClick={() => set("file")("")} className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-emerald-800 hover:bg-emerald-100">Replace</button></div>
                  : <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface/60 px-4 py-6 text-center transition hover:border-brand/50 hover:bg-brand-soft/40"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand shadow-sm"><Icon n="upload" s={20} /></span><span className="text-[13.5px] font-semibold">Attach the tender document</span><span className="text-xs text-muted">PDF, DOC or DOCX · click to choose a file</span><input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => set("file")(e.target.files?.[0]?.name ?? "")} /></label>}
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-semibold">When is the bid due?</div>
                <div role="group" aria-label="Bid due" className="grid grid-cols-4 gap-2">{["14", "30", "45", "60"].map((d) => { const on = f.eord === d; return <button key={d} type="button" aria-pressed={on} onClick={() => set("eord")(d)} className={`rounded-lg border py-2 text-center transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-surface"}`}><span className="num block text-[17px] font-semibold leading-none">{d}</span><span className={`text-[11px] ${on ? "text-white/80" : "text-muted"}`}>days</span></button>; })}</div>
              </div>
            </div>
          </div>)}
        {f.outcome === "callback" && (
          <div className="pop overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[12.5px] font-semibold"><span className="text-amber-700"><Icon n="clock" s={14} /></span>Remind me to call back</div>
            <div className="grid grid-cols-4 gap-2 p-4">{["2", "7", "14", "30"].map((d) => { const on = f.days === d; return <button key={d} type="button" aria-pressed={on} onClick={() => set("days")(d)} className={`rounded-lg border py-2 text-center transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-surface"}`}><span className="num block text-[17px] font-semibold leading-none">{d}</span><span className={`text-[11px] ${on ? "text-white/80" : "text-muted"}`}>days</span></button>; })}</div>
          </div>)}
        {f.outcome === "notInterested" && (
          <div className="pop overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[12.5px] font-semibold"><span className="text-red-700"><Icon n="x" s={14} /></span>Why are they not interested?</div>
            <div className="flex flex-wrap gap-2 p-4">{["Already chose a supplier", "Project on hold", "Price expectations too low", "Wants a local firm", "No lifts planned"].map((r) => { const on = f.reason === r; return <button key={r} type="button" aria-pressed={on} onClick={() => set("reason")(r)} className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-surface"}`}>{r}</button>; })}</div>
          </div>)}
        {(() => {
          const out = OUTCOMES.find((x) => x.k === f.outcome);
          const steps: [string, boolean][] = [["What was said", !!f.said.trim()], ["Who you spoke to", f.outcome === "callback" || !!f.name], ["Next step", !!f.outcome], ...(f.outcome === "tender" ? ([["Tender document", !!f.file]] as [string, boolean][]) : [])];
          return (
            <div className="rounded-xl border border-line bg-surface/60 p-3">
              <div className="flex flex-wrap gap-1.5">{steps.map(([l, done]) => <span key={l} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${done ? "bg-emerald-100 text-emerald-800" : "bg-white text-muted ring-1 ring-line"}`}>{done ? <Icon n="check" s={11} w={3} /> : <span className="h-2 w-2 rounded-full border border-current" />}{l}</span>)}</div>
              <button type="button" disabled={!ok} onClick={save} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-4 text-[14px] font-semibold text-white transition hover:border-brand-dark hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"><Icon n="check" s={15} w={2.5} />{out ? out.cta : "Save the conversation"}</button>
            </div>);
        })()}
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

/* ---------------- after the order: the account manager and the other reps ---------------- */
const LINE_INFO: { k: "ni" | "ei" | "sc" | "mod"; label: string; icon: string }[] = [
  { k: "ni", label: "New installation", icon: "layers" }, { k: "ei", label: "Existing lifts", icon: "gear" }, { k: "sc", label: "Service contract", icon: "shield" }, { k: "mod", label: "Modernisation", icon: "bolt" },
];

export function AccountUpdatePanel({ o, t }: { o: Opp; t: Task }) {
  const { s, me, mutate } = useApp();
  const acc = accountOf(s, o.accountId) ?? s.sherpa.accounts.find((a) => a.name === o.placeName);
  const lines = acc?.lines ?? { ni: false, ei: false, sc: false, mod: false };
  const [send, setSend] = useState<("ei" | "mod")[]>([]); const [note, setNote] = useState("");
  const toggle = (k: "ei" | "mod") => setSend((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  const offering = s.sherpa.tasks.some((x) => !x.done && x.oppId === o.id && x.kind === "handover");
  const options: { k: "ei" | "mod"; title: string; text: string }[] = [
    { k: "ei", title: "Existing lifts", text: "Other lifts at this customer that need service or repair." },
    { k: "mod", title: "Modernisation", text: "Older units here that could be modernised." },
  ];
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Saves what you know on the account and sends a handover pack to each rep you pick." then="Each rep gets a to-do with the customer, the lifts and the order, and drafts their own offer.">
      <div className="mb-4 rounded-xl border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-2"><b className="text-[14px]">{acc?.name ?? o.placeName}</b>{acc ? <span className="t-small">Last contact {ago(Date.now() + s.clock - acc.lastActivity)}</span> : <span className="t-small">New customer record</span>}</div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 @xl:grid-cols-4">{LINE_INFO.map((l) => { const on = lines[l.k] || send.includes(l.k as "ei" | "mod") || (l.k === "sc" && offering); const state = l.k === "ni" ? "Just sold" : l.k === "sc" && offering ? "Being offered" : send.includes(l.k as "ei" | "mod") ? "Handing over" : lines[l.k] ? "Active" : "Not yet"; return (
          <div key={l.k} className={`rounded-lg border px-2.5 py-2 ${on ? "border-emerald-200 bg-emerald-50" : "border-dashed border-line bg-surface/60"}`}><span className={`grid h-7 w-7 place-items-center rounded-md ${on ? "bg-white text-emerald-700" : "bg-white text-muted"}`}><Icon n={l.icon} s={14} /></span><div className="mt-1.5 text-[12.5px] font-semibold leading-tight">{l.label}</div><div className={`text-[11.5px] ${on ? "text-emerald-800" : "text-muted"}`}>{state}</div></div>); })}</div>
      </div>
      <div className="text-[13px] font-semibold">What else could other teams sell here?</div>
      <div className="mt-1.5 grid grid-cols-1 gap-2 @xl:grid-cols-2">{options.map((x) => { const to = s.cfg.owners[o.area]?.[x.k.toUpperCase() as "EI" | "MOD"]; const on = send.includes(x.k); const had = !!lines[x.k]; return (
        <button key={x.k} type="button" disabled={had || !to} aria-pressed={on} onClick={() => toggle(x.k)} className={`relative rounded-xl border p-3 pr-9 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${on ? "border-brand bg-brand-soft/60" : "border-line bg-white hover:bg-surface"}`}>
          <b className="block text-[13.5px]">{x.title}</b><span className="text-[12.5px] text-muted">{had ? "Already being worked on." : x.text}</span>{to && !had && <span className="mt-1.5 block text-[12px] font-medium">Send to {NAMES[to]}</span>}
          <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-md border-2 ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{on && <Icon n="check" s={11} w={3.5} />}</span>
        </button>); })}</div>
      <div className="mt-3"><div className="mb-1.5 text-[13px] font-semibold">Note for the account <span className="font-normal text-muted">(optional)</span></div><Field v={note} set={setNote} ph="e.g. Developer plans two more towers next year. Contact prefers WhatsApp." area /></div>
      <button type="button" onClick={() => mutate((st) => OP.updateAccount(st, t.id, me!.id, { handovers: send, note }))} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-4 text-[14px] font-semibold text-white transition hover:border-brand-dark hover:bg-brand-dark @md:w-auto"><Icon n="check" s={15} w={2.5} />{send.length ? `Update the account and send ${send.length} handover${send.length > 1 ? "s" : ""}` : "Update the account"}</button>
    </Panel>
  );
}

export function HandoverOfferPanel({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const acc = accountOf(s, o.accountId) ?? s.sherpa.accounts.find((a) => a.name === o.placeName);
  const defaultProduct: ProductKey = /\bMOD\b/i.test(t.title) ? "modernisation" : "maintenance";
  const [product, setProduct] = useState<ProductKey>(defaultProduct); const [term, setTerm] = useState(3); const [disc, setDisc] = useState(0);
  const yearly = PRODUCT[product].yearly; const termUsed = yearly ? term : 1;
  const list = listPrice(o.area, product, termUsed); const price = Math.round(list * (1 - disc / 100));
  const pill = (on: boolean) => `rounded-lg border px-3 py-2 text-center text-[13px] font-semibold transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-surface"}`;
  return (
    <Panel title={t.title} why={t.detail ?? ""} does="Drafts an offer for this customer, priced from the area price list. It becomes your own opportunity." then="You review the draft, get any approval it needs, and send it to the customer.">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-[13px]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink"><Icon n="users" s={17} /></span><span className="min-w-0"><b className="block truncate">{acc?.name ?? o.placeName}</b><span className="text-muted">{AREA_NAME[o.area] ?? o.area} · order {o.order?.number ?? "placed"}{acc ? ` · ${acc.contact.name}` : ""}</span></span></div>
      <div className="space-y-4">
        <div><div className="mb-1.5 text-[13px] font-semibold">What do you offer?</div><div className="grid grid-cols-2 gap-2">{(["maintenance", "modernisation"] as ProductKey[]).map((p) => <button key={p} type="button" aria-pressed={product === p} onClick={() => setProduct(p)} className={pill(product === p)}>{PRODUCT[p].label}</button>)}</div></div>
        {yearly && <div><div className="mb-1.5 text-[13px] font-semibold">For how long?</div><div className="grid grid-cols-3 gap-2">{[1, 3, 5].map((y) => <button key={y} type="button" aria-pressed={term === y} onClick={() => setTerm(y)} className={pill(term === y)}><span className="num text-[16px]">{y}</span> <span className="text-[11.5px] font-medium opacity-80">year{y > 1 ? "s" : ""}</span></button>)}</div></div>}
        <div><div className="mb-1.5 text-[13px] font-semibold">Discount</div><div className="grid grid-cols-4 gap-2">{[0, 5, 10, 15].map((d) => <button key={d} type="button" aria-pressed={disc === d} onClick={() => setDisc(d)} className={pill(disc === d)}>{d}%</button>)}</div>{disc > 10 && <p className="mt-1.5 text-xs text-amber-800">Above 10% the Sales Manager has to approve before it is sent.</p>}</div>
        <div className="overflow-hidden rounded-xl border border-line text-[13px]">
          <div className="flex justify-between px-3 py-2"><span className="text-muted">List price{yearly ? ` · ${termUsed} year${termUsed > 1 ? "s" : ""}` : ""}</span><span className="num">{inr(list)}</span></div>
          <div className="flex justify-between border-t border-line px-3 py-2"><span className="text-muted">Discount {disc}%</span><span className="num">− {inr(list - price)}</span></div>
          <div className="flex justify-between border-t border-line bg-brand-soft/50 px-3 py-2.5"><b>Offer price</b><b className="num text-[15px]">{inr(price)}</b></div>
        </div>
        <button type="button" onClick={() => { let id: string | undefined; mutate((st) => { id = OP.offerHandover(st, t.id, me!.id, { product, term: termUsed, discountPct: disc })?.id; }); if (id) openOffer(id); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-4 text-[14px] font-semibold text-white transition hover:border-brand-dark hover:bg-brand-dark @md:w-auto"><Icon n="send" s={15} />Draft the offer</button>
      </div>
    </Panel>
  );
}
