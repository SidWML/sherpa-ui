import { AREA_NAME, DAY, KIND_LABEL, MANAGER, NAMES, OP, addTask, isOpen, nowS, ping, regionRef } from "./sherpa";
import { tierOf } from "./engine";
import { accountHealth } from "./scores";
import type { Account, Opp, Reason, State, User } from "./types";

const LINE: Record<keyof Account["lines"], { label: string; kind: Opp["kind"]; team: "NI" | "EI" | "SC" | "MOD" }> = {
  ni: { label: "New installations", kind: "newbuild", team: "NI" }, ei: { label: "Existing installations", kind: "existing", team: "EI" },
  sc: { label: "Service contracts", kind: "renewal", team: "SC" }, mod: { label: "Modernisation", kind: "modernisation", team: "MOD" },
};
export const LINES = LINE;

export function accountView(s: State, a: Account) {
  const now = nowS(s);
  const units = s.sherpa.assets.filter((x) => x.accountId === a.id);
  const contracts = s.sherpa.contracts.filter((c) => c.accountId === a.id).sort((x, y) => y.log[y.log.length - 1].t - x.log[x.log.length - 1].t);
  const opps = s.sherpa.opps.filter((o) => o.accountId === a.id).sort((x, y) => (y.log[y.log.length - 1]?.t ?? y.createdAt) - (x.log[x.log.length - 1]?.t ?? x.createdAt));
  const open = opps.filter(isOpen);
  const ending = units.filter((u) => u.contractEnd && u.contractEnd - now < 90 * DAY && u.contractEnd > now);
  const faults = units.reduce((t, u) => t + u.faults90d, 0);
  const healthWhy = accountHealth(units, ending.length, faults); const health = healthWhy.score;
  const annual = units.reduce((t, u) => t + (u.contractValue ?? 0), 0);
  const silentDays = Math.round((now - a.lastActivity) / DAY);
  const space = (Object.keys(LINE) as (keyof Account["lines"])[]).filter((k) => !a.lines[k]);
  const next: { title: string; why: string; kind?: Opp["kind"] }[] = [];
  if (ending.length && !open.some((o) => o.kind === "renewal")) next.push({ title: `Renew ${ending.length} contract${ending.length > 1 ? "s" : ""} ending within 90 days`, why: ending.map((u) => u.label.split(" · ")[0]).join(", "), kind: "renewal" });
  const old = units.filter((u) => u.ageYears >= 20);
  if (old.length && !open.some((o) => o.kind === "modernisation")) next.push({ title: `Propose modernisation for ${old.length} unit${old.length > 1 ? "s" : ""} over 20 years`, why: "Old units with faults cost the customer more each year.", kind: "modernisation" });
  const other = units.filter((u) => u.brand === "other" || (u.servicer && !/schindler/i.test(u.servicer)));
  if (other.length) next.push({ title: `Win the service on ${other.length} unit${other.length > 1 ? "s" : ""} serviced by others`, why: "The customer already trusts us on other units.", kind: "existing" });
  space.filter((k) => k !== "ei").forEach((k) => next.push({ title: `Open ${LINE[k].label.toLowerCase()}`, why: `${a.name} buys nothing from us in this line yet.`, kind: LINE[k].kind }));
  if (silentDays >= 60) next.unshift({ title: `Call ${a.contact.name}: no contact for ${silentDays} days`, why: "Key accounts go quiet before they move to a competitor." });
  const pending = next.filter((n) => n.kind ? !open.some((o) => o.kind === n.kind && o.source.type === "account") : !a.plan?.actions.some((x) => !x.done && n.title.startsWith(x.text)));
  return { units, contracts, opps, open, ending, health, healthWhy, annual, silentDays, space, next: pending, pipeline: open.reduce((t, o) => t + (o.value ?? 0), 0) };
}

export function accountsFor(s: State, u: User): Account[] {
  if (["am", "mgr", "lead", "admin", "mkt"].includes(u.role)) return s.sherpa.accounts;
  return s.sherpa.accounts.filter((a) => a.owner === u.id || s.sherpa.assets.some((x) => x.accountId === a.id && (x.owner === u.id || x.sc === u.id || x.mod === u.id)) || s.sherpa.opps.some((o) => o.accountId === a.id && o.owner === u.id));
}

const act = (s: State, a: Account, by: string, text: string, contact = false) => { (a.activity ??= []).push({ t: nowS(s), by: NAMES[by] ?? by, text }); if (contact) a.lastActivity = nowS(s); };
const find = (s: State, id: string) => s.sherpa.accounts.find((a) => a.id === id);

export const AC = {
  setGoal(s: State, id: string, by: string, goal: string) {
    const a = find(s, id); if (!a) return;
    a.plan = { goal, actions: a.plan?.actions ?? [], updatedBy: NAMES[by] ?? by, updatedAt: nowS(s) }; act(s, a, by, "Account plan goal updated");
  },
  addAction(s: State, id: string, by: string, text: string, owner: string, days: number) {
    const a = find(s, id); if (!a || !text.trim()) return;
    a.plan ??= { goal: "", actions: [], updatedBy: NAMES[by] ?? by, updatedAt: nowS(s) };
    a.plan.actions.push({ id: `pa-${s.sherpa.seq++}`, text: text.trim(), owner, due: nowS(s) + days * DAY, done: false });
    a.plan.updatedAt = nowS(s); a.plan.updatedBy = NAMES[by] ?? by;
    addTask(s, { forUser: owner, by, title: `${a.name}: ${text.trim()}`, detail: "From the account plan.", days, kind: "accountAction", source: "Account plan", accountId: a.id });
    act(s, a, by, `Plan action added for ${NAMES[owner] ?? owner}: ${text.trim()}`);
  },
  toggleAction(s: State, id: string, by: string, actionId: string) {
    const a = find(s, id); const x = a?.plan?.actions.find((y) => y.id === actionId); if (!a || !x) return;
    x.done = !x.done; act(s, a, by, `${x.done ? "Done" : "Reopened"}: ${x.text}`);
    s.sherpa.tasks.forEach((t) => { if (t.accountId === a.id && t.kind === "accountAction" && t.title.endsWith(x.text)) { t.done = x.done; t.doneAt = x.done ? nowS(s) : undefined; } });
  },
  log(s: State, id: string, by: string, how: string, text: string) { const a = find(s, id); if (a && text.trim()) act(s, a, by, `${how}: ${text.trim()}`, true); },
  addContact(s: State, id: string, by: string, c: { name: string; role: string; phone?: string; email?: string }) {
    const a = find(s, id); if (!a || !c.name.trim()) return; (a.contacts ??= []).push(c); act(s, a, by, `Contact added: ${c.name}, ${c.role}`);
  },
  raise(s: State, id: string, by: string, kind: Opp["kind"], why: string) {
    const a = find(s, id); if (!a) return;
    const team = kind === "newbuild" || kind === "project" ? "NI" : kind === "renewal" ? "SC" : kind === "modernisation" ? "MOD" : "EI";
    const ref = regionRef(s, a.area, kind === "newbuild" ? "newinstall" : kind === "renewal" ? "renewal" : kind === "modernisation" ? "modernisation" : "maintenance");
    const reasons: Reason[] = [{ label: `Raised by ${NAMES[by] ?? by} from the account plan`, pts: 40 }, ...(a.key ? [{ label: "Key customer", pts: 10 }] : []), { label: `History: existing customer`, pts: 5 }, ...(ref.count >= 3 && ref.winRate >= 60 ? [{ label: `History: we won ${ref.winRate}% of similar quotes in ${AREA_NAME[a.area] ?? a.area}`, pts: 5 }] : [])];
    const score = Math.min(100, reasons.reduce((t, r) => t + r.pts, 0));
    const o = OP.create(s, { title: `${KIND_LABEL[kind]}: ${a.name}`, kind, accountId: a.id, placeName: a.name, area: a.area, owner: MANAGER, stage: "review", source: { type: "account", label: `Account plan, ${a.name}` }, contact: { name: a.contact.name, role: a.contact.role, email: a.contact.email, via: "the account record" } });
    o.suggested = s.cfg.owners[a.area]?.[team]; o.reasons = reasons; o.score = score; o.tier = tierOf(score, s.cfg);
    addTask(s, { oppId: o.id, forUser: MANAGER, by, title: `Review: ${o.title}`, detail: `${o.tier} lead, score ${score}. ${why}`, days: 2, kind: "review", source: "Account plan" });
    act(s, a, by, `Opportunity raised for review: ${KIND_LABEL[kind]}. ${why}`);
    if (by !== MANAGER) ping(s, MANAGER, `${NAMES[by]} raised ${o.title} for review`);
    return o.id;
  },
};
