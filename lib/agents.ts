/* Mock agents. Each one turns mock CRM data into a document the seller can read, edit and act on.
   They are fixed templates over real rules and data. There is no AI here, and the chat says so. */
import { AREA_NAME, DAY, HOUR, NAMES, PRODUCT, accountOf, assetOf, daysTo, inr, listPrice, nowS, offerOf, regionRef, tenderOf, winChance, type Effect } from "./sherpa";
import type { Account, Asset, State, User } from "./types";

export interface DocChip { label: string; effect?: Effect; ask?: string; tone?: "green"; done?: string; to?: string }
export interface Block { h?: string; rows?: [string, string][]; bullets?: string[]; text?: string; table?: { head: string[]; rows: string[][] } }
export interface Doc { no: number; title: string; agent: string; sources: string[]; intro: string; why: string[]; blocks: Block[]; draft?: { label: string; subject?: string; text: string }; chips: DocChip[] }
export interface DocRef { key?: string; assetId?: string; accountId?: string; tenderId?: string; offerId?: string; segment?: string; mleadId?: string }

const unit = (a: Asset) => a.label.split(" · ")[0];
const place = (a: Asset) => a.label.split(" · ")[1] ?? "";
const fmt = (s: State, t: number) => new Date(t).toLocaleDateString("en-IN");
const first = (acc?: Account) => acc?.contact.name.split(" ")[0] ?? "there";

/** Which NBA numbers have a document flow (the others run as offer, email, approval or pipeline flows in the chat). */
export const DOC_NBAS = [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 20, 21, 22, 24, 25, 26, 27];

export function docFor(s: State, no: number, r: DocRef, u: User): Doc | null {
  const sh = s.sherpa; const now = nowS(s); const k = r.key;
  const asset = assetOf(s, r.assetId); const acc = accountOf(s, r.accountId ?? asset?.accountId); const tender = tenderOf(s, r.tenderId); const offer = offerOf(s, r.offerId);
  const sources = ["NewCRM account and contract", "SAP service history", "Installed base"];

  if (no === 1 && asset) return {
    no, title: `Callback brief: ${unit(asset)}`, agent: "Sales Assistant · CRM Agent", sources, intro: `${asset.callbacks14d} callback${asset.callbacks14d > 1 ? "s" : ""} on ${unit(asset)} in the last 14 days. Here is a short brief and a deal argument.`, why: ["Callbacks come from SAP service. A call within a week of a callback lifts renewal odds.", "The talking point is generated from the fault pattern."],
    blocks: [
      { rows: [["Customer", `${acc?.name} · ${acc?.contact.name}, ${acc?.contact.role}`], ["Unit", `${unit(asset)} · ${place(asset)} · ${asset.model}`], ["Callbacks", `${asset.callbacks14d} in 14 days · ${asset.callbacks90d} in 90 days`], ["Contract", asset.contractEnd ? `ends ${fmt(s, asset.contractEnd)}, ${inr(asset.contractValue ?? 0)} per year` : "none"]] },
      { h: "Deal argument", bullets: ["The customer felt the fault. Open with what we fixed and how fast.", `Offer a preventive visit plan so ${asset.callbacks90d >= 4 ? "repeat call-outs stop" : "it does not recur"}.`, "Ask who decides on the renewal and when."] },
    ],
    draft: { label: "Opening for the call", text: `Namaste ${first(acc)} garu, this is ${u.name.split(" ")[0]} from Schindler. I saw our engineer attended ${unit(asset)} recently. Is the lift running well now? I would like to share a short plan so it stays that way.` },
    chips: [{ label: "Log a call task for this week", tone: "green", effect: { t: "task", title: `Call ${acc?.contact.name} about ${unit(asset)}`, days: 5, accountId: acc?.id, nba: k }, done: "Task created and written to NewCRM." }, { label: "Draft the renewal", ask: `Draft the renewal for lift ${asset.id.slice(1)}` }],
  };

  if (no === 2 && asset) return {
    no, title: `Corrected OBR: ${unit(asset)}`, agent: "CRM Agent", sources: ["NewCRM contract history", "OBR"], intro: `The contract for ${unit(asset)} was amended after the OBR was raised. This is the corrected OBR for the back office.`, why: ["Compares the contract version on the OBR date with the current one.", "The back office gets one corrected OBR instead of an email thread."],
    blocks: [{ table: { head: ["Field", "On the OBR", "Now (amended)"], rows: [["Service hours", "Mon to Sat, 8 to 6", "24x7"], ["Response time", "4 hours", "2 hours"], ["Annual value", inr(asset.contractValue ?? 0), inr((asset.contractValue ?? 0) * 1.09)], ["Contract version", "v2", "v3 (amended 12 Nov)"]] } }, { h: "Impact", bullets: ["The OBR was priced on the old contract: 9% under-priced.", `${asset.obr ?? 3} open OBRs on this unit use the old terms.`] }],
    chips: [{ label: "Send the corrected OBR to the back office", tone: "green", effect: { t: "obr", assetId: asset.id, nba: k }, done: "Corrected OBR sent. Logged in NewCRM." }, { label: "Not now" }],
  };

  if (no === 4 && asset) {
    const mo = sh.offers.find((o) => o.assetId === asset.id && o.product === "modernisation");
    return {
      no, title: `Joint EI and MOD plan: ${unit(asset)}`, agent: "Price Pilot · MOD Propensity Scoring", sources: ["OBR history", "NewCRM opportunities"], intro: `${asset.obr} OBRs in 90 days while your modernisation offer ${mo?.id ?? ""} is open. Here is how to use that and stay aligned with the EI rep.`, why: ["High OBR volume means the customer already pays for the problem every month.", "An EI and MOD message that disagrees loses the deal."],
      blocks: [{ rows: [["Customer", acc?.name ?? ""], ["Open MOD offer", mo ? `${mo.id} · ${inr(mo.price)} · ${mo.status}` : "none"], ["OBRs in 90 days", String(asset.obr)], ["Estimated call-out cost", inr((asset.obr ?? 0) * 18000)], ["EI owner", NAMES[asset.owner]]] }, { h: "Plan", bullets: [`Use the ${inr((asset.obr ?? 0) * 18000)} of call-outs as the cost of doing nothing.`, "Ask the EI rep to hold any renewal pricing until the MOD decision.", "Offer a phased modernisation so budget is not the blocker."] }],
      chips: [{ label: `Alert ${NAMES[asset.owner].split(" ")[0]} and agree the plan`, tone: "green", effect: { t: "alertOwners", assetId: asset.id, nba: k }, done: "EI and MOD owners alerted. Logged in NewCRM." }, { label: "Open the MOD offer", ask: `Open offer ${mo?.id ?? ""}` }],
    };
  }

  if (no === 5 && asset) {
    const mo = sh.offers.find((o) => o.assetId === asset.id && o.product === "modernisation");
    return {
      no, title: `Modernisation offer on your unit: ${unit(asset)}`, agent: "CRM Agent", sources: ["NewCRM opportunities"], intro: `${NAMES[asset.mod ?? "mia"]} has a modernisation offer ${mo?.id ?? ""} open on a unit you service. Align before the customer hears two stories.`, why: ["The same unit appears on two opportunities owned by two sellers."],
      blocks: [{ rows: [["Your unit", `${unit(asset)} · ${place(asset)}`], ["MOD offer", mo ? `${mo.id} · ${inr(mo.price)} · ${mo.status}` : "none"], ["MOD owner", NAMES[asset.mod ?? "mia"]], ["Your contract", asset.contractEnd ? `ends ${fmt(s, asset.contractEnd)}` : "none"]] }, { h: "Suggested", bullets: ["Bundle: extend the service contract with the modernisation so the customer sees one price.", "Do not send a standalone renewal until the MOD offer has an answer."] }],
      chips: [{ label: "Alert both owners and plan a bundled offer", tone: "green", effect: { t: "alertOwners", assetId: asset.id, nba: k }, done: "Both owners alerted. Logged in NewCRM." }, { label: "Create a task to align this week", effect: { t: "task", title: `Align EI and MOD on ${unit(asset)}`, days: 3, to: asset.mod, accountId: acc?.id, nba: k }, done: "Task created for the MOD rep." }],
    };
  }

  if (no === 6 && offer) return {
    no, title: `What changed in the contract: ${offer.id}`, agent: "Contract Risk Reviewer", sources: ["Contract Risk Reviewer", "NewCRM contract history"], intro: `The customer's contract changed while ${offer.id} is open. Here is the difference and what it does to the price.`, why: ["Compares the contract version the offer was priced on with the current one.", "Price effect is a fixed uplift per extra cover item."],
    blocks: [{ table: { head: ["Clause", "Offer was priced on", "Contract now"], rows: [["Service hours", "Mon to Sat, 8 to 6", "24x7"], ["Response time", "4 hours", "2 hours"], ["Late-response credit", "None", "2% of the monthly fee per late response"], ["Term", `${offer.term} years`, `${offer.term} years`]] } }, { h: "Price effect", rows: [["Current offer", inr(offer.price)], ["Suggested after change", inr(Math.round(offer.listPrice * 1.08 * (1 - offer.discountPct / 100)))], ["Reason", "24x7 cover and a 2-hour response need a standby engineer"]] }],
    chips: [{ label: "Update the offer for the amended contract", tone: "green", effect: { t: "offerContract", id: offer.id, nba: k }, done: "Offer updated (+8%). Logged in NewCRM." }, { label: "Keep the price and note the risk", effect: { t: "note", text: `Offer ${offer.id}: contract amended, price kept. Risk noted: 24x7 cover not priced.`, nba: k }, done: "Risk noted in NewCRM." }],
  };

  if ((no === 7 || no === 8) && asset) {
    const trend = asset.callbacksPrev90d ? Math.round(((asset.callbacks90d - asset.callbacksPrev90d) / asset.callbacksPrev90d) * 100) : 0;
    return {
      no, title: `${no === 7 ? "Renewal plan" : "Retention visit"}: ${unit(asset)}`, agent: no === 7 ? "Customer Health Score · Churn Prediction" : "Customer Health Score · Sales Assistant", sources, intro: no === 7 ? `${acc?.name} is at risk. Here is why and a plan before the contract ends.` : `Callbacks on ${unit(asset)} are up ${trend}%. Here is a visit plan.`, why: ["Health score = callbacks, faults and age on fixed weights.", "Risk factors are the strongest signals in the score."],
      blocks: [{ rows: [["Health score", `${asset.health} of 100`], ["Callbacks", `${asset.callbacks90d} in 90 days (${asset.callbacksPrev90d} before, ${trend >= 0 ? "up" : "down"} ${Math.abs(trend)}%)`], ["Faults", `${asset.faults90d} in 90 days`], ["Contract", asset.contractEnd ? `ends in ${daysTo(s, asset.contractEnd)} days` : "none"]] }, { h: "Risk factors", bullets: [`Callbacks rising ${trend}%`, asset.ageYears >= 12 ? `Unit is ${asset.ageYears} years old` : "Recent faults", `Customer contact: ${acc?.contact.name} (${acc?.contact.role})`] }, { h: "Plan", bullets: [`Visit ${first(acc)} within 5 days with the service history`, "Offer a 3-year renewal with a preventive visit schedule", "Agree a root-cause fix for the repeat faults"] }],
      chips: [{ label: "Book the visit", tone: "green", effect: { t: "task", title: `Retention visit: ${acc?.name} (${unit(asset)})`, days: 5, accountId: acc?.id, nba: k }, done: "Visit task created. Logged in NewCRM." }, { label: "Draft the renewal", ask: `Draft the renewal for lift ${asset.id.slice(1)}` }],
    };
  }

  if (no === 10 && asset) return {
    no, title: `Repair quote from the technician note: ${unit(asset)}`, agent: "Repair Lead Generation", sources: ["SAP service notes"], intro: "I read the technician's note and turned it into a repair quote. Check the parts and price, then it goes into the normal approval path.", why: ["Part names and counts are read from the note.", "Prices come from the standard repair price list for the area."],
    blocks: [{ h: "Technician note", text: asset.techNote ?? "" }, { table: { head: ["Item", "Qty", "Price"], rows: [["Door roller kit", "4", inr(48000)], ["Door sill re-alignment", "1", inr(18000)], ["Labour: 2 technicians, 2 days", "1", inr(22000)], ["Operator check and test run", "1", inr(7000)], ["Total (GST extra)", "", inr(95000)]] } }],
    chips: [{ label: "Create the repair quote", tone: "green", ask: `Draft a repair quote for lift ${asset.id.slice(1)}` }, { label: "Not now" }],
  };

  if (no === 11 && asset) {
    const price = listPrice(acc?.area ?? "HYC", "modernisation", 1); const saving = 420000; const pay = price / saving;
    return {
      no, title: `Modernisation case: ${unit(asset)}`, agent: "MOD Propensity Scoring · Price Pilot", sources: ["Installed base", "SAP service history", "MOD Propensity Scoring"], intro: `${unit(asset)} is ${asset.ageYears} years old with ${asset.faults90d} faults in 90 days. Here is the business case.`, why: ["Propensity = age, fault rate and parts risk on fixed weights.", "Savings = avoided call-outs plus energy, from standard assumptions."],
      blocks: [{ table: { head: ["", "Today", "After modernisation"], rows: [["Faults per 90 days", String(asset.faults90d), "under 1"], ["Energy use (index)", "100", "68"], ["Downtime per year", "46 hours", "under 6 hours"], ["Parts availability", "Discontinued parts", "Current parts for 15+ years"]] } }, { rows: [["Investment", inr(price)], ["Yearly saving (call-outs and energy)", inr(saving)], ["Simple payback", `${pay.toFixed(1)} years`], ["Typical range for this area", `6 to 9 years (${regionRef(s, acc?.area ?? "HYC", "modernisation").winRate}% of our offers won)`]] }],
      chips: [{ label: "Price this modernisation", tone: "green", ask: `Draft a modernisation offer for lift ${asset.id.slice(1)}` }, { label: "Book a site survey", effect: { t: "task", title: `Site survey: ${unit(asset)}, ${acc?.name}`, days: 7, accountId: acc?.id, nba: k }, done: "Survey task created. Logged in NewCRM." }],
    };
  }

  if (no === 12 && asset) return {
    no, title: `Obsolete part alert: ${unit(asset)}`, agent: "MOD Propensity Scoring", sources: ["Parts lifecycle list", "Installed base"], intro: `${asset.obsolete} Here is a customer alert and an upgrade option.`, why: ["Parts lifecycle comes from the factory discontinuation list.", "The alert is a standard letter. You can edit it before it goes."],
    blocks: [{ rows: [["Unit", `${unit(asset)} · ${asset.model}`], ["Part", "Door operator board DO-31"], ["Status", "Discontinued. Last-time buy closes in 6 months"], ["Customer risk", "A board failure after that means weeks of downtime"]] }],
    draft: { label: "Letter to the customer", subject: `Important: discontinued part on ${unit(asset)}`, text: `Dear ${first(acc)} garu,\n\nThe door operator board on ${unit(asset)} at ${place(asset)} has been discontinued by the manufacturer. A last-time purchase is possible for the next 6 months.\n\nWe recommend either securing spare boards now, or planning a door-system upgrade that removes the risk. I would be glad to walk you through both.\n\nBest regards,\n${u.name}` },
    chips: [{ label: "Send the alert to the customer", tone: "green", effect: { t: "customerAlert", assetId: asset.id, nba: k }, done: "Alert sent and logged in NewCRM." }, { label: "Propose the upgrade", ask: `Draft a modernisation offer for lift ${asset.id.slice(1)}` }],
  };

  if (no === 13 && tender) {
    const open = tender.checklist.filter((c) => !c.done);
    return {
      no, title: `Bid checklist: ${tender.id}`, agent: "Tender Insight · CRM Agent", sources: ["Tender Insight", "NewCRM opportunity"], intro: `The end of order date for ${tender.name} is in ${daysTo(s, tender.eord)} days and the stage is "${tender.stage}". ${open.length} checklist items are still open.`, why: ["EORD within 14 days and stage not final triggers this.", "Checklist is the standard bid list for this tender type."],
      blocks: [{ rows: [["Tender", tender.name], ["End of order date", `${fmt(s, tender.eord)} (${daysTo(s, tender.eord)} days)`], ["Value", inr(tender.value)], ["Stage", tender.stage]] }, { h: "Checklist", bullets: tender.checklist.map((c) => `${c.done ? "✓" : "○"} ${c.t}`) }],
      chips: [{ label: "Set the stage to final bidding", tone: "green", effect: { t: "tenderStage", id: tender.id, stage: "final", nba: k }, done: "Stage updated in NewCRM." }, { label: "Create tasks for the open items", effect: { t: "task", title: `Close open bid items for ${tender.id}: ${open.map((c) => c.t).join("; ")}`, days: 3, accountId: tender.accountId, nba: k }, done: "Task created." }],
    };
  }

  if (no === 14 && (tender || acc)) {
    const note = tender ? accountOf(s, tender.accountId)?.lostBids ?? tender.summary : acc?.lostBids ?? "";
    return {
      no, title: `Why we lost at ${accountOf(s, tender?.accountId ?? acc?.id)?.name}`, agent: "Sales Assistant", sources: ["NewCRM loss history"], intro: "We lost a bid at this account before. Here is what happened and what to change this time.", why: ["Reads the closed-lost reason and competitor from NewCRM.", "Suggestions are fixed patterns for price losses."],
      blocks: [{ h: "What happened", text: note }, { h: "What to change", bullets: ["Lead with total cost of ownership, not unit price.", "Offer a shorter delivery time: the developer valued speed.", "Offer a longer warranty instead of a bigger discount.", `Stay within ${Math.round(regionRef(s, tender?.area ?? "HYC", "newinstall").avgDiscount)}% discount, the area average.`] }],
      chips: [{ label: "Add to the bid notes", tone: "green", effect: { t: "note", text: `Bid strategy for ${tender?.id ?? ""}: lead with lifecycle cost, shorter delivery, longer warranty.`, nba: k }, done: "Bid notes saved in NewCRM." }, { label: "Not now" }],
    };
  }

  if (no === 15 && tender) {
    const reg = regionRef(s, tender.area, "newinstall");
    return {
      no, title: `Tender summary: ${tender.id}`, agent: "Project Lead Finder · Tender Insight", sources: ["Project Lead Finder", "Building permits"], intro: `A new project matches your territory. Here is a summary and a fit score.`, why: ["Matched on area, building type and lift count from the permit.", "Fit score = key customer, area presence, size and past win rate."],
      blocks: [{ rows: [["Project", tender.name], ["Customer", accountOf(s, tender.accountId)?.name ?? ""], ["Area", AREA_NAME[tender.area]], ["Size", `${tender.lifts} lifts · ${inr(tender.value)}`], ["Order date", `about ${daysTo(s, tender.eord)} days`], ["Fit score", `${reg.sells ? 82 : 20} of 100`]] }, { h: "Summary", text: tender.summary }, { h: "Why it fits", bullets: [accountOf(s, tender.accountId)?.key ? "Existing key customer" : "New customer in a covered area", `We won ${reg.winRate}% of similar bids in ${AREA_NAME[tender.area]}`, "Size is above our usual project threshold"] }],
      chips: [{ label: "Qualify as a lead", tone: "green", effect: { t: "tenderQualify", id: tender.id, nba: k }, done: "Qualified and assigned in NewCRM." }, { label: "Not a fit", effect: { t: "tenderDrop", id: tender.id, nba: k }, done: "Dismissed and logged." }],
    };
  }

  if (no === 17 && tender) return {
    no, title: `Counter-argument: ${tender.id}`, agent: "Tender Insight", sources: ["Tender Insight"], intro: "The tender spec names a competitor product. Here is how to answer it without losing the bid.", why: ["Competitor spec is matched against our equivalent product list.", "Wording is a standard compliance statement."],
    blocks: [{ h: "What the spec says", text: tender.competitorSpec ?? "" }, { h: "Our answer", bullets: ["Our door operator meets the same performance class: same opening time and safety rating.", "Equal and approved alternates are allowed under the tender terms.", "Offer a witness test at the factory to prove equivalence."] }],
    draft: { label: "Clarification question to the tender office", text: `With reference to clause on the door operator and drive: please confirm that equivalent products of the same performance class are acceptable. We will submit the compliance sheet with our bid.` },
    chips: [{ label: "Add to the bid notes", tone: "green", effect: { t: "note", text: `Counter-argument saved for ${tender.id}: equivalence statement and factory witness test.`, nba: k }, done: "Saved in NewCRM." }, { label: "Create a task to send the clarification", effect: { t: "task", title: `Send clarification on competitor spec for ${tender.id}`, days: 2, accountId: tender.accountId, nba: k }, done: "Task created." }],
  };

  if (no === 20) return {
    no, title: "Coaching theme for the team", agent: "CRM Agent", sources: ["CRM Agent", "Team win-rate drivers"], intro: "Team-level only. No person is named or ranked, and this stays off until the works council has reviewed it.", why: ["Compares groups of quotes by how fast they were followed up.", "Never shows individual performance."],
    blocks: [{ table: { head: ["Follow-up speed", "Quotes", "Won"], rows: [["Within 3 days", "14", "57%"], ["4 to 13 days", "11", "36%"], ["14 days or more", "9", "22%"]] } }, { h: "Theme", bullets: ["Quotes followed up within 3 days win about twice as often.", "Idle-quote prompts already help. Discuss follow-up habits in the team meeting."] }],
    chips: [{ label: "Note it for the team meeting", tone: "green", effect: { t: "note", text: "Team meeting theme: follow up quotes within 3 days.", nba: k }, done: "Noted." }],
  };

  if (no === 21 && offer) return {
    no, title: `Complete the configuration: ${offer.id}`, agent: "Configuration Assistant", sources: ["NewCRM quote", "Tender spec", "Configuration Assistant"], intro: `${offer.id} is missing ${offer.missing?.length ?? 0} fields. I filled them from the tender spec. Please check before you complete the quote.`, why: ["Rated load from the passenger count in the spec.", "Floors from the building height in the spec.", "Door type from the architect's drawing note."],
    blocks: [{ table: { head: ["Field", "Suggested value", "Taken from"], rows: [["Rated load (kg)", "1,350 kg (20 persons)", "Tender spec, passenger count"], ["Number of floors", "34 stops (G+32 plus basement)", "Tender spec, building height"], ["Door type", "Centre-opening, 2 panels", "Architect's drawing note"]] } }],
    chips: [{ label: "Complete the quote", tone: "green", effect: { t: "offerFix", id: offer.id, nba: k }, done: "Quote completed. The seller has been told." }, { label: "Ask the seller to confirm", effect: { t: "task", title: `Confirm configuration for ${offer.id}`, days: 1, to: offer.createdBy, nba: k }, done: "Task sent to the seller." }],
  };

  if (no === 22 && offer) {
    const hrs = Math.round((now - offer.lastActivity) / HOUR); const w = winChance(s, offer.area, offer.product, offer.discountPct);
    return {
      no, title: `Escalation brief: ${offer.id}`, agent: "CRM Agent", sources: ["Approval log", "Price Pilot"], intro: `${offer.id} has waited ${hrs} hours for approval. This one-page brief makes the decision quick.`, why: ["Approval waiting more than 48 hours triggers this.", "The brief is what the approver needs: price, area check, risk."],
      blocks: [{ rows: [["Customer", accountOf(s, offer.accountId)?.name ?? ""], ["Offer", `${offer.title} · ${inr(offer.price)} · ${offer.discountPct}% off`], ["Waiting", `${hrs} hours for ${offer.approvals.filter((x) => x.status === "pending").map((x) => NAMES[x.by]).join(", ")}`], ["Win chance at this discount", `${w}%`], ["Risk of delay", "The customer may sign with another firm this week"]] }],
      draft: { label: "Message to the approver", text: `${offer.id} for ${accountOf(s, offer.accountId)?.name} (${inr(offer.price)}, ${offer.discountPct}% off) has waited ${hrs} hours. Win chance at this discount is ${w}%. A decision today would keep the deal alive.` },
      chips: [{ label: "Escalate with this context", tone: "green", effect: { t: "escalate", id: offer.id, nba: k }, done: "Escalated to the approver and logged." }, { label: "Not now" }],
    };
  }

  if (no === 24 && acc) {
    const units = sh.assets.filter((a) => a.accountId === acc.id);
    return {
      no, title: `Account review: ${acc.name}`, agent: "CRM Agent · Customer Health Score", sources: ["NewCRM account", "Customer Health Score"], intro: `No activity on ${acc.name} for ${Math.floor((now - acc.lastActivity) / DAY)} days. Here is the whole account before a customer review.`, why: ["Silent = no call, visit, quote or email logged for 60 days.", "Health is a fixed score per unit."],
      blocks: [{ rows: [["Contact", `${acc.contact.name}, ${acc.contact.role}`], ["Lines active", Object.entries(acc.lines).filter(([, v]) => v).map(([x]) => x.toUpperCase()).join(", ") || "none"], ["Open offers", sh.offers.filter((o) => o.accountId === acc.id && !["won", "lost", "rejected"].includes(o.status)).map((o) => o.id).join(", ") || "none"]] }, { table: { head: ["Unit", "Contract", "Health"], rows: units.map((a) => [unit(a), a.contractEnd ? `ends in ${daysTo(s, a.contractEnd)} d` : "none", String(a.health)]) } }, { h: "Suggested", bullets: ["Call the contact this week with a short account review.", units.some((a) => a.health < 45) ? "Start with the at-risk unit." : "Share a portfolio health summary.", "Check overlap with the NI and EI owners before you call."] }],
      chips: [{ label: "Book the account review", tone: "green", effect: { t: "task", title: `Account review with ${acc.contact.name} (${acc.name})`, days: 7, accountId: acc.id, nba: k }, done: "Task created. Logged in NewCRM." }, { label: "Draft an outreach email", ask: `Draft a check-in email to ${acc.name}` }],
    };
  }

  if (no === 25 && acc) {
    const missing = (["ei", "sc", "mod"] as const).filter((l) => !acc.lines[l]);
    return {
      no, title: `Handover pack: ${acc.name}`, agent: "Handover Pack Generator · Conversion Alerts", sources: ["NewCRM account", "Installed base"], intro: `${acc.name} buys only ${Object.entries(acc.lines).filter(([, v]) => v).map(([x]) => x.toUpperCase()).join(", ")} from us. Here is a pack for the next line.`, why: ["Cross-sell = active in one line and none in the others.", "The pack is what the next seller needs so the customer is not asked everything again."],
      blocks: [{ rows: [["Customer", `${acc.name} · ${AREA_NAME[acc.area]}`], ["Decision maker", `${acc.contact.name}, ${acc.contact.role}`], ["Installed lifts", String(sh.assets.filter((a) => a.accountId === acc.id).length)], ["Oldest unit", `${Math.max(0, ...sh.assets.filter((a) => a.accountId === acc.id).map((a) => a.ageYears))} years`], ["Relationship", `Key account. Last contact ${Math.floor((now - acc.lastActivity) / DAY)} days ago`]] }, { h: "Next lines", bullets: missing.map((l) => (l === "sc" ? "SC: no service contract on the new units" : l === "ei" ? "EI: callbacks and repairs not yet covered" : "MOD: units over 20 years may qualify")) }],
      chips: missing.map((l, i): DocChip => ({ label: `Send to the ${l.toUpperCase()} rep`, tone: i === 0 ? "green" : undefined, effect: { t: "handover", accountId: acc.id, to: l === "ei" ? "elias" : l === "sc" ? "sofia" : "mia", line: l, nba: i === 0 ? k : undefined }, done: `Pack sent to the ${l.toUpperCase()} rep. Task created.` })),
    };
  }

  if (no === 26) {
    const area = r.segment ?? "HYC"; const units = sh.assets.filter((a) => a.ageYears >= 20 && accountOf(s, a.accountId)?.area === area);
    const names = Array.from(new Set(units.map((a) => accountOf(s, a.accountId)?.name ?? "")));
    const subject = "Keep your lift safe and reliable for the next 10 years"; const body = `Dear {{first name}} garu,\n\nLifts over 20 years old need extra care. Our engineers can check your lift and suggest a clear plan: preventive maintenance, parts security, or a phased upgrade.\n\nBook a free health check this month and get a written report within 3 days.\n\nBest regards,\nSchindler India`;
    return {
      no, title: `Audience: ageing lifts in ${AREA_NAME[area]}`, agent: "Customer Segmentation · Personalized Outreach", sources: ["Customer Segmentation", "Installed base"], intro: `${units.length} lifts over 20 years old in ${AREA_NAME[area]} across ${names.length} customers. Here is the audience and a draft campaign.`, why: ["Segment = installed base filtered by age, area and no recent offer.", "Message is written per segment with one clear call to action."],
      blocks: [{ table: { head: ["Customer", "Units", "Oldest"], rows: names.map((n) => { const us = units.filter((a) => accountOf(s, a.accountId)?.name === n); return [n, String(us.length), `${Math.max(...us.map((a) => a.ageYears))} years`]; }) } }, { h: "Why this audience", bullets: ["Age 20+ means parts and reliability risk rising", "No modernisation offer in the last 6 months", "Contacts are on file for every account"] }],
      draft: { label: "Campaign message", subject, text: body },
      chips: [{ label: "Create the campaign", tone: "green", effect: { t: "campaign", name: `Ageing lifts health check: ${AREA_NAME[area]}`, segment: `Ageing lifts, ${AREA_NAME[area]}`, area, size: units.length, subject, body, nba: k }, done: "Campaign created and live. Leads will appear in the campaign list." }, { label: "Not now" }],
    };
  }

  if (no === 27 && u.role === "mkt") {
    const idle = sh.mleads.filter((l) => l.status === "new" && now - l.createdAt > 48 * HOUR);
    const owner = (a: string) => (a === "HYW" ? "ethan" : "elias");
    return {
      no, title: "Leads not followed up in 48 hours", agent: "CRM Agent", sources: ["CRM Agent", "Campaign leads"], intro: `${idle.length} campaign lead${idle.length > 1 ? "s have" : " has"} waited over 48 hours. Assign the ones with no owner and nudge the rest.`, why: ["Waiting = status new and no action for 48 hours.", "Assignment follows the area owner list."],
      blocks: [{ table: { head: ["Lead", "Source", "Waiting", "Owner"], rows: idle.map((l) => [`${l.id} ${l.name}`, l.source, `${Math.round((now - l.createdAt) / HOUR)} h`, l.owner ? NAMES[l.owner] : "none"]) } }],
      chips: [...idle.filter((l) => !l.owner).map((l, i): DocChip => ({ label: `Assign ${l.id} to ${NAMES[owner(l.area)].split(" ")[0]}`, tone: i === 0 ? "green" : undefined, effect: { t: "assign", mleadId: l.id, to: owner(l.area), nba: k }, done: `${l.id} assigned and the owner told.` })), ...idle.filter((l) => l.owner).slice(0, 1).map((): DocChip => ({ label: "Nudge the owners", effect: { t: "nudgeLeads", nba: k }, done: "Owners nudged." }))],
    };
  }
  return null;
}
