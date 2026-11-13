import { AREA_NAME, DAY, KIND_LABEL, MANAGER, NAMES, OP, addTask, nowS, ping } from "./sherpa";
import { tierOf } from "./engine";
import { PLACES } from "./data";
import type { Audience, Campaign, MLead, Opp, Reason, State } from "./types";

export interface Target { key: string; name: string; area: string; accountId?: string; why: string; age: number; contact?: string }

export const DEFAULT_AUDIENCE: Audience = { areas: ["HYW", "HYC"], minAge: 15, brand: "any", contractEnding: false, buildingTypes: [], snapped: true };

export function targetsOf(s: State, a: Audience): Target[] {
  const now = nowS(s); const out = new Map<string, Target>();
  const typeOf = (placeId: string) => PLACES.find((p) => p.id === placeId)?.type;
  s.sherpa.assets.forEach((u) => {
    const acc = s.sherpa.accounts.find((x) => x.id === u.accountId); if (!acc) return;
    if (a.areas.length && !a.areas.includes(acc.area)) return;
    if (u.ageYears < a.minAge) return;
    if (a.brand !== "any" && u.brand !== a.brand) return;
    if (a.contractEnding && !(u.contractEnd && u.contractEnd - now < 180 * DAY)) return;
    const bt = typeOf(u.placeId); if (a.buildingTypes.length && (!bt || !a.buildingTypes.includes(bt))) return;
    const k = `acc:${acc.id}`; const prev = out.get(k);
    out.set(k, { key: k, name: acc.name, area: acc.area, accountId: acc.id, age: Math.max(prev?.age ?? 0, u.ageYears), why: prev ? prev.why : `${u.label.split(" · ")[0]}, ${u.ageYears} years${u.contractEnd && u.contractEnd - now < 180 * DAY ? ", contract ending" : ""}`, contact: acc.contact.name });
  });
  if (a.snapped) s.reports.filter((r) => r.status === "sent" && r.input.subject === "unit").forEach((r) => {
    const i = r.input; if (a.areas.length && !a.areas.includes(r.area)) return;
    if (i.age < a.minAge) return; if (a.brand !== "any" && i.brand !== a.brand) return;
    if (a.buildingTypes.length && !a.buildingTypes.includes(i.buildingType)) return;
    const k = `place:${r.placeId}`; if (out.has(k) || [...out.values()].some((t) => t.accountId && s.sherpa.accounts.find((x) => x.id === t.accountId)?.placeIds.includes(r.placeId))) return;
    out.set(k, { key: k, name: r.placeName, area: r.area, why: `Spotted in Snap & Lead: ${i.brand === "other" ? "another company's lift" : "our lift"}, about ${i.age} years`, age: i.age });
  });
  return [...out.values()];
}

export function describe(a: Audience) {
  const parts = [a.areas.length ? a.areas.map((x) => AREA_NAME[x] ?? x).join(", ") : "All areas", a.minAge ? `lifts ${a.minAge}+ years` : "", a.brand === "other" ? "other brands" : a.brand === "ours" ? "Schindler lifts" : "", a.contractEnding ? "contract ending in 6 months" : "", a.buildingTypes.length ? a.buildingTypes.join(", ") : "", a.snapped ? "incl. Snap & Lead sightings" : ""];
  return parts.filter(Boolean).join(" · ");
}

export function draftMessage(a: Audience, goal: Opp["kind"]): { name: string; subject: string; body: string } {
  const where = a.areas.length === 1 ? AREA_NAME[a.areas[0]] : "Telangana";
  if (goal === "modernisation") return { name: `Modernise lifts over ${a.minAge} years, ${where}`, subject: "Your lift is ageing. A modernisation costs less than you think", body: `Dear {first name},\n\nLifts over ${a.minAge} years old break down more often and use more power. A Schindler modernisation replaces the drive and controller in about two weeks per lift, with the building in use.\n\nBook a free survey this month and get a written report on every lift.\n\nWarm regards,\nSchindler India` };
  if (goal === "renewal") return { name: `Renew before your contract ends, ${where}`, subject: "Keep your lifts covered: renew early and lock today's price", body: "Dear {first name},\n\nYour maintenance contract ends soon. Renew now and keep this year's price for two years, with a free safety check.\n\nReply to this email or book a call with your account manager.\n\nWarm regards,\nSchindler India" };
  if (goal === "newbuild") return { name: `New projects, ${where}`, subject: "Planning a new building? Talk lifts early", body: "Dear {first name},\n\nThe best lift layouts are decided before the structure goes up. Our planners will size the lifts for your building for free.\n\nWarm regards,\nSchindler India" };
  return { name: `Safe lifts, any brand: AMC offer, ${where}`, subject: "One maintenance partner for every lift in your building", body: "Dear {first name},\n\nWe maintain lifts of every brand. Switch to a Schindler maintenance contract and get your first quarter at 10% off, with a 4-hour breakdown response.\n\nWarm regards,\nSchindler India" };
}

const find = (s: State, id: string) => s.sherpa.campaigns.find((c) => c.id === id);
const INTEREST: Record<Opp["kind"], string> = { modernisation: "Modernisation survey", renewal: "Contract renewal", newbuild: "New project lifts", existing: "Maintenance contract", project: "New project lifts" };

export const MK = {
  create(s: State, by: string, p: { name: string; audience: Audience; goal: Opp["kind"]; subject: string; body: string }): string {
    const size = targetsOf(s, p.audience).length;
    const c: Campaign = { id: `C-${s.sherpa.seq++}`, name: p.name, segment: describe(p.audience), area: p.audience.areas[0] ?? "HYW", size, status: "draft", createdBy: by, createdAt: nowS(s), message: { subject: p.subject, body: p.body }, leads: 0, audience: p.audience, goal: p.goal };
    s.sherpa.campaigns.unshift(c); s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text: `Campaign drafted: ${c.name} (${size} contacts)` });
    return c.id;
  },
  launch(s: State, id: string, by: string) {
    const c = find(s, id); if (!c || c.status !== "draft") return;
    c.status = "live"; c.launchedAt = nowS(s); c.funnel = { sent: c.size, opened: 0, clicked: 0, replied: 0 };
    s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text: `Campaign ${c.id} sent to ${c.size} contacts` });
  },
  /** Demo only: a day of opens, clicks and replies. Replies become scored marketing leads. */
  simulate(s: State, id: string) {
    const c = find(s, id); if (!c?.audience || c.status !== "live" || !c.funnel) return;
    const f = c.funnel; const targets = targetsOf(s, c.audience);
    const replied = s.sherpa.mleads.filter((l) => l.campaignId === c.id).map((l) => l.name);
    f.opened = Math.min(f.sent, f.opened + Math.max(1, Math.round(f.sent * 0.3)));
    f.clicked = Math.min(f.opened, f.clicked + Math.max(1, Math.round(f.sent * 0.12)));
    const next = targets.filter((t) => !replied.includes(t.name)).slice(0, Math.max(1, Math.round(f.sent * 0.1)));
    next.forEach((t, k) => {
      const why: Reason[] = [{ label: "Replied to the campaign", pts: 30 }, { label: c.goal === "modernisation" && t.age >= 20 ? `Lift about ${t.age} years old` : "Fits the audience", pts: c.goal === "modernisation" && t.age >= 20 ? 20 : 10 }];
      if (t.accountId) why.push({ label: "Existing customer", pts: 10 });
      if (k === 0) why.push({ label: "Asked for a call or a survey", pts: 15 }); else why.push({ label: "Opened 2+ emails", pts: 5 });
      const lead: MLead = { id: `ML-${s.sherpa.seq++}`, name: t.name, source: `Campaign reply: ${c.name}`, area: t.area, createdAt: nowS(s), status: "new", interest: INTEREST[c.goal ?? "existing"], score: Math.min(100, why.reduce((a, b) => a + b.pts, 0)), campaignId: c.id, accountId: t.accountId, contact: t.contact ? { name: t.contact, role: "Customer contact" } : undefined, scoreWhy: why, kind: c.goal };
      s.sherpa.mleads.unshift(lead);
    });
    f.replied += next.length; c.leads += next.length;
  },
  end(s: State, id: string) { const c = find(s, id); if (c) c.status = "done"; },
  nurture(s: State, leadId: string, by: string) { const l = s.sherpa.mleads.find((x) => x.id === leadId); if (l) { l.status = "nurture"; s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text: `${l.name} moved to nurture` }); } },
  toReview(s: State, leadId: string, by: string) {
    const l = s.sherpa.mleads.find((x) => x.id === leadId); if (!l || l.oppId) return;
    const kind = l.kind ?? (/modern/i.test(l.interest) ? "modernisation" : /renew/i.test(l.interest) ? "renewal" : /new|project/i.test(l.interest) ? "newbuild" : "existing");
    const team = kind === "newbuild" || kind === "project" ? "NI" : kind === "renewal" ? "SC" : kind === "modernisation" ? "MOD" : "EI";
    const o = OP.create(s, { title: `${KIND_LABEL[kind]}: ${l.name}`, kind, accountId: l.accountId, placeName: l.name, area: l.area, owner: MANAGER, stage: "review", source: { type: "campaign", label: l.source }, contact: l.contact ? { ...l.contact, via: "the campaign reply" } : undefined });
    o.suggested = s.cfg.owners[l.area]?.[team]; o.reasons = l.scoreWhy ?? [{ label: "Marketing lead score", pts: l.score }]; o.score = l.score; o.tier = tierOf(l.score, s.cfg);
    addTask(s, { oppId: o.id, forUser: MANAGER, by, title: `Review: ${o.title}`, detail: `${o.tier} marketing lead, score ${l.score}. ${l.source}.`, days: 2, kind: "review", source: "Marketing" });
    l.status = "review"; l.oppId = o.id; l.owner = MANAGER;
    s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text: `${l.name} sent to ${NAMES[MANAGER]} for review` });
    ping(s, MANAGER, `New marketing lead to review: ${l.name}`);
  },
};
