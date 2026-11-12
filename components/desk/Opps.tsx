"use client";
import { useState, type ReactNode } from "react";
import { A, useApp } from "@/lib/store";
import { USERS } from "@/lib/data";
import { AREA_NAME, GUIDE, KIND_LABEL, NAMES, OP, STAGES, SH, accountOf, daysTo, inr, isOpen, offerOf, oppOf, tasksOfOpp, tenderOf, visitorFor } from "@/lib/sherpa";
import type { Opp, State, Task } from "@/lib/types";
import { Btn, Card, Empty, Icon, Pill, ago } from "../ui";
import { Back, Fold, Label } from "./Action";
import { Page } from "./Common";
import { OfferPill } from "./Offers";

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
  const stageIdx = Math.max(0, STAGES.findIndex((x) => x[0] === o.stage));
  const reporter = o.source.reporter ? NAMES[o.source.reporter] : undefined;

  return (
    <div className={`mx-auto max-w-5xl ${embedded ? "p-4" : "p-4 @2xl:p-8"}`}>
      {!embedded && <Back onClick={onBack} label="Back to opportunities" />}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><Pill tone="blue">{KIND_LABEL[o.kind]}</Pill>{o.unrouted && <Pill tone="red">No owner</Pill>}<Pill>from {o.source.label}</Pill></div>
        {!embedded && <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">{o.title}</h1>}
        <p className="mt-1 text-sm text-muted">{o.placeName} · {AREA_NAME[o.area] ?? o.area} · owner {NAMES[o.owner] ?? o.owner}{reporter ? ` · spotted by ${reporter}` : ""}{o.value ? ` · worth ${inr(o.value)}` : ""}</p>
      </header>

      {/* where it is, and whose move it is */}
      <Card className="mb-5 p-5">
        <ol className="flex items-center gap-0">{STAGES.map(([k, l], i) => (
          <li key={k} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center"><div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : i <= stageIdx ? "bg-brand" : "bg-line"}`} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${i < stageIdx || o.stage === "won" ? "border-brand bg-brand text-white" : i === stageIdx ? "border-brand bg-white text-brand ring-4 ring-brand/15" : "border-line bg-white"}`}>{(i < stageIdx || o.stage === "won") && <Icon n="check" s={12} w={3} />}</span><div className={`h-0.5 flex-1 ${i === STAGES.length - 1 ? "opacity-0" : i < stageIdx ? "bg-brand" : "bg-line"}`} /></div>
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
              : <div className="rounded-xl bg-amber-50 p-3 text-[13.5px] text-amber-900"><b>No contact yet.</b> The photo only shows a building. Until there is a decision-maker, nobody can call anyone. The owner decides how to find one: ask the person who spotted it, ask Sales support to research it, or walk in.</div>}
          </Card>
          {(tender || offer) && (
            <Card className="p-5">
              <Label>Tender and offer</Label>
              <div className="space-y-3">
                {tender && <div className="rounded-xl border border-line p-3 text-[13.5px]"><div className="flex items-center justify-between gap-2"><b>{tender.id} · {tender.name}</b><Pill tone={tender.stage === "final" ? "green" : "gray"}>{tender.stage === "final" ? "Final bidding" : tender.stage}</Pill></div><div className="mt-1 text-xs text-muted">The customer&apos;s formal request. Bid due in {Math.max(0, daysTo(s, tender.eord))} days. {tender.competitorSpec ? "The spec names a competitor product." : ""}</div><ul className="mt-2 space-y-1 text-[13px]">{tender.checklist.map((c) => <li key={c.t} className="flex gap-2"><span className={c.done ? "text-emerald-600" : "text-muted"}>{c.done ? "✓" : "○"}</span>{c.t}</li>)}</ul></div>}
                {offer && <button onClick={() => openOffer(offer.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left text-[13.5px] hover:bg-surface"><div><b>{offer.id} · {offer.title}</b><div className="text-xs text-muted">{tender ? "Our priced answer to the tender" : "Our offer to the customer"} · {inr(offer.price)} · {offer.discountPct}% off</div></div><span className="flex items-center gap-2"><OfferPill o={offer} /><Icon n="chev" s={14} /></span></button>}
              </div>
            </Card>
          )}
          <Card className="px-5 py-2"><Fold title="Timeline" count={`${o.log.length} events`}><ol className="space-y-3 text-[13px]">{[...o.log].reverse().map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by} · {ago(now - l.t)}</span></span></li>)}</ol></Fold></Card>
        </div>
        <Card className="p-5 @4xl:sticky @4xl:top-4">
          <Label>Who is doing what</Label>
          {all.length === 0 && <div className="text-sm text-muted">No steps yet.</div>}
          <ul className="space-y-3 text-[13px]">{all.slice().sort((a, b) => Number(a.done) - Number(b.done) || a.due - b.due).map((t) => (
            <li key={t.id} className="flex gap-2.5"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : t.due < now ? "border-brand" : "border-line"}`}>{t.done && <Icon n="check" s={9} w={4} />}</span><span className={t.done ? "text-muted line-through" : ""}>{t.title}<span className="block text-xs text-muted">{NAMES[t.forUser ?? ""] ?? "Anyone"} · {t.done ? `done ${ago(now - (t.doneAt ?? now))} ago` : t.due < now ? "overdue" : `due in ${Math.max(0, daysTo(s, t.due))} days`}</span></span></li>
          ))}</ul>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the step in front of me */
function Panel({ title, why, does, then, children }: { title: string; why: string; does?: string; then?: string; children: ReactNode }) {
  return (
    <Card className="border-brand/25">
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Your next step</div>
        <h2 className="mt-2 text-xl font-semibold leading-snug">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{why}</p>
        {(does || then) && <div className="mt-3 space-y-1 rounded-xl bg-surface p-3 text-[13px]">{does && <div><b>What happens:</b> {does}</div>}{then && <div><b>Then:</b> {then}</div>}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </Card>
  );
}
const Field = ({ v, set, ph, area }: { v: string; set: (x: string) => void; ph: string; area?: boolean }) => area
  ? <textarea value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="min-h-20 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-brand" />
  : <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="min-h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" />;

function TaskPanel({ o, t, openOffer }: { o: Opp; t: Task; openOffer: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const by = me!.id; const iid = o.source.itemId;
  const [f, setF] = useState({ name: "", role: "", phone: "", email: "", note: "", how: "Phone call", route: "" , reason: "Not a real opportunity", days: "30", to: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const offer = offerOf(s, o.offerId);
  const reporterId = o.source.reporter; const canAskReporter = !!reporterId && reporterId !== o.owner;
  const visitor = visitorFor(s, o);

  if (t.kind === "accept") return (
    <Panel title={`Accept this ${KIND_LABEL[o.kind].toLowerCase()} lead`} why={`${t.detail ?? o.title} Accepting makes you the owner. If nobody accepts within a day, the manager sees it as an exception.`} does={`Makes you the owner${o.source.reporter ? ` and tells ${NAMES[o.source.reporter]} it was accepted (+20 points for them)` : ""}.`} then={o.contact ? `You contact ${o.contact.name}.` : "You decide how to find a decision-maker, because we have no contact yet."}>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => mutate((st) => { const i = iid ? st.reports.flatMap((r) => r.items).find((x) => x.id === iid) : undefined; if (i && i.status === "new") A.accept(st, i.id, by); OP.accepted(st, o.id, by); })}><Icon n="check" s={15} /> Accept</Btn>
        <select value={f.reason} onChange={(e) => set("reason")(e.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm">{["Wrong area", "Not our product", "Duplicate", "Already in progress"].map((r) => <option key={r}>{r}</option>)}</select>
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
      <div className="space-y-2"><select value={f.how} onChange={(e) => set("how")(e.target.value)} className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm">{["Phone call", "Email", "Phone call and email"].map((x) => <option key={x}>{x}</option>)}</select>
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
    <Panel title="Qualify: tender or direct quote?" why="Is the customer asking several firms for prices through a formal tender with an end date, or can you offer directly? This decides what happens next." does="Creates the tender and an offer (formal), or an offer (direct). Or closes it if it is not a fit." then="Formal: Sales support completes the configuration and you fill the compliance sheet. Direct: you price it and send it for approval.">
      <div className="flex flex-wrap items-center gap-2">
        <select value={f.days} onChange={(e) => set("days")(e.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm">{["14", "30", "45", "60"].map((d) => <option key={d} value={d}>Bid due in {d} days</option>)}</select>
        <Btn onClick={() => mutate((st) => OP.qualify(st, o.id, by, "tender", Number(f.days)))}>Formal tender</Btn>
        <Btn v="ghost" onClick={() => mutate((st) => OP.qualify(st, o.id, by, "direct"))}>Direct quote</Btn>
        <select value={f.reason} onChange={(e) => set("reason")(e.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm">{["Not a real opportunity", "Customer not interested", "Already served by us"].map((r) => <option key={r}>{r}</option>)}</select>
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
    <Panel title={t.title} why={t.detail ?? ""} does={t.kind === "send" ? "Opens the email to edit and send." : t.kind === "followup" ? "Opens the offer with a follow-up email ready." : "Opens the offer so you can change the price or discount and submit it."} then={t.kind === "send" ? "A follow-up is set for 14 days. If the customer is silent it comes back to you." : t.kind === "followup" ? "Log the result when the customer answers: won or lost." : "It goes to the manager if the discount is above 10%."}>
      {offer && <Btn onClick={() => openOffer(offer.id)}>Open {offer.id}</Btn>}
    </Panel>
  );

  if (t.kind === "assign") return (
    <Panel title={t.title} why={t.detail ?? ""} does="Makes the person the owner and gives them an accept to-do." then="They accept within a day.">
      <div className="flex flex-wrap gap-2"><select value={f.to} onChange={(e) => set("to")(e.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="">Choose an owner</option>{USERS.filter((u) => !u.hidden && u.team === TEAM_FOR[o.kind]).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title.split("·")[0]}</option>)}</select>
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
