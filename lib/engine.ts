import type { Config, Draft, Input, Outcome, Preset, Reason, Team, Tier } from "./types";
import { PLACES, TEAM_NAME } from "./data";
export { PLACES };

export const ESC: Record<string, string> = {
  A1: "M1", A2: "M2", B1: "M3", B2: "M4", B3: "M5", B5: "M6", B8: "M7", B13: "M8", B14: "M9",
  C1: "M10", C2: "M11", C4: "M12", C7: "M13", D1: "M15", C13: "M16",
};

export function tierOf(score: number, cfg: Config): Tier {
  return score >= cfg.tiers.hot ? "Hot" : score >= cfg.tiers.warm ? "Warm" : score >= cfg.tiers.cold ? "Cold" : "Info";
}
const sum = (r: Reason[]) => r.reduce((a, b) => a + b.pts, 0);

export function baseInput(): Input {
  return {
    equip: "lift", subject: "unit", quality: "ok", brand: "ours", records: "found", contract: "active", servicer: "unknown",
    condition: "unsure", age: 12, units: 1, buildingType: "office", keyCustomer: false, inArea: true, placeSrc: "gps",
    newPlace: false, known: "none", breakdowns: 0, contact: false, offline: false, oldPhoto: false, locMismatch: false,
    certExpired: false, declinedRetake: false, lowConfidence: false,
  };
}

export function presetToInput(p: Preset, placeId: string): Input {
  const pl = PLACES.find((x) => x.id === placeId) ?? PLACES[0];
  return {
    ...baseInput(), equip: p.equip, subject: p.subject, notice: p.notice, quality: p.quality,
    brand: p.reading.brand, number: p.reading.number, age: p.reading.age, servicer: p.reading.servicer,
    records: p.backend.records, contract: p.backend.contract, known: p.backend.known, breakdowns: p.backend.breakdowns,
    buildingType: pl.type, keyCustomer: !!pl.key, inArea: pl.area !== "OUT", placeSrc: p.placeSrc,
    lowConfidence: p.quality === "brandOnly", ...(p.extra ?? {}),
  };
}

function mods(i: Input, mode: "unit" | "site" | "mod", ours: boolean): Reason[] {
  const m: Reason[] = [];
  if (i.contact) m.push({ label: mode === "site" ? "Developer or contractor met on site" : "Reporter met someone at the site", pts: 10 });
  if (mode !== "site") {
    if (i.units >= 5) m.push({ label: "Five or more lifts in the building", pts: 10 });
    else if (i.units >= 2) m.push({ label: "Two to four lifts in the building", pts: 5 });
    if (i.buildingType === "mall" || i.buildingType === "hospital") m.push({ label: "Mall or hospital", pts: 10 });
  }
  if (mode === "unit") {
    if (i.condition === "minor") m.push({ label: "Minor issues seen", pts: 10 });
    if (i.condition === "out") m.push({ label: "Out of service", pts: 20 });
    if (ours && i.breakdowns >= 4) m.push({ label: "Four or more breakdown calls in 90 days", pts: 10 });
    if (!ours && i.age >= 20) m.push({ label: "Another company's lift about 20 years or older", pts: 10 });
    if (i.reason === "complaint") m.push({ label: "Someone complained about it", pts: 10 });
    if (i.reasonDetail === "unhappy") m.push({ label: "Customer unhappy with our service", pts: 10 });
    if (i.reasonDetail === "quote") m.push({ label: "Customer asked for a quote", pts: 15 });
    if (!ours) {
      if (i.inCharge === "fm" || i.inCharge === "owner") m.push({ label: i.inCharge === "fm" ? "Facility manager known" : "Building owner known", pts: 5 });
      if (i.ownerTalk === "open") m.push({ label: "Person in charge is open to a call", pts: 15 });
      if (i.ownerTalk === "no") m.push({ label: "Person in charge was not interested", pts: -10 });
      if (i.servicerMood === "unhappy") m.push({ label: "Unhappy with the current servicer", pts: 15 });
    }
  }
  if (mode === "mod" && i.reason === "old") m.push({ label: "Reporter says it looks old or worn", pts: 5 });
  if (mode === "site") {
    if (i.stage === "early") m.push({ label: "Building-site stage: early", pts: 15 });
    if (i.stage === "structure") m.push({ label: "Building-site stage: structure going up", pts: 10 });
    if (i.stage === "finishing") m.push({ label: "Building-site stage: finishing work", pts: -10 });
  }
  if (mode === "mod") {
    if (i.age >= 25) m.push({ label: "25 years or older", pts: 10 });
    if (i.condition === "minor" || i.condition === "out") m.push({ label: "Problems on an old lift", pts: 15 });
  }
  if (i.keyCustomer) m.push({ label: "Key customer", pts: 10 });
  if (i.lowConfidence) m.push({ label: "Photo reading was not certain", pts: -10 });
  return m;
}

const eqWord = (e: Input["equip"]) => (e === "lift" ? "lift" : e === "escalator" ? "escalator" : "moving walk");

export function evaluate(i: Input, cfg: Config): Outcome {
  const o: Outcome = { items: [], cases: [], points: [], plain: [], headline: "", verdict: "unsure", notes: [] };
  const esc = i.equip !== "lift";
  const ours = i.brand === "ours";
  const W = eqWord(i.equip);
  const cid = (b: string) => (esc && ESC[b] ? ESC[b] : b);
  const tag = (b: string) => { const c = cid(b); if (!o.cases.includes(c)) o.cases.push(c); return c; };
  const add = (d: Partial<Draft> & Pick<Draft, "kind" | "team" | "track" | "caseId" | "title" | "summary">) =>
    o.items.push({ score: 0, tier: "Info", reasons: [], also: [], flags: [], ...d });

  type LOpts = { extra?: Reason[]; also?: Team[]; flags?: string[]; silent?: boolean; cap?: number; floor?: number; kind?: "lead" | "ticket" };
  const lead = (team: Team, track: Draft["track"], base: number, label: string, mode: "unit" | "site" | "mod", caseB: string, title: string, summary: string, op: LOpts = {}) => {
    const reasons: Reason[] = [{ label, pts: base }, ...mods(i, mode, ours), ...(op.extra ?? [])];
    let score = sum(reasons);
    if (op.floor !== undefined && score < op.floor) { reasons.push({ label: "Urgent: out of service sets Hot", pts: op.floor - score }); score = op.floor; }
    if (op.cap !== undefined && score > op.cap) { reasons.push({ label: "Capped by rule", pts: op.cap - score }); score = op.cap; }
    score = Math.max(0, Math.min(100, score));
    const tier = tierOf(score, cfg);
    const kind = op.kind ?? "lead";
    if (tier === "Info" && kind === "lead") {
      add({ kind: "info", team: null, track: "info", caseId: tag(caseB), title: "Saved as information", summary: `${summary} Score ${score} is under the lead threshold.`, score, tier, reasons, autoClose: "Saved as information" });
      return;
    }
    add({ kind, team, track, caseId: tag(caseB), title, summary, score, tier, reasons, also: op.also ?? [], flags: op.flags ?? [], silent: op.silent });
  };
  const records = (caseB: string, title: string, summary: string, flags: string[] = [], also: Team[] = []) =>
    add({ kind: "records", team: "RS", track: "records", caseId: tag(caseB), title, summary, flags, also });
  const note = (caseB: string, title: string, summary: string, team: Team | null = null) =>
    add({ kind: "note", team, track: "noted", caseId: tag(caseB), title, summary, autoClose: "Noted" });
  const info = (caseB: string, title: string, summary: string, team: Team | null = null, steps?: string[], autoClose = "Saved as information") =>
    add({ kind: "info", team, track: "info", caseId: tag(caseB), title, summary, steps, autoClose });
  const pts = (key: string, label: string, p: number, status: "pending" | "confirmed" = "pending") => o.points.push({ key, label, pts: p, status });

  o.verdict = i.quality === "notLift" || i.quality === "unreadable" ? "retake" : ours ? "ours" : i.brand === "other" ? "notours" : "unsure";
  const idTxt = i.number ? `${W} ${i.number}` : `this ${W}`;
  const own = ours ? `Looks like one of ours (${idTxt})` : i.brand === "other" ? `Not one of our ${W}s (${idTxt})` : `Brand not clear for ${idTxt}`;

  const body = () => {
    /* E: photo quality */
    if (i.quality === "notLift") {
      add({ kind: "retake", team: null, track: "retake", caseId: tag("E5"), title: "Not a lift", summary: "Photo does not show a lift or escalator.", step0: 1 });
      pts("sent", "Report sent", 0, "confirmed"); o.plain.push("That photo does not show a lift. Please retake. No points for this one."); return;
    }
    if (i.quality === "duplicatePhoto") {
      info("E9", "Duplicate photo blocked", "This exact photo was sent before.");
      pts("sent", "Duplicate photo", 0, "confirmed"); o.plain.push("This exact photo was sent before, so no points."); return;
    }
    if (i.quality === "unreadable") {
      if (i.declinedRetake) { info("E4", "Neither readable", "Photo unreadable and the reporter declined to retake."); pts("sent", "Report sent", 10, "pending"); o.plain.push("Saved as information only."); return; }
      add({ kind: "retake", team: null, track: "retake", caseId: tag("E4"), title: "Clearer photo needed", summary: "Neither brand nor number is readable.", step0: 1 });
      o.plain.push("We need a clearer photo of the plate or button panel."); return;
    }
    if (i.quality === "ok" && i.number) tag("E1");
    if (i.quality === "brandOnly") tag("E2");
    if (i.dangerPhoto) tag("A6");
    if (i.oldPhoto) { tag("E10"); o.notes.push("Old gallery photo: points held and sampled by the records team."); }
    if (i.locMismatch) { tag("F7"); o.notes.push("Location differs from the photo: points held."); }

    /* A: safety */
    if (i.condition === "unsafe") {
      const hurt = i.hurt === "yes" || i.hurt === "unsure";
      const id = !i.inArea ? "A4" : i.brand === "other" ? "A3" : i.offline ? "A5" : hurt ? "A1" : "A2";
      const c = tag(id);
      if (esc) tag(hurt ? "A1" : "A2");
      const flags = [hurt ? (esc ? "Someone hurt or caught" : "Someone trapped or hurt") : "Nobody hurt", ...(i.offline ? ["Sent late, no signal"] : []), ...(!ours ? ["Not our lift"] : [])];
      add({
        kind: "emergency", team: "ED", track: "emergency", caseId: c, flags,
        title: hurt ? "Unsafe: " + (esc ? "someone hurt or caught" : "someone trapped or hurt") : "Unsafe: nobody hurt",
        summary: `Unsafe ${W} reported${hurt ? ", people at risk" : ""}.${!ours ? " Not our lift: building owner to be informed." : ""}${!i.inArea ? " Outside our area: record local rules." : ""}`,
        also: ours ? ["SVC"] : [], steps: !ours || !i.inArea ? ["Alerted", "Acknowledged", "Building informed"] : undefined,
        score: 100, tier: "Hot",
      });
      pts("safety", "Valid safety report (badge)", 30, "pending");
      o.plain.push("Emergency desk alerted. No sales lead is created.");
      return;
    }

    /* D8: outside area */
    if (!i.inArea) { info("D8", "Outside our service area", "Building is outside the area. Saved as information.", null); pts("sent", "Report sent", 10, "pending"); o.plain.push("Outside our area. Saved as information."); return; }

    /* G: duplicates and history */
    if (i.known !== "none") {
      const t: Team = ours ? "SC" : "EI";
      const D: Record<string, [string, string, number, string]> = {
        sameReporter: ["G2", "You reported this earlier. Showing your earlier report, no new lead.", 0, "Same reporter sent it before."],
        openLead: ["G1", "An open lead already exists for this unit. Your photos are added to it.", 2, "New photos and notes appended to the open lead."],
        colleague: ["G3", "A colleague reported this minutes ago. Merged, with credit to both.", 2, "Second reporter merged into the open lead."],
        lostRecent: ["G5", "A lead on this unit was lost recently. Passed to the previous owner to decide.", 2, "New sighting on a recently lost lead."],
        deal: ["G8", "This unit is part of a larger deal. Added as intel to that deal.", 2, "Sighting added to a deal in negotiation."],
        won: ["G6", "We already won this one. The records team checks the record.", 2, "Already won. Check the record is correct."],
        openTicket: ["G7", "An open service ticket exists. Your photos are added to it.", 0, "Photos added to the open ticket."],
      };
      const [g, msg, p, sm] = D[i.known];
      if (i.known === "won") add({ kind: "info", team: "RS", track: "info", caseId: tag(g), title: "Already won", summary: sm, steps: undefined, autoClose: "Saved as information" });
      else if (i.known === "openTicket") add({ kind: "merge", team: "SVC", track: "fault", caseId: tag(g), title: "Added to open service ticket", summary: sm, step0: 1 });
      else add({ kind: "merge", team: i.known === "sameReporter" ? null : t, track: "merge", caseId: tag(g), title: "Added to existing lead", summary: sm, step0: 1, also: [] });
      pts("sent", p ? "Duplicate credit" : "Duplicate of your earlier report", p, "confirmed");
      o.plain.push(msg); return;
    }

    /* D: sites and notices */
    if (i.subject === "site" || i.subject === "notice") {
      const pub = i.buildingType === "gov" || i.buildingType === "transport";
      if (i.subject === "notice") {
        if (i.notice === "renovation") { info("D5", "Renovation intel", "Lift under renovation behind hoarding. Record who is doing it and until when.", "MOD"); o.plain.push("Thanks. Modernisation sales will log who is doing the work."); }
        else if (i.notice === "tender" || pub) { info("C9", "Tender notice", "Modernisation or tender notice visible.", pub ? "TENDER" : "NI", undefined, "Passed to team"); o.plain.push("Notice passed to the tender team."); }
        else lead("NI", "project", 45, "\"Lift coming soon\" board", "site", "D4", "Lift coming soon board", "A notice board says a lift is coming. Check dates and developer.");
        pts("sent", "Report sent", 10); return;
      }
      if (pub) { info(esc ? "C13" : "C13", "Tender only", `${esc ? "Escalators" : "Lift"} planned at a public building. No direct pitch.`, "TENDER", undefined, "Passed to tenders"); pts("sent", "Report sent", 10); o.plain.push("Public building: passed to the tender team."); return; }
      if (i.weInstalling) { note("D3", "We are installing", "Our company is installing the lift. Project team told.", null); pts("sent", "Report sent", 10); o.plain.push("Thanks. Our project team already has this one."); return; }
      if (i.competitorInstalling) {
        info("D2", "Competitor installing", "A competitor is installing. Logged as competitor intelligence.", "NI", undefined, "Intel logged");
        pts("sent", "Report sent", 10); o.plain.push("Logged as competitor intelligence."); return;
      }
      const d = "D1";
      lead("NI", "project", cfg.base.site, "Building site with no lift yet", "site", d, "Building site, no lift yet", `${esc ? "Escalators" : "Lift"} not yet installed at the site.`, {
        cap: i.ordered ? cfg.tiers.warm - 1 : undefined, extra: i.ordered ? [{ label: "Developer says it is already ordered: Cold, kept as intel", pts: 0 }] : [],
      });
      pts("sent", "Report sent", 10); o.plain.push(`Building site${i.stage ? `, stage: ${i.stage}` : ""}. New-installation sales get it.`); return;
    }

    /* U: units */
    const prob = i.condition === "minor" || i.condition === "out";
    const faulty = prob;
    const old = i.age >= 20;

    if (ours) {
      if (i.records === "multiple") { records("E12", "Number matches several units", "Pick the right record.", ["possibleDuplicate"]); pts("records", "Report sent", 10); }
      else if (i.records === "scrapped" || i.records === "otherBuilding") { records("B18", "Records review", "Unit marked scrapped or recorded in another building.", ["review"]); pts("sent", "Report sent", 10); }
      else if (i.records === "wrong") { records("B17", "Records fix", "Record details differ from the photos: address, model or lift count."); pts("sent", "Report sent", 10); }
      else if (i.records === "missing") {
        if (i.servicer === "other") {
          records("B15", "Missing lift, other firm's sticker", "Our lift is not in records and carries another firm's sticker.");
          lead("SC", "winback", cfg.base.ourOther, "Our lift, another company services it now", "unit", "B15", "Win-back lead", "Our lift, not in records, serviced by another firm.");
        } else if (prob) {
          records("B14", "Missing lift with a problem", "Our lift is not in records and has a problem.");
          lead("SVC", "fault", cfg.base.ourMissingProblem, "Our lift, not in records, with a problem", "unit", "B14", "Service ticket", "Fault on a lift missing from records.", { kind: "ticket", floor: i.condition === "out" ? cfg.tiers.hot : undefined });
          lead("EI", "fault", cfg.base.ourMissingProblem, "Our lift, not in records, with a problem", "unit", "B14", "Sales alert", "Fault on a lift missing from records. Tell the customer contact.", { silent: true });
        } else if (i.servicer === "us") records("B16", "Missing lift, our own sticker", "Our sticker but no record: add the unit and link the contract from SAP.", [], ["SC"]);
        else records("B13", "Missing lift", "Our lift is not in the installed base. Add it.");
        pts("sent", "Report sent", 10); pts("added", "Missing lift added to our records", 30);
      } else {
        // found or placeOnly
        if (i.records === "placeOnly") { records("E2", "Confirm place-only match", "Matched by place and brand. Low certainty: confirm the record.", ["lowCertainty"]); }
        if (i.servicer === "other" && i.contract !== "active") {
          lead("SC", "winback", cfg.base.ourOther, "Our lift, another company services it now", "unit", "B8", "Win-back lead", "Our lift is now serviced by another company.");
        } else if (i.contract === "warranty") {
          if (prob) lead("SVC", "fault", cfg.base.ourProblem, "Our lift under contract with a problem", "unit", "B11", "Warranty service ticket", "Fault on a lift under warranty.", { kind: "ticket", also: ["EI"] });
          else { note("B10", "Under warranty", "New lift under warranty. Reminder 90 days before warranty ends.", "EI"); }
        } else if (i.contract === "ended") lead("SC", "renewal", cfg.base.ended, "Our lift, contract ended", "unit", "B5", "Renewal lead", "Contract has ended.");
        else if (i.contract === "ending") lead("SC", "renewal", cfg.base.ended, "Contract ends within 60 days (early renewal)", "unit", "B6", "Early renewal lead", "Contract ends within 60 days.");
        else if (i.contract === "never") lead("SC", "sales", cfg.base.ended, "In records, never had a contract", "unit", "B7", "New service-contract lead", "Lift in records that never had a contract.");
        else if (i.contract === "cancelled") lead("SC", "sales", cfg.base.ended, "Contract cancelled, on hold or in dispute", "unit", "B9", "Lead with caution", "Contract cancelled or in dispute. Manager decides whether to approach.", { flags: ["Caution: dispute"], also: ["MGR"] });
        else if (prob) {
          const floor = i.condition === "out" ? cfg.tiers.hot : undefined;
          lead("SVC", "fault", cfg.base.ourProblem, "Our lift under contract with a problem", "unit", i.condition === "out" ? "B3" : "B2", i.condition === "out" ? "Urgent service ticket" : "Service ticket", i.condition === "out" ? "Out of service. Dispatch same day." : "Minor fault on a lift under contract.", { kind: "ticket", also: ["EI"], floor, flags: i.condition === "out" ? ["Urgent"] : [] });
          lead("EI", "fault", cfg.base.ourProblem, "Our lift under contract with a problem", "unit", i.condition === "out" ? "B3" : "B2", "Sales alert", "Fault on a lift under contract. Call the customer.", { silent: true, floor });
          if (i.breakdowns >= 4) tag("B4");
        } else if (i.breakdowns >= 4) {
          tag("B4");
          lead("EI", "noted", cfg.base.ourProblem, "Customer at risk: repeated breakdowns", "unit", "B4", "Customer at risk", "Four or more breakdown calls in 90 days. Plan a retention visit.", { also: ["MGR"], silent: true, flags: ["Customer at risk"] });
          add({ kind: "note", team: null, track: "noted", caseId: tag("B1"), title: "Noted", summary: "Running fine on the day.", autoClose: "Noted" });
        } else if (i.reason === "contract") {
          lead("SC", "renewal", cfg.base.ended, "Contract question heard on site", "unit", "B6", "Contract follow-up", `Contract question at the site${i.reasonDetail === "ending" ? ": the customer thinks it ends soon" : i.reasonDetail === "unhappy" ? ": the customer is unhappy with the service" : i.reasonDetail === "quote" ? ": the customer wants a quote" : ""}.`);
        } else if (i.reason === "complaint") {
          lead("EI", "sales", cfg.base.ourProblem, "Complaint about our lift, running fine on the day", "unit", "B4", "Customer at risk", "Someone complained about this lift. Plan a retention call.", { flags: ["Customer at risk"] });
        } else note("B1", "Noted", "Lift is ours, in records, contract active, running fine. Nothing to do.");
        if (i.keyCustomer) tag("B19");
        if ((old && faulty) || (i.reason === "old" && i.age >= 15)) lead("MOD", "modernisation", cfg.base.veryOld, "Very old lift (modernisation lead)", "mod", "B12", "Modernisation lead", old && faulty ? "Lift is 20 years or older and faulty." : "The reporter says it looks old or worn.");
        pts("sent", "Report sent", 10);
      }
    } else {
      // another company's
      if (i.buildingType === "gov" || i.buildingType === "transport") {
        info("C13", "Tender only", "Government or public building. No direct pitch.", "TENDER", undefined, "Passed to tenders");
        pts("sent", "Report sent", 10); o.plain.push("Public building: passed to the tender team."); return;
      }
      if (i.brand === "unclear") {
        records("C16", "Unclear brand", "Brand unclear or modified unit. The records team decides, then sales.", [], ["EI"]);
        pts("sent", "Report sent", 10); o.plain.push("Brand unclear. The records team will check."); return;
      }
      const T: Record<string, [string, number, string, string]> = {
        other: ["C1", cfg.base.otherLocal, "Another company's lift, local firm services it", "A local firm services it. Good chance."],
        maker: ["C2", cfg.base.otherMaker, "Another company's lift, serviced by its own maker", "Serviced by its own maker. Low priority."],
        staff: ["C3", cfg.base.otherLocal, "Another company's lift, building staff service it", "Building staff service it. Note on parts and service."],
        nobody: ["C4", cfg.base.otherLocal, "Another company's lift, nobody services it", "No servicing sticker seen."],
        unknown: ["C5", cfg.base.otherLocal, "Another company's lift, servicing firm unknown", "Servicing firm unknown. Assistant asks again after sending."],
        us: ["C1", cfg.base.otherLocal, "Another company's lift", "Serviced by us?"],
      };
      const [cc, base, label, sm] = T[i.servicer];
      const young = i.age < 3;
      lead("EI", "sales", base, label, "unit", cc, "Sales lead", sm, {
        also: i.keyCustomer ? ["AM"] : [], cap: young ? cfg.tiers.warm - 1 : undefined,
        extra: young ? [{ label: "Installed under 3 years ago: revisit when warranty ends", pts: 0 }] : [],
        flags: [...(cc === "C2" ? ["Low priority"] : []), ...(cc === "C5" ? ["needsInfo"] : []), ...(i.certExpired ? ["Compliance flag: certificate expired"] : [])],
      });
      if (i.certExpired) tag("C8");
      if (i.lostBid) { tag("C15"); o.notes.push("Lost a bid to this competitor recently."); }
      if (young) tag("C10");
      if (prob) tag("C6");
      if (i.buildingType === "mall" || i.buildingType === "hospital") tag("C11");
      if (i.keyCustomer) tag("C12");
      if (old) lead("MOD", "modernisation", cfg.base.veryOld, "Very old lift (modernisation lead)", "mod", "C7", "Modernisation lead", "Another company's lift, 20 years or older.");
      pts("sent", "Report sent", 10);
    }
    o.plain.push(`${own}.`);
  };

  body();

  /* location and place cases */
  if (i.quality !== "notLift" && i.quality !== "duplicatePhoto") {
    if (i.newPlace) {
      tag("F5");
      add({ kind: "records", team: "RS", track: "records", caseId: "F5", title: "Verify new building", summary: "Place not in our records. Verify the building and its registered sales area.", flags: ["newPlace"] });
    }
    if (i.placeSrc === "gps" && !i.newPlace) tag("F1");
    if (i.placeSrc === "denied") tag("F3");
    if (i.placeSrc === "later") { tag("F6"); o.notes.push("Reported later: lower place certainty."); }
  }
  /* key customer: the account manager gets an Account track on the main sales lead */
  const mainLead = o.items.find((x) => x.kind === "lead" && !x.silent && (x.team === "SC" || x.team === "EI"));
  if (i.keyCustomer && mainLead && i.subject === "unit") {
    tag(ours ? "B19" : "C12");
    add({ kind: "lead", team: "AM", track: "account", caseId: "C12", title: "Key customer sighting", summary: "Another site of a key customer. The local rep owns the lead; you coordinate.", score: mainLead.score, tier: mainLead.tier, reasons: mainLead.reasons, flags: ["Local rep owns the lead"] });
  }
  if (new Set(o.items.filter((x) => (x.kind === "lead" || x.kind === "ticket") && !x.silent && x.team && x.team !== "AM").map((x) => x.team)).size >= 2) tag("H6");
  if (i.equip === "walk") tag("M14");

  /* points: statuses */
  const held = i.oldPhoto || i.locMismatch;
  const clean = !held && !i.lowConfidence && i.quality === "ok";
  o.points.forEach((p) => { if (p.key === "sent" && p.pts > 0) p.status = held ? "held" : clean ? "confirmed" : "pending"; });
  if (o.cases.length === 0) o.cases.push("K1"); else if (!o.items.some((x) => x.kind === "emergency")) tag("K1");

  const first = o.items.find((x) => !x.silent);
  o.headline = o.verdict === "retake" ? "Needs a clearer photo" : o.verdict === "ours" ? "Looks like one of ours" : o.verdict === "notours" ? "Not one of ours" : "Needs checking";
  if (first && o.plain.length === 0) o.plain.push(first.summary);
  return o;
}

export function teamsOf(o: Outcome): Team[] {
  const t: Team[] = [];
  o.items.filter((x) => !x.silent).forEach((x) => { if (x.team && !t.includes(x.team)) t.push(x.team); });
  return t;
}
export const teamNames = (ts: Team[]) => ts.map((t) => TEAM_NAME[t]).join(" + ");

/* ---------- Mock facts that owners see (never shown to reporters) ---------- */
export function facts(i: Input) {
  const ended = i.contract === "ended" || i.contract === "cancelled";
  return {
    contractEnd: i.contract === "ended" ? "31 Mar 2026" : i.contract === "ending" ? "12 Jan 2027" : i.contract === "active" ? "30 Jun 2027" : i.contract === "warranty" ? "Warranty to 14 Feb 2027" : i.contract === "never" ? "None on record" : "Cancelled 02 Aug 2026",
    lastVisit: ended ? "14 Dec 2025" : "03 Oct 2026",
    servicing: i.servicer === "other" ? "Local firm (read from sticker)" : i.servicer === "maker" ? "Its own maker" : i.servicer === "staff" ? "Building staff" : i.servicer === "nobody" ? "Nobody visibly" : i.servicer === "us" ? "Us" : "Unknown",
    model: i.brand === "ours" ? "Schindler 3300" : i.brand === "other" ? "OtherLift Prime" : "Unclear",
    year: String(2026 - Math.round(i.age)),
    otherUnits: i.units > 1 ? i.units - 1 : 0,
  };
}

export const OPENING: Record<string, string> = {
  SC: "Hello, I am calling from Schindler. Your lift service contract recently came up for renewal. Could we arrange a short visit to talk through options?",
  EI: "Hello, I noticed your lift during a visit. Many buildings like yours benefit from a service review. Could we find 15 minutes this week?",
  MOD: "Hello, we noticed your lift is over twenty years old. We can survey it and show what a modernisation could save you in faults and energy.",
  NI: "Hello, we saw your project on site. We would like to introduce Schindler as a lift supplier and learn about your timeline.",
  SVC: "Dispatch an engineer. Check the fault history first.",
  AM: "Coordinate with the local rep before approaching the customer.",
};
