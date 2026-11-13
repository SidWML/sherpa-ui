"use client";
import { OP, SH, ensureAccount, leadHooks, offerOf, seedSherpa, serviceLeadFor, techFor, tenderOf } from "./sherpa";
import { AC } from "./accounts";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Alert, Draft, Input, Item, LeadInfo, Photo, PointStatus, Report, SiteVisit, State, Team, Tier } from "./types";
import { APPS, DEFAULT_CFG, GLOBAL_OWNER, PLACES, PRESETS, TRACKS, USERS, type AppId } from "./data";
import { baseInput, evaluate, presetToInput, tierOf } from "./engine";

export const H = 3600000;
const KEY = "snaplead-poc-v7";
const USER_KEY: Record<AppId, string> = { sherpa: "sherpa-user", snap: "snaplead-user" };
export const STATE_VERSION = 13;

export const userOf = (id?: string | null) => USERS.find((u) => u.id === id);
export const nowOf = (s: State) => Date.now() + s.clock;
export const stepsOf = (i: Item) => i.steps ?? TRACKS[i.track].steps;
export const effTier = (i: Item): Tier => i.override?.to ?? i.tier;

/* ---------- internal helpers (mutate a draft state) ---------- */
function nid(s: State, p: string) { s.seq += 1; return `${p}${s.seq}`; }
function notify(s: State, userId: string | undefined, text: string, reportId?: string) {
  if (!userId) return;
  s.alerts.unshift({ id: nid(s, "al"), userId, t: nowOf(s), text, reportId, read: false });
}
function audit(s: State, by: string, text: string) { s.audit.unshift({ t: nowOf(s), by, text }); }
function itemLog(s: State, it: Item, by: string, text: string) { it.log.push({ t: nowOf(s), by, text }); it.lastActionAt = nowOf(s); }
function sysLog(s: State, it: Item, text: string) { it.log.push({ t: nowOf(s), by: "System", text }); } // does not reset the follow-up clock
function findItem(s: State, id: string): [Report, Item] | null {
  for (const r of s.reports) { const it = r.items.find((x) => x.id === id); if (it) return [r, it]; }
  return null;
}
function addPoint(s: State, r: Report, key: string, label: string, pts: number, status: PointStatus) {
  if (r.points.some((p) => p.key === key && p.status !== "reversed") && key !== "extra") return;
  r.points.push({ id: nid(s, "pt"), key, label, pts, status, at: nowOf(s) });
}
function confirmPoint(r: Report, key: string) { r.points.forEach((p) => { if (p.key === key && p.status === "pending") p.status = "confirmed"; }); }

function routeItem(s: State, area: string, it: Item) {
  if (!it.team) { it.routed = "none"; return; }
  if (s.cfg.paused) { it.routed = "exception"; it.flags.push("Routing paused"); return; }
  const owner = GLOBAL_OWNER[it.team] ?? s.cfg.owners[area]?.[it.team];
  if (owner) { it.ownerId = owner; it.routed = "owner"; } else it.routed = "exception";
}

function closeItem(s: State, r: Report, it: Item, outcome: string, by: string) {
  it.step = stepsOf(it).length - 1; it.status = "closed"; it.outcome = outcome; itemLog(s, it, by, outcome);
  void r;
}
function toStep(s: State, r: Report, it: Item, re: RegExp, by: string, text: string): boolean {
  const idx = stepsOf(it).findIndex((x) => re.test(x));
  if (idx > it.step) {
    it.step = idx; itemLog(s, it, by, text);
    notify(s, r.reporterId, `${r.id}: ${stepsOf(it)[idx]}`, r.id);
    r.timeline.push({ t: nowOf(s), by: "System", text: `${TRACKS[it.track].label}: ${stepsOf(it)[idx]}` });
    return true;
  }
  return false;
}

function makeItems(s: State, r: Report, drafts: Draft[], at: number): Item[] {
  return drafts.map((d) => ({
    ...d, id: nid(s, "it"), reportId: r.id, routed: "none", status: d.kind === "retake" ? "waiting" : "new",
    step: d.step0 ?? 0, createdAt: at, lastActionAt: at, clockLevel: 0, nudges: 0, log: [{ t: at, by: "System", text: "Created from report" }],
  }));
}

function activate(s: State, r: Report) {
  const at = nowOf(s);
  let anyOwner = false; let anyExc = false;
  r.items.forEach((it) => {
    if (it.status === "waiting" && it.kind === "retake") return;
    it.status = "new"; it.createdAt = at; it.lastActionAt = at;
    routeItem(s, r.area, it);
    if (it.kind === "emergency") { it.step = 0; }
    if (it.autoClose) { it.step = stepsOf(it).length - 1; it.status = "closed"; it.outcome = it.autoClose; }
    else if (it.kind === "merge") { it.step = Math.max(it.step, 1); }
    if (it.routed === "owner" && it.status === "new" && !it.silent) {
      anyOwner = true;
      const u = userOf(it.ownerId);
      notify(s, it.ownerId, `${it.kind === "emergency" ? "EMERGENCY" : it.tier} · ${it.title} · ${r.placeName}`, r.id);
      if (it.also.length) it.log.push({ t: at, by: "System", text: `Also told: ${it.also.join(", ")}` });
      void u;
    }
    if (it.routed === "exception") { anyExc = true; notify(s, s.cfg.owners[r.area]?.MGR ?? "marc", `No owner: ${it.title} · ${r.placeName}`, r.id); }
    if (it.silent && it.routed === "owner") notify(s, it.ownerId, `Heads-up · ${it.title} · ${r.placeName}`, r.id);
    if (it.flags.includes("needsInfo")) notify(s, r.reporterId, `${r.id} needs info: the servicing firm sticker. You can add it later.`, r.id);
    if (it.also.includes("AM")) notify(s, s.cfg.owners[r.area]?.AM, `Key customer site: ${r.placeName}`, r.id);
    if (it.also.includes("MGR")) notify(s, s.cfg.owners[r.area]?.MGR, `${it.title} · ${r.placeName}`, r.id);
  });
  if (anyOwner && !r.cases.includes("H1")) r.cases.push("H1");
  if (anyExc && !r.cases.includes("H2")) r.cases.push("H2");
  if (r.items.some((x) => x.routed === "exception" && x.team === "NI") && !r.cases.includes("D9")) r.cases.push("D9");
  r.timeline.push({ t: at, by: "System", text: r.status === "queued" ? "Synced after signal returned" : "Report created and routed by rules" });
  OP.fromReport(s, r);
}

export interface NewReport {
  id?: string; reporterId: string; input: Input; photos: Photo[]; placeId: string; placeName: string; area: string;
  answers: { q: string; a: string }[]; corrections: string[]; at?: number; trusted?: boolean;
}
export function createReport(s: State, p: NewReport): Report {
  const at = p.at ?? nowOf(s);
  const existing = p.id ? s.reports.find((x) => x.id === p.id) : undefined;
  if (existing) return existing; // a retry with the same report ID never creates a duplicate
  const out = evaluate(p.input, s.cfg);
  const id = p.id ?? `SL-${1000 + s.seq + 1}`; s.seq += 1;
  const queued = s.offline;
  const r: Report = {
    id, reporterId: p.reporterId, createdAt: at, status: queued ? "queued" : "sent", placeName: p.placeName, placeId: p.placeId, area: p.area,
    input: p.input, photos: p.photos, answers: p.answers, corrections: p.corrections, items: [], cases: [...out.cases], points: [],
    timeline: [{ t: at, by: queued ? "Phone" : "Reporter", text: queued ? "Saved on the phone, waiting to send" : "Report confirmed and created" }],
    extras: { photos: 0 }, headline: out.headline, verdict: out.verdict, plain: out.plain, trusted: p.trusted ?? true,
  };
  s.reports.unshift(r);
  r.items = makeItems(s, r, out.items, at);
  const sameDay = s.reports.filter((x) => x.reporterId === p.reporterId && x.id !== r.id && at - x.createdAt < 24 * H && x.points.some((q) => q.key === "sent" && q.pts > 0)).length;
  const limited = sameDay >= s.cfg.dailyLimit;
  if (limited) { r.cases.push("K6"); r.timeline.push({ t: at, by: "System", text: "Daily limit reached: report accepted, no extra points today" }); }
  out.points.forEach((pt) => {
    const pts = limited && pt.key !== "safety" ? 0 : pt.pts;
    r.points.push({ id: nid(s, "pt"), key: pt.key, label: limited && pts === 0 && pt.pts > 0 ? "Daily limit reached" : pt.label, pts, status: pt.status, at });
  });
  if (!queued) activate(s, r);
  else { r.items.forEach((it) => { it.status = "waiting"; }); r.cases.push("J1"); }
  return r;
}

/** A lift the records steward confirmed joins the installed base, so the next snap of it is found. */
function addAsset(s: State, r: Report) {
  if (r.input.number && s.sherpa.assets.some((a) => a.label.startsWith(r.input.number!))) return;
  const acc = ensureAccount(s, r, s.cfg.owners[r.area]?.EI ?? "ethan");
  if (!acc.placeIds.includes(r.placeId)) acc.placeIds.push(r.placeId);
  const c = r.input.condition;
  s.sherpa.assets.push({ id: `as-${s.sherpa.seq++}`, accountId: acc.id, placeId: r.placeId, label: `${r.input.number ?? `Unit from ${r.id}`} · ${r.placeName}`, model: r.info?.manufacturer || "Schindler, model to confirm", ageYears: r.input.age, brand: "ours", callbacks14d: 0, callbacks90d: 0, callbacksPrev90d: 0, faults90d: c === "out" ? 2 : 0, health: c === "fine" ? 80 : c === "minor" ? 60 : 40, servicer: r.input.servicer === "us" ? "Schindler" : "Unknown", owner: acc.owner });
  s.sherpa.crm.unshift({ t: nowOf(s), by: "Records", text: `Unit ${r.input.number ?? r.id} added to the installed base at ${r.placeName}` });
}

/* ---------- clock: follow-up reminders ---------- */
export function tick(s: State) {
  const now = nowOf(s);
  OP.sync(s);
  s.reports.forEach((r) => {
    if (r.status !== "sent") return;
    r.items.forEach((it) => {
      if (it.status === "snoozed" && it.snoozeUntil && it.snoozeUntil <= now) { it.status = "new"; it.lastActionAt = it.snoozeUntil; it.clockLevel = 0; }
      if (it.kind !== "lead" || it.silent || it.status !== "new" || it.team === "AM") return;
      const t = effTier(it);
      const th = t === "Hot" ? s.cfg.followUp.hot : t === "Warm" ? s.cfg.followUp.warm : null;
      if (!th) return;
      const hrs = (now - it.lastActionAt) / H;
      const lvl = hrs >= th[2] ? 3 : hrs >= th[1] ? 2 : hrs >= th[0] ? 1 : 0;
      for (let l = it.clockLevel + 1; l <= lvl; l++) {
        const mgr = s.cfg.owners[r.area]?.MGR ?? "marc";
        if (l === 1) { notify(s, it.ownerId, `Reminder: ${t} lead waiting ${th[0]}h · ${it.title} · ${r.placeName}`, r.id); sysLog(s, it, `Reminder sent to owner after ${th[0]}h`); }
        if (l === 2) { notify(s, mgr, `No action in ${th[1]}h · ${it.title} · ${r.placeName}`, r.id); sysLog(s, it, `Manager told after ${th[1]}h`); }
        if (l === 3) { notify(s, mgr, `Reassign now · ${it.title} · ${r.placeName}`, r.id); sysLog(s, it, `Manager to reassign after ${th[2]}h`); }
      }
      it.clockLevel = Math.max(it.clockLevel, lvl);
    });
  });
}
export function clockHours(it: Item, s: State) { return Math.floor((nowOf(s) - it.lastActionAt) / H); }

/* ---------- owner / desk actions ---------- */
export const A = {
  accept(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.status = "accepted"; it.acceptedAt = nowOf(s); itemLog(s, it, userOf(by)?.name ?? by, "Accepted");
    toStep(s, r, it, /assigned|told|checks|acknowledged/i, by, "Accepted");
    confirmPoint(r, "sent");
    if (it.kind === "lead" || it.kind === "ticket") {
      if (r.reporterId === it.ownerId) r.timeline.push({ t: nowOf(s), by: "System", text: "Reporter is the owner: no extra reward on own lead" });
      else if (!it.silent) addPoint(s, r, `accept-${it.id}`, "Lead accepted by the owner", 20, "confirmed");
    }
    notify(s, r.reporterId, `${r.id}: accepted by ${userOf(by)?.name ?? "the owner"} (+20 points)`, r.id);
  },
  decline(s: State, id: string, by: string, reason: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.status = "declined"; it.declineReason = reason; it.routed = "exception"; it.ownerId = undefined; itemLog(s, it, userOf(by)?.name ?? by, `Declined: ${reason}`);
    notify(s, s.cfg.owners[r.area]?.MGR ?? "marc", `Declined (${reason}) · ${it.title} · ${r.placeName}`, r.id);
    if (!r.cases.includes("H4")) r.cases.push("H4");
  },
  contact(s: State, id: string, by: string, how: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.status === "new") A.accept(s, id, by);
    itemLog(s, it, userOf(by)?.name ?? by, how);
    toStep(s, r, it, /contacted/i, by, how);
  },
  visit(s: State, id: string, by: string, note?: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.status === "new") A.accept(s, id, by);
    toStep(s, r, it, /contacted/i, by, "Contacted"); toStep(s, r, it, /visit|survey/i, by, "Visit logged");
    if (note) itemLog(s, it, userOf(by)?.name ?? by, `Visit note: ${note}`);
  },
  quote(s: State, id: string, by: string, note?: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.status === "new") A.accept(s, id, by);
    toStep(s, r, it, /contacted/i, by, "Contacted"); toStep(s, r, it, /visit|survey/i, by, "Visit"); toStep(s, r, it, /proposal/i, by, "Proposal");
    toStep(s, r, it, /quote|offer|proposal/i, by, "Quote or offer logged");
    if (note) itemLog(s, it, userOf(by)?.name ?? by, `Quote note: ${note}`);
    if (!it.quoted) { it.quoted = true; addPoint(s, r, `quote-${it.id}`, "Quote sent", 50, "confirmed"); }
  },
  opportunity(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [, it] = f;
    if (it.status === "new") A.accept(s, id, by);
    it.flags.push("Opportunity created"); itemLog(s, it, userOf(by)?.name ?? by, "Opportunity created in NewCRM");
  },
  notRelevant(s: State, id: string, by: string, reason: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    closeItem(s, r, it, `Closed: not relevant (${reason})`, userOf(by)?.name ?? by);
    notify(s, r.reporterId, `${r.id}: closed. Thank you for reporting.`, r.id);
  },
  snooze(s: State, id: string, by: string, days: number) {
    const f = findItem(s, id); if (!f) return; const [, it] = f;
    it.status = "snoozed"; it.snoozeUntil = nowOf(s) + days * 24 * H; itemLog(s, it, userOf(by)?.name ?? by, `Snoozed ${days} days`);
  },
  dataFix(s: State, id: string, by: string, text: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    const d: Draft = { kind: "records", team: "RS", track: "records", caseId: "RS", title: "Data fix requested by owner", summary: text || "Owner asks for a records correction.", score: 0, tier: "Info", reasons: [], also: [], flags: ["dataFix"] };
    const [n] = makeItems(s, r, [d], nowOf(s)); n.silent = true; routeItem(s, r.area, n); r.items.push(n);
    notify(s, n.ownerId, `Data fix request · ${r.placeName}`, r.id); itemLog(s, it, userOf(by)?.name ?? by, "Data fix requested from the records team");
  },
  outcome(s: State, id: string, by: string, kind: "won" | "lost" | "notinterested" | "invalid" | "hold") {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    const label = { won: "Won", lost: "Lost to a competitor", notinterested: "Customer not interested", invalid: "Invalid", hold: "On hold" }[kind];
    if (kind === "won") {
      A.quote(s, id, by); closeItem(s, r, it, "Won", userOf(by)?.name ?? by);
      addPoint(s, r, `won-${it.id}`, "Won", 200, "confirmed"); r.impact = true;
      notify(s, r.reporterId, `${r.id}: WON. Your report became a deal (+200 points). See the impact story.`, r.id);
    } else {
      closeItem(s, r, it, label, userOf(by)?.name ?? by);
      if (kind === "invalid") { it.flags.push("Invalid: manager review"); notify(s, s.cfg.owners[r.area]?.MGR ?? "marc", `Invalid lead to review · ${r.placeName}`, r.id); }
      notify(s, r.reporterId, `${r.id}: closed (${label}). Thank you. Earlier points stay.`, r.id);
    }
    r.timeline.push({ t: nowOf(s), by: "System", text: `${TRACKS[it.track].label}: ${label}` });
  },
  /* manager */
  reassign(s: State, ids: string[], to: string, by: string) {
    ids.forEach((id) => {
      const f = findItem(s, id); if (!f) return; const [r, it] = f;
      const prev = it.ownerId; it.ownerId = to; it.routed = "owner"; it.status = "new"; it.clockLevel = 0; it.lastActionAt = nowOf(s); it.declineReason = undefined;
      it.flags = it.flags.filter((x) => x !== "Routing paused");
      itemLog(s, it, userOf(by)?.name ?? by, `Reassigned ${prev ? userOf(prev)?.name + " → " : "to "}${userOf(to)?.name}`);
      notify(s, to, `Assigned to you: ${it.title} · ${r.placeName}`, r.id);
      audit(s, userOf(by)?.name ?? by, `Reassigned ${it.id} (${r.id}) to ${userOf(to)?.name}`);
      if (!r.cases.includes("H1")) r.cases.push("H1");
    });
  },
  nudge(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.nudges += 1; notify(s, it.ownerId, `Nudge from manager: ${it.title} · ${r.placeName}`, r.id); itemLog(s, it, userOf(by)?.name ?? by, "Nudged owner");
  },
  override(s: State, id: string, by: string, to: Tier, reason: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.override = { from: it.override?.from ?? it.tier, to, reason, by: userOf(by)?.name ?? by };
    itemLog(s, it, userOf(by)?.name ?? by, `Tier override ${it.tier} → ${to}: ${reason}`);
    audit(s, userOf(by)?.name ?? by, `Tier override on ${it.id} (${r.id}): ${it.tier} → ${to}. Reason: ${reason}`);
  },
  approveMerge(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.flags = it.flags.filter((x) => x !== "mergePending"); closeItem(s, r, it, "Merged", userOf(by)?.name ?? by); audit(s, userOf(by)?.name ?? by, `Approved merge ${it.id} (${r.id})`);
    toStep(s, r, it, /added|corrected/i, by, "Merged");
    notify(s, r.reporterId, `${r.id}: merged into our records`, r.id);
  },
  releasePoints(s: State, reportId: string, by: string, ok: boolean) {
    const r = s.reports.find((x) => x.id === reportId); if (!r) return;
    r.points.forEach((p) => { if (p.status === "held") p.status = ok ? "confirmed" : "reversed"; });
    if (!ok) { r.fake = true; r.trusted = false; }
    audit(s, userOf(by)?.name ?? by, `${ok ? "Released" : "Rejected"} held points on ${r.id}`);
    notify(s, r.reporterId, ok ? `${r.id}: points released. Thank you.` : `${r.id}: points were not awarded. Please follow the photo guidance.`, r.id);
  },
  /* records */
  records(s: State, id: string, by: string, action: "confirm" | "create" | "link" | "merge" | "correct" | "reject" | "scrapped" | "different", fake = false) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f; const who = userOf(by)?.name ?? by;
    it.status = it.status === "new" ? "accepted" : it.status;
    toStep(s, r, it, /checks/i, by, "Records team is checking");
    if (action === "merge") { it.flags.push("mergePending"); itemLog(s, it, who, "Merge proposed: waiting for the manager"); notify(s, s.cfg.owners[r.area]?.MGR ?? "marc", `Approve merge · ${r.placeName}`, r.id); return; }
    const text: Record<string, string> = { confirm: "Match confirmed", create: "Added to our records", link: "Linked to the existing record", correct: "Record corrected", reject: "Rejected", scrapped: "Marked scrapped", different: "Different lift: new record" };
    closeItem(s, r, it, text[action], who);
    if (action === "create" || action === "different") {
      const pend = r.points.find((p) => p.key === "added" && p.status === "pending");
      if (pend) pend.status = "confirmed"; else addPoint(s, r, `added-${it.id}`, "Missing lift added to our records", 30, "confirmed");
      addAsset(s, r);
    }
    if (action === "confirm" || action === "link" || action === "correct") confirmPoint(r, "sent");
    if (action === "reject" && fake) { r.points.forEach((p) => { if (p.status !== "reversed") p.status = "reversed"; }); r.fake = true; r.trusted = false; notify(s, s.cfg.owners[r.area]?.MGR ?? "marc", `Junk report rejected: ${r.id}`, r.id); }
    audit(s, who, `Records: ${text[action]} on ${it.id} (${r.id})`);
    notify(s, r.reporterId, action === "reject" ? `${r.id}: we could not use this report${fake ? " (points reversed)" : ""}.` : `${r.id}: ${text[action]}${action === "create" ? " (+30 points)" : ""}`, r.id);
    if (it.step < stepsOf(it).length - 1) it.step = stepsOf(it).length - 1;
    r.timeline.push({ t: nowOf(s), by: who, text: `Records: ${text[action]}` });
  },
  /* emergency */
  ack(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    it.status = "accepted"; toStep(s, r, it, /acknowledged/i, by, "Acknowledged");
    r.points.forEach((p) => { if (p.key === "safety") p.status = "confirmed"; });
    notify(s, r.reporterId, `${r.id}: emergency desk acknowledged. Thank you (+30 and a Safety First badge).`, r.id);
  },
  dispatch(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.step < 1) A.ack(s, id, by);
    it.serviceOrder = `SO-${70000 + s.seq}`; s.seq += 1; toStep(s, r, it, /engineer/i, by, `Dispatched: service order ${it.serviceOrder}`);
    notify(s, "jonas", `Service order ${it.serviceOrder} · ${r.placeName}`, r.id);
  },
  notifyBuilding(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.step < 1) A.ack(s, id, by);
    it.buildingInformed = true; toStep(s, r, it, /building informed/i, by, "Standard safety message sent to the building owner");
    audit(s, userOf(by)?.name ?? by, `Safety message sent to building owner for ${r.placeName} (${r.id})`);
  },
  closeEmergency(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    closeItem(s, r, it, "Closed", userOf(by)?.name ?? by);
    notify(s, r.reporterId, `${r.id}: emergency closed. Thank you for speaking up.`, r.id);
  },
  /* service */
  svcAccept(s: State, id: string, by: string) { A.accept(s, id, by); },
  assignEngineer(s: State, id: string, by: string, name: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.status === "new") A.accept(s, id, by);
    it.engineer = name; toStep(s, r, it, /engineer/i, by, `Engineer assigned: ${name}`);
  },
  closeTicket(s: State, id: string, by: string, outcome: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    toStep(s, r, it, /engineer/i, by, "Engineer assigned"); closeItem(s, r, it, `Fixed: ${outcome}`, userOf(by)?.name ?? by);
    notify(s, r.reporterId, `${r.id}: fixed. Thank you.`, r.id);
  },
  handBack(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    const d: Draft = { kind: "lead", team: "SC", track: "renewal", caseId: it.caseId, title: "Renewal chance from a service job", summary: "Service found a renewal chance while fixing the fault.", score: 55, tier: "Warm", reasons: [{ label: "Handed back by the service team", pts: 55 }], also: [], flags: [] };
    const [n] = makeItems(s, r, [d], nowOf(s)); routeItem(s, r.area, n); r.items.push(n);
    notify(s, n.ownerId, `Renewal chance handed back by service · ${r.placeName}`, r.id); itemLog(s, it, userOf(by)?.name ?? by, "Handed back to sales");
  },
  /* account manager */
  coordinate(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    if (it.status === "new") it.status = "accepted";
    toStep(s, r, it, /account manager told/i, by, "Reviewed");
    const rep = r.items.find((x) => x.team !== "AM" && x.ownerId && x.kind === "lead");
    if (rep) notify(s, rep.ownerId, `Account manager is coordinating on ${r.placeName}`, r.id);
    itemLog(s, it, userOf(by)?.name ?? by, "Coordinated with the local rep");
  },
  accountPlan(s: State, id: string, by: string) {
    const f = findItem(s, id); if (!f) return; const [r, it] = f;
    closeItem(s, r, it, "Added to account plan", userOf(by)?.name ?? by);
    notify(s, r.reporterId, `${r.id}: added to the account plan`, r.id);
  },
  /* reporter extras */
  extra(s: State, reportId: string, kind: "contact" | "note" | "photo" | "detail", text: string) {
    const r = s.reports.find((x) => x.id === reportId); if (!r) return;
    const log = (t: string) => r.items.forEach((it) => { if (it.status !== "closed" && it.team) it.log.push({ t: nowOf(s), by: userOf(r.reporterId)?.name ?? "Reporter", text: t }); });
    if (kind === "contact" && !r.extras.contact) {
      r.extras.contact = text; r.input.contact = true; addPoint(s, r, "x-contact", "Contact added", 5, "confirmed"); log(`Contact added: ${text}`);
      const out = evaluate(r.input, s.cfg);
      r.items.forEach((it) => {
        const nu = out.items.find((d) => d.caseId === it.caseId && d.team === it.team && d.kind === it.kind);
        if (nu && it.kind === "lead" && it.status !== "closed") { it.score = nu.score; it.tier = nu.tier; it.reasons = nu.reasons; }
      });
    }
    if (kind === "note" && !r.extras.note) { r.extras.note = text; addPoint(s, r, "x-note", "Note added", 5, "confirmed"); log(`Note: ${text}`); }
    if (kind === "photo" && r.extras.photos < 3) { r.extras.photos += 1; addPoint(s, r, `x-photo${r.extras.photos}`, "Extra photo", 3, "confirmed"); log("Extra photo added"); }
    if (kind === "detail") {
      r.input.servicer = "other";
      const re = evaluate(r.input, s.cfg); r.headline = re.headline; r.plain = re.plain;
      r.items.forEach((it) => { it.flags = it.flags.filter((x) => x !== "needsInfo"); if (it.team) it.log.push({ t: nowOf(s), by: "Reporter", text: `Detail added: ${text}` }); });
      r.extras.note = r.extras.note ?? text;
    }
    r.timeline.push({ t: nowOf(s), by: "Reporter", text: kind === "contact" ? "Added a contact" : kind === "note" ? "Added a note" : kind === "photo" ? "Added a photo" : `Added detail: ${text}` });
    r.items.forEach((it) => { if (it.ownerId && it.status !== "closed" && it.team) notify(s, it.ownerId, `${r.id}: reporter added ${kind}`, r.id); });
  },
  editInfo(s: State, reportId: string, info: LeadInfo) {
    const r = s.reports.find((x) => x.id === reportId); if (!r) return;
    const hadContact = !!(r.extras.contact || r.info?.contactName.trim());
    r.info = info;
    r.timeline.push({ t: nowOf(s), by: userOf(r.reporterId)?.name ?? "Reporter", text: "Lead details updated" });
    if (!hadContact && info.contactName.trim()) A.extra(s, reportId, "contact", [info.contactName.trim(), info.role.trim()].filter(Boolean).join(", "));
    else r.items.forEach((it) => { if (it.ownerId && it.status !== "closed" && it.team) notify(s, it.ownerId, `${r.id}: reporter updated the lead details`, r.id); });
  },
  resumeRetake(s: State, reportId: string) {
    const r = s.reports.find((x) => x.id === reportId); if (!r) return;
    r.input.quality = "brandOnly"; r.input.lowConfidence = true;
    const out = evaluate(r.input, s.cfg);
    r.items = r.items.filter((x) => x.kind !== "retake");
    r.items.push(...makeItems(s, r, out.items, nowOf(s))); r.cases = Array.from(new Set([...r.cases, ...out.cases]));
    r.headline = out.headline; r.verdict = out.verdict; r.plain = out.plain;
    out.points.forEach((p) => addPoint(s, r, p.key, p.label, p.pts, p.status));
    r.items.filter((x) => x.status === "new" && x.routed === "none").forEach((it) => { routeItem(s, r.area, it); if (it.autoClose) { it.step = stepsOf(it).length - 1; it.status = "closed"; it.outcome = it.autoClose; } else if (it.kind === "merge") it.step = 1; if (it.ownerId) notify(s, it.ownerId, `${it.title} · ${r.placeName}`, r.id); });
    r.timeline.push({ t: nowOf(s), by: "Reporter", text: "Sent a clearer photo: report resumed" });
  },
  sync(s: State) {
    s.reports.filter((r) => r.status === "queued").forEach((r) => { r.status = "sent"; activate(s, r); r.timeline.unshift({ t: nowOf(s), by: "System", text: "Report ID reused on retry: no duplicate" }); notify(s, r.reporterId, `${r.id} was sent after signal returned.`, r.id); });
  },
};

/* ---------- seed ---------- */
function photosFor(kind: "unit" | "site"): Photo[] {
  return kind === "site"
    ? [{ id: "p1", label: "Site hoarding", kind: "site", text: "New tower, Block C" }, { id: "p2", label: "Notice board", kind: "board", text: "Lift installation: Q2" }]
    : [{ id: "p1", label: "Licence plate", kind: "plate", text: "Lift No. 74821" }, { id: "p2", label: "Button panel", kind: "panel" }, { id: "p3", label: "Service sticker", kind: "sticker", text: "Serviced by OtherLift" }, { id: "p4", label: "Cabin", kind: "cabin" }];
}
function seedReport(s: State, who: string, placeId: string, presetId: string, hoursAgo: number, edit?: (i: Input) => void) {
  const pr = PRESETS.find((x) => x.id === presetId)!; const pl = PLACES.find((x) => x.id === placeId)!;
  const input = presetToInput(pr, placeId); edit?.(input);
  const at = Date.now() - hoursAgo * H;
  const saved = s.clock; s.clock = at - Date.now();
  const r = createReport(s, { reporterId: who, input, photos: photosFor(input.subject === "site" ? "site" : "unit"), placeId, placeName: pl.name, area: pl.area, answers: [], corrections: [], at });
  s.clock = saved;
  return r;
}

type Stage = "assigned" | "contacted" | "visited" | "offer" | "sent" | "won" | "lost" | "notinterested" | "hold" | "declined";
const ORDER: Stage[] = ["assigned", "contacted", "visited", "offer", "sent"];
const SITE: Omit<SiteVisit, "by" | "at"> = { met: { name: "Ramesh Gupta", role: "Facility manager", phone: "+91 98480 22110" }, lifts: "3", floors: "12", condition: "Worn but running", decision: "Facility manager with the owner", timeline: "This quarter", competitor: "Local firm", note: "Unhappy with response times from the current servicer." };

/** Runs at a moment in the past, so seeded logs and timelines read like real history. */
function at(s: State, hoursAgo: number, fn: () => void) { const saved = s.clock; s.clock = -hoursAgo * H; fn(); s.clock = saved; }

/** Moves one Snap & Lead sales lead and its SHERPA opportunity together, the way the desk screens do. */
function drive(s: State, r: Report, goal: Stage, track?: string) {
  const it = r.items.find((i) => i.kind === "lead" && !i.silent && i.team !== "AM" && (!track || i.track === track)); if (!it) return;
  const opp = s.sherpa.opps.find((o) => o.source.itemId === it.id);
  const owner = it.ownerId ?? opp?.suggested; if (!owner) return;
  const span = (Date.now() - r.createdAt) / H; const steps = goal === "declined" ? 1 : (ORDER.indexOf(goal as Stage) + 1 || ORDER.length + 1);
  const when = (k: number) => Math.max(0.2, span - (span * (k + 1)) / (steps + 1));
  if (goal === "declined") return at(s, when(0), () => A.decline(s, it.id, owner, "Not my customer segment"));
  at(s, when(0), () => { if (opp) OP.review(s, opp.id, "marc", { owner, technician: techFor(r.area) }); A.accept(s, it.id, owner); });
  if (steps < 2) return;
  if (["notinterested", "hold"].includes(goal)) return at(s, when(1), () => { A.contact(s, it.id, owner, "Phone call: spoke to the facility manager"); A.outcome(s, it.id, owner, goal as "notinterested" | "hold"); });
  at(s, when(1), () => A.contact(s, it.id, owner, "Phone call: the facility manager is open to a meeting"));
  if (steps < 3) return;
  at(s, when(2), () => { if (opp) OP.siteVisit(s, opp.id, techFor(r.area), SITE); A.visit(s, it.id, owner, "Met the facility manager and checked the lifts"); });
  if (steps < 4) return;
  at(s, when(3), () => { if (opp) OP.setupDeal(s, opp.id, owner, { accountId: opp.accountId ?? "new", path: "direct" }); });
  if (steps < 5) return;
  const of = () => s.sherpa.offers.find((o) => o.id === s.sherpa.opps.find((x) => x.source.itemId === it.id)?.offerId);
  at(s, when(4), () => {
    const o = of();
    if (o) { o.missing = undefined; SH.submit(s, o.id, owner); o.approvals.filter((x) => x.status === "pending").forEach((x) => SH.decide(s, o.id, x.by, "approved", "Within the region price reference")); SH.send(s, o.id, owner, { subject: `Your offer for ${r.placeName}`, body: "Please find our offer attached." }); }
    A.quote(s, it.id, owner, "Offer sent to the customer");
  });
  if (goal === "won" || goal === "lost") at(s, when(5), () => { const o = of(); if (o) SH.outcome(s, o.id, owner, goal, goal === "lost" ? "Competitor offer" : undefined); A.outcome(s, it.id, owner, goal); });
}

type NiGoal = "accept" | "research" | "talk" | "callback" | "notinterested" | "quoteBrief" | "quoteApproval" | "quoteSent" | "tenderDetails" | "tenderBid" | "bidReview" | "bidConfirm" | "bidSent" | "agreed" | "order" | "job" | "done" | "lost";
const NI_STEPS: Record<NiGoal, [number, number]> = {
  accept: [1, 1], research: [3, 3], talk: [3, 3], callback: [4, 4], notinterested: [4, 4], quoteBrief: [4, 4], quoteApproval: [6, 6], quoteSent: [7, 7], lost: [8, 10],
  tenderDetails: [4, 4], tenderBid: [5, 5], bidReview: [6, 6], bidConfirm: [7, 7], bidSent: [9, 9], agreed: [8, 10], order: [9, 11], job: [10, 12], done: [11, 13],
};

/** A building-site report under its own name, so new-installation deals are spread over the map. */
function siteReport(s: State, who: string, name: string, area: string, geo: { lat: number; lng: number }, preset: string, hoursAgo: number, edit?: (i: Input) => void) {
  const pr = PRESETS.find((x) => x.id === preset)!;
  const input = presetToInput(pr, "harbour"); edit?.(input);
  const at = Date.now() - hoursAgo * H; const saved = s.clock; s.clock = at - Date.now();
  const r = createReport(s, { reporterId: who, input, photos: photosFor("site"), placeId: "harbour", placeName: name, area, answers: [], corrections: [], at });
  s.clock = saved;
  s.sherpa.opps.filter((o) => o.source.reportId === r.id).forEach((o) => { o.geo = geo; o.accountId = undefined; });
  return r;
}

/** Moves a new-installation lead through the flow: review, accept, contact, quote or tender, order, handover. */
function driveNI(s: State, r: Report, goal: NiGoal, opt: { tender?: boolean; research?: boolean } = {}) {
  const it = r.items.find((i) => i.kind === "lead" && !i.silent && i.team !== "AM"); if (!it) return;
  const opp = s.sherpa.opps.find((o) => o.source.itemId === it.id); if (!opp) return;
  const owner = it.ownerId ?? opp.suggested; if (!owner) return;
  const id = opp.id; const tender = opt.tender || ["tenderDetails", "tenderBid", "bidReview", "bidConfirm", "bidSent"].includes(goal);
  const end = NI_STEPS[goal][tender ? 1 : 0];
  const span = (Date.now() - r.createdAt) / H;
  let k = 0; const step = (fn: () => void) => { k++; if (k > end) return false; at(s, Math.max(0.2, span - (span * k) / (end + 1)), fn); return true; };
  const contact = { name: "K. Prakash", role: "Project director", phone: "+91 98480 41207" };
  if (!step(() => OP.review(s, id, "marc", { owner }))) return;
  if (!step(() => { A.accept(s, it.id, owner); OP.accepted(s, id, owner); })) return;
  if (!step(() => {
    const o = s.sherpa.opps.find((x) => x.id === id)!;
    if (o.contact && !opt.research) return;
    OP.research(s, id, owner, tender ? ["Contact details", "Tender document", "Project owner"] : ["Contact details", "Project owner"]);
  })) return;
  const research = s.sherpa.tasks.find((t) => t.oppId === id && t.kind === "research" && !t.done);
  if (research && goal !== "research") at(s, Math.max(0.2, span - (span * (k + 0.5)) / (end + 1)), () => OP.shareResearch(s, research.id, "shalini", tender ? ["permit", "owner", "tender"] : ["permit", "owner"]));
  const wants = { lifts: "4", floors: "G+14", when: "Within 3 months" };
  const outcome = goal === "callback" ? "callback" : goal === "notinterested" ? "notInterested" : tender ? "tender" : "quote";
  if (!step(() => {
    A.contact(s, it.id, owner, outcome === "notInterested" ? "Phone call: the developer has already chosen a supplier" : "Phone call: the project director wants prices");
    OP.talk(s, id, owner, { how: outcome === "callback" ? "Phone call" : "Site visit", with: contact, said: outcome === "callback" ? "Busy with the slab work. Asked us to call back next week." : outcome === "notInterested" ? "They signed with another lift company last month." : tender ? "They issued a formal tender to three lift companies." : "Wants a direct quote for 4 passenger lifts.", wants, outcome, callbackDays: 7, reason: "Already chose another supplier", eordDays: 30 });
    if (outcome === "notInterested") A.outcome(s, it.id, owner, "notinterested");
  })) return;
  const o = () => s.sherpa.opps.find((x) => x.id === id)!;
  const of = () => offerOf(s, o().offerId);
  if (tender) {
    if (!step(() => { const t = tenderOf(s, o().tenderId); if (!t) return; if (!t.doc) OP.tenderDoc(s, t.id, "shalini", { name: "tender-document.pdf", size: 820000 }); OP.answerGaps(s, t.id, "shalini", Object.fromEntries((t.doc?.gaps ?? []).map((g) => [g.key, g.opts[0]]))); })) return;
    if (!step(() => { const t = tenderOf(s, o().tenderId); if (t) { OP.fillPapers(s, t.id, "marc"); OP.bidDone(s, t.id, "marc", 8); } })) return;
    if (!step(() => OP.bidReviewed(s, id, "shalini", true, "Payment terms and papers in order"))) return;
    if (!step(() => OP.bidConfirmed(s, id, owner, true))) return;
  } else {
    if (!step(() => OP.quoteBrief(s, id, owner, { floors: "15", load: "1,000 kg (13 persons)", speed: "1.75 m/s", finish: "Stainless steel", timeline: "Within 3 months", extras: "" }))) return;
    if (!step(() => { const f = of(); if (f) { SH.setTerms(s, f.id, owner, { discountPct: 14 }); SH.submit(s, f.id, owner); } })) return;
  }
  if (!step(() => { const f = of(); if (!f) return; if (f.status === "awaiting") SH.decide(s, f.id, "marc", "approved", "In line with recent wins in the area"); SH.send(s, f.id, owner, { subject: `Our ${tender ? "bid" : "quotation"} for ${r.placeName}`, body: "Please find it attached." }); A.quote(s, it.id, owner, tender ? "Bid sent to the customer" : "Quotation sent to the customer"); })) return;
  if (goal === "lost") { step(() => { const f = of(); if (f) SH.outcome(s, f.id, owner, "lost", "Competitor offer was 9% lower"); }); return; }
  if (!step(() => { const f = of(); OP.agreed(s, id, owner, { price: f?.price ?? 0, start: Date.now() + s.clock + 45 * 86400000, how: "Signed letter of intent", proof: "letter-of-intent.pdf" }); })) return;
  if (!step(() => OP.winDecision(s, id, "marc", true))) return;
  if (!step(() => OP.createOrder(s, id, "shalini", { number: `SO-${4400 + s.sherpa.seq}`, delivery: Date.now() + s.clock + 120 * 86400000, payment: "10% advance, 60% on delivery, 30% on handover" }))) return;
  step(() => OP.acceptJob(s, id, serviceLeadFor(r.area) ?? "srikanth", { start: Date.now() + s.clock + 60 * 86400000, siteContact: { name: "B. Ramana", phone: "+91 90000 31415" } }));
}

/** Leads at every stage of both pipelines, so each screen has realistic work in it. */
function seedPipeline(s: State) {
  const item = (r: Report, kind: string) => r.items.find((i) => i.kind === kind)!;
  const add = (who: string, place: string, preset: string, h: number, edit?: (i: Input) => void) => seedReport(s, who, place, preset, h, edit);
  const fine = (i: Input) => { i.condition = "fine"; };

  // Sales pipeline, one lead per stage
  add("alex", "secbiz", "K1", 1.5, fine);
  drive(s, add("alex", "citymall", "C3", 40, fine), "assigned");
  drive(s, add("alex", "riverside", "C6", 75, (i) => { i.condition = "out"; }), "contacted");
  drive(s, add("alex", "baselhosp", "C8", 130, fine), "visited");
  drive(s, add("tom", "secbiz", "C10", 170, fine), "offer");
  drive(s, add("alex", "secbiz", "C2", 210, fine), "sent");
  drive(s, add("alex", "baselhosp", "C11", 420, fine), "won");
  drive(s, add("alex", "citymall", "C15", 320, fine), "lost");
  drive(s, add("tom", "riverside", "M10", 260, fine), "notinterested");
  drive(s, add("alex", "secbiz", "B7", 100, fine), "hold");
  drive(s, add("tom", "baselhosp", "C4", 55, fine), "declined");

  // Renewals and win-backs
  drive(s, add("alex", "techpark", "B6", 90, fine), "contacted");
  drive(s, add("tom", "station", "M6", 190, fine), "sent");
  drive(s, add("alex", "secbiz", "B8", 66, fine), "assigned");
  drive(s, add("alex", "station", "M7", 460, fine), "won");
  drive(s, add("tom", "cityhall", "B9", 380, fine), "lost");
  drive(s, add("tom", "secbiz", "B5", 410, fine), "lost");
  drive(s, add("tom", "riverside", "B8", 120, fine), "sent");

  // Key customer: renewal in progress and the account manager adds it to the plan
  const key = add("alex", "techpark", "B19", 280, fine);
  drive(s, key, "visited", "renewal");
  const am = key.items.find((i) => i.team === "AM"); if (am) at(s, 270, () => A.accountPlan(s, am.id, "lena"));

  // Modernisation, two leads from one photo at different stages
  const mod = add("alex", "riverside", "C7", 150, (i) => { i.condition = "minor"; });
  drive(s, mod, "visited", "modernisation"); drive(s, mod, "contacted", "sales");
  const mod2 = add("tom", "techpark", "C7", 360, (i) => { i.condition = "minor"; });
  drive(s, mod2, "sent", "modernisation"); drive(s, mod2, "lost", "sales");
  const m13 = add("tom", "citymall", "M13", 520, (i) => { i.condition = "minor"; });
  drive(s, m13, "won", "modernisation"); drive(s, m13, "lost", "sales");

  // New installations: one deal at every step of the flow
  const site = (who: string, name: string, area: string, lat: number, lng: number, h: number, preset = "D1") => siteReport(s, who, name, area, { lat, lng }, preset, h, (i) => { if (preset === "D1") { i.stage = "structure"; i.ordered = false; } });
  driveNI(s, site("alex", "Narsingi Greens (building site)", "HYW", 17.384, 78.357, 20, "D4"), "accept");
  driveNI(s, site("alex", "Tellapur Grand (building site)", "HYW", 17.465, 78.283, 30), "research", { tender: true, research: true });
  driveNI(s, site("tom", "Manikonda Residency (building site)", "HYW", 17.402, 78.384, 44), "talk", { research: true });
  driveNI(s, site("alex", "Puppalaguda Heights (building site)", "HYW", 17.389, 78.371, 70), "callback");
  driveNI(s, site("tom", "Gandipet Villas (building site)", "HYW", 17.391, 78.31, 140), "notinterested");
  driveNI(s, site("alex", "Kondapur Crest (building site)", "HYW", 17.47, 78.364, 60), "quoteBrief");
  driveNI(s, site("alex", "Uppal Metro Plaza (building site)", "SEC", 17.401, 78.559, 96), "quoteApproval");
  driveNI(s, add("alex", "harbour", "M15", 240, () => undefined), "quoteSent");
  driveNI(s, site("tom", "Financial District Tower 4 (building site)", "HYW", 17.414, 78.341, 52), "tenderDetails");
  driveNI(s, site("alex", "Nanakramguda One (building site)", "HYW", 17.417, 78.348, 110), "tenderBid");
  driveNI(s, site("alex", "Begumpet Square (building site)", "HYC", 17.444, 78.462, 150), "bidReview");
  driveNI(s, site("tom", "Malkajgiri Central (building site)", "SEC", 17.457, 78.527, 175), "bidConfirm");
  driveNI(s, site("alex", "Kompally Signature (building site)", "SEC", 17.536, 78.484, 300), "bidSent");
  driveNI(s, site("alex", "Shamshabad Gateway (building site)", "HYC", 17.24, 78.43, 360), "agreed");
  driveNI(s, site("tom", "Miyapur Orchid Towers (building site)", "HYW", 17.496, 78.357, 420), "order");
  driveNI(s, site("alex", "Bachupally Meadows (building site)", "HYW", 17.545, 78.36, 500), "job", { tender: true });
  driveNI(s, add("tom", "harbour", "D1", 600, (i) => { i.stage = "finishing"; i.ordered = false; i.contact = true; }), "done");
  driveNI(s, site("alex", "Attapur Riverfront (building site)", "HYC", 17.37, 78.43, 480), "lost");
  site("tom", "Attapur Riverfront (building site)", "HYC", 17.371, 78.431, 6, "D4");
  add("alex", "cityhall", "C9", 46);

  // Faults on lifts we maintain
  const f1 = add("alex", "cityhall", "B3", 20, (i) => { i.condition = "out"; });
  at(s, 18, () => A.assignEngineer(s, item(f1, "ticket").id, "jonas", "Suresh K."));
  const f2 = add("alex", "techpark", "B2", 180, (i) => { i.condition = "minor"; });
  at(s, 176, () => A.accept(s, item(f2, "ticket").id, "jonas")); at(s, 150, () => A.closeTicket(s, item(f2, "ticket").id, "jonas", "Door sensor replaced"));
  const f3 = add("tom", "secbiz", "M4", 8, (i) => { i.condition = "minor"; });
  at(s, 6, () => A.accept(s, item(f3, "ticket").id, "jonas"));

  // Emergencies at every step
  const e1 = add("alex", "station", "M2", 7, (i) => { i.condition = "unsafe"; i.hurt = "no"; });
  at(s, 6.8, () => A.dispatch(s, item(e1, "emergency").id, "dimitri"));
  const e3 = add("tom", "riverside", "A2", 2, (i) => { i.condition = "unsafe"; i.hurt = "no"; });
  at(s, 1.8, () => A.ack(s, item(e3, "emergency").id, "dimitri"));
  const e2 = add("tom", "secbiz", "A2", 340, (i) => { i.condition = "unsafe"; i.hurt = "no"; });
  at(s, 339.8, () => A.dispatch(s, item(e2, "emergency").id, "dimitri")); at(s, 336, () => A.closeEmergency(s, item(e2, "emergency").id, "dimitri"));

  // Records: waiting, checking, added, corrected, rejected as scrapped
  add("alex", "secbiz", "B16", 3, fine);
  const rc1 = add("tom", "station", "M8", 28, fine); at(s, 24, () => A.accept(s, item(rc1, "records").id, "priya"));
  const rc2 = add("alex", "baselhosp", "B14", 230, fine); at(s, 200, () => A.records(s, item(rc2, "records").id, "priya", "create"));
  const rc3 = add("alex", "cityhall", "E12", 300, fine); at(s, 280, () => A.records(s, item(rc3, "records").id, "priya", "correct"));
  const rc4 = add("tom", "riverside", "B18", 160, fine); at(s, 150, () => A.records(s, item(rc4, "records").id, "priya", "scrapped"));

  // Already known, information only, retake and offline
  add("alex", "riverside", "G1", 12, fine);
  add("tom", "citymall", "G7", 15, fine);
  add("alex", "geneva", "D8", 350, fine);
  add("alex", "secbiz", "M3", 80, fine);
  add("alex", "station", "E4", 0.6);
  s.offline = true; add("alex", "secbiz", "J1", 0.3, fine); s.offline = false;

  // Bonuses the reporter already added
  const withExtras = s.reports.find((r) => r.reporterId === "alex" && r.placeId === "baselhosp" && r.items.some((i) => i.status === "closed"));
  if (withExtras) { withExtras.extras.contact = "Dr. Anitha Rao · +91 94403 55120"; withExtras.extras.note = "Hospital board approved a lift upgrade budget for next year."; }
}

leadHooks.quoted = (s, itemId, by) => { const f = findItem(s, itemId); if (f && f[1].status !== "closed") A.quote(s, itemId, by); };
leadHooks.closed = (s, itemId, by, result) => { const f = findItem(s, itemId); if (f && f[1].status !== "closed") A.outcome(s, itemId, by, result); };

export function seed(): State {
  const s: State = { reports: [], alerts: [], audit: [], cfg: structuredClone(DEFAULT_CFG), clock: 0, offline: false, userId: null, seq: 100, sherpa: seedSherpa(), v: STATE_VERSION };
  const adv = (h: number) => { s.clock += h * H; };
  // 1: Alex, Riverside, local-firm lift, accepted + contacted ("In progress")
  const r1 = seedReport(s, "alex", "riverside", "C1", 2, (i) => { i.age = 18; i.condition = "minor"; i.units = 3; i.contact = true; });
  s.clock = 0;
  const l1 = r1.items.find((x) => x.kind === "lead")!; at(s, 1.5, () => A.accept(s, l1.id, "ethan")); at(s, 0.7, () => A.contact(s, l1.id, "ethan", "Called the building manager"));
  // 2: Alex, City Mall, renewal won yesterday
  const r2 = seedReport(s, "alex", "citymall", "B5", 30, (i) => { i.condition = "fine"; });
  const l2 = r2.items.find((x) => x.kind === "lead")!; at(s, 27, () => A.accept(s, l2.id, "sofia")); at(s, 20, () => A.outcome(s, l2.id, "sofia", "won"));
  // 3: Alex, Tech Park, missing lift in records (records update)
  const r3 = seedReport(s, "alex", "techpark", "B13", 48, (i) => { i.condition = "fine"; });
  at(s, 40, () => A.accept(s, r3.items.find((x) => x.kind === "records")!.id, "priya"));
  // 4: Tom, minor fault ours
  seedReport(s, "tom", "riverside", "B2", 3, (i) => { i.condition = "minor"; });
  // 5: Tom, building site Hot, 50h without action
  seedReport(s, "tom", "harbour", "D1", 50, (i) => { i.stage = "structure"; i.ordered = false; i.contact = false; });
  // 6: Tom, Warangal site, no NI rep
  seedReport(s, "tom", "rhine", "D9", 5, (i) => { i.stage = "early"; });
  // 7: unsafe, nobody hurt, ours, mall
  seedReport(s, "tom", "citymall", "A2", 0.3, (i) => { i.condition = "unsafe"; i.hurt = "no"; });
  // 8: place-only match -> records confirm
  seedReport(s, "alex", "riverside", "E2", 26, (i) => { i.condition = "fine"; i.records = "placeOnly"; i.number = undefined; });
  // 9: key customer other brand
  seedReport(s, "tom", "techpark", "C12", 4, (i) => { i.condition = "fine"; i.units = 4; });
  // 10: two leads from one photo
  seedReport(s, "alex", "riverside", "B12", 6, (i) => { i.condition = "minor"; i.age = 26; });
  // 11: declined lead -> manager list
  const r11 = seedReport(s, "tom", "citymall", "C1", 20, (i) => { i.condition = "fine"; });
  const l11 = r11.items.find((x) => x.kind === "lead")!; at(s, 16, () => A.decline(s, l11.id, "elias", "Wrong area"));
  // 12: old photo, points held
  seedReport(s, "tom", "riverside", "E10", 9, (i) => { i.condition = "fine"; });
  // 13: records fix + proposed merge waiting for manager
  const r13 = seedReport(s, "alex", "techpark", "B17", 10, (i) => { i.condition = "fine"; });
  at(s, 7, () => A.records(s, r13.items.find((x) => x.kind === "records")!.id, "priya", "merge"));
  // 14: the manager already qualified one lead, so the technician has a visit waiting
  const v = s.sherpa.opps.find((o) => o.stage === "review" && o.kind === "existing" && o.suggested);
  if (v?.source.itemId && v.suggested) { A.reassign(s, [v.source.itemId], v.suggested, "marc"); A.accept(s, v.source.itemId, v.suggested); OP.review(s, v.id, "marc", { owner: v.suggested, technician: techFor(v.area), note: "The reporter says the building is unhappy with its servicer. Please go this week." }); }
  // 15: a renewal the customer accepted, so its contract draft is waiting for the rep
  SH.outcome(s, "OF-901", "ethan", "won");
  // 16: a key account with a plan in progress
  AC.setGoal(s, "deccan", "lena", "Keep all three lines and win the Tower 2 modernisation before the contract ends.");
  AC.addAction(s, "deccan", "lena", "Quarterly review with Anand Rao", "lena", 5);
  AC.addAction(s, "deccan", "lena", "Survey Tower 2 lift for modernisation", "ethan", 10);
  seedPipeline(s);
  s.clock = 0; adv(0); tick(s);
  s.alerts.forEach((a) => { if (a.t < Date.now() - 4 * H) a.read = true; });
  return s;
}

/* ---------- context ---------- */
interface Ctx {
  app: AppId; s: State; ready: boolean; me: ReturnType<typeof userOf>; now: number;
  mutate: (fn: (s: State) => void) => void;
  login: (id: string) => void; reset: () => void;
  setOffline: (b: boolean) => void;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error("no store"); return c; };

/** Talks to the mock server (app/api/state). The server keeps one JSON file, so data survives reloads and is shared between browser windows. */
const api = {
  async get(): Promise<{ rev: number; state: State | null } | null> { try { const r = await fetch("/api/state", { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; } },
  async put(state: State): Promise<number | null> { try { const r = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state }) }); return r.ok ? ((await r.json()) as { rev: number }).rev : null; } catch { return null; } },
};
const mineOf = (st: State, prev: State | null): State => ({ ...st, userId: prev?.userId ?? null, offline: prev?.offline ?? false });

const inApp = (app: AppId, id: string | null | undefined) => APPS[app].users.some((u) => u.id === id);

/** Each app keeps its own signed-in user, so SHERPA and Snap & Lead never sign each other out in the same browser. */
export function Provider({ app, children }: { app: AppId; children: ReactNode }) {
  const [s, setS] = useState<State | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rev = useRef(0); const dirty = useRef(false); const lv = useRef(0);
  /** States that came from the server. They are not saved back, so a real local change is never mistaken for one. */
  const fromServer = useRef(new WeakSet<object>());
  const [nowTick, setNowTick] = useState(0);

  /* load: the server first, then this browser's cache, then fresh seed data */
  useEffect(() => {
    let dead = false;
    (async () => {
      let init: State | null = null;
      const remote = await api.get();
      if (remote?.state && remote.state.v === STATE_VERSION) { init = remote.state; rev.current = remote.rev; }
      if (!init) { try { const raw = localStorage.getItem(KEY); if (raw) { const j = JSON.parse(raw) as State; if (j.v === STATE_VERSION) init = j; } } catch { /* ignore */ } }
      const st = init ?? seed();
      let saved: string | null = null;
      try { saved = localStorage.getItem(USER_KEY[app]); } catch { /* ignore */ }
      st.userId = inApp(app, saved) ? saved : APPS[app].home;
      if (!dead) setS(st);
    })();
    return () => { dead = true; };
  }, [app]);
  /* save: this browser's cache at once, the server after a short pause */
  useEffect(() => {
    if (!s) return;
    if (fromServer.current.has(s)) return;
    const mine = ++lv.current; dirty.current = true;
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(async () => {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
      const r = await api.put(s); if (r !== null) rev.current = r;
      if (lv.current === mine) dirty.current = false;
    }, 300);
  }, [s]);
  /* listen: pick up changes made in another window, without touching who is signed in here */
  useEffect(() => {
    const i = setInterval(async () => {
      if (dirty.current) return;
      const before = lv.current;
      const j = await api.get(); if (!j?.state || j.rev <= rev.current || j.state.v !== STATE_VERSION || dirty.current || lv.current !== before) return;
      rev.current = j.rev;
      setS((prev) => { const n = mineOf(j.state!, prev); fromServer.current.add(n); return n; });
    }, 4000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => { const i = setInterval(() => setNowTick((x) => x + 1), 30000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!s) return;
    const t = setTimeout(() => setS((p) => { if (!p) return p; const n = structuredClone(p); tick(n); return n; }), 0);
    return () => clearTimeout(t);
  }, [nowTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = useCallback((fn: (st: State) => void) => {
    setS((p) => { if (!p) return p; const n = structuredClone(p); fn(n); tick(n); return n; });
  }, []);
  const login = useCallback((id: string) => {
    if (!inApp(app, id)) return;
    try { localStorage.setItem(USER_KEY[app], id); } catch { /* ignore */ }
    setS((p) => (p ? { ...p, userId: id } : p));
  }, [app]);
  const reset = useCallback(() => { setS((p) => { const n = seed(); n.userId = p?.userId ?? null; return n; }); }, []);
  const setOffline = useCallback((b: boolean) => mutate((st) => { st.offline = b; if (!b) A.sync(st); }), [mutate]);

  const value = useMemo<Ctx | null>(() => s ? ({ app, s, ready: true, me: userOf(s.userId), now: nowOf(s), mutate, login, reset, setOffline }) : null, [app, s, mutate, login, reset, setOffline]);
  if (!value) return <div className="grid h-screen place-items-center text-sm text-muted">Loading {APPS[app].name}…</div>;
  return <C.Provider value={value}>{children}</C.Provider>;
}

/* ---------- selectors ---------- */
export function pointsOf(s: State, userId: string) {
  let confirmed = 0, pending = 0;
  s.reports.filter((r) => r.reporterId === userId).forEach((r) => r.points.forEach((p) => { if (p.status === "confirmed") confirmed += p.pts; else if (p.status === "pending" || p.status === "held") pending += p.pts; }));
  return { confirmed, pending };
}
/** Most recent activity on a report: creation, any timeline entry, or any action on its items. */
export function reportActivity(r: Report): number {
  let t = r.createdAt;
  for (const e of r.timeline) if (e.t > t) t = e.t;
  for (const it of r.items) { t = Math.max(t, it.createdAt, it.lastActionAt); for (const l of it.log) if (l.t > t) t = l.t; }
  return t;
}
/** Most recent activity on a single item. */
export function itemActivity(it: Item): number {
  let t = Math.max(it.createdAt, it.lastActionAt);
  for (const l of it.log) if (l.t > t) t = l.t;
  return t;
}
/** Newest-activity-first comparator for { r, it } rows. */
export const byRecent = (a: { r: Report; it: Item }, b: { r: Report; it: Item }) => Math.max(itemActivity(b.it), b.r.createdAt) - Math.max(itemActivity(a.it), a.r.createdAt);
export function itemsFor(s: State, user: { id: string; team?: Team }) {
  const out: { r: Report; it: Item }[] = [];
  s.reports.forEach((r) => { if (r.status !== "sent") return; r.items.forEach((it) => { if (it.ownerId === user.id || (!it.ownerId && user.team && it.team === user.team)) out.push({ r, it }); }); });
  return out.sort(byRecent);
}
export function exceptions(s: State) {
  const now = nowOf(s); const ex: { r: Report; it: Item; why: string }[] = [];
  s.reports.forEach((r) => {
    if (r.status !== "sent") return;
    r.items.forEach((it) => {
      if (it.status === "closed") return;
      if (it.routed === "exception" && it.status !== "declined") ex.push({ r, it, why: it.flags.includes("Routing paused") ? "Routing paused" : "No owner found" });
      else if (it.status === "declined") ex.push({ r, it, why: `Declined: ${it.declineReason}` });
      else if (it.clockLevel >= 2 && it.status === "new") ex.push({ r, it, why: it.clockLevel >= 3 ? `No action for ${Math.floor((now - it.lastActionAt) / H)}h: reassign` : `No action in ${s.cfg.followUp[effTier(it) === "Hot" ? "hot" : "warm"][1]}h` });
      else if (it.kind === "records" && it.status === "new" && now - it.createdAt > 48 * H) ex.push({ r, it, why: "Records task stuck 2 days" });
      if (it.flags.includes("mergePending")) ex.push({ r, it, why: "Merge waiting for approval" });
      if (it.flags.includes("possibleDuplicate")) ex.push({ r, it, why: "Possible duplicate" });
      if (it.flags.some((f) => f.startsWith("Invalid"))) ex.push({ r, it, why: "Invalid lead to review" });
    });
  });
  return ex;
}
export { baseInput, tierOf };
export type { Alert };
