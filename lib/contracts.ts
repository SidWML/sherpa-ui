import { DAY, MANAGER, leadHooks, NAMES, PRODUCT, SUPPORT, accountOf, addTask, assetOf, closeTasks, inr, nowS, olog, oppOf, ping, tenderOf } from "./sherpa";
import type { Contract, Offer, Opp, ProductKey, State } from "./types";

export const PAYMENT: Record<ProductKey, { label: string; pct: number }[]> = {
  newinstall: [{ label: "Advance with the order", pct: 10 }, { label: "On delivery of material to site", pct: 60 }, { label: "On handover", pct: 30 }],
  modernisation: [{ label: "Advance with the order", pct: 30 }, { label: "On delivery of material", pct: 50 }, { label: "On handover", pct: 20 }],
  renewal: [{ label: "Quarterly in advance", pct: 100 }],
  maintenance: [{ label: "Quarterly in advance", pct: 100 }],
  repair: [{ label: "On completion", pct: 100 }],
};
const yearly = (p: ProductKey) => PRODUCT[p].yearly;
function clausesFor(p: ProductKey): Contract["clauses"] {
  const base = [
    { key: "scope", title: "Scope and specification", text: "The lifts and work described in the offer and its annexes.", on: true, optional: false },
    { key: "warranty", title: "Warranty", text: yearly(p) ? "Parts replaced under this contract carry a 6-month warranty." : "12 months from handover on material and workmanship.", on: true, optional: false },
    { key: "liability", title: "Liability", text: "Limited to the contract value, except for injury caused by negligence.", on: true, optional: false },
    { key: "termination", title: "Termination", text: yearly(p) ? "Either side may end the contract with 90 days' written notice after the first year." : "Only for material breach not fixed within 30 days of notice.", on: true, optional: false },
  ];
  const extra = yearly(p)
    ? [{ key: "escalation", title: "Annual price escalation", text: "The price rises by 5% on each anniversary.", on: true, optional: true },
       { key: "comprehensive", title: "Comprehensive cover", text: "All parts included, except vandalism and cabin finishes.", on: false, optional: true },
       { key: "callout", title: "24x7 call-out", text: "Engineer on site within 2 hours, day and night.", on: false, optional: true }]
    : [{ key: "ld", title: "Liquidated damages", text: "0.5% of the contract value per week of delay, capped at 5%.", on: false, optional: true },
       { key: "amc", title: "Free maintenance after handover", text: "12 months of maintenance included from handover.", on: true, optional: true }];
  return [...base, ...extra];
}
function scopeOf(s: State, of: Offer, o: Opp): string[] {
  const t = tenderOf(s, o.tenderId); const a = assetOf(s, of.assetId);
  if (of.product === "newinstall") return [`${t?.lifts ?? 1} passenger lift${(t?.lifts ?? 1) > 1 ? "s" : ""}${o.site?.floors ? `, ${o.site.floors}` : ""}`, of.brief ? `${of.brief.load}, ${of.brief.speed}, ${of.brief.finish}` : "As in the bid's technical compliance sheet", "Supply, installation, testing and handover"];
  if (of.product === "modernisation") return [a?.label ?? o.placeName, of.brief ? `Scope: ${of.brief.finish}` : "Controller and drive replacement", "Removal of old equipment and safety certification"];
  return [a?.label ?? `Lifts at ${o.placeName}`, `${of.term}-year ${PRODUCT[of.product].label.toLowerCase()}`, "Preventive maintenance every month, breakdown call-outs"];
}
const log = (s: State, c: Contract, by: string, text: string) => c.log.push({ t: nowS(s), by: NAMES[by] ?? by, text });
const find = (s: State, id?: string) => s.sherpa.contracts.find((c) => c.id === id);

/** What SHERPA flags for Sales support. Mock rules, not legal advice. */
export function contractFlags(s: State, c: Contract): { text: string; ok: boolean }[] {
  const of = s.sherpa.offers.find((x) => x.id === c.offerId); const acc = accountOf(s, c.accountId);
  const on = (k: string) => c.clauses.find((x) => x.key === k)?.on;
  const days = Math.round((c.start - nowS(s)) / DAY);
  return [
    { text: of && of.discountPct > 10 ? `Discount of ${of.discountPct}% is above the 10% guideline. It was approved by ${NAMES[MANAGER]}.` : "Price matches the approved offer.", ok: !(of && of.discountPct > 10) || of.approvals.some((x) => x.status === "approved") },
    { text: c.payment[0].pct >= 10 || yearly(c.product) ? `Payment plan: ${c.payment.map((p) => `${p.pct}% ${p.label.toLowerCase()}`).join(", ")}.` : "Advance is below 10%.", ok: c.payment[0].pct >= 10 || yearly(c.product) },
    { text: on("ld") ? "Liquidated damages are included. Legal accepts up to 5%: within limit." : "No liquidated damages clause.", ok: true },
    { text: days < 14 ? `Start date is in ${Math.max(0, days)} days. Check installation or service capacity.` : `Start date in ${days} days.`, ok: days >= 14 },
    { text: acc?.contact.email ? `Signer: ${acc.contact.name}, ${acc.contact.email}.` : "No signer email on the account. Add one before sending for signature.", ok: !!acc?.contact.email },
  ];
}

export const CT = {
  draft(s: State, of: Offer, o: Opp) {
    if (o.contractId && find(s, o.contractId)) return;
    const c: Contract = {
      id: `CT-${s.sherpa.seq++}`, oppId: o.id, offerId: of.id, accountId: of.accountId, product: of.product, title: `${PRODUCT[of.product].label}: ${accountOf(s, of.accountId)?.name ?? o.placeName}`,
      status: "draft", value: of.price, term: of.term, start: nowS(s) + (yearly(of.product) ? 30 : 45) * DAY, scope: scopeOf(s, of, o),
      sla: yearly(of.product) ? "Breakdown response within 4 hours, 8 am to 8 pm, all days" : undefined,
      payment: PAYMENT[of.product].map((p) => ({ ...p })), clauses: clausesFor(of.product), createdAt: nowS(s), log: [],
    };
    log(s, c, "SHERPA", `Drafted from ${of.id}: ${inr(c.value)}, standard clauses and payment plan`);
    s.sherpa.contracts.unshift(c); o.contractId = c.id;
    addTask(s, { oppId: o.id, forUser: o.owner, by: of.createdBy, title: `Check the contract draft ${c.id}`, detail: "SHERPA drafted it from the accepted offer. Check the start date, the payment plan and the optional clauses, then send it for the commercial check.", days: 2, kind: "contractDraft", source: "Contract" });
  },
  setStart(s: State, id: string, by: string, start: number) { const c = find(s, id); if (!c || c.status !== "draft") return; c.start = start; log(s, c, by, `Start date set to ${new Date(start).toLocaleDateString("en-IN")}`); },
  toggle(s: State, id: string, by: string, key: string) {
    const c = find(s, id); const cl = c?.clauses.find((x) => x.key === key); if (!c || !cl || !cl.optional || c.status !== "draft") return;
    cl.on = !cl.on; log(s, c, by, `${cl.title} ${cl.on ? "added" : "removed"}`);
  },
  submit(s: State, id: string, by: string) {
    const c = find(s, id); const o = oppOf(s, c?.oppId); if (!c || !o || c.status !== "draft") return;
    c.status = "check"; c.flags = contractFlags(s, c); closeTasks(s, o.id, ["contractDraft"]);
    log(s, c, by, "Sent for the commercial and legal check"); olog(s, o, by, `Contract ${c.id} sent to ${NAMES[SUPPORT]} for checking`);
    addTask(s, { oppId: o.id, forUser: SUPPORT, by, title: `Check contract ${c.id} for ${accountOf(s, c.accountId)?.name ?? o.placeName}`, detail: `${c.flags.filter((f) => !f.ok).length} point(s) flagged by SHERPA.`, days: 1, kind: "contractCheck", source: "Contract" });
  },
  check(s: State, id: string, by: string, ok: boolean, note = "") {
    const c = find(s, id); const o = oppOf(s, c?.oppId); if (!c || !o || c.status !== "check") return;
    closeTasks(s, o.id, ["contractCheck"]);
    if (!ok) { c.status = "draft"; log(s, c, by, `Sent back: ${note}`); olog(s, o, by, `Contract sent back by ${NAMES[by]}: ${note}`); addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Fix contract ${c.id}: ${note}`, days: 2, kind: "contractDraft", source: "Contract" }); return; }
    c.status = "approval"; log(s, c, by, `Commercial and legal check passed${note ? `: ${note}` : ""}`);
    addTask(s, { oppId: o.id, forUser: MANAGER, by, title: `Approve contract ${c.id}`, detail: `${c.title}, ${inr(c.value)}. Checked by ${NAMES[by]}.`, days: 1, kind: "contractApprove", source: "Contract" });
  },
  approve(s: State, id: string, by: string, ok: boolean, note = "") {
    const c = find(s, id); const o = oppOf(s, c?.oppId); if (!c || !o || c.status !== "approval") return;
    closeTasks(s, o.id, ["contractApprove"]);
    if (!ok) { c.status = "draft"; log(s, c, by, `Changes asked: ${note}`); olog(s, o, by, `Contract changes asked: ${note}`); addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Revise contract ${c.id}: ${note}`, days: 2, kind: "contractDraft", source: "Contract" }); return; }
    c.status = "signature"; log(s, c, by, "Approved by the Sales Manager");
    addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Send contract ${c.id} for e-signature`, detail: `Approved by ${NAMES[by]}. ${accountOf(s, c.accountId)?.contact.name ?? "The customer"} signs from a link.`, days: 1, kind: "contractSign", source: "Contract" });
    if (o.owner !== by) ping(s, o.owner, `Contract ${c.id} approved. Send it for signature.`);
  },
  sendForSignature(s: State, id: string, by: string) {
    const c = find(s, id); const o = oppOf(s, c?.oppId); if (!c || !o || c.status !== "signature" || c.log.some((l) => /e-signature/.test(l.text))) return;
    const acc = accountOf(s, c.accountId);
    log(s, c, by, `Sent for e-signature to ${acc?.contact.name ?? "the customer"}`); olog(s, o, by, `Contract ${c.id} sent for signature`);
    closeTasks(s, o.id, ["contractSign"]);
  },
  /** Demo only: stands in for the customer signing from the e-signature link. */
  customerSigns(s: State, id: string) {
    const c = find(s, id); const o = oppOf(s, c?.oppId); if (!c || !o || c.status !== "signature") return;
    const acc = accountOf(s, c.accountId);
    c.signedBy = acc?.contact.name ?? "Customer"; c.signedAt = nowS(s); log(s, c, c.signedBy, "Signed electronically");
    CT.activate(s, c, o);
  },
  activate(s: State, c: Contract, o: Opp) {
    const now = nowS(s); const acc = accountOf(s, c.accountId); const of = s.sherpa.offers.find((x) => x.id === c.offerId);
    c.status = "active"; log(s, c, "SHERPA", "Contract active");
    closeTasks(s, o.id, null); o.stage = "won"; o.closedAt = now; o.value = c.value;
    olog(s, o, "SHERPA", `Won: contract ${c.id} signed by ${c.signedBy}, ${inr(c.value)}`);
    const by = o.owner;
    if (yearly(c.product)) {
      const a = assetOf(s, of?.assetId) ?? s.sherpa.assets.find((x) => x.accountId === c.accountId);
      if (a) { a.contractEnd = c.start + c.term * 365 * DAY; a.contractValue = Math.round(c.value / c.term); a.servicer = "Schindler"; a.contractChangedAfterObr = false; }
      if (acc) { acc.lines.sc = true; acc.lines.ei = true; }
    } else {
      const lifts = tenderOf(s, o.tenderId)?.lifts ?? 1;
      if (c.product === "newinstall" && acc) {
        for (let i = 0; i < lifts; i++) s.sherpa.assets.push({ id: `a-${s.sherpa.seq++}`, accountId: acc.id, placeId: acc.placeIds[0] ?? "", label: `New lift ${i + 1} · ${o.placeName}`, model: "Schindler 3300", ageYears: 0, brand: "ours", callbacks14d: 0, callbacks90d: 0, callbacksPrev90d: 0, faults90d: 0, health: 100, handedOver: true, servicer: "Schindler", owner: s.cfg.owners[o.area]?.EI ?? by });
        acc.lines.ni = true;
      }
      if (c.product === "modernisation" && acc) acc.lines.mod = true;
      addTask(s, { oppId: o.id, forUser: by, by: "SHERPA", title: `Hand ${c.id} over to the installation team`, detail: `Signed scope: ${c.scope.join("; ")}. Start ${new Date(c.start).toLocaleDateString("en-IN")}.`, days: 3, kind: "handover", source: "Contract" });
      const sc = s.cfg.owners[o.area]?.SC;
      if (sc) addTask(s, { oppId: o.id, forUser: sc, by, title: `Offer a service contract to ${acc?.name ?? o.placeName}`, detail: `${c.id} is signed. Handover pack: customer, lifts, contacts and the signed scope.`, days: 7, kind: "handover", source: "N25" });
    }
    if (acc) { acc.lastActivity = now; (acc.activity ??= []).push({ t: now, by: NAMES[by] ?? by, text: `Contract ${c.id} signed: ${c.title}, ${inr(c.value)}` }); }
    if (acc?.key) addTask(s, { oppId: o.id, forUser: s.cfg.owners[o.area]?.AM ?? "lena", by, title: `Update the account plan for ${acc.name}`, detail: `${c.id} signed at a key account.`, days: 7, kind: "accountAction", source: "Contract" });
    s.sherpa.crm.unshift({ t: now, by: "SHERPA", text: `Contract ${c.id} written to NewCRM: ${c.title}, ${inr(c.value)}, start ${new Date(c.start).toLocaleDateString("en-IN")}` });
    if (o.source.itemId && leadHooks.closed) leadHooks.closed(s, o.source.itemId, o.owner, "won");
    else if (o.source.reporter) ping(s, o.source.reporter, `The lead you spotted at ${o.placeName} is won. Thank you!`);
  },
};
