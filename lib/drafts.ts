import { CT, PAYMENT, contractFlags } from "./contracts";
import { GUIDE, NAMES, PRODUCT, accountOf, assetOf, inr, nowS, oppOf, ping, tenderOf } from "./sherpa";
import type { Contract, DocComment, DraftReview, Offer, State, Tender } from "./types";

export type DocRef = { kind: "quote" | "bid" | "contract"; id: string };
export interface DocSection { key: string; title: string; text: string; live?: boolean; editedBy?: string; editedAt?: number }
export interface Tip { id: string; section?: string; level: "risk" | "improve"; text: string; why: string; fix?: { section: string; text: string } | { toggle: string } }
export interface DraftView { title: string; sections: DocSection[]; tips: Tip[]; comments: DocComment[]; log: DraftReview["log"] }

export function liftDetails(t: Tender) {
  const speed = /(\d\.\d) m\/s/.exec(t.summary)?.[1] ?? "1.75";
  const g = /G\+(\d+)/.exec(t.summary);
  const delivery = /(\d+) months/.exec(t.summary)?.[1];
  return {
    speed, stops: g ? Number(g[1]) + 1 : 20, delivery: delivery ? `${delivery} months` : "As the tender says",
    model: Number(speed) >= 2 ? "Schindler 5500" : "Schindler 3300", load: "1,350 kg (20 persons)", door: "Centre-opening, 2 panels", drive: "Gearless",
  };
}

const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const has = (re: RegExp, ...xs: (string | undefined)[]) => xs.some((x) => x && re.test(x));
const text = (secs: DocSection[], key: string) => secs.find((x) => x.key === key)?.text ?? "";
const all = (secs: DocSection[]) => secs.map((x) => x.text).join("\n");
const add = (secs: DocSection[], key: string, more: string) => `${text(secs, key).trimEnd()}\n${more}`;

/* ------------------------------------------------------------------ quotation */
function quoteDraft(s: State, of: Offer): DocSection[] {
  const acc = accountOf(s, of.accountId); const a = assetOf(s, of.assetId); const o = oppOf(s, of.oppId); const b = of.brief;
  const what = PRODUCT[of.product].label.toLowerCase(); const unit = a?.label.split(" · ")[0] ?? o?.placeName ?? acc?.name ?? "your building";
  const scope = of.product === "modernisation" ? `Modernisation of ${unit}: ${b?.finish ?? "new controller and drive"}.\nRated load ${b?.load ?? "as today"}, speed ${b?.speed ?? "as today"}.\nRemoval of the old equipment, testing and the safety certificate.`
    : of.product === "newinstall" ? `${tenderOf(s, o?.tenderId)?.lifts ?? 1} new passenger lift(s) for ${o?.placeName ?? acc?.name}.\nRated load ${b?.load ?? "1,000 kg"}, speed ${b?.speed ?? "1.75 m/s"}, finish ${b?.finish ?? "standard"}.\nSupply, installation, testing and handover.`
    : of.product === "repair" ? `Repair of ${unit} and a full safety check after the work.`
    : `${of.term}-year ${what} for ${unit}.\nMonthly preventive maintenance and breakdown call-outs.`;
  return [
    { key: "intro", title: "Opening", text: `Dear ${(o?.contact ?? acc?.contact)?.name ?? "Sir or Madam"},\n\nThank you for your time. Please find our ${what} for ${unit} below.` },
    { key: "scope", title: "Scope", text: scope },
    { key: "price", title: "Price", live: true, text: `List price ${inr(of.listPrice)}. Discount ${of.discountPct}%. Price ${inr(of.price)}${PRODUCT[of.product].yearly ? `, that is ${inr(of.price / of.term)} a year for ${of.term} year${of.term > 1 ? "s" : ""}` : ""}. GST extra.` },
    { key: "delivery", title: PRODUCT[of.product].yearly ? "Start of service" : "Delivery and installation", text: PRODUCT[of.product].yearly ? "Service starts on the first day of the month after your order." : "Delivery and installation as agreed after the order." },
    { key: "terms", title: "Terms", text: `Payment: ${PAYMENT[of.product].map((p) => `${p.pct}% ${p.label.toLowerCase()}`).join(", ")}.` },
  ];
}
function quoteTips(s: State, of: Offer, secs: DocSection[]): Tip[] {
  const o = oppOf(s, of.oppId); const a = assetOf(s, of.assetId); const acc = accountOf(s, of.accountId); const out: Tip[] = [];
  if (!has(/valid/i, all(secs))) out.push({ id: "validity", section: "terms", level: "risk", text: "Say how long the price holds.", why: "Without a validity date the customer can accept this price months from now.", fix: { section: "terms", text: add(secs, "terms", "This quotation is valid for 30 days from the date of issue.") } });
  if (of.discountPct > GUIDE.seller && !has(/discount (applies|reflects)|because/i, text(secs, "terms"))) out.push({ id: "discount", section: "terms", level: "risk", text: `Explain the ${of.discountPct}% discount.`, why: `It is above the ${GUIDE.seller}% guideline. A reason in writing stops it becoming the customer's new normal.`, fix: { section: "terms", text: add(secs, "terms", `The special discount applies because ${PRODUCT[of.product].yearly ? `of the ${of.term}-year commitment` : "the work is ordered as one package"}.`) } });
  const seen = o?.site?.condition ?? (a && a.faults90d ? `${a.faults90d} faults in the last 90 days` : undefined);
  if (seen && !has(/saw|noticed|visit|fault|condition|wear/i, text(secs, "intro"))) out.push({ id: "personal", section: "intro", level: "improve", text: "Open with what we found on site.", why: "Quotes that name the customer's own problem are read and answered faster.", fix: { section: "intro", text: `Dear ${(o?.contact ?? acc?.contact)?.name ?? "Sir or Madam"},\n\nThank you for meeting ${o?.site ? NAMES[o.site.by] : "us"} on site. We found ${seen.toLowerCase()} on ${a?.label.split(" · ")[0] ?? (o?.placeName ? `the lifts at ${o.placeName}` : "your lift")}${a ? `, which is ${a.ageYears} years old` : ""}. The proposal below fixes the cause, not only the symptoms.` } });
  if (!PRODUCT[of.product].yearly && !has(/\d+\s*(weeks?|days?|months?)/i, text(secs, "delivery"))) out.push({ id: "delivery", section: "delivery", level: "improve", text: "Give dates, not 'as agreed'.", why: "Timing is the customer's first question. Answering it up front saves a round of emails.", fix: { section: "delivery", text: of.product === "modernisation" ? "We start within 8 weeks of your order. Work takes about 2 weeks per lift, one lift at a time, so the building stays in use." : of.product === "newinstall" ? "Delivery 16 weeks after the drawings are approved. Installation about 6 weeks per lift." : "We complete the repair within 10 working days of your order." } });
  if (PRODUCT[of.product].yearly && !has(/response|within \d+ hours/i, text(secs, "scope"))) out.push({ id: "sla", section: "scope", level: "improve", text: "State the breakdown response time.", why: "It is what customers compare between maintenance offers.", fix: { section: "scope", text: add(secs, "scope", "Breakdown response within 4 hours, 8 am to 8 pm, all days.") } });
  if (text(secs, "intro").length > 600) out.push({ id: "long", section: "intro", level: "improve", text: "The opening is long.", why: "Keep the opening to two or three sentences. The detail is below.", fix: { section: "intro", text: shorter(text(secs, "intro")) } });
  return out;
}

/* ------------------------------------------------------------------ bid letter */
function bidDraft(s: State, t: Tender, live?: { discountPct?: number }): DocSection[] {
  const acc = accountOf(s, t.accountId); const gap = (k: string) => t.doc?.gaps.find((g) => g.key === k)?.a; const d0 = liftDetails(t); const d = { ...d0, load: gap("load") ?? d0.load, door: gap("door") ?? d0.door };
  const disc = live?.discountPct ?? t.bid?.discountPct ?? t.draft?.discountPct ?? 8;
  const to = oppOf(s, t.oppId)?.contact ?? acc?.contact; const org = acc?.name ?? ""; const price = Math.round(t.value * (1 - disc / 100));
  return [
    { key: "cover", title: "Cover letter", text: `To ${to?.name ?? "the tender committee"}, ${to?.role ?? ""}${to === acc?.contact ? `, ${org}` : ""}\n\nSubject: Our bid for ${t.name}\n\nSchindler India is pleased to submit its bid for ${t.lifts} lift${t.lifts > 1 ? "s" : ""}. Our offer meets the technical specification in full.` },
    { key: "technical", title: "Technical offer", text: `${t.lifts} × ${d.model}, ${d.load}, ${d.speed} m/s, ${d.stops} stops.\nDoors: ${d.door}. Drive: ${d.drive}.` },
    { key: "commercial", title: "Price", live: true, text: `List price ${inr(t.value)}. Discount ${disc}%. Bid price ${inr(price)} (${inr(price / t.lifts)} per lift). GST extra.` },
    { key: "delivery", title: "Delivery", text: "Delivery as per the tender schedule." },
    { key: "terms", title: "Terms and exclusions", text: "Payment as per the tender conditions." },
  ];
}
function bidTips(s: State, t: Tender, secs: DocSection[]): Tip[] {
  const acc = accountOf(s, t.accountId); const d = liftDetails(t); const out: Tip[] = [];
  const asked = t.doc?.found.find((f) => /delivery/i.test(f.label))?.value.replace(/ from (the )?order$/i, "") ?? (d.delivery === "As the tender says" ? undefined : d.delivery);
  if (t.competitorSpec && !has(/equivalent|equal/i, text(secs, "technical"))) out.push({ id: "spec", section: "technical", level: "risk", text: "The letter claims full compliance, but the tender names a competitor's part.", why: `${t.competitorSpec} Claiming full compliance can get the bid rejected at the technical check.`, fix: { section: "technical", text: add(secs, "technical", "Door operator: the tender names a competitor's part. We offer our own equivalent operator with the same opening width and speed, certified to EN 81-20. The datasheet is attached.") } });
  if ((t.lossNote || acc?.lostBids) && !has(/lifetime|energy|total cost/i, text(secs, "cover"))) out.push({ id: "price-story", section: "cover", level: "improve", text: "We lost this customer before on price. Lead with lifetime cost.", why: t.lossNote ?? acc?.lostBids ?? "", fix: { section: "cover", text: add(secs, "cover", "\nOver 20 years our lifts use up to 30% less energy and need fewer call-outs, which lowers your total cost of ownership.") } });
  if (!has(/\d+\s*(weeks?|months?)/i, text(secs, "delivery"))) out.push({ id: "delivery", section: "delivery", level: "improve", text: "Commit to a delivery time.", why: "The tender scores delivery. 'As per schedule' scores zero.", fix: { section: "delivery", text: asked ? `Delivery and installation within ${asked} from the order, as the tender asks. Lifts are installed in pairs so floors open as they finish.` : "Delivery 16 weeks from the order. Installation about 6 weeks per lift." } });
  if (!has(/civil|scaffold/i, text(secs, "terms"))) out.push({ id: "exclusions", section: "terms", level: "risk", text: "List what is not included.", why: "Without exclusions, civil work and scaffolding become our cost after the award.", fix: { section: "terms", text: add(secs, "terms", "Not included: civil work, scaffolding, shaft lighting and the power supply to the machine room.") } });
  if (!has(/valid/i, all(secs))) out.push({ id: "validity", section: "terms", level: "risk", text: "Say how long the bid holds.", why: "Tender awards are often late. Without validity the price is open-ended.", fix: { section: "terms", text: add(secs, "terms", "Our bid is valid for 90 days from the closing date.") } });
  return out;
}

/* ------------------------------------------------------------------ contract */
function contractDraft(c: Contract): DocSection[] {
  return [
    { key: "scope", title: "What we deliver", text: c.scope.join("\n") },
    ...(c.sla ? [{ key: "sla", title: "Service level", text: c.sla }] : []),
    { key: "payment", title: "Payment", live: true, text: `${c.payment.map((p) => `${p.pct}% ${p.label.toLowerCase()}`).join(", ")}. Contract value ${inr(c.value)}. Start ${day(c.start)}.` },
    ...c.clauses.filter((x) => x.on).map((x) => ({ key: `clause:${x.key}`, title: x.title, text: x.text })),
  ];
}
function contractTips(s: State, c: Contract, secs: DocSection[]): Tip[] {
  const out: Tip[] = contractFlags(s, c).filter((f) => !f.ok).map((f, i) => ({ id: `flag-${i}`, level: "risk" as const, text: f.text, why: "From the commercial guidelines." }));
  const on = (k: string) => c.clauses.find((x) => x.key === k)?.on;
  if (!PRODUCT[c.product].yearly && !has(/complet/i, text(secs, "scope"))) out.push({ id: "completion", section: "scope", level: "risk", text: "No completion date.", why: "Without one, delay disputes have nothing to point to, and the handover payment has no trigger date.", fix: { section: "scope", text: add(secs, "scope", c.product === "modernisation" ? "Work is completed within 10 weeks of the start date, one lift at a time, so the building stays in use." : "Work is completed within 16 weeks of the start date.") } });
  if (PRODUCT[c.product].yearly && !on("escalation")) out.push({ id: "escalation", level: "improve", text: "Add yearly price escalation.", why: `Wages and parts rise every year. Over ${c.term} years a fixed price loses margin.`, fix: { toggle: "escalation" } });
  if (!PRODUCT[c.product].yearly && c.clauses.some((x) => x.key === "amc") && !on("amc")) out.push({ id: "amc", level: "improve", text: "Include the first year of maintenance.", why: "Customers who get it renew into a service contract far more often.", fix: { toggle: "amc" } });
  Object.keys(c.review?.texts ?? {}).filter((k) => k.startsWith("clause:")).forEach((k) => out.push({ id: `wording-${k}`, section: k, level: "risk", text: `Standard wording changed in "${c.clauses.find((x) => `clause:${x.key}` === k)?.title}".`, why: "Sales support must check changed legal wording before the manager approves." }));
  return out;
}

/* ------------------------------------------------------------------ shared */
function target(s: State, ref: DocRef, live?: { discountPct?: number }) {
  if (ref.kind === "quote") { const of = s.sherpa.offers.find((x) => x.id === ref.id); return of && { meta: () => (of.review ??= blank()), review: of.review, draft: () => quoteDraft(s, of), tips: (secs: DocSection[]) => quoteTips(s, of, secs), title: `${of.product === "newinstall" || of.product === "modernisation" ? "Quotation" : "Offer"} ${of.id}`, notify: of.createdBy }; }
  if (ref.kind === "bid") { const t = tenderOf(s, ref.id); return t && { meta: () => (t.letter ??= blank()), review: t.letter, draft: () => bidDraft(s, t, live), tips: (secs: DocSection[]) => bidTips(s, t, secs), title: `Bid letter for ${t.name}`, notify: oppOf(s, t.oppId)?.owner ?? t.owner }; }
  const c = s.sherpa.contracts.find((x) => x.id === ref.id);
  return c && { meta: () => (c.review ??= blank()), review: c.review, draft: () => contractDraft(c), tips: (secs: DocSection[]) => contractTips(s, c, secs), title: `Contract ${c.id}`, notify: oppOf(s, c.oppId)?.owner ?? "" };
}
const blank = (): DraftReview => ({ texts: {}, dismissed: [], comments: [], log: [] });

export function draftView(s: State, ref: DocRef, live?: { discountPct?: number }): DraftView | undefined {
  const t = target(s, ref, live); if (!t) return;
  const r = t.review;
  const sections = t.draft().map((x) => { const e = !x.live ? r?.texts[x.key] : undefined; return e ? { ...x, text: e.text, editedBy: e.by, editedAt: e.at } : x; });
  return { title: t.title, sections, tips: t.tips(sections).filter((x) => !r?.dismissed.includes(x.id)), comments: r?.comments ?? [], log: r?.log ?? [] };
}

function shorter(t: string) {
  const [head, ...rest] = t.split(/\n\n/); const body = rest.join(" ");
  const sentences = (body || head).match(/[^.!?]+[.!?]+/g) ?? [body || head];
  const short = sentences.slice(0, 2).join("").trim();
  return rest.length ? `${head}\n\n${short}` : short;
}
const FORMAL: [RegExp, string][] = [[/\bwe'll\b/gi, "we will"], [/\byou're\b/gi, "you are"], [/\bdon't\b/gi, "do not"], [/\bcan't\b/gi, "cannot"], [/\bit's\b/gi, "it is"], [/\bthanks\b/gi, "thank you"], [/\bget\b/gi, "receive"], [/\babout\b/gi, "approximately"]];
export const REWRITES = { shorter: "Shorter", formal: "More formal", plain: "Plain words" } as const;
const PLAIN: [RegExp, string][] = [[/\bpleased to submit\b/gi, "sending"], [/\bapproximately\b/gi, "about"], [/\bcommence\b/gi, "start"], [/\bin accordance with\b/gi, "under"], [/\butili[sz]e\b/gi, "use"], [/\bprior to\b/gi, "before"], [/\bkindly\b/gi, "please"]];
function rewrite(t: string, mode: keyof typeof REWRITES) {
  if (mode === "shorter") return shorter(t);
  return (mode === "formal" ? FORMAL : PLAIN).reduce((x, [re, to]) => x.replace(re, to), t);
}

const who = (by: string) => NAMES[by] ?? by;
export const DR = {
  edit(s: State, ref: DocRef, by: string, key: string, value: string, note?: string) {
    const t = target(s, ref); if (!t) return; const m = t.meta(); const sec = t.draft().find((x) => x.key === key); if (!sec || sec.live) return;
    if (value.trim() === sec.text.trim()) delete m.texts[key]; else m.texts[key] = { text: value, by: who(by), at: nowS(s) };
    m.log.push({ t: nowS(s), by: who(by), text: note ?? `Edited ${sec.title}` });
  },
  reset(s: State, ref: DocRef, by: string, key: string) {
    const t = target(s, ref); if (!t) return; const m = t.meta(); delete m.texts[key];
    m.log.push({ t: nowS(s), by: who(by), text: `Put ${t.draft().find((x) => x.key === key)?.title ?? key} back to SHERPA's draft` });
  },
  apply(s: State, ref: DocRef, by: string, tipId: string) {
    const v = draftView(s, ref); const tip = v?.tips.find((x) => x.id === tipId); if (!tip?.fix) return;
    if ("toggle" in tip.fix) {
      const c = s.sherpa.contracts.find((x) => x.id === ref.id); const cl = c?.clauses.find((x) => x.key === (tip.fix as { toggle: string }).toggle); if (!c || !cl) return;
      if (c.status === "draft") CT.toggle(s, c.id, by, cl.key); else { cl.on = !cl.on; c.log.push({ t: nowS(s), by: who(by), text: `${cl.title} ${cl.on ? "added" : "removed"}` }); }
      target(s, ref)!.meta().log.push({ t: nowS(s), by: who(by), text: `Applied SHERPA's suggestion: ${tip.text}` });
      return;
    }
    DR.edit(s, ref, by, tip.fix.section, tip.fix.text, `Applied SHERPA's suggestion: ${tip.text}`);
  },
  dismiss(s: State, ref: DocRef, by: string, tipId: string) {
    const t = target(s, ref); if (!t) return; const m = t.meta(); if (!m.dismissed.includes(tipId)) m.dismissed.push(tipId);
    m.log.push({ t: nowS(s), by: who(by), text: `Dismissed a SHERPA suggestion` });
  },
  rewrite(s: State, ref: DocRef, by: string, key: string, mode: keyof typeof REWRITES) {
    const v = draftView(s, ref); const sec = v?.sections.find((x) => x.key === key); if (!sec || sec.live) return;
    DR.edit(s, ref, by, key, rewrite(sec.text, mode), `SHERPA rewrote ${sec.title}: ${REWRITES[mode].toLowerCase()}`);
  },
  comment(s: State, ref: DocRef, by: string, section: string, value: string) {
    const t = target(s, ref); if (!t || !value.trim()) return; const m = t.meta();
    m.comments.push({ id: `cm-${s.sherpa.seq++}`, section, by: who(by), at: nowS(s), text: value.trim() });
    if (t.notify && t.notify !== by) ping(s, t.notify, `${who(by)} commented on ${t.title}: ${value.trim()}`);
  },
  resolve(s: State, ref: DocRef, by: string, id: string) {
    const t = target(s, ref); const c = t?.meta().comments.find((x) => x.id === id); if (!t || !c) return;
    c.resolved = true; t.meta().log.push({ t: nowS(s), by: who(by), text: `Resolved a comment from ${c.by}` });
  },
};
