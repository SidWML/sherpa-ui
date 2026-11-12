"use client";
import { useState, type ReactNode } from "react";
import { A, effTier, stepsOf, useApp } from "@/lib/store";
import { OPENING } from "@/lib/engine";
import type { Item, Report, Role, State } from "@/lib/types";
import { Btn, Card, Icon } from "../ui";

export const DECLINE = ["Wrong area", "Not our product", "Duplicate", "Already in progress", "Other"];
export const NOT_REL = ["Customer not interested", "Already served by us", "Not a real opportunity", "Other"];
const OUTCOMES = ["Won", "Lost to a competitor", "Customer not interested", "On hold"];
const OUT: Record<string, "won" | "lost" | "notinterested" | "hold"> = { Won: "won", "Lost to a competitor": "lost", "Customer not interested": "notinterested", "On hold": "hold" };
const ENGINEERS = ["Luca Rossi", "Nadia Frei", "Pascal Egger"];
const RESULTS = ["Door operator replaced", "Re-adjusted and tested", "Part ordered, follow-up visit", "No fault found"];

/* ------------------------------------------------------------------ small shared pieces */
export function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="mb-4 flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"><Icon n="back" s={14} /> {label}</button>;
}
export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-3 t-label">{children}</div>;
}
export function Fold({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line py-3 first:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}{count && <span className="ml-2 text-xs font-normal text-muted">{count}</span>}</span>
        <span className="text-muted transition group-open:rotate-90"><Icon n="chev" s={15} /></span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------ next best action */
export interface Nba {
  title: string; why: string; cta: string; options?: string[];
  /** When set, pressing the button first asks for a short note. */
  form?: { options?: string[]; placeholder: string; cta: string };
  /** What pressing the button does, in plain words. */
  then?: string; /** What the user does after this step. */ next?: string; /** The confirmation shown after pressing. */ done?: string;
  run: (st: State, by: string, opt?: string, note?: string) => void;
}
export interface More { label: string; danger?: boolean; run?: (st: State, by: string) => void; ask?: { title: string; options?: string[]; text?: string; cta: string; apply: (st: State, by: string, v: string) => void } }

const TIER_WHY = { Hot: "Hot lead: act within one working day.", Warm: "Warm lead: act within three working days.", Cold: "Cold lead: review weekly.", Info: "For your information." } as const;

/** One recommended step for this item, from fixed rules. The seller can always choose something else under More actions. */
export function nbaFor(r: Report, it: Item, role: Role): Nba | null {
  if (it.status === "closed" || it.silent) return null;
  const id = it.id;
  if (it.kind === "emergency") {
    if (role === "svc") return null;
    const notOurs = r.input.brand === "other" || !r.input.inArea;
    if (it.step < 1) return { title: "Acknowledge the alert", why: "Nobody has acknowledged it yet. The target is 10 minutes. Acknowledging tells the reporter help is coming.", cta: "Acknowledge", run: (st, by) => A.ack(st, id, by) };
    if (!notOurs && !it.serviceOrder) return { title: "Dispatch an engineer", why: "This is our lift. A service order sends an engineer and tells the service team.", cta: "Dispatch", run: (st, by) => A.dispatch(st, id, by) };
    if (notOurs && !it.buildingInformed) return { title: "Notify the building owner", why: "Not our lift, or outside our area. Send the standard safety message so the owner can take it out of service.", cta: "Send message", run: (st, by) => A.notifyBuilding(st, id, by) };
    return { title: "Close the alert", why: "Everything needed has been done. Closing thanks the reporter and awards the Safety First badge.", cta: "Close alert", run: (st, by) => A.closeEmergency(st, id, by) };
  }
  if (it.team === "AM") {
    return it.status === "new"
      ? { title: "Review and coordinate with the local rep", why: "A key-customer site was sighted. The local rep owns the lead; you coordinate and avoid overlap.", cta: "Coordinate", run: (st, by) => A.coordinate(st, id, by) }
      : { title: "Add this site to the account plan", why: "The local rep has it. Record it in the account plan to close your task.", cta: "Add to account plan", run: (st, by) => A.accountPlan(st, id, by) };
  }
  if (it.team === "SVC") {
    if (it.status === "new") return { title: "Create the service ticket", why: "A fault was reported on a lift we maintain. Creating the ticket starts the repair and earns the reporter points.", cta: "Create ticket", run: (st, by) => A.svcAccept(st, id, by) };
    if (!it.engineer) return { title: "Assign an engineer", why: "The ticket is open. Pick who attends.", cta: "Assign", options: ENGINEERS, run: (st, by, o) => A.assignEngineer(st, id, by, o ?? ENGINEERS[0]) };
    return { title: "Close the ticket", why: `${it.engineer} is assigned. Record what was done to close it.`, cta: "Close ticket", options: RESULTS, run: (st, by, o) => A.closeTicket(st, id, by, o ?? RESULTS[0]) };
  }
  if (it.kind === "records") {
    const missing = r.input.records === "missing";
    return missing
      ? { title: "Add this lift to our records (+30)", why: "No record exists for this lift. Creating one grows the installed base and rewards the reporter.", cta: "Create record", run: (st, by) => A.records(st, id, by, "create") }
      : { title: "Confirm the match", why: "A candidate record matches the number, brand and place. Confirm to link this sighting to it.", cta: "Confirm match", run: (st, by) => A.records(st, id, by, "confirm") };
  }
  if (it.kind === "lead") {
    const sc = it.reasons[0]?.label ? `${it.reasons[0].label}. ` : "";
    if (it.status === "new" || it.status === "snoozed") return { title: it.status === "snoozed" ? "Pick this lead back up" : "Accept this lead", why: `${sc}${TIER_WHY[effTier(it)]}`, cta: "Accept", then: "Makes you the owner and tells the reporter the lead was accepted (+20 points for them).", next: "Contact the customer", done: "Lead accepted. The reporter has been told.", run: (st, by) => A.accept(st, id, by) };
    const steps = stepsOf(it);
    const iC = steps.findIndex((x) => /contacted/i.test(x)), iV = steps.findIndex((x) => /visit|survey/i.test(x)), iQ = steps.findIndex((x) => /quote|offer|proposal|tender/i.test(x));
    const NEXT = { visit: "Visit or survey the site", quote: "Send a quote or offer", outcome: "Log the outcome: won, lost or on hold" };
    const after = (from: "contact" | "visit" | "quote") => (from === "contact" && iV >= 0 && iV > it.step ? NEXT.visit : (from === "contact" || from === "visit") && iQ >= 0 ? NEXT.quote : NEXT.outcome);
    const stage = iC >= 0 && it.step < iC ? "contact" : iV >= 0 && it.step < iV ? "visit" : iQ >= 0 && it.step < iQ ? "quote" : iC < 0 && iV < 0 && iQ < 0 ? "contact" : "outcome";
    const opening = OPENING[it.team ?? ""];
    if (stage === "outcome") return { title: "Log the outcome", why: "The quote is out. Record how it ended so the reporter hears the result.", cta: "Save outcome", options: OUTCOMES, then: "Closes the lead and tells the reporter the result. Won gives them +200 points.", next: "Nothing. The lead is closed", done: "Outcome saved. The lead is closed.", run: (st, by, o) => A.outcome(st, id, by, OUT[o ?? "Won"]) };
    if (stage === "quote") return { title: "Send a quote or offer", why: "Send the customer a quote or offer, then record what you offered here.", cta: "Log quote or offer", form: { placeholder: "What did you offer? For example: 3-year maintenance contract at ₹1,25,000 per year", cta: "Save quote" }, then: "Saves your quote note on the lead, moves the progress to Quote and gives the reporter +50 points.", next: after("quote"), done: "Quote saved on the lead.", run: (st, by, _o, note) => A.quote(st, id, by, note) };
    if (stage === "visit") return { title: "Visit or survey the site", why: r.input.subject === "site" ? "The developer has been contacted. Go to the site, meet the contractor, and record what you found." : "The customer has been contacted. Go and see the lift, then record what you found.", cta: "Log visit", form: { options: ["Visited the site", "Met the customer at their office", "Video walk-through"], placeholder: r.input.subject === "site" ? "What did you find? For example: 2 towers, structure at floor 8, lift supplier not chosen yet" : "What did you see? For example: 6 lifts, two over 20 years old, contract with a local firm ends in March", cta: "Save visit" }, then: "Saves your visit note on the lead and moves the progress to Visit.", next: after("visit"), done: "Visit saved on the lead.", run: (st, by, o, note) => A.visit(st, id, by, [o, note].filter(Boolean).join(": ")) };
    return { title: "Contact the customer", why: opening ? `Suggested opening: ${opening}` : "Call or email the contact to qualify the lead.", cta: "Log call or email", form: { options: ["Phone call", "Email", "Phone call and email"], placeholder: "What was said? For example: Spoke to the facility manager, happy to meet next week", cta: "Save call or email" }, then: "Saves your call or email on the lead and moves the progress to Contacted.", next: after("contact"), done: "Call or email saved on the lead.", run: (st, by, o, note) => A.contact(st, id, by, `${o ?? "Contact"}${note ? `: ${note}` : " (no note)"}`) };
  }
  return null;
}

/** Everything else the user may do, kept out of sight so the recommended step stays obvious. */
export function moreFor(r: Report, it: Item, role: Role, nba: Nba | null): More[] {
  if (it.status === "closed" || it.silent || it.kind === "emergency" || it.team === "AM") return [];
  const id = it.id;
  if (it.team === "SVC") {
    const m: More[] = [{ label: "Hand back to sales (renewal chance)", run: (st, by) => A.handBack(st, id, by) }];
    if (nba?.title !== "Close the ticket") m.push({ label: "Close with an outcome…", ask: { title: "Close the ticket", options: RESULTS, cta: "Close ticket", apply: (st, by, v) => A.closeTicket(st, id, by, v) } });
    return m;
  }
  if (it.kind === "records") {
    const R = (a: Parameters<typeof A.records>[3], fake = false) => (st: State, by: string) => A.records(st, id, by, a, fake);
    return ([
      ["Confirm the match", "confirm"], ["Different lift: new record", "different"], ["Create a record (+30)", "create"], ["Link to the existing record", "link"],
      ["Correct the record", "correct"], ["Merge (needs the manager)", "merge"], ["Mark as scrapped", "scrapped"],
    ] as const).filter(([, a]) => !(nba && ((a === "confirm" && nba.cta === "Confirm match") || (a === "create" && nba.cta === "Create record")))).map(([l, a]): More => ({ label: l, run: R(a) }))
      .concat([{ label: "Reject", danger: true, run: R("reject") } as More, { label: "Reject as junk (reverses points)", danger: true, run: R("reject", true) } as More]);
  }
  if (it.kind !== "lead") return [];
  const out: More[] = [];
  const isNew = it.status === "new" || it.status === "snoozed";
  out.push({ label: "Create opportunity in NewCRM", run: (st, by) => A.opportunity(st, id, by) });
  out.push({ label: "Snooze for 3 days", run: (st, by) => A.snooze(st, id, by, 3) });
  if (isNew) out.push({ label: "Decline…", danger: true, ask: { title: "Decline this lead", options: DECLINE, cta: "Decline", apply: (st, by, v) => A.decline(st, id, by, v) } });
  out.push({ label: "Not relevant…", ask: { title: "Mark as not relevant", options: NOT_REL, cta: "Close lead", apply: (st, by, v) => A.notRelevant(st, id, by, v) } });
  out.push({ label: "Ask records for a data fix…", ask: { title: "What is wrong in the records?", text: "Describe the correction", cta: "Send request", apply: (st, by, v) => A.dataFix(st, id, by, v) } });
  if (nba?.cta !== "Save outcome") out.push({ label: "Log the outcome…", ask: { title: "Log the outcome", options: OUTCOMES, cta: "Save outcome", apply: (st, by, v) => A.outcome(st, id, by, OUT[v]) } });
  void role;
  return out;
}

/* ------------------------------------------------------------------ the card */
export function NbaCard({ r, it, role }: { r: Report; it: Item; role: Role }) {
  const { me, mutate } = useApp();
  const nba = nbaFor(r, it, role);
  const more = moreFor(r, it, role, nba);
  const [opt, setOpt] = useState(""); const [menu, setMenu] = useState(false);
  const [dlg, setDlg] = useState<More | null>(null); const [val, setVal] = useState("");
  const [form, setForm] = useState(false); const [note, setNote] = useState(""); const [banner, setBanner] = useState<string | null>(null);
  const by = me!.id;
  const go = (o?: string, n?: string) => { if (!nba) return; mutate((st) => nba.run(st, by, o, n)); setBanner(`${nba.done ?? `${nba.cta}: done.`}${nba.next ? ` Next: ${nba.next}.` : ""}`); setForm(false); setNote(""); setOpt(""); };
  if (it.status === "closed") {
    return (
      <Card className="flex items-center gap-3 border-emerald-200 bg-emerald-50/60 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon n="check" s={20} /></span>
        <div><div className="text-[15px] font-semibold">Done: {it.outcome ?? "closed"}</div><div className="text-[13px] text-muted">Nothing more to do here. The reporter has been told.</div></div>
      </Card>
    );
  }
  if (!nba && !more.length) return <Card className="p-5 text-sm text-muted">This is a heads-up for your information. No action needed.</Card>;
  return (
    <>
      <Card className="border-brand/25">
        <div className="p-5">
          {banner && <div className="pop mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13.5px] text-emerald-900"><span className="mt-0.5 text-emerald-600"><Icon n="check" s={16} w={2.5} /></span><span>{banner}</span></div>}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Next best action</div>
          {nba && (
            <>
              <h2 className="mt-2 text-xl font-semibold leading-snug">{nba.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{nba.why}</p>
              {(nba.then || nba.next) && <div className="mt-3 space-y-1 rounded-xl bg-surface p-3 text-[13px]">{nba.then && <div><b>What happens:</b> {nba.then}</div>}{nba.next && <div><b>After this:</b> {nba.next}</div>}</div>}
            </>
          )}
          {form && nba?.form && (
            <div className="pop mt-4 space-y-2 rounded-xl border border-line p-3">
              {nba.form.options && <select value={opt} onChange={(e) => setOpt(e.target.value)} className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">{nba.form.options.map((o) => <option key={o}>{o}</option>)}</select>}
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={nba.form.placeholder} className="min-h-20 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-brand" />
              <div className="flex gap-2"><Btn onClick={() => go(opt, note.trim())}>{nba.form.cta}</Btn><Btn v="ghost" onClick={() => setForm(false)}>Cancel</Btn><span className="self-center text-xs text-muted">The note is optional.</span></div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {nba?.options && <select value={opt || nba.options[0]} onChange={(e) => setOpt(e.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand">{nba.options.map((o) => <option key={o}>{o}</option>)}</select>}
            {nba && !form && <Btn onClick={() => { if (nba.form) { setForm(true); setOpt(nba.form.options?.[0] ?? ""); return; } go(opt || nba.options?.[0]); }}>{nba.cta}</Btn>}
            {more.length > 0 && (
              <div className="relative">
                <Btn v="ghost" onClick={() => setMenu(!menu)}>More actions <Icon n="chev" s={14} /></Btn>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                    <div className="pop absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-line bg-white p-1 shadow-xl">
                      {more.map((m) => (
                        <button key={m.label} onClick={() => { setMenu(false); if (m.ask) { setDlg(m); setVal(m.ask.options?.[0] ?? ""); } else mutate((st) => m.run!(st, by)); }} className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface ${m.danger ? "text-red-700" : ""}`}>{m.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-b-2xl border-t border-line bg-surface/60 px-5 py-2.5 text-[11.5px] text-muted">Suggested by fixed rules, not AI. You decide, and every action is logged.</div>
      </Card>
      {dlg?.ask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setDlg(null)}>
          <div onClick={(e) => e.stopPropagation()} className="pop w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="text-base font-semibold">{dlg.ask.title}</div>
            <div className="mt-3">
              {dlg.ask.options ? <select value={val} onChange={(e) => setVal(e.target.value)} className="min-h-11 w-full rounded-xl border border-line px-3 text-sm">{dlg.ask.options.map((o) => <option key={o}>{o}</option>)}</select>
                : <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={dlg.ask.text} className="min-h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />}
            </div>
            <div className="mt-4 flex justify-end gap-2"><Btn v="ghost" onClick={() => setDlg(null)}>Cancel</Btn><Btn disabled={!val} onClick={() => { const a = dlg.ask!; mutate((st) => a.apply(st, by, val)); setDlg(null); }}>{dlg.ask.cta}</Btn></div>
          </div>
        </div>
      )}
    </>
  );
}
