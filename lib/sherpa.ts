/* SHERPA: mock NewCRM data for Hyderabad and Telangana, region price reference, offers with approvals, effects that write back to the
   mock CRM, and the next-best-action engine for all 27 NBAs. Everything is deterministic rules. There is no AI here: the chat and the
   cards only dress these results up. */
import { USERS } from "./data";
import { tierOf } from "./engine";
import { CT } from "./contracts";
import { unitHealth } from "./scores";
import type { Account, Agreement, Alert, Asset, Campaign, ChatMsg, Config, Finding, MLead, Offer, Opp, OppStage, Past, ProductKey, QuoteBrief, Reason, Report, Sherpa, SiteVisit, State, Talk, Task, TaskKind, Tender, TenderDoc, User } from "./types";

export const DAY = 86400000;
export const HOUR = 3600000;
export const nowS = (s: State) => Date.now() + s.clock;
/** Set by the store: closes the Snap & Lead item behind a deal, so the reporter sees the result and gets the points. Kept as a hook to avoid an import cycle. */
export const leadHooks: { closed?: (s: State, itemId: string, by: string, result: "won" | "lost") => void; quoted?: (s: State, itemId: string, by: string) => void } = {};

export const PRODUCT: Record<ProductKey, { label: string; yearly: boolean; list: number; agent: string }> = {
  renewal: { label: "Service contract renewal", yearly: true, list: 145000, agent: "Proposal Generator" },
  maintenance: { label: "Maintenance contract", yearly: true, list: 125000, agent: "Proposal Generator" },
  repair: { label: "Repair quote", yearly: false, list: 95000, agent: "Repair Lead Generation" },
  modernisation: { label: "Modernisation package", yearly: false, list: 3200000, agent: "MOD Propensity Scoring" },
  newinstall: { label: "New installation proposal", yearly: false, list: 4200000, agent: "Proposal Generator" },
};
/** Price level by sales area. An area not listed here is one where we do not sell. */
export const FACTOR: Record<string, number> = { HYW: 1, HYC: 0.98, SEC: 0.93, WGL: 0.88 };
export const AREA_NAME: Record<string, string> = { HYW: "Hyderabad West", HYC: "Hyderabad Central", SEC: "Secunderabad and East", WGL: "Warangal", OUT: "outside Telangana" };
export const GUIDE = { seller: 10, manager: 20 };
export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const inrShort = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n));
export const chf = inr; // kept so older imports keep working

export const listPrice = (area: string, product: ProductKey, term: number) => Math.round(PRODUCT[product].list * (FACTOR[area] ?? 1) * (PRODUCT[product].yearly ? term : 1));
/** Up to 10% the seller sends alone. Up to 20% the sales manager approves. Above 20% is outside this app: it needs the regional lead in writing. */
export const approversFor = (pct: number, cfg?: Pick<Config, "approveAll">): string[] => (pct > GUIDE.manager ? [] : pct > GUIDE.seller || (cfg?.approveAll ?? true) ? ["marc"] : []);
export const aboveLimit = (pct: number) => pct > GUIDE.manager;
export const MANAGER = "marc"; export const SUPPORT = "shalini";
/** The papers a tender bid usually needs. The Sales Manager builds the bid from these. */
export const BID_PAPERS = [
  { key: "emd", title: "Bid security (EMD)", help: "Money or a bank guarantee that shows we are serious. Usually 2% of the bid price.", auto: false },
  { key: "company", title: "Company papers", help: "Registration, GST and PAN. Taken from the company file.", auto: true },
  { key: "past", title: "Similar past projects", help: "A list of lifts we installed for other customers.", auto: true },
  { key: "turnover", title: "Turnover statement", help: "Yearly sales for the last 3 years.", auto: true },
  { key: "compliance", title: "Technical compliance sheet", help: "Line by line: what the tender asks and what our lift gives.", auto: true },
  { key: "price", title: "Price sheet", help: "The price of every lift, in the tender's format.", auto: true },
  { key: "datasheets", title: "Lift datasheets and drawings", help: "Technical pages for the lift model we offer.", auto: true },
  { key: "declarations", title: "Signed declarations and authority letter", help: "Signed statements the tender asks for. The manager signs them.", auto: false },
] as const;
const PAPER_LIST = () => BID_PAPERS.map((p) => ({ t: p.title, done: false }));
export const perYear = (o: Pick<Offer, "price" | "term" | "product">) => (PRODUCT[o.product].yearly ? o.price / o.term : o.price);
export const NAMES: Record<string, string> = { ...Object.fromEntries(USERS.map((u) => [u.id, u.name])), projectfinder: "Project Lead Finder" };

/* ------------------------------------------------------------------ region reference */
export interface RegionRef { area: string; sells: boolean; count: number; avg: number; min: number; max: number; avgDiscount: number; wins: number; winRate: number }
export function regionRef(s: State, area: string, product: ProductKey): RegionRef {
  const sells = area in FACTOR;
  const all = s.sherpa.past.filter((p) => p.area === area && p.product === product && nowS(s) - p.at < 365 * DAY);
  const n = all.length; const prices = all.map((p) => p.price); const wins = all.filter((p) => p.outcome === "won").length;
  return { area, sells, count: n, avg: n ? prices.reduce((a, b) => a + b, 0) / n : 0, min: n ? Math.min(...prices) : 0, max: n ? Math.max(...prices) : 0, avgDiscount: n ? all.reduce((a, p) => a + p.discountPct, 0) / n : 0, wins, winRate: n ? Math.round((wins / n) * 100) : 0 };
}
export function winChanceWhy(s: State, area: string, product: ProductKey, pct: number) {
  const base = s.sherpa.past.filter((p) => p.area === area && p.product === product);
  const near = base.filter((p) => Math.abs(p.discountPct - pct) <= 6);
  const close = near.length >= 3; const set = close ? near : base; const won = set.filter((p) => p.outcome === "won").length;
  return { pct: set.length ? Math.round((won / set.length) * 100) : 0, won, n: set.length, close, lo: Math.max(0, pct - 6), hi: pct + 6 };
}
export const winChance = (s: State, area: string, product: ProductKey, pct: number) => winChanceWhy(s, area, product, pct).pct;
export function variantsFor(product: ProductKey) {
  return PRODUCT[product].yearly
    ? [{ key: "A", label: "1 year, list price", term: 1, disc: 0 }, { key: "B", label: "3 years, 8% off", term: 3, disc: 8 }, { key: "C", label: "5 years, 15% off", term: 5, disc: 15 }]
    : [{ key: "A", label: "Standard scope, list price", term: 1, disc: 0 }, { key: "B", label: "Standard scope, 8% off", term: 1, disc: 8 }, { key: "C", label: "Extended scope, 15% off", term: 1, disc: 15 }];
}

/* ------------------------------------------------------------------ seed */
const CUST = ["Alpine Logistics Pvt Ltd", "Charminar Hospitality", "Musi Riverfront Hotels", "Osmania Heights School", "Nagarjuna Builders", "Godavari Insurance", "Hitech Parking Services", "Medicover Wellness"];
const DISC = [4, 8, 12, 6, 15, 9, 18, 3, 11, 22, 7];
function seedPast(now: number): Past[] {
  const out: Past[] = []; let n = 0;
  (["HYW", "HYC", "SEC", "WGL"] as const).forEach((area) => (Object.keys(PRODUCT) as ProductKey[]).forEach((product) => {
    const count = product === "modernisation" || product === "newinstall" ? 5 : product === "renewal" ? 9 : 7;
    for (let i = 0; i < count; i++) {
      const d = DISC[(n + i * 3) % DISC.length];
      out.push({ id: `p${n}-${i}`, area, product, price: Math.round(PRODUCT[product].list * FACTOR[area] * (1 - d / 100)), discountPct: d, outcome: (n * 7 + i * 3 + d) % 5 < (d <= 8 ? 2 : d <= 14 ? 3 : 4) ? "won" : "lost", at: now - (20 + ((n + i) * 29) % 330) * DAY, customer: CUST[(n + i) % CUST.length] });
    }
    n++;
  }));
  return out;
}

export function seedSherpa(): Sherpa {
  const now = Date.now();
  const acc = (id: string, name: string, area: string, place: string, owner: string, ago: number, c: [string, string, string], lines: Account["lines"], key = false, lostBids?: string): Account =>
    ({ id, name, area, key, placeIds: [place], owner, lastActivity: now - ago * DAY, contact: { name: c[0], role: c[1], email: c[2] }, lines, lostBids });
  const accounts: Account[] = [
    acc("deccan", "Deccan Tech Parks Pvt Ltd", "HYW", "techpark", "ethan", 71, ["Anand Rao", "Head of Facilities", "anand.rao@deccantech.example"], { ni: true, ei: true, sc: true, mod: false }, true),
    acc("cyber", "Cyber Gateway Realty", "HYW", "riverside", "ethan", 9, ["Mahesh Goud", "Facility manager", "mahesh.goud@cybergateway.example"], { ni: false, ei: true, sc: true, mod: false }),
    acc("banjara", "Banjara Retail Pvt Ltd", "HYC", "citymall", "elias", 20, ["Sandhya Reddy", "Centre manager", "sandhya.reddy@banjararetail.example"], { ni: false, ei: true, sc: true, mod: false }),
    acc("kakatiya", "Kakatiya Medical Centre", "WGL", "baselhosp", "ethan", 33, ["Dr. Venkat Rao", "Technical director", "venkat.rao@kakatiyamc.example"], { ni: false, ei: true, sc: true, mod: false }),
    acc("kokapet", "Kokapet Skyline Developers", "HYC", "harbour", "noah", 12, ["Ramesh Naidu", "Project head", "ramesh.naidu@kokapetskyline.example"], { ni: true, ei: false, sc: false, mod: false }, false, "Lost the 2025 Madhapur tower bid on price: OtherLift was 14% lower with a longer lead time."),
    acc("secbiz", "Secunderabad Business Hub Pvt Ltd", "SEC", "secbiz", "lena", 48, ["Farah Siddiqui", "Estate head", "farah.siddiqui@secbizhub.example"], { ni: true, ei: false, sc: false, mod: false }, true),
    acc("tsic", "Telangana State Infra Corp", "HYC", "cityhall", "noah", 26, ["S. Ramana", "Executive engineer", "s.ramana@tsic.example"], { ni: false, ei: true, sc: false, mod: false }),
  ];
  const ast = (id: string, accountId: string, placeId: string, label: string, model: string, age: number, o: Partial<Asset> & { owner: string }): Asset =>
    ({ id, accountId, placeId, label, model, ageYears: age, brand: "ours", callbacks14d: 0, callbacks90d: 0, callbacksPrev90d: 0, faults90d: 0, health: 80, servicer: "Schindler", ...o });
  const assets: Asset[] = [
    ast("a74821", "deccan", "techpark", "Lift 74821 · Deccan Tech Park, Tower 2", "Schindler 3300", 12, { owner: "ethan", sc: "sofia", contractEnd: now + 38 * DAY, contractValue: 145000, callbacks14d: 2, callbacks90d: 9, callbacksPrev90d: 5, faults90d: 3, health: 38 }),
    ast("a75200", "deccan", "techpark", "Lift 75200 · Deccan Tech Park, Tower 1", "Schindler 3300", 10, { owner: "ethan", contractEnd: now + 120 * DAY, contractValue: 138000, obr: 3, contractChangedAfterObr: true, health: 74 }),
    ast("a77300", "deccan", "techpark", "Lift 77300 · Deccan Tech Park, Tower 3", "Schindler 3100", 14, { owner: "ethan", contractEnd: now + 240 * DAY, contractValue: 132000, callbacks90d: 3, callbacksPrev90d: 2, faults90d: 2, health: 66, techNote: "Technician visit 3 Nov: door roller worn on landings 2 and 5. Replace 4 rollers and re-align the door sill." }),
    ast("a74820", "cyber", "riverside", "Lift 74820 · Cyber Gateway, Tower A", "Schindler 3300", 9, { owner: "ethan", contractEnd: now + 200 * DAY, contractValue: 130000, callbacks14d: 1, callbacks90d: 2, callbacksPrev90d: 1, faults90d: 1, health: 82 }),
    ast("a75110", "cyber", "riverside", "Lift 75110 · Cyber Gateway, Tower B", "Schindler 3300", 11, { owner: "ethan", contractEnd: now + 160 * DAY, contractValue: 135000, callbacks90d: 8, callbacksPrev90d: 5, faults90d: 2, health: 61 }),
    ast("a90311", "kakatiya", "baselhosp", "Lift 90311 · Kakatiya Medical Centre", "Schindler 5500", 15, { owner: "ethan", sc: "sofia", contractEnd: now + 70 * DAY, contractValue: 210000, callbacks90d: 8, callbacksPrev90d: 3, faults90d: 2, health: 41 }),
    ast("a61102", "banjara", "citymall", "Lift 61102 · Banjara Central Mall, Block B", "Schindler 3100", 27, { owner: "elias", mod: "mia", contractEnd: now + 300 * DAY, contractValue: 152000, callbacks90d: 6, callbacksPrev90d: 6, faults90d: 5, health: 55, obsolete: "Door operator board DO-31 is discontinued. Last-time buy closes in 6 months." }),
    ast("a82010", "banjara", "citymall", "Lift 82010 · Banjara Central Mall, Block A", "Schindler 3300", 21, { owner: "elias", mod: "mia", contractEnd: now + 150 * DAY, contractValue: 140000, callbacks90d: 4, callbacksPrev90d: 3, faults90d: 2, obr: 6, health: 58 }),
    ast("a50113", "banjara", "citymall", "Lift 50113 · Banjara Central Mall, Block D", "Schindler 3100", 22, { owner: "elias", contractEnd: now + 400 * DAY, contractValue: 128000, health: 70 }),
    ast("a88002", "banjara", "citymall", "Lift 88002 · Banjara Central Mall, Block C (new)", "Schindler 5500", 0, { owner: "elias", handedOver: true, servicer: "none yet", health: 95 }),
    ast("a50112", "tsic", "cityhall", "Lift 50112 · Secretariat Annexe", "Schindler 3100", 26, { owner: "elias", mod: "mia", contractEnd: now + 350 * DAY, contractValue: 125000, health: 62 }),
    ast("a50111", "secbiz", "secbiz", "Lift 50111 · Secunderabad Business Hub", "Schindler 3300", 24, { owner: "elias", contractEnd: now + 420 * DAY, contractValue: 126000, health: 72 }),
  ];
  assets.forEach((a) => { a.health = unitHealth(a).score; });
  const tender = (id: string, name: string, accountId: string, area: string, owner: string, line: Tender["line"], stage: Tender["stage"], eordDays: number, lifts: number, summary: string, o: Partial<Tender> = {}): Tender =>
    ({ id, name, accountId, area, owner, line, stage, eord: now + eordDays * DAY, value: lifts * PRODUCT.newinstall.list, lifts, summary, discovered: now - 12 * DAY, checklist: PAPER_LIST(), ...o });
  const tenders: Tender[] = [
    tender("T-101", "Kokapet Skyline Towers A to C: 14 lifts", "kokapet", "HYC", "noah", "ni", "bidding", 9, 14, "Three residential towers, G+32, 14 passenger lifts at 2.0 m/s. Bid due in 9 days. Developer wants delivery in 11 months.", { lossNote: "Lost the 2025 Madhapur tower bid on price: OtherLift was 14% lower with a longer lead time." }),
    tender("T-102", "Gachibowli Phase 3 Commercial Tower: 8 lifts", "deccan", "HYW", "noah", "ni", "matched", 55, 8, "New commercial tower matched from a building permit. G+24, 8 lifts plus 2 service lifts. Existing key customer.", { discovered: now - 2 * DAY }),
    tender("T-103", "Secunderabad Metro Mall expansion: 6 lifts and 4 escalators", "secbiz", "SEC", "noah", "ni", "bidding", 40, 6, "Mall expansion, 6 lifts and 4 escalators. The tender spec names a competitor door operator and a 2.0 m/s drive.", { competitorSpec: "Spec names the OtherLift 'Prime' door operator and a gearless drive rated 2.0 m/s. Both can be met with our equivalent, with a short clarification." }),
    tender("T-104", "AMC tender: Cyber Gateway Towers A and B", "cyber", "HYW", "sofia", "sc", "qualifying", 6, 2, "Three-year service contract tender for 2 lifts. Incumbent is a local firm.", { value: 780000 }),
    tender("T-105", "Banjara Central Mall: lift and escalator modernisation", "banjara", "HYC", "mia", "mod", "bidding", 11, 3, "Modernise 3 ageing lifts: controller, door operators and drive. Customer asks for a phased plan.", { value: 9600000 }),
  ];
  const offer = (id: string, accountId: string, assetId: string | undefined, area: string, product: ProductKey, term: number, disc: number, by: string, daysAgo: number, o: Partial<Offer> = {}): Offer => {
    const lp = listPrice(area, product, term);
    return { id, accountId, assetId, area, product, title: PRODUCT[product].label, term, listPrice: lp, price: Math.round(lp * (1 - disc / 100)), discountPct: disc, status: "sent", createdBy: by, createdAt: now - (daysAgo + 3) * DAY, sentAt: now - daysAgo * DAY, lastActivity: now - daysAgo * DAY, approvals: [], log: [{ t: now - (daysAgo + 3) * DAY, by: NAMES[by] ?? by, text: "Offer drafted" }, { t: now - daysAgo * DAY, by: NAMES[by] ?? by, text: "Sent to the customer" }], ...o };
  };
  const offers: Offer[] = [
    offer("OF-901", "cyber", "a74820", "HYW", "renewal", 3, 6, "ethan", 16),
    offer("OF-902", "banjara", "a61102", "HYC", "repair", 1, 8, "elias", 24),
    offer("OF-903", "kakatiya", "a90311", "WGL", "renewal", 3, 12, "ethan", 30),
    offer("OF-904", "banjara", "a88002", "HYC", "maintenance", 3, 5, "sofia", 23),
    offer("OF-905", "banjara", "a82010", "HYC", "modernisation", 1, 6, "mia", 5),
    offer("OF-906", "deccan", "a75200", "HYW", "renewal", 3, 7, "sofia", 4, { contractChange: "The customer's contract was amended on 12 Nov: service hours extended to 24x7 and the response time cut from 4 hours to 2 hours. The offered price no longer covers the extra cover." }),
    offer("OF-910", "kokapet", undefined, "HYC", "newinstall", 1, 0, "noah", 0, { status: "draft", sentAt: undefined, missing: ["Rated load (kg)", "Number of floors", "Door type"], log: [{ t: now - 2 * DAY, by: NAMES.noah, text: "Draft started from tender T-101. Configuration data is missing: asked Sales support to complete it" }] }),
    offer("OF-911", "kakatiya", "a90311", "WGL", "renewal", 3, 15, "sofia", 0, { status: "awaiting", sentAt: undefined, lastActivity: now - 60 * HOUR, approvals: [{ by: "marc", status: "pending" }], log: [{ t: now - 60 * HOUR, by: NAMES.sofia, text: "Sent for approval to Madhav Reddy: 15% is above the 10% guideline" }] }),
  ];
  const mleads: MLead[] = [
    { id: "ML-501", name: "Padma Constructions", source: "Web form: AMC enquiry", area: "HYW", createdAt: now - 60 * HOUR, status: "new", interest: "Service contract for 6 lifts", score: 72 },
    { id: "ML-502", name: "Sri Sai Residency", source: "Campaign reply: ageing lifts offer", area: "HYC", createdAt: now - 55 * HOUR, status: "new", interest: "Modernisation of 2 lifts", score: 64 },
    { id: "ML-503", name: "Nizam Boutique Hotel", source: "Trade fair QR code", area: "SEC", createdAt: now - 20 * HOUR, status: "new", interest: "Maintenance contract", score: 58 },
  ];
  const campaigns: Campaign[] = [{ id: "C-1", name: "Keep your lift safe: AMC for lifts over 20 years", segment: "Ageing lifts, Hyderabad Central", area: "HYC", size: 9, status: "live", createdBy: "manoj", createdAt: now - 18 * DAY, leads: 3 }];
  const sh: Sherpa = { accounts, assets, tenders, opps: [], past: seedPast(now), offers, mleads, campaigns, tasks: [], contracts: [], crm: [], nba: {}, flags: { coaching: false }, seq: 913 };
  seedOpps(sh, now);
  return sh;
}

/* ------------------------------------------------------------------ the opportunity: one record from sighting to won */
export const KIND_LABEL: Record<Opp["kind"], string> = { newbuild: "New installation", existing: "Existing installation", renewal: "Service contract", modernisation: "Modernisation", project: "Project" };
export const STAGES: [OppStage, string][] = [["review", "Review"], ["new", "Lead"], ["contact", "Contact"], ["visit", "Visit"], ["qualify", "Qualify"], ["bid", "Bid"], ["offer", "Offer"], ["sent", "Sent"], ["contract", "Contract"], ["order", "Order"], ["won", "Won"]];
/** A Snap & Lead lead skips the accept and contact steps: the manager reviews it and a technician visits. */
export const isNI = (o: Pick<Opp, "kind">) => o.kind === "newbuild" || o.kind === "project";
export const NI_STAGES = (o: Opp): [OppStage, string][] => [["review", "Review"], ["new", "Accept"], ["contact", "Customer call"], o.tenderId ? ["bid", "Bid"] : ["offer", "Quote"], ["sent", "Sent"], ["order", "Order"], ["won", "Won"]];
export function stagesFor(o: Opp): [OppStage, string][] {
  if (isNI(o)) return NI_STAGES(o);
  if (o.source.type !== "snap" || o.stage === "new" || o.stage === "contact") return STAGES.filter(([k]) => k !== "review");
  const deal: OppStage = o.tenderId ? "bid" : "offer";
  return STAGES.filter(([k]) => k !== "new" && k !== "contact" && (k === deal || (k !== "bid" && k !== "offer")));
}
export const TECHS = USERS.filter((u) => u.role === "tech");
export const SERVICE_LEADS = USERS.filter((u) => u.role === "sl");
export const serviceLeadFor = (area: string) => SERVICE_LEADS.find((u) => u.areas?.includes(area))?.id ?? SERVICE_LEADS[0]?.id;
/** Why we lost this customer or place last time, so the next deal starts with it. */
export function lastLoss(s: State, o: Opp): { reason: string; at: number; title: string } | undefined {
  const prev = s.sherpa.opps.filter((x) => x.id !== o.id && x.lostReason && x.closedAt && ((o.accountId && x.accountId === o.accountId) || x.placeName === o.placeName)).sort((a, b) => b.closedAt! - a.closedAt!)[0];
  return prev ? { reason: prev.lostReason!, at: prev.closedAt!, title: prev.title } : undefined;
}
export const techFor = (area: string) => TECHS.find((u) => u.areas?.includes(area))?.id ?? TECHS[0]?.id;
export const oppOf = (s: State, id?: string) => s.sherpa.opps.find((o) => o.id === id);
export const oppOfOffer = (s: State, o: Offer) => s.sherpa.opps.find((x) => x.id === o.oppId);
export const tasksOfOpp = (s: State, oppId: string, open = true) => s.sherpa.tasks.filter((t) => t.oppId === oppId && (!open || !t.done));
export const isOpen = (o: Opp) => !["won", "lost", "closed"].includes(o.stage);

export function addTask(s: State, t: { oppId?: string; forUser: string; by: string; title: string; detail?: string; days: number; kind: TaskKind; source?: string; accountId?: string }): Task {
  const task: Task = { id: `TK-${s.sherpa.seq++}`, oppId: t.oppId, title: t.title, detail: t.detail, by: t.by, forUser: t.forUser, accountId: t.accountId, kind: t.kind, due: nowS(s) + t.days * DAY, done: false, createdAt: nowS(s), source: t.source ?? "workflow" };
  s.sherpa.tasks.unshift(task);
  if (t.forUser !== t.by) ping(s, t.forUser, `${NAMES[t.by] ?? t.by} needs you: ${t.title}`);
  return task;
}
export function closeTasks(s: State, oppId: string | undefined, kinds: TaskKind[] | null, result?: string) {
  s.sherpa.tasks.forEach((t) => { if (oppId && t.oppId === oppId && !t.done && (!kinds || (t.kind && kinds.includes(t.kind)))) { t.done = true; t.doneAt = nowS(s); if (result) t.result = result; } });
}
export const olog = (s: State, o: Opp, by: string, text: string) => { o.log.push({ t: nowS(s), by: NAMES[by] ?? by, text }); };
/** Who goes to the customer: the owner, except a modernisation survey (the MOD rep) and a service-contract renewal (the EI rep for the area). */
export function visitorFor(s: State, o: Opp): string {
  if (o.technician) return o.technician;
  if (o.kind === "modernisation") return "mia";
  if (o.kind === "renewal") return s.cfg.owners[o.area]?.EI ?? o.owner;
  return o.owner;
}
const kindOfTeam = (team?: string | null): Opp["kind"] => (team === "NI" ? "newbuild" : team === "SC" ? "renewal" : team === "MOD" ? "modernisation" : "existing");

export const OP = {
  create(s: State, p: { title: string; kind: Opp["kind"]; accountId?: string; placeName: string; area: string; owner: string; source: Opp["source"]; value?: number; contact?: Opp["contact"]; stage?: OppStage; unrouted?: boolean; geo?: Opp["geo"] }): Opp {
    const o: Opp = { id: `OP-${s.sherpa.seq++}`, geo: p.geo, title: p.title, kind: p.kind, accountId: p.accountId, placeName: p.placeName, area: p.area, owner: p.owner, unrouted: p.unrouted, stage: p.stage ?? "new", createdAt: nowS(s), value: p.value, source: p.source, contact: p.contact, log: [] };
    olog(s, o, p.source.reporter ?? p.owner, `Opportunity created from ${p.source.label}`);
    s.sherpa.opps.unshift(o);
    return o;
  },
  /** Called when a Snap & Lead lead is routed: one opportunity per lead, with an accept task for the owner. */
  fromReport(s: State, r: Report) {
    r.items.filter((i) => i.kind === "lead" && !i.silent && i.team !== "AM").forEach((i) => {
      if (s.sherpa.opps.some((x) => x.source.itemId === i.id)) return;
      const acc = s.sherpa.accounts.find((a) => a.placeIds.includes(r.placeId));
      const contact = r.extras.contact ? { name: r.extras.contact.split("·")[0].trim(), role: "Given by the reporter", phone: r.extras.contact.split("·")[1]?.trim(), via: "the reporter" } : undefined;
      const kind = kindOfTeam(i.team);
      const opp = OP.create(s, { title: `${KIND_LABEL[kind]}: ${r.placeName}`, kind, accountId: acc?.id, placeName: r.placeName, area: r.area, owner: MANAGER, source: { type: "snap", reportId: r.id, itemId: i.id, reporter: r.reporterId, label: `Snap & Lead ${r.id}` }, contact, stage: "review" });
      opp.suggested = i.ownerId;
      const hist = historyReasons(s, opp, r.placeId);
      opp.reasons = [...i.reasons, ...hist];
      opp.score = Math.max(0, Math.min(100, i.score + hist.reduce((a, b) => a + b.pts, 0)));
      opp.tier = i.score === 0 ? i.tier : tierOf(opp.score, s.cfg);
      addTask(s, { oppId: opp.id, forUser: MANAGER, by: r.reporterId, title: `Review: ${opp.title}`, detail: `${opp.tier} lead, score ${opp.score}. ${i.summary}${i.ownerId ? "" : ` No ${i.team} owner covers ${AREA_NAME[r.area] ?? r.area}.`}`, days: opp.tier === "Hot" ? 1 : 2, kind: "review", source: "Snap & Lead" });
    });
  },
  /** The Sales Manager decided to pursue: names the owner, and for leads other than new installations the technician who visits. */
  review(s: State, id: string, by: string, p: { owner: string; technician?: string; note?: string }) {
    const o = oppOf(s, id); if (!o || o.stage !== "review") return;
    closeTasks(s, id, ["review", "assign"]);
    if (isNI(o) || !p.technician) {
      o.owner = p.owner; o.unrouted = false; o.stage = "new";
      olog(s, o, by, `Pursue. Owner ${NAMES[p.owner] ?? p.owner}${p.note ? `. ${p.note}` : ""}`);
      if (p.note) OP.note(s, id, by, p.note);
      addTask(s, { oppId: id, forUser: p.owner, by, title: `Accept: ${o.title}`, detail: `${NAMES[by]} decided to pursue this ${o.tier ? `${o.tier} ` : ""}lead and picked you.`, days: 1, kind: "accept", source: "Lead review" });
      if (p.owner !== by) ping(s, p.owner, `${NAMES[by]} gave you ${o.title}. Accept it to start.`);
      return;
    }
    const technician = p.technician;
    o.owner = p.owner; o.unrouted = false; o.technician = technician; o.visitBy = technician; o.stage = "visit";
    olog(s, o, by, `Pursue. Owner ${NAMES[p.owner] ?? p.owner}, site visit by ${NAMES[technician] ?? technician}${p.note ? `. ${p.note}` : ""}`);
    if (p.note) OP.note(s, id, by, p.note);
    addTask(s, { oppId: id, forUser: technician, by, title: `Site visit: ${o.placeName}`, detail: `${KIND_LABEL[o.kind]} lead${o.tier ? ` (${o.tier})` : ""}. Meet the person in charge, check the lifts and file the site-visit report. ${NAMES[p.owner]} owns the deal.`, days: o.tier === "Hot" ? 2 : 5, kind: "siteVisit", source: "Lead review" });
    if (p.owner !== by) ping(s, p.owner, `${NAMES[by]} gave you ${o.title}. ${NAMES[technician]} visits first.`);
  },
  reviewClose(s: State, id: string, by: string, reason: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, null, reason); o.stage = "closed"; o.closedAt = nowS(s); o.lostReason = `Not pursued: ${reason}`; olog(s, o, by, `Not pursued: ${reason}`);
  },
  note(s: State, id: string, by: string, text: string) {
    const o = oppOf(s, id); if (!o || !text.trim()) return;
    const stage = STAGES.find((x) => x[0] === o.stage)?.[1] ?? o.stage;
    (o.notes ??= []).push({ t: nowS(s), by: NAMES[by] ?? by, text: `${stage}: ${text.trim()}` });
  },
  /** The technician filed the site-visit report. The owner sets up the deal next. */
  siteVisit(s: State, id: string, by: string, v: Omit<SiteVisit, "by" | "at">) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["siteVisit", "visit"]);
    o.site = { ...v, by, at: nowS(s) }; o.visited = true; o.stage = "qualify";
    if (v.met.name) o.contact = { name: v.met.name, role: v.met.role, phone: v.met.phone, via: `${NAMES[by] ?? by} on the site visit` };
    olog(s, o, by, `Site visit done${v.met.name ? `: met ${v.met.name}, ${v.met.role}` : ""}`);
    if (v.note) OP.note(s, id, by, v.note);
    const next = o.kind === "newbuild" || o.kind === "project" ? "tender or quotation?" : o.kind === "modernisation" ? "modernisation quotation" : "maintenance offer";
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Set up the deal for ${o.placeName}`, detail: `${NAMES[by]} visited. Confirm the customer, then pick the path: ${next}`, days: 2, kind: "dealSetup", source: "Site visit" });
  },
  /** The owner confirmed the customer and picked the path. */
  setupDeal(s: State, id: string, by: string, p: { accountId: string | "new"; path: "tender" | "direct" | "notfit"; eordDays?: number; product?: ProductKey; term?: number; discountPct?: number; nba?: string }) {
    const o = oppOf(s, id); if (!o) return;
    if (p.path !== "notfit") {
      const acc = p.accountId === "new" ? newAccountFor(s, o) : accountOf(s, p.accountId);
      if (acc) { o.accountId = acc.id; olog(s, o, by, p.accountId === "new" ? `New customer created: ${acc.name}` : `Linked to existing customer ${acc.name}`); }
    }
    closeTasks(s, id, ["dealSetup"]);
    OP.qualify(s, id, by, p.path, p.eordDays ?? 30, { product: p.product, term: p.term, discountPct: p.discountPct });
    if (p.nba) olog(s, o, by, `Next best action taken: ${p.nba}`);
  },
  /** The owner accepted. Next: a contact. If none is known, the owner decides how to find one. */
  accepted(s: State, id: string, by: string) {
    const o = oppOf(s, id); if (!o || o.stage !== "new") return;
    closeTasks(s, id, ["accept", "assign"]); o.stage = "contact"; olog(s, o, by, "Accepted. The reporter was told");
    if (o.contact) addTask(s, { oppId: id, forUser: o.owner, by, title: `Contact ${o.contact.name} about ${o.placeName}`, days: 2, kind: "contact" });
    else addTask(s, { oppId: id, forUser: o.owner, by, title: `Find a decision-maker for ${o.placeName}`, detail: isNI(o) ? "We have no contact. Ask Sales support to search the records, ask the person who spotted it, or find them yourself." : "We have no contact. Ask the reporter, ask Sales support to research it, or walk in yourself.", days: 2, kind: "findContact" });
  },
  askReporter(s: State, id: string, by: string) {
    const o = oppOf(s, id); const rep = o?.source.reporter; if (!o || !rep || rep === o.owner) return;
    closeTasks(s, id, ["findContact"]);
    addTask(s, { oppId: id, forUser: rep, by, title: `Add the contact for ${o.placeName}`, detail: "Look at the hoarding or the notice board. Note the developer or contractor name and any phone number. +5 points.", days: 2, kind: "research", source: "contact" });
    olog(s, o, by, `Asked ${NAMES[rep]} (who reported it) for the developer name and phone`);
  },
  research(s: State, id: string, by: string, want: string[] = ["Contact details"]) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["findContact"]);
    o.research = { want, by, at: nowS(s) };
    addTask(s, { oppId: id, forUser: SUPPORT, by, title: `Find ${want.map((w) => w.toLowerCase()).join(", ")} for ${o.placeName}`, detail: `${NAMES[by]} asked for: ${want.join(", ")}. Search the building permit, the company register and our customer records, then share what fits. Do not call the customer.`, days: 2, kind: "research", source: "contact" });
    olog(s, o, by, `Asked Sales support to find: ${want.join(", ")}`);
  },
  /** Sales support shares what the records search found. The first contact picked becomes the deal's contact. */
  shareResearch(s: State, taskId: string, by: string, ids: string[]) {
    const t = s.sherpa.tasks.find((x) => x.id === taskId); const o = oppOf(s, t?.oppId); if (!t || !o) return;
    const picked = researchFindings(s, o).filter((f) => ids.includes(f.id)); const c = picked.find((f) => f.contact)?.contact; if (!c) return;
    t.done = true; t.doneAt = nowS(s); t.result = picked.map((f) => f.title).join("; ");
    o.research = { ...(o.research ?? { want: [], by: o.owner, at: nowS(s) }), shared: picked.map((f) => `${f.source}: ${f.title}. ${f.detail}`), tenderFile: picked.find((f) => f.file)?.file };
    o.contact = { ...c, via: `${NAMES[by] ?? by} (records search)` };
    olog(s, o, by, `Shared from the records search: ${picked.map((f) => f.title).join("; ")}`);
    addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Call or visit ${c.name} about ${o.placeName}`, detail: `${NAMES[by]} found ${c.name}, ${c.role}${c.phone ? `, ${c.phone}` : ""}.${o.research.tenderFile ? ` Also found the tender document ${o.research.tenderFile}.` : ""} Record the conversation when you have spoken.`, days: 2, kind: "contact", source: "contact" });
    ping(s, o.owner, `${NAMES[by]} found a contact for ${o.placeName}: ${c.name}, ${c.role}`);
  },
  /** The rep finds the customer without help and goes straight to the conversation. */
  selfContact(s: State, id: string, by: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["findContact"]);
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Call or visit the customer at ${o.placeName}`, detail: "Find the person in charge yourself and record the conversation.", days: 2, kind: "contact" });
    olog(s, o, by, "Finding the contact without help");
  },
  /** The rep spoke to the customer. What the customer said decides the path. */
  talk(s: State, id: string, by: string, t: Omit<Talk, "by" | "at">) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["contact", "findContact"]);
    (o.talks ??= []).push({ ...t, by, at: nowS(s) });
    if (t.with.name) o.contact = { name: t.with.name, role: t.with.role, phone: t.with.phone, email: o.contact?.email, via: o.contact?.name === t.with.name ? o.contact.via : `${NAMES[by] ?? by} (${t.how.toLowerCase()})` };
    olog(s, o, by, `${t.how} with ${t.with.name || "the customer"}: ${t.said || "no note"}`);
    if (t.outcome === "callback") {
      const days = t.callbackDays ?? 7;
      addTask(s, { oppId: id, forUser: o.owner, by, title: `Call back ${t.with.name || "the customer"} at ${o.placeName}`, detail: `They asked to be called back. Last time: ${t.said || "no note"}`, days, kind: "contact", source: "Reminder" });
      olog(s, o, by, `Call back in ${days} days. Reminder set`); return;
    }
    if (t.outcome === "notInterested") { o.stage = "closed"; o.closedAt = nowS(s); o.lostReason = `Not interested: ${t.reason ?? "no reason given"}`; olog(s, o, by, `Closed. ${o.lostReason}`); return; }
    if (t.outcome === "tender") {
      const lifts = Number(t.wants.lifts) || 0;
      OP.qualify(s, id, by, "tender", t.eordDays ?? 30);
      const tn = tenderOf(s, o.tenderId);
      if (tn && lifts) { tn.value = Math.round((tn.value / Math.max(1, tn.lifts)) * lifts); tn.lifts = lifts; }
      const file = t.tenderFile ?? o.research?.tenderFile;
      if (tn && file) { tn.doc = readTenderDoc(tn, { name: file, size: 860000 }, nowS(s)); olog(s, o, by, `Tender document ${file} attached`); }
      return;
    }
    OP.qualify(s, id, by, "direct");
  },
  /** Whoever was asked returns a contact. The owner gets the next task. */
  provideContact(s: State, taskId: string, by: string, c: { name: string; role: string; phone?: string; email?: string }) {
    const t = s.sherpa.tasks.find((x) => x.id === taskId); const o = oppOf(s, t?.oppId); if (!t || !o) return;
    t.done = true; t.doneAt = nowS(s); t.result = `${c.name}, ${c.role}`;
    o.contact = { ...c, via: NAMES[by] ?? by }; olog(s, o, by, `Contact added: ${c.name}, ${c.role}`);
    if (o.stage === "contact" || o.stage === "new") addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Contact ${c.name} about ${o.placeName}`, detail: `${NAMES[by]} found the contact${c.phone ? `: ${c.phone}` : ""}.`, days: 2, kind: "contact" });
    if (t.forUser && o.source.reporter === t.forUser) s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text: `Contact added by reporter for ${o.placeName} (+5 points)` });
  },
  /** The owner walked in and met someone. This is also the first visit. */
  walkIn(s: State, id: string, by: string, c: { name: string; role: string; phone?: string }, note: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["findContact", "contact", "visit"]); o.contact = { ...c, via: "a walk-in" }; o.visited = true; o.stage = "qualify";
    olog(s, o, by, `Walked in and met ${c.name}, ${c.role}${note ? `: ${note}` : ""}`);
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Qualify ${o.placeName}: tender or direct quote?`, days: 2, kind: "qualify" });
  },
  /** A call or email was saved. A visit follows, by the right person. */
  contacted(s: State, id: string, by: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["contact"]); o.stage = "visit";
    const v = visitorFor(s, o); o.visitBy = v;
    addTask(s, { oppId: id, forUser: v, by, title: `Visit ${o.placeName}${o.kind === "modernisation" ? " and survey the lifts" : ""}`, detail: v === o.owner ? "Meet the contact on site and record what you find." : `${NAMES[o.owner]} owns the opportunity. You do the ${o.kind === "modernisation" ? "technical survey" : "site visit"}.`, days: 5, kind: "visit" });
    if (v !== o.owner) olog(s, o, by, `${NAMES[v]} will visit (${o.kind === "modernisation" ? "modernisation survey" : "existing-installation rep for the area"})`);
  },
  visited(s: State, id: string, by: string, note: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["visit"]); o.visited = true; o.stage = "qualify"; olog(s, o, by, `Visit done${note ? `: ${note}` : ""}`);
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Qualify ${o.placeName}: tender or direct quote?`, days: 2, kind: "qualify" });
  },
  /** The owner decides. A formal request becomes a tender with a bid and an offer. Otherwise a direct offer. */
  qualify(s: State, id: string, by: string, choice: "tender" | "direct" | "notfit", eordDays = 30, terms: { product?: ProductKey; term?: number; discountPct?: number } = {}) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["qualify"]);
    if (choice === "notfit") { o.stage = "closed"; o.closedAt = nowS(s); olog(s, o, by, "Not a fit. Closed"); return; }
    const product: ProductKey = terms.product ?? (o.kind === "newbuild" || o.kind === "project" ? "newinstall" : o.kind === "renewal" ? "renewal" : o.kind === "modernisation" ? "modernisation" : "maintenance");
    const accId = o.accountId ?? ensureAccountFor(s, o).id; o.accountId = accId;
    const offer = SH.makeOffer(s, { accountId: accId, area: o.area, product, term: terms.term ?? (product === "maintenance" || product === "renewal" ? 3 : 1), discountPct: terms.discountPct ?? 0, by: o.owner, oppId: o.id, source: o.source.itemId ? { reportId: o.source.reportId!, itemId: o.source.itemId } : undefined });
    o.offerId = offer.id;
    if (choice === "tender") {
      const t: Tender = { id: `T-${s.sherpa.seq++}`, name: o.title.includes(o.placeName) ? o.title : `${o.title}: ${o.placeName}`, accountId: accId, area: o.area, owner: o.owner, line: "ni", stage: "bidding", eord: nowS(s) + eordDays * DAY, value: PRODUCT[product].list * (Number(o.site?.lifts) || 1), lifts: Number(o.site?.lifts) || 1, summary: `Tender raised from ${o.source.label}.${o.site ? ` Site visit: ${o.site.lifts || "?"} lifts, ${o.site.floors || "floors not known"}.` : ""}`, discovered: nowS(s), oppId: o.id, checklist: PAPER_LIST() };
      s.sherpa.tenders.unshift(t); o.tenderId = t.id; o.stage = "bid"; olog(s, o, by, `Formal tender ${t.id} raised. Bid due in ${eordDays} days`);
      if (product === "newinstall") offer.missing = ["Rated load (kg)", "Number of floors", "Door type"];
      if (isNI(o)) { addTask(s, { oppId: id, forUser: SUPPORT, by, title: `Fill in the lift details from tender ${t.id}`, detail: `${NAMES[o.owner]} has a formal tender from the customer. Read the tender document and answer what it leaves open. Bid due in ${eordDays} days.`, days: Math.max(1, Math.min(3, eordDays - 10)), kind: "config", source: "N13" }); return; }
      addTask(s, { oppId: id, forUser: o.owner, by, title: `Upload the tender document for ${t.id}`, detail: `Bid due in ${eordDays} days. SHERPA reads the document, asks what it leaves open and drafts the bid. The Sales Manager approves it.`, days: Math.max(2, eordDays - 7), kind: "tenderDoc", source: "N13" });
    } else if (product === "newinstall" || product === "modernisation") { o.stage = "offer"; olog(s, o, by, `Quotation ${offer.id} started`); addTask(s, { oppId: id, forUser: o.owner, by, title: `Answer the quotation questions for ${offer.id}`, detail: "A few questions about the lifts. SHERPA drafts the quotation from them.", days: 3, kind: "quoteBrief" }); }
    else { o.stage = "offer"; olog(s, o, by, `Direct offer ${offer.id} drafted`); addTask(s, { oppId: id, forUser: o.owner, by, title: `Check and submit ${offer.id} for approval`, days: 3, kind: "revise" }); }
  },
  /** Offer events keep the opportunity and everyone's tasks in step. */
  onOffer(s: State, of: Offer, ev: "submitted" | "approved" | "changes" | "rejected" | "sent" | "chased" | "won" | "lost" | "blocked", note = "") {
    const o = oppOf(s, of.oppId); if (!o) return; const acc = accountOf(s, of.accountId)?.name ?? o.placeName;
    if (ev === "blocked") { addTask(s, { oppId: o.id, forUser: of.createdBy, by: MANAGER, title: `Lower the discount on ${of.id}`, detail: `${of.discountPct}% is above the ${GUIDE.manager}% the manager can approve. Reduce it, or get the regional lead's written approval outside this app.`, days: 2, kind: "revise" }); return; }
    if (ev === "submitted") { closeTasks(s, o.id, ["revise", "send", "config"]); of.approvals.forEach((x) => addTask(s, { oppId: o.id, forUser: x.by, by: of.createdBy, title: `Approve ${of.discountPct}% on ${of.id} for ${acc}`, detail: `${of.title}, ${inr(of.price)}. Guideline is ${GUIDE.seller}%.`, days: 2, kind: "approve", source: "N19" })); o.stage = "offer"; olog(s, o, of.createdBy, `${of.id} sent for approval`); }
    if (ev === "approved") { closeTasks(s, o.id, ["approve", "revise"]); o.stage = o.stage === "bid" ? "bid" : "offer"; addTask(s, { oppId: o.id, forUser: of.createdBy, by: MANAGER, title: `Send ${of.id} to ${acc}`, detail: "Approved. Edit the email if you like and send it.", days: 1, kind: "send" }); olog(s, o, MANAGER, `${of.id} approved`); }
    if (ev === "changes" || ev === "rejected") { closeTasks(s, o.id, ["approve"]); addTask(s, { oppId: o.id, forUser: of.createdBy, by: MANAGER, title: ev === "changes" ? `Revise ${of.id}: ${note}` : `${of.id} was rejected: ${note}`, days: 2, kind: "revise" }); olog(s, o, MANAGER, ev === "changes" ? `Changes asked on ${of.id}: ${note}` : `${of.id} rejected: ${note}`); }
    if (ev === "sent") { if (o.source.itemId) leadHooks.quoted?.(s, o.source.itemId, of.createdBy); closeTasks(s, o.id, ["send", "compliance"]); o.stage = "sent"; addTask(s, { oppId: o.id, forUser: of.createdBy, by: of.createdBy, title: `Follow up with ${acc} on ${of.id}`, detail: "Nothing from the customer yet. Call or send the follow-up SHERPA drafted.", days: 14, kind: "followup", source: "N16" }); olog(s, o, of.createdBy, `${of.id} sent to the customer. Follow-up in 14 days`); if (o.tenderId) { const t = tenderOf(s, o.tenderId); if (t) t.stage = "submitted"; } }
    if (ev === "chased") { s.sherpa.tasks.forEach((t) => { if (t.oppId === o.id && t.kind === "followup" && !t.done) t.due = nowS(s) + 14 * DAY; }); olog(s, o, of.createdBy, "Follow-up sent. Next check in 14 days"); }
    if (ev === "won") {
      closeTasks(s, o.id, null); o.stage = "contract"; olog(s, o, of.createdBy, `Customer accepted ${of.id}, ${inr(of.price)}. Contract next`);
      const t = tenderOf(s, o.tenderId); if (t) t.stage = "won";
      CT.draft(s, of, o);
    }
    if (ev === "lost") { if (o.source.itemId) leadHooks.closed?.(s, o.source.itemId, o.owner, "lost"); closeTasks(s, o.id, null); o.stage = "lost"; o.closedAt = nowS(s); o.lostReason = note || "No reason given"; olog(s, o, of.createdBy, `Lost: ${of.id}${note ? `: ${note}` : ""}`); const t = tenderOf(s, o.tenderId); if (t) t.stage = "lost"; }
  },
  declined(s: State, id: string, by: string, reason: string) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["accept"]); o.unrouted = true; o.owner = MANAGER; olog(s, o, by, `Declined (${reason}). Sent back to the manager`);
    addTask(s, { oppId: id, forUser: MANAGER, by, title: `Assign an owner: ${NAMES[by]} declined (${reason})`, detail: `${o.title} at ${o.placeName}.`, days: 1, kind: "assign", source: "H4" });
  },
  completeTask(s: State, taskId: string, by: string, result = "") {
    const t = s.sherpa.tasks.find((x) => x.id === taskId); if (!t) return;
    t.done = true; t.doneAt = nowS(s); t.result = result; const o = oppOf(s, t.oppId); if (o) olog(s, o, by, `${t.title}${result ? `: ${result}` : ""}`);
  },
  /** One paper of the bid is ready, or not. */
  setPaper(s: State, tenderId: string, i: number, done: boolean) {
    const t = tenderOf(s, tenderId); if (t?.checklist[i]) t.checklist[i].done = done;
  },
  /** Fill every paper SHERPA can make by itself. */
  fillPapers(s: State, tenderId: string, by: string) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t) return;
    BID_PAPERS.forEach((p, i) => { if (p.auto && t.checklist[i]) t.checklist[i].done = true; });
    if (o) olog(s, o, by, "SHERPA filled the bid papers it can make");
  },
  /** The Sales Manager finished the bid. The owner sends it to the customer. */
  bidDone(s: State, tenderId: string, by: string, discountPct: number) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t || !o) return;
    const product: ProductKey = t.line === "ni" ? "newinstall" : t.line === "sc" ? "maintenance" : "modernisation";
    const offer = offerOf(s, o.offerId) ?? SH.makeOffer(s, { accountId: t.accountId, area: t.area, product, term: t.line === "sc" ? 3 : 1, discountPct: 0, by: o.owner, oppId: o.id });
    if (offer.missing?.length) return;
    offer.listPrice = t.value; offer.discountPct = discountPct; offer.price = Math.round(t.value * (1 - discountPct / 100));
    offer.status = "approved"; offer.approvals = [{ by, status: "approved", at: nowS(s) }]; offer.email = undefined; offer.lastActivity = nowS(s);
    offer.log.push({ t: nowS(s), by: NAMES[by] ?? by, text: `Bid created: ${discountPct}% off, ${inr(offer.price)}` });
    t.checklist.forEach((c) => { c.done = true; }); t.stage = "final"; t.bid = { by, at: nowS(s), discountPct };
    closeTasks(s, o.id, ["bid", "compliance", "approve", "revise", "config", "approveBid", "tenderDoc"]);
    o.offerId = offer.id; offer.oppId = o.id; o.value = offer.price; o.stage = "offer";
    const acc = accountOf(s, t.accountId)?.name ?? o.placeName;
    olog(s, o, by, `Bid for ${t.id} created: ${discountPct}% off, ${inr(offer.price)}`);
    if (isNI(o)) { o.stage = "bid"; addTask(s, { oppId: o.id, forUser: SUPPORT, by, title: `Review the terms and papers of the bid for ${t.id}`, detail: `${NAMES[by]} prepared the bid at ${discountPct}% off, ${inr(offer.price)}. Check the contract terms and every paper before ${NAMES[o.owner]} confirms it with the customer's request.`, days: 1, kind: "bidReview", source: "Bid" }); return; }
    addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Send the bid to ${acc}`, detail: `${NAMES[by]} created the bid. Check the email and send it to the customer.`, days: 2, kind: "send", source: "Bid" });
  },
  tickCompliance(s: State, id: string, by: string) {
    const o = oppOf(s, id); if (!o) return; const t = tenderOf(s, o.tenderId);
    if (t) t.checklist.forEach((c) => { if (/compliance/i.test(c.t)) c.done = true; });
    closeTasks(s, id, ["compliance"]); olog(s, o, by, "Compliance sheet filled");
  },
  reassign(s: State, id: string, by: string, to: string) {
    const o = oppOf(s, id); if (!o) return; o.owner = to; o.unrouted = false;
    s.sherpa.tasks.forEach((t) => { if (t.oppId === id && !t.done && t.forUser === by && t.kind === "assign") { t.done = true; t.doneAt = nowS(s); } });
    olog(s, o, by, `Assigned to ${NAMES[to]}`);
    if (o.stage === "new") addTask(s, { oppId: id, forUser: to, by, title: `Accept: ${o.title} at ${o.placeName}`, days: 1, kind: "accept" });
  },
  tenderDoc(s: State, tenderId: string, by: string, file: { name: string; size: number }) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t) return;
    t.doc = readTenderDoc(t, file, nowS(s));
    if (o) olog(s, o, by, `Tender document ${file.name} read: ${t.doc.found.length} facts found, ${t.doc.gaps.length} questions`);
  },
  answerGaps(s: State, tenderId: string, by: string, answers: Record<string, string>) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t?.doc) return;
    t.doc.gaps.forEach((g) => { if (answers[g.key]) g.a = answers[g.key]; });
    const of = offerOf(s, o?.offerId); if (of) { of.missing = undefined; of.log.push({ t: nowS(s), by: NAMES[by] ?? by, text: "Lift details completed from the tender document and the owner's answers" }); }
    BID_PAPERS.forEach((p, i) => { if (p.auto && t.checklist[i]) t.checklist[i].done = true; });
    t.value = Math.round(t.value * t.doc.gaps.reduce((f, g) => f * (FACTORS[g.a ?? ""] ?? 1), 1));
    if (o) olog(s, o, by, "Bid drafted from the tender document. Papers SHERPA can make are filled");
    if (o && isNI(o) && !t.bid) {
      closeTasks(s, o.id, ["config"]);
      if (!tasksOfOpp(s, o.id).some((x) => x.kind === "bid")) addTask(s, { oppId: o.id, forUser: MANAGER, by, title: `Prepare the bid for ${t.id}`, detail: `${NAMES[by]} filled in the lift details from the tender. Set the price with earlier quotes, check the papers and answer any competitor part the tender names.`, days: Math.max(1, Math.min(3, daysTo(s, t.eord) - 5)), kind: "bid", source: "Bid" });
    }
  },
  /** The owner sends the draft bid to the Sales Manager. */
  submitBid(s: State, tenderId: string, by: string, discountPct: number) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t || !o) return;
    t.draft = { by, at: nowS(s), discountPct, answers: Object.fromEntries((t.doc?.gaps ?? []).map((g) => [g.key, g.a ?? ""])) };
    closeTasks(s, o.id, ["tenderDoc", "bid", "revise"]);
    olog(s, o, by, `Draft bid sent to ${NAMES[MANAGER]} for approval: ${discountPct}% off`);
    addTask(s, { oppId: o.id, forUser: MANAGER, by, title: `Approve the bid for ${t.id}`, detail: `${NAMES[by]} drafted it at ${discountPct}% off ${inr(t.value)}. Check the price and papers, change anything, then approve.`, days: Math.max(1, Math.min(3, daysTo(s, t.eord) - 2)), kind: "approveBid", source: "Bid" });
  },
  bidChanges(s: State, tenderId: string, by: string, note: string) {
    const t = tenderOf(s, tenderId); const o = oppOf(s, t?.oppId); if (!t || !o) return;
    t.draft = undefined; closeTasks(s, o.id, ["approveBid"]);
    olog(s, o, by, `Changes asked on the bid: ${note}`);
    addTask(s, { oppId: o.id, forUser: o.owner, by, title: `Revise the draft bid for ${t.id}: ${note}`, days: 2, kind: "tenderDoc", source: "Bid" });
  },
  /** The owner answered the quotation questions. SHERPA prices the draft from them. */
  quoteBrief(s: State, oppId: string, by: string, b: QuoteBrief) {
    const o = oppOf(s, oppId); const of = offerOf(s, o?.offerId); if (!o || !of) return;
    of.brief = b; of.listPrice = Math.round(listPrice(of.area, of.product, of.term) * briefFactor(b)); of.price = Math.round(of.listPrice * (1 - of.discountPct / 100)); of.missing = undefined; of.email = undefined;
    of.log.push({ t: nowS(s), by: "SHERPA", text: `Draft quotation priced from the answers: ${b.floors} floors, ${b.load}, ${b.speed}` }); of.lastActivity = nowS(s);
    o.value = of.price; closeTasks(s, oppId, ["quoteBrief"]);
    olog(s, o, by, `Quotation questions answered. Draft ${of.id} at ${inr(of.price)}`);
    addTask(s, { oppId, forUser: o.owner, by, title: `Check the draft quotation ${of.id} and send it for approval`, detail: "SHERPA priced it from your answers. Change the discount if needed, then submit.", days: 2, kind: "revise" });
  },
  /** Sales support checked the bid's terms and papers. */
  bidReviewed(s: State, id: string, by: string, ok: boolean, note = "") {
    const o = oppOf(s, id); const t = tenderOf(s, o?.tenderId); if (!o || !t) return;
    closeTasks(s, id, ["bidReview"]);
    if (!ok) return OP.bidBack(s, id, by, note);
    olog(s, o, by, `Bid terms and papers checked${note ? `: ${note}` : ""}`);
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Confirm the bid matches what ${o.contact?.name ?? "the customer"} asked`, detail: `The bid for ${t.id} is ready. Check it against the customer's request before it goes out.`, days: 1, kind: "bidConfirm", source: "Bid" });
  },
  /** The rep confirmed the bid matches the customer's request, or sent it back. */
  bidConfirmed(s: State, id: string, by: string, ok: boolean, note = "") {
    const o = oppOf(s, id); const t = tenderOf(s, o?.tenderId); if (!o || !t) return;
    closeTasks(s, id, ["bidConfirm"]);
    if (!ok) return OP.bidBack(s, id, by, note);
    olog(s, o, by, "Bid matches what the customer asked");
    addTask(s, { oppId: id, forUser: o.owner, by, title: `Send the bid to ${accountOf(s, t.accountId)?.name ?? o.placeName}`, detail: "Checked by Sales support and by you. Write the email, or download the bid for the tender portal.", days: 1, kind: "send", source: "Bid" });
  },
  bidBack(s: State, id: string, by: string, note: string) {
    const o = oppOf(s, id); const t = tenderOf(s, o?.tenderId); if (!o || !t) return;
    t.bid = undefined; t.stage = "bidding"; o.stage = "bid";
    olog(s, o, by, `Bid sent back to ${NAMES[MANAGER]}: ${note}`);
    addTask(s, { oppId: id, forUser: MANAGER, by, title: `Change the bid for ${t.id}: ${note}`, detail: `${NAMES[by]} sent the bid back.`, days: 1, kind: "bid", source: "Bid" });
  },
  /** The order deadline is near: this is the last version of the bid. */
  markFinal(s: State, id: string, by: string) {
    const o = oppOf(s, id); const t = tenderOf(s, o?.tenderId); if (!o || !t) return;
    t.stage = "final"; olog(s, o, by, `Bid for ${t.id} marked final`);
  },
  /** The customer said yes. The Sales Manager approves the win next. */
  agreed(s: State, id: string, by: string, a: Omit<Agreement, "by" | "at">) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["followup", "agreed", "send"]);
    o.agreed = { ...a, by, at: nowS(s) }; o.stage = "order"; o.value = a.price;
    olog(s, o, by, `Customer agreed: ${inr(a.price)}, start ${new Date(a.start).toLocaleDateString("en-IN")}, ${a.how.toLowerCase()}. Proof: ${a.proof}`);
    addTask(s, { oppId: id, forUser: MANAGER, by, title: `Approve the win: ${o.placeName}, ${inr(a.price)}`, detail: `${NAMES[by]} recorded the customer's yes (${a.how.toLowerCase()}). Check the price and the proof, then approve or ask for a change.`, days: 1, kind: "approveWin", source: "Order" });
  },
  winDecision(s: State, id: string, by: string, ok: boolean, note = "") {
    const o = oppOf(s, id); if (!o?.agreed) return;
    closeTasks(s, id, ["approveWin"]);
    if (!ok) {
      olog(s, o, by, `Win not approved yet: ${note}`);
      addTask(s, { oppId: id, forUser: o.owner, by, title: `Change the agreed terms: ${note}`, detail: `${NAMES[by]} asked for a change before the order is created.`, days: 2, kind: "agreed", source: "Order" }); return;
    }
    olog(s, o, by, "Win approved. Sales support creates the order");
    addTask(s, { oppId: id, forUser: SUPPORT, by, title: `Create the order for ${o.placeName}`, detail: `${inr(o.agreed.price)}, start ${new Date(o.agreed.start).toLocaleDateString("en-IN")}. Set the order number, delivery date and payment terms.`, days: 1, kind: "order", source: "Order" });
  },
  /** The order is created. This is the win. */
  createOrder(s: State, id: string, by: string, p: { number: string; delivery: number; payment: string }) {
    const o = oppOf(s, id); if (!o?.agreed) return;
    const now = nowS(s); const of = offerOf(s, o.offerId); const acc = accountForOpp(s, o); const t = tenderOf(s, o.tenderId);
    closeTasks(s, id, null);
    o.order = { ...p, by, at: now }; o.stage = "won"; o.closedAt = now; o.value = o.agreed.price;
    if (of) { of.status = "won"; of.price = o.agreed.price; log(s, of, by, `Order ${p.number} created. Won`); s.sherpa.past.push({ id: `p${s.sherpa.seq++}`, area: of.area, product: of.product, price: perYear(of), discountPct: of.discountPct, outcome: "won", at: now, customer: acc?.name ?? o.placeName }); }
    if (t) t.stage = "won";
    olog(s, o, by, `Order ${p.number} created: delivery ${new Date(p.delivery).toLocaleDateString("en-IN")}, ${p.payment}`);
    if (acc) {
      acc.lines.ni = true; acc.lastActivity = now; (acc.activity ??= []).push({ t: now, by: NAMES[by] ?? by, text: `Order ${p.number} for ${o.placeName}: ${inr(o.agreed.price)}` });
      for (let i = 0; i < (t?.lifts ?? (Number(o.talks?.at(-1)?.wants.lifts) || 1)); i++) s.sherpa.assets.push({ id: `a-${s.sherpa.seq++}`, accountId: acc.id, placeId: acc.placeIds[0] ?? "", label: `New lift ${i + 1} · ${o.placeName}`, model: "Schindler 3300", ageYears: 0, brand: "ours", callbacks14d: 0, callbacks90d: 0, callbacksPrev90d: 0, faults90d: 0, health: 100, handedOver: false, servicer: "Schindler", owner: s.cfg.owners[o.area]?.EI ?? o.owner });
    }
    crm(s, by, `Order ${p.number} written to NewCRM: ${o.placeName}, ${inr(o.agreed.price)}`);
    const lead = serviceLeadFor(o.area);
    if (lead) { o.job = { lead }; addTask(s, { oppId: id, forUser: lead, by, title: `Accept the job: ${o.placeName}`, detail: `Order ${p.number}, delivery ${new Date(p.delivery).toLocaleDateString("en-IN")}. Read the handover pack, then accept with a planned start and a site contact.`, days: 3, kind: "job", source: "Handover" }); }
    const sc = s.cfg.owners[o.area]?.SC;
    if (sc) addTask(s, { oppId: id, forUser: sc, by: "SHERPA", title: `Offer a maintenance contract to ${acc?.name ?? o.placeName}`, detail: `Order ${p.number} for new lifts. Offer maintenance from handover.`, days: 7, kind: "handover", source: "N25" });
    addTask(s, { oppId: id, forUser: s.cfg.owners[o.area]?.AM ?? "lena", by: "SHERPA", title: `Update the account for ${acc?.name ?? o.placeName}`, detail: `New installation won (order ${p.number}). Update the account and look for what other teams could sell.`, days: 7, kind: "accountAction", source: "Order" });
    const ml = s.sherpa.mleads.find((l) => l.oppId === o.id); const camp = s.sherpa.campaigns.find((c) => c.id === ml?.campaignId);
    if (camp) addTask(s, { oppId: id, forUser: "manoj", by: "SHERPA", title: `Link campaign "${camp.name}" to the won deal`, detail: `${o.placeName} came from this campaign and is now won: ${inr(o.agreed.price)}.`, days: 7, kind: "other", source: "Order" });
    if (o.source.itemId && leadHooks.closed) leadHooks.closed(s, o.source.itemId, o.owner, "won");
    else if (o.source.reporter) ping(s, o.source.reporter, `The lead you spotted at ${o.placeName} is won. Thank you!`);
    ping(s, o.owner, `Order ${p.number} created for ${o.placeName}. Won!`);
  },
  /** The service lead took over the job. */
  acceptJob(s: State, id: string, by: string, p: { start: number; siteContact: { name: string; phone?: string } }) {
    const o = oppOf(s, id); if (!o) return;
    closeTasks(s, id, ["job"]);
    o.job = { lead: by, start: p.start, siteContact: p.siteContact, acceptedAt: nowS(s) };
    olog(s, o, by, `Job accepted. Planned start ${new Date(p.start).toLocaleDateString("en-IN")}, site contact ${p.siteContact.name}${p.siteContact.phone ? `, ${p.siteContact.phone}` : ""}`);
    ping(s, o.owner, `${NAMES[by]} accepted the job at ${o.placeName}. Start ${new Date(p.start).toLocaleDateString("en-IN")}.`);
  },
  /** A rep turns a handover into an offer: a new opportunity of their own, with a priced draft. */
  offerHandover(s: State, taskId: string, by: string, p: { product: ProductKey; term: number; discountPct: number }): Offer | undefined {
    const t = s.sherpa.tasks.find((x) => x.id === taskId); const won = oppOf(s, t?.oppId); const acc = won ? accountForOpp(s, won) : undefined;
    if (!t || !won || !acc) return;
    const offer = SH.makeOffer(s, { accountId: acc.id, area: won.area, product: p.product, term: p.term, discountPct: p.discountPct, by, fromNba: "N25" });
    acc.lines[p.product === "modernisation" ? "mod" : "sc"] = true; acc.lastActivity = nowS(s);
    OP.completeTask(s, taskId, by, `${PRODUCT[p.product].label} offer ${offer.id} drafted for ${acc.name}`);
    crm(s, by, `${PRODUCT[p.product].label} offer ${offer.id} drafted for ${acc.name} from order ${won.order?.number ?? won.id}`);
    return offer;
  },
  /** The account manager records what is new on the account and hands other lines to the right reps. */
  updateAccount(s: State, taskId: string, by: string, p: { handovers: ("ei" | "sc" | "mod")[]; note: string }) {
    const t = s.sherpa.tasks.find((x) => x.id === taskId); const won = oppOf(s, t?.oppId); const acc = won ? accountForOpp(s, won) : undefined;
    if (!t || !won || !acc) return;
    p.handovers.forEach((line) => {
      const to = s.cfg.owners[won.area]?.[line.toUpperCase() as "EI" | "SC" | "MOD"]; if (!to) return;
      acc.lines[line] = true;
      addTask(s, { oppId: won.id, forUser: to, by, title: `Handover pack: pursue ${line.toUpperCase()} at ${acc.name}`, detail: `${acc.name} just bought new lifts (order ${won.order?.number ?? won.id}). ${line === "mod" ? "Look at modernising the older units." : "Look at the existing units for service or repair work."}`, days: 7, kind: "handover", source: "Handover", accountId: acc.id });
      ping(s, to, `${NAMES[by]} sent you a handover pack for ${acc.name} (${line.toUpperCase()})`);
      crm(s, by, `Handover pack sent to ${NAMES[to]} for ${acc.name} (${line.toUpperCase()})`);
    });
    acc.lastActivity = nowS(s); (acc.activity ??= []).push({ t: nowS(s), by: NAMES[by] ?? by, text: `Account updated after order ${won.order?.number ?? won.id}${p.note.trim() ? `: ${p.note.trim()}` : ""}${p.handovers.length ? `. Handed over: ${p.handovers.map((x) => x.toUpperCase()).join(", ")}` : ""}` });
    OP.completeTask(s, taskId, by, p.handovers.length ? `Account updated, ${p.handovers.length} handover${p.handovers.length > 1 ? "s" : ""} sent` : "Account updated");
  },
  /** Keeps the opportunity in step with the Snap & Lead lead it came from. */
  sync(s: State) {
    s.sherpa.opps.forEach((o) => {
      if (o.source.type !== "snap" || !o.source.itemId || !isOpen(o)) return;
      const it = s.reports.flatMap((r) => r.items).find((x) => x.id === o.source.itemId); if (!it) return;
      if (o.stage === "review" || o.stage === "contract" || o.stage === "order") return;
      if (it.ownerId && it.ownerId !== o.owner) { const prev = o.owner; o.owner = it.ownerId; s.sherpa.tasks.forEach((t) => { if (t.oppId === o.id && !t.done && t.forUser === prev) t.forUser = it.ownerId; }); }
      if (it.status === "closed" && it.kind === "lead") { o.stage = /Won/i.test(it.outcome ?? "") ? "won" : "closed"; o.closedAt = nowS(s); closeTasks(s, o.id, null); }
    });
  },
};
function ensureAccountFor(s: State, o: Opp): Account {
  const found = s.sherpa.accounts.find((a) => a.name === o.placeName);
  if (found) return found;
  const a: Account = { id: `acc-${s.sherpa.seq++}`, name: o.placeName, area: o.area, placeIds: [], owner: o.owner, lastActivity: nowS(s), lines: { ni: false, ei: false, sc: false, mod: false }, contact: { name: o.contact?.name ?? "To be confirmed", role: o.contact?.role ?? "", email: o.contact?.email ?? "contact@customer.example" } };
  s.sherpa.accounts.push(a); return a;
}

function newAccountFor(s: State, o: Opp): Account {
  const a: Account = { id: `acc-${s.sherpa.seq++}`, name: o.placeName, area: o.area, placeIds: [], owner: o.owner, lastActivity: nowS(s), lines: { ni: false, ei: false, sc: false, mod: false }, contact: { name: o.contact?.name ?? "To be confirmed", role: o.contact?.role ?? "", email: o.contact?.email ?? "contact@customer.example" } };
  const r = s.reports.find((x) => x.id === o.source.reportId); if (r) a.placeIds.push(r.placeId);
  s.sherpa.accounts.push(a); return a;
}
/** Accounts that could be this customer: same place first, then a shared word in the name. */
export function accountMatches(s: State, o: Opp): Account[] {
  const r = s.reports.find((x) => x.id === o.source.reportId);
  const words = o.placeName.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !["tower", "block", "building", "site"].includes(w));
  const byPlace = s.sherpa.accounts.filter((a) => (r && a.placeIds.includes(r.placeId)) || a.id === o.accountId);
  const byName = s.sherpa.accounts.filter((a) => !byPlace.includes(a) && words.some((w) => a.name.toLowerCase().includes(w)));
  return [...byPlace, ...byName].slice(0, 3);
}
const productOfKind = (k: Opp["kind"]): ProductKey => (k === "newbuild" || k === "project" ? "newinstall" : k === "renewal" ? "renewal" : k === "modernisation" ? "modernisation" : "maintenance");
/** Score reasons from history: the win rate in the area, the customer and earlier deals at the place. */
function historyReasons(s: State, o: Opp, placeId: string): Reason[] {
  const out: Reason[] = [];
  const ref = regionRef(s, o.area, productOfKind(o.kind));
  if (ref.count >= 3 && ref.winRate >= 60) out.push({ label: `History: we won ${ref.winRate}% of similar quotes in ${AREA_NAME[o.area] ?? o.area}`, pts: 5 });
  if (ref.count >= 3 && ref.winRate <= 30) out.push({ label: `History: only ${ref.winRate}% won in ${AREA_NAME[o.area] ?? o.area}`, pts: -5 });
  const acc = s.sherpa.accounts.find((a) => a.placeIds.includes(placeId));
  if (acc) out.push({ label: `History: ${acc.name} is already a customer`, pts: 5 });
  const before = s.sherpa.opps.filter((x) => x.id !== o.id && x.placeName === o.placeName);
  if (before.some((x) => x.stage === "won")) out.push({ label: "History: we won a deal at this place before", pts: 5 });
  if (before.some((x) => isOpen(x))) out.push({ label: "History: another deal is already open here", pts: -5 });
  return out;
}
export interface Insight { lines: string[]; nba: { title: string; why: string } }
/** What the manager sees next to a lead under review. Mock AI: rules over the same data. */
export function reviewBrief(s: State, o: Opp): Insight {
  const r = s.reports.find((x) => x.id === o.source.reportId); const i = r?.input;
  const ref = regionRef(s, o.area, productOfKind(o.kind));
  const acc = accountOf(s, o.accountId) ?? (r ? s.sherpa.accounts.find((a) => a.placeIds.includes(r.placeId)) : undefined);
  const assets = acc ? s.sherpa.assets.filter((a) => a.accountId === acc.id) : [];
  const lines: string[] = [];
  lines.push(acc ? `${acc.name} is an existing customer${assets.length ? ` with ${assets.length} unit${assets.length > 1 ? "s" : ""} on record` : ""}.` : "No customer record yet. One is created when the deal is set up.");
  if (ref.count) lines.push(`${AREA_NAME[o.area] ?? o.area}: ${ref.wins} of ${ref.count} similar quotes won in the last year, average discount ${Math.round(ref.avgDiscount)}%.`);
  else lines.push(`No similar quotes in ${AREA_NAME[o.area] ?? o.area} in the last year.`);
  if (i) {
    if (i.brand === "other") lines.push(`Serviced by ${i.servicer === "maker" ? "its maker" : i.servicer === "staff" ? "building staff" : i.servicer === "nobody" ? "nobody" : "another company"}, about ${i.age} years old.`);
    if (i.condition === "minor" || i.condition === "out") lines.push(`The reporter saw ${i.condition === "out" ? "it out of service" : "minor issues"}.`);
    if (i.subject === "site") lines.push(`Building site${i.stage ? `, ${i.stage === "early" ? "early stage" : i.stage === "structure" ? "structure going up" : "finishing"}` : ""}. ${i.competitorInstalling ? "A competitor is on site." : "No lift supplier seen yet."}`);
  }
  const nba = o.kind === "newbuild" || o.kind === "project"
    ? { title: "Pursue: the NI rep calls the developer", why: "Building sites are won before the tender. Ask for the timeline and whether a tender is planned." }
    : o.kind === "modernisation" ? { title: "Book a modernisation survey", why: "An old unit with problems. A survey gives the facts for the quotation." }
    : o.kind === "renewal" ? { title: "Visit, then offer a 3-year renewal", why: "The contract ended or is ending. Renewals close fastest after a visit." }
    : i?.brand === "other" ? { title: "Competitor-serviced unit: approach the owner with a maintenance offer (NBA 9)", why: "The owner already pays for service. A visit and a first-year discount win most of these." }
    : { title: "Visit and offer a maintenance contract", why: "Our lift without an active contract." };
  return { lines, nba };
}
export interface DealNba { key: string; title: string; why: string; product: ProductKey; term: number; discountPct: number }
/** Next best actions for an existing installation, from the report and the unit. */
export function dealNbas(s: State, o: Opp): DealNba[] {
  const i = s.reports.find((x) => x.id === o.source.reportId)?.input;
  const out: DealNba[] = [];
  if (i?.brand === "other" || o.kind === "existing") out.push({ key: "N9", title: "Win the service: 3-year maintenance, 10% off", why: i?.servicer === "nobody" ? "Nobody services it today. A contract is an easy yes." : "Serviced by someone else. A first-year discount is the usual way in.", product: "maintenance", term: 3, discountPct: 10 });
  if (o.kind === "renewal" || i?.contract === "ended" || i?.contract === "ending" || i?.contract === "cancelled") out.push({ key: "N3", title: "Renew the contract for 3 years", why: "The contract has ended or is ending.", product: "renewal", term: 3, discountPct: 5 });
  out.push({ key: "N23", title: "1-year maintenance trial at list price", why: "A low-risk first step for a cautious owner.", product: "maintenance", term: 1, discountPct: 0 });
  if ((i?.age ?? 0) >= 20 || i?.condition === "out") out.push({ key: "N11", title: "Offer a modernisation instead", why: `About ${i?.age ?? 20} years old${i?.condition === "out" ? " and out of service" : ""}. A new drive and controller may cost less than years of repairs.`, product: "modernisation", term: 1, discountPct: 0 });
  return out;
}

/* ------------------------------------------------------------------ tender document: mock reading */
const pick = <T,>(xs: T[], seed: string, k = 0) => xs[[...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7 + k) % xs.length];
/** Mock records search for Sales support: building permit, company register and our own customer records. */
export function researchFindings(s: State, o: Opp): Finding[] {
  const base = o.placeName.split(/[,(]/)[0].replace(/\b(Tower|Block|Site|building site)\b.*$/i, "").trim() || o.placeName;
  const dev = `${base.split(" ").slice(0, 2).join(" ")} ${pick(["Developers", "Infra Projects", "Constructions", "Realty"], base)} Pvt Ltd`;
  const first = ["K. Prakash", "S. Lakshmi", "R. Venkat", "M. Farida", "P. Srinivas", "A. Kavya", "N. Harsha"];
  const phone = (k: number) => `+91 9${pick(["8480", "9490", "7032", "8121"], base, k)} ${String(10000 + (([...base].reduce((h, c) => h + c.charCodeAt(0), 0) * (k + 3)) % 89999)).padStart(5, "0")}`;
  const acc = accountOf(s, o.accountId) ?? accountMatches(s, o)[0];
  const slug = base.toLowerCase().replace(/[^a-z]+/g, "-");
  const out: Finding[] = [
    { id: "permit", source: "Building permit", kind: "contact", title: `${pick(first, base)}, Project director at ${dev}`, detail: `Named as the applicant on the building permit for ${o.placeName}.`, contact: { name: pick(first, base), role: `Project director, ${dev}`, phone: phone(1) } },
    { id: "owner", source: "Building permit", kind: "owner", title: `${dev} owns the project`, detail: `Permit holder for ${o.placeName}, ${AREA_NAME[o.area] ?? o.area}.` },
    { id: "register", source: "Company register", kind: "contact", title: `${pick(first, base, 2)}, Director of ${dev}`, detail: "Listed as a director. Registered office in Hyderabad.", contact: { name: pick(first, base, 2), role: `Director, ${dev}`, email: `director@${slug}.example` } },
    acc ? { id: "crm", source: "Customer records", kind: "contact", title: `${acc.contact.name}, ${acc.contact.role} at ${acc.name}`, detail: `Existing customer. Last contact ${Math.max(1, Math.round((nowS(s) - acc.lastActivity) / DAY))} days ago.`, contact: { name: acc.contact.name, role: `${acc.contact.role}, ${acc.name}`, email: acc.contact.email } }
      : { id: "crm", source: "Customer records", kind: "owner", title: "No earlier dealings", detail: `Nothing in our records for ${dev}.` },
  ];
  if (o.research?.want.some((w) => /tender/i.test(w))) out.push({ id: "tender", source: "e-Procurement portal", kind: "tender", title: `Tender notice: lifts for ${base}`, detail: "Published on the state portal. Bid due in about 30 days.", file: `${slug}-lift-tender.pdf` });
  return out;
}

export function readTenderDoc(t: Tender, file: { name: string; size: number }, at: number): TenderDoc {
  const g = /G\+(\d+)/.exec(t.summary); const speed = /(\d\.\d) m\/s/.exec(t.summary)?.[1]; const months = /(\d+) months/.exec(t.summary)?.[1];
  return {
    name: file.name, size: file.size, at,
    found: [
      { label: "Lifts asked for", value: `${t.lifts} passenger lift${t.lifts > 1 ? "s" : ""}`, page: 3 },
      { label: "Building", value: g ? `G+${g[1]}, ${Number(g[1]) + 1} stops` : "20 stops", page: 3 },
      { label: "Speed", value: `${speed ?? "1.75"} m/s`, page: 4 },
      { label: "Delivery", value: months ? `${months} months from order` : "12 months from order", page: 6 },
      { label: "Last date to submit", value: new Date(t.eord).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), page: 1 },
      { label: "Bid security (EMD)", value: "2% of the bid price, bank guarantee", page: 2 },
      ...(t.competitorSpec ? [{ label: "Named spec", value: t.competitorSpec, page: 5 }] : []),
    ],
    gaps: [
      { key: "load", q: "The document gives no rated load. What should we offer?", opts: ["1,000 kg (13 persons)", "1,350 kg (20 persons)", "1,600 kg (21 persons)"] },
      { key: "door", q: "Which door type?", opts: ["Centre-opening, 2 panels", "Side-opening, 2 panels", "Telescopic, 3 panels"] },
      { key: "finish", q: "Cabin finish?", opts: ["Stainless steel, hairline", "Mirror steel", "Painted, customer colour"] },
      { key: "service", q: "Include free maintenance after handover?", opts: ["12 months", "24 months", "Not included"] },
    ],
  };
}
const FACTORS: Record<string, number> = { "1,600 kg (21 persons)": 1.04, "Telescopic, 3 panels": 1.02, "Mirror steel": 1.02, "24 months": 1.03 };
export function briefFactor(b?: QuoteBrief) {
  if (!b) return 1;
  const floors = Number(b.floors) || 10;
  return Math.max(0.85, Math.min(1.4, 1 + (floors - 10) * 0.015)) * (/2\.5|3\.0/.test(b.speed) ? 1.1 : 1) * (/mirror|glass/i.test(b.finish) ? 1.03 : 1);
}
const CUSTOMER_LINES = [
  "Thanks for the quotation. Can you confirm the delivery time for all the lifts?",
  "Does the price include the first year of maintenance?",
  "That works for us. Please send the order form and we will sign this week.",
];
const SERVICE_LINES = [
  "Thanks for the offer. How fast do you respond when a lift breaks down?",
  "Our current contract ends next month. Can you start straight after?",
  "That works for us. Please send the contract and we will sign this week.",
];

/** Opportunities and tasks for the seeded tenders and offers, so every offer and tender already belongs to one record. */
function seedOpps(sh: Sherpa, now: number) {
  const st = { sherpa: sh, clock: 0, cfg: undefined } as unknown as State;
  const mk = (title: string, kind: Opp["kind"], accountId: string, place: string, area: string, owner: string, stage: OppStage, label: string, createdAgo: number) => {
    const o: Opp = { id: `OP-${sh.seq++}`, title, kind, accountId, placeName: place, area, owner, stage, createdAt: now - createdAgo * DAY, source: { type: "nba", label }, log: [{ t: now - createdAgo * DAY, by: NAMES[owner] ?? owner, text: `Opportunity created from ${label}` }] };
    sh.opps.push(o); return o;
  };
  const task = (o: Opp, forUser: string, by: string, title: string, kind: TaskKind, dueDays: number, ageH = 0, detail?: string) => { sh.tasks.push({ id: `TK-${sh.seq++}`, oppId: o.id, title, detail, by, forUser, kind, due: now + dueDays * DAY, done: false, createdAt: now - ageH * HOUR, source: "workflow" }); };
  const acc = (id: string) => sh.accounts.find((a) => a.id === id)!;
  sh.tenders.forEach((t) => {
    const o = mk(t.name, t.line === "ni" ? "newbuild" : t.line === "sc" ? "renewal" : "modernisation", t.accountId, acc(t.accountId).name, t.area, t.owner, t.stage === "matched" ? (t.line === "ni" ? "contact" : "qualify") : "bid", `tender ${t.id}`, 12);
    t.oppId = o.id; o.tenderId = t.id; o.value = t.value; o.contact = { name: acc(t.accountId).contact.name, role: acc(t.accountId).contact.role, email: acc(t.accountId).contact.email, via: "the account record" }; o.visited = t.stage !== "matched";
    if (t.stage === "matched" && t.line === "ni") task(o, t.owner, "projectfinder", `Call ${acc(t.accountId).contact.name} about ${t.id}`, "contact", 2, 20, `${t.summary} Record what the customer wants: quote, formal tender, call back later or not interested.`);
    else if (t.stage === "matched") task(o, t.owner, "projectfinder", `Qualify ${t.id}: tender or direct quote?`, "qualify", 2, 20, t.summary);
    else task(o, MANAGER, "projectfinder", `Create the bid for ${t.id}`, "bid", Math.max(2, Math.round((t.eord - now) / DAY) - 5), 30, `Bid due ${Math.round((t.eord - now) / DAY)} days from now. Lift details and past prices are ready in the bid builder.`);
  });
  sh.offers.forEach((of) => {
    const t = sh.tenders.find((x) => x.accountId === of.accountId && of.product === "newinstall");
    if (t?.oppId) { of.oppId = t.oppId; const o = sh.opps.find((x) => x.id === t.oppId)!; o.offerId = of.id; if (of.missing?.length) task(o, SUPPORT, of.createdBy, `Complete the configuration for ${of.id}`, "config", 1, 40, `Missing: ${of.missing.join(", ")}`); return; }
    const kind: Opp["kind"] = of.product === "modernisation" ? "modernisation" : of.product === "renewal" ? "renewal" : "existing";
    const o = mk(`${of.title}: ${acc(of.accountId).name}`, kind, of.accountId, acc(of.accountId).name, of.area, of.createdBy, of.status === "sent" ? "sent" : "offer", `offer ${of.id}`, 20);
    of.oppId = o.id; o.offerId = of.id; o.value = of.price; o.visited = true; o.contact = { name: acc(of.accountId).contact.name, role: acc(of.accountId).contact.role, email: acc(of.accountId).contact.email, via: "the account record" };
    if (of.status === "sent" && of.sentAt) task(o, of.createdBy, of.createdBy, `Follow up with ${acc(of.accountId).name} on ${of.id}`, "followup", Math.round((of.sentAt + 14 * DAY - now) / DAY), 0);
    if (of.status === "awaiting") of.approvals.filter((x) => x.status === "pending").forEach((x) => task(o, x.by, of.createdBy, `Approve ${of.discountPct}% on ${of.id} for ${acc(of.accountId).name}`, "approve", -0.5, 60, `${of.title}, ${inr(of.price)}. Guideline is ${GUIDE.seller}%.`));
  });
  void st;
}

/* ------------------------------------------------------------------ helpers */
export function ping(s: State, userId: string, text: string, offerId?: string, reportId?: string) {
  const a: Alert = { id: `al${Date.now()}${Math.floor(Math.random() * 1e5)}`, userId, t: nowS(s), text, offerId, reportId, read: false };
  s.alerts.unshift(a);
}
const log = (s: State, o: Offer, by: string, text: string) => { o.log.push({ t: nowS(s), by: NAMES[by] ?? by, text }); o.lastActivity = nowS(s); };
const crm = (s: State, by: string, text: string) => { s.sherpa.crm.unshift({ t: nowS(s), by: NAMES[by] ?? by, text }); };
export const accountOf = (s: State, id?: string) => s.sherpa.accounts.find((a) => a.id === id);
export const assetOf = (s: State, id?: string) => s.sherpa.assets.find((a) => a.id === id);
export const offerOf = (s: State, id?: string) => s.sherpa.offers.find((o) => o.id === id);
export const tenderOf = (s: State, id?: string) => s.sherpa.tenders.find((t) => t.id === id);
export const daysTo = (s: State, t: number) => Math.round((t - nowS(s)) / DAY);

/** An account for a Snap & Lead place that is not in the mock CRM yet. */
/** The customer record for an opportunity. A new building site has none until it is won, so it is made here. */
export function accountForOpp(s: State, o: Opp): Account | undefined {
  const found = accountOf(s, o.accountId) ?? s.sherpa.accounts.find((a) => a.name === o.placeName);
  if (found) { o.accountId = found.id; return found; }
  const r = s.reports.find((x) => x.id === o.source.reportId); if (!r) return;
  const acc = ensureAccount(s, r, o.owner); o.accountId = acc.id; return acc;
}
export function ensureAccount(s: State, r: Report, owner: string): Account {
  const found = s.sherpa.accounts.find((a) => a.placeIds.includes(r.placeId));
  if (found) return found;
  const a: Account = { id: `acc-${r.placeId}-${s.sherpa.seq++}`, name: r.placeName, area: r.area, placeIds: [r.placeId], owner, lastActivity: nowS(s), lines: { ni: false, ei: false, sc: false, mod: false }, contact: { name: r.extras.contact?.split("·")[0]?.trim() || "Building contact", role: "To be confirmed", email: "contact@customer.example" } };
  s.sherpa.accounts.push(a);
  return a;
}

/* ------------------------------------------------------------------ effects: what a chip does when pressed */
export type Effect =
  | { t: "task"; title: string; days: number; accountId?: string; to?: string; nba?: string }
  | { t: "note"; text: string; nba?: string }
  | { t: "tenderStage"; id: string; stage: Tender["stage"]; nba?: string }
  | { t: "tenderQualify"; id: string; nba?: string }
  | { t: "tenderDrop"; id: string; nba?: string }
  | { t: "offerFix"; id: string; nba?: string }
  | { t: "offerContract"; id: string; nba?: string }
  | { t: "escalate"; id: string; nba?: string }
  | { t: "obr"; assetId: string; nba?: string }
  | { t: "alertOwners"; assetId: string; nba?: string }
  | { t: "customerAlert"; assetId: string; nba?: string }
  | { t: "handover"; accountId: string; to: string; line: "ni" | "ei" | "sc" | "mod"; nba?: string }
  | { t: "campaign"; name: string; segment: string; area: string; size: number; subject: string; body: string; nba?: string }
  | { t: "assign"; mleadId: string; to: string; nba?: string }
  | { t: "nudgeLeads"; nba?: string }
  | { t: "ack"; nba?: string };

/* ------------------------------------------------------------------ offer actions */
export const SH = {
  makeOffer(s: State, p: { id?: string; accountId: string; assetId?: string; area: string; product: ProductKey; term: number; discountPct: number; by: string; fromNba?: string; source?: Offer["source"]; oppId?: string }): Offer {
    const lp = listPrice(p.area, p.product, p.term);
    const num = p.id ? Number(p.id.slice(3)) : s.sherpa.seq; s.sherpa.seq = Math.max(s.sherpa.seq, num + 1);
    const o: Offer = { id: p.id ?? `OF-${num}`, accountId: p.accountId, assetId: p.assetId, area: p.area, product: p.product, title: PRODUCT[p.product].label, term: p.term, listPrice: lp, price: Math.round(lp * (1 - p.discountPct / 100)), discountPct: p.discountPct, status: "draft", createdBy: p.by, createdAt: nowS(s), lastActivity: nowS(s), approvals: [], fromNba: p.fromNba, source: p.source, log: [] };
    log(s, o, p.by, "Draft created by SHERPA from the account data and the region price reference");
    s.sherpa.offers.unshift(o);
    let opp = oppOf(s, p.oppId) ?? (p.source ? s.sherpa.opps.find((x) => x.source.itemId === p.source!.itemId) : undefined);
    if (!opp) {
      const acc = accountOf(s, p.accountId); const kind: Opp["kind"] = p.product === "modernisation" ? "modernisation" : p.product === "renewal" ? "renewal" : p.product === "newinstall" ? "newbuild" : "existing";
      opp = OP.create(s, { title: PRODUCT[p.product].label, kind, accountId: p.accountId, placeName: acc?.name ?? "Customer", area: p.area, owner: p.by, source: { type: "nba", label: p.fromNba ? `next best action ${p.fromNba.split(":")[0]}` : "Ask SHERPA" }, stage: "offer", contact: acc ? { name: acc.contact.name, role: acc.contact.role, email: acc.contact.email, via: "the account record" } : undefined });
    }
    o.oppId = opp.id; opp.offerId = o.id; opp.value = o.price; if (opp.stage === "new" || opp.stage === "contact" || opp.stage === "visit" || opp.stage === "qualify") opp.stage = "offer";
    return o;
  },
  setTerms(s: State, id: string, by: string, t: { term?: number; discountPct?: number }) {
    const o = offerOf(s, id); if (!o || !["draft", "changes"].includes(o.status)) return;
    if (t.term !== undefined) o.term = t.term;
    if (t.discountPct !== undefined) o.discountPct = Math.max(0, Math.min(40, Math.round(t.discountPct)));
    o.listPrice = Math.round(listPrice(o.area, o.product, o.term) * briefFactor(o.brief)); o.price = Math.round(o.listPrice * (1 - o.discountPct / 100));
    o.email = undefined; o.approvals = [];
    log(s, o, by, `Terms changed: ${PRODUCT[o.product].yearly ? `${o.term} year${o.term > 1 ? "s" : ""}, ` : ""}${o.discountPct}% off`);
  },
  submit(s: State, id: string, by: string) {
    const o = offerOf(s, id); if (!o || !["draft", "changes"].includes(o.status)) return;
    if (o.missing?.length) { log(s, o, by, "Cannot be sent yet: configuration data is missing"); return; }
    if (aboveLimit(o.discountPct)) { log(s, o, by, `Blocked: ${o.discountPct}% is above the ${GUIDE.manager}% a manager can approve`); OP.onOffer(s, o, "blocked"); return; }
    const need = approversFor(o.discountPct, s.cfg);
    if (!need.length) { o.status = "approved"; o.approvals = []; log(s, o, by, `Within guideline (${o.discountPct}% is up to ${GUIDE.seller}%): no approval needed`); OP.onOffer(s, o, "approved"); return; }
    o.approvals = need.map((u) => ({ by: u, status: "pending" as const }));
    o.status = "awaiting";
    log(s, o, by, `Sent for approval to ${need.map((u) => NAMES[u] ?? u).join(" then ")}: ${o.discountPct > GUIDE.seller ? `${o.discountPct}% is above the ${GUIDE.seller}% guideline` : "every quotation is approved by the Sales Manager"}`);
    OP.onOffer(s, o, "submitted");
  },
  decide(s: State, id: string, by: string, d: "approved" | "changes" | "rejected", reason: string, discountPct?: number) {
    const o = offerOf(s, id); if (!o || o.status !== "awaiting") return;
    const step = o.approvals.find((x) => x.status === "pending" && x.by === by); if (!step) return;
    if (d === "approved" && discountPct !== undefined && discountPct !== o.discountPct && discountPct <= GUIDE.manager) {
      log(s, o, by, `Discount changed from ${o.discountPct}% to ${discountPct}% by ${NAMES[by] ?? by}`);
      o.discountPct = discountPct; o.price = Math.round(o.listPrice * (1 - discountPct / 100));
      const op = oppOf(s, o.oppId); if (op) op.value = o.price;
    }
    step.status = d; step.reason = reason; step.at = nowS(s);
    const who = NAMES[by] ?? by;
    if (d === "approved") {
      log(s, o, by, `Approved${reason ? `: ${reason}` : ""}`);
      const next = o.approvals.find((x) => x.status === "pending");
      if (next) ping(s, next.by, `Approval needed: ${o.title} for ${accountOf(s, o.accountId)?.name} at ${o.discountPct}% off (above ${GUIDE.manager}%)`, o.id);
      else { o.status = "approved"; ping(s, o.createdBy, `${o.id} approved by ${who}. You can send it now.`, o.id); OP.onOffer(s, o, "approved"); }
    } else if (d === "changes") { o.status = "changes"; log(s, o, by, `Asked for changes: ${reason}`); ping(s, o.createdBy, `${who} asked for changes on ${o.id}: ${reason}`, o.id); OP.onOffer(s, o, "changes", reason); }
    else { o.status = "rejected"; log(s, o, by, `Rejected: ${reason}`); ping(s, o.createdBy, `${who} rejected ${o.id}: ${reason}`, o.id); OP.onOffer(s, o, "rejected", reason); }
  },
  send(s: State, id: string, by: string, email: { subject: string; body: string }) {
    const o = offerOf(s, id); if (!o || o.status !== "approved") return;
    o.email = email; o.status = "sent"; o.sentAt = nowS(s); o.attachment = `${o.id}-${o.product === "newinstall" || o.product === "modernisation" ? "quotation" : "offer"}.pdf`;
    o.chat = [{ from: "us", by: NAMES[by] ?? by, t: nowS(s), text: email.subject, file: o.attachment }];
    log(s, o, by, `Email sent to the customer with ${o.attachment}. Follow-up set for 14 days`);
    const a = accountOf(s, o.accountId); if (a) a.lastActivity = nowS(s);
    if (o.fromNba) s.sherpa.nba[o.fromNba] = { status: "done", at: nowS(s) };
    crm(s, by, `Quote ${o.id} logged on the account with the email attached`);
    OP.onOffer(s, o, "sent");
  },
  /** A message to the customer. The mock customer answers straight away. */
  chat(s: State, id: string, by: string, text: string) {
    const o = offerOf(s, id); if (!o || !text.trim()) return;
    const msgs = (o.chat ??= []); const acc = accountOf(s, o.accountId);
    msgs.push({ from: "us", by: NAMES[by] ?? by, t: nowS(s), text: text.trim() });
    const n = msgs.filter((m) => m.from === "customer").length;
    const reply = /discount|price|cost|cheaper/i.test(text) && n < 2 ? "We have one more quote that is a little lower. Can you do anything on the price?" : (PRODUCT[o.product].yearly ? SERVICE_LINES : CUSTOMER_LINES)[Math.min(n, CUSTOMER_LINES.length - 1)];
    const m: ChatMsg = { from: "customer", by: acc?.contact.name ?? "Customer", t: nowS(s) + 60000, text: reply };
    msgs.push(m); log(s, o, by, "Message to the customer. The customer replied"); if (acc) acc.lastActivity = nowS(s);
  },
  remind(s: State, id: string, by: string) {
    const o = offerOf(s, id); if (!o || o.status !== "awaiting") return;
    o.approvals.filter((x) => x.status === "pending").forEach((x) => { ping(s, x.by, `Reminder: ${o.id} for ${accountOf(s, o.accountId)?.name} at ${o.discountPct}% off is waiting for you`, o.id); log(s, o, by, `Reminded ${NAMES[x.by] ?? x.by}`); });
  },
  chase(s: State, id: string, by: string) {
    const o = offerOf(s, id); if (!o || o.status !== "sent") return;
    log(s, o, by, "Follow-up sent to the customer"); const a = accountOf(s, o.accountId); if (a) a.lastActivity = nowS(s);
    OP.onOffer(s, o, "chased");
  },
  outcome(s: State, id: string, by: string, r: "won" | "lost", reason?: string) {
    const o = offerOf(s, id); if (!o || o.status !== "sent") return;
    o.status = r; log(s, o, by, r === "won" ? "Customer accepted. Won" : `Customer declined${reason ? `: ${reason}` : ""}. Lost`);
    s.sherpa.past.push({ id: `p${s.sherpa.seq++}`, area: o.area, product: o.product, price: perYear(o), discountPct: o.discountPct, outcome: r, at: nowS(s), customer: accountOf(s, o.accountId)?.name ?? "Customer" });
    const a = accountOf(s, o.accountId); if (a) a.lastActivity = nowS(s);
    crm(s, by, `Opportunity ${o.id} closed ${r === "won" ? "won" : "lost"}`);
    OP.onOffer(s, o, r, reason);
  },
  setNba(s: State, key: string, status: "snoozed" | "dismissed" | "done", days = 1) {
    s.sherpa.nba[key] = { status, at: nowS(s), until: status === "snoozed" ? nowS(s) + days * DAY : undefined };
  },
  /** Run a chip's effect against the mock CRM. Always writes a line to the CRM log so the back office can see it. */
  apply(s: State, by: string, e: Effect) {
    const sh = s.sherpa; const now = nowS(s); const who = NAMES[by] ?? by;
    switch (e.t) {
      case "task": { const t: Task = { id: `TK-${sh.seq++}`, title: e.title, by, forUser: e.to ?? by, accountId: e.accountId, kind: "other", due: now + e.days * DAY, done: false, createdAt: now, source: e.nba ?? "chat" }; sh.tasks.unshift(t); crm(s, by, `Task created: ${e.title}`); if (e.to && e.to !== by) ping(s, e.to, `${who} assigned you a task: ${e.title}`); break; }
      case "note": crm(s, by, e.text); break;
      case "tenderStage": { const t = tenderOf(s, e.id); if (t) { t.stage = e.stage; crm(s, by, `Tender ${t.id} moved to ${e.stage === "final" ? "final bidding" : e.stage}`); } break; }
      case "tenderQualify": { const t = tenderOf(s, e.id); if (t) { t.stage = "qualifying"; const a = accountOf(s, t.accountId); if (a) a.lastActivity = now; crm(s, by, `Tender ${t.id} qualified as a lead and assigned to ${NAMES[t.owner]}`); } break; }
      case "tenderDrop": { const t = tenderOf(s, e.id); if (t) { t.stage = "lost"; crm(s, by, `Tender ${t.id} dismissed: not a fit`); } break; }
      case "offerFix": { const o = offerOf(s, e.id); if (o) { o.missing = undefined; log(s, o, by, "Configuration completed by Sales support: rated load 1,350 kg, 34 floors, centre-opening doors"); closeTasks(s, o.oppId, ["config"]); const op = oppOf(s, o.oppId); if (op) { olog(s, op, by, "Configuration completed by Sales support"); addTask(s, { oppId: op.id, forUser: o.createdBy, by, title: `Price and submit ${o.id} for approval`, detail: "The configuration is complete. Set the discount and send it for approval.", days: 2, kind: "revise" }); } ping(s, o.createdBy, `${who} completed the configuration for ${o.id}. You can send it for approval.`, o.id); crm(s, by, `Quote ${o.id} completed with configuration data`); } break; }
      case "offerContract": { const o = offerOf(s, e.id); if (o) { o.contractChange = undefined; o.listPrice = Math.round(o.listPrice * 1.08); o.price = Math.round(o.listPrice * (1 - o.discountPct / 100)); log(s, o, by, "Offer updated for the amended contract: price raised 8% for 24x7 cover and a 2-hour response"); crm(s, by, `Offer ${o.id} updated for the amended contract`); } break; }
      case "escalate": { const o = offerOf(s, e.id); if (o) { o.approvals.filter((x) => x.status === "pending").forEach((x) => ping(s, x.by, `Escalation from Sales support: ${o.id} (${accountOf(s, o.accountId)?.name}, ${inr(o.price)}) has waited ${Math.round((now - o.lastActivity) / HOUR)} hours and is blocking the deal`, o.id)); log(s, o, by, "Escalated to the approver with context by Sales support"); crm(s, by, `Approval escalation sent on ${o.id}`); } break; }
      case "obr": { const a = assetOf(s, e.assetId); if (a) { a.contractChangedAfterObr = false; crm(s, by, `Corrected OBR for ${a.label.split(" · ")[0]} sent to the back office`); } break; }
      case "alertOwners": { const a = assetOf(s, e.assetId); if (a) { [a.owner, a.mod].filter(Boolean).forEach((u) => ping(s, u!, `Joint EI and MOD plan for ${a.label.split(" · ")[0]}: ${who} proposes a bundled offer`)); crm(s, by, `EI and MOD owners alerted for ${a.label.split(" · ")[0]}`); } break; }
      case "customerAlert": { const a = assetOf(s, e.assetId); if (a) { crm(s, by, `Customer alerted about obsolete parts on ${a.label.split(" · ")[0]}`); const acc = accountOf(s, a.accountId); if (acc) acc.lastActivity = now; } break; }
      case "handover": { const acc = accountOf(s, e.accountId); if (acc) { acc.lines[e.line] = true; sh.tasks.unshift({ id: `TK-${sh.seq++}`, title: `Handover pack: pursue ${e.line.toUpperCase()} at ${acc.name}`, by, forUser: e.to, accountId: acc.id, kind: "handover", due: now + 7 * DAY, done: false, createdAt: now, source: e.nba ?? "handover" }); ping(s, e.to, `${who} sent you a handover pack for ${acc.name} (${e.line.toUpperCase()})`); crm(s, by, `Handover pack sent to ${NAMES[e.to]} for ${acc.name}`); } break; }
      case "campaign": { sh.campaigns.unshift({ id: `C-${sh.seq++}`, name: e.name, segment: e.segment, area: e.area, size: e.size, status: "live", createdBy: by, createdAt: now, message: { subject: e.subject, body: e.body }, leads: 0 }); crm(s, by, `Campaign created: ${e.name} (${e.size} contacts)`); break; }
      case "assign": { const l = sh.mleads.find((x) => x.id === e.mleadId); if (l) { l.owner = e.to; l.status = "working"; crm(s, by, `Lead ${l.id} assigned to ${NAMES[e.to]}`); const o = OP.create(s, { title: l.interest, kind: "existing", placeName: l.name, area: l.area, owner: e.to, source: { type: "campaign", label: `campaign lead ${l.id} (${l.source})` } }); addTask(s, { oppId: o.id, forUser: e.to, by, title: `Accept: ${l.name} (${l.interest})`, detail: `${l.source}. Score ${l.score}.`, days: 1, kind: "accept", source: "N27" }); } break; }
      case "nudgeLeads": { sh.mleads.filter((l) => l.status === "new" && now - l.createdAt > 48 * HOUR).forEach((l) => { if (l.owner) ping(s, l.owner, `Lead ${l.id} (${l.name}) has waited over 48 hours. Please follow up.`); }); crm(s, by, "Owners nudged for leads waiting over 48 hours"); break; }
      case "ack": break;
    }
    if (e.nba) sh.nba[e.nba] = { status: "done", at: now };
  },
};

/* ------------------------------------------------------------------ generated text */
export function emailFor(s: State, o: Offer, seller: string): { subject: string; body: string } {
  const a = accountOf(s, o.accountId); const asset = assetOf(s, o.assetId);
  const first = (oppOf(s, o.oppId)?.contact ?? a?.contact)?.name.split(" ")[0] ?? "there";
  const what = asset ? asset.label.split(" · ")[0] + (asset.label.split(" · ")[1] ? ` at ${asset.label.split(" · ")[1]}` : "") : (a?.name ?? "your building");
  const tn = s.sherpa.tenders.find((t) => t.oppId === o.oppId && t.bid);
  if (tn) {
    const body = `Dear ${first} garu,

Please find our bid for ${tn.name}.

- Lifts: ${tn.lifts}
- Bid price: ${inr(o.price)}${o.discountPct ? `, including ${o.discountPct}% off the list price` : ""}. GST extra as applicable.
- Papers attached: ${BID_PAPERS.map((p) => p.title.toLowerCase()).join(", ")}.

Please tell me if you need anything else before the last date. I will call you to check that you received it.

Best regards,
${seller}`;
    return { subject: `Our bid for ${tn.name}`, body };
  }
  const yearly = PRODUCT[o.product].yearly;
  const price = yearly ? `${inr(o.price / o.term)} per year (${inr(o.price)} over ${o.term} year${o.term > 1 ? "s" : ""})` : inr(o.price);
  const body = `Dear ${first} garu,\n\nThank you for your time. Following our conversation about ${what}, here is our proposal: ${o.title.toLowerCase()}${yearly ? `, ${o.term} year${o.term > 1 ? "s" : ""}` : ""}.\n\nPrice: ${price}${o.discountPct ? `, including ${o.discountPct}% off the list price` : ""}. GST extra as applicable.\n\nI will call you in two weeks to answer any questions. If it helps, I can come by and walk through it on site.\n\nBest regards,\n${seller}`;
  return { subject: `${o.title} for ${what}`, body };
}
export function chaseEmail(s: State, o: Offer, seller: string) {
  const a = accountOf(s, o.accountId); const first = a?.contact.name.split(" ")[0] ?? "there";
  return { subject: `Following up: ${o.title}`, body: `Dear ${first} garu,\n\nI wanted to follow up on the ${o.title.toLowerCase()} we sent on ${new Date(o.sentAt ?? o.createdAt).toLocaleDateString("en-IN")}. Is there anything I can clarify, or a decision I can help you prepare?\n\nIf timing is the issue, I am happy to adjust the start date.\n\nBest regards,\n${seller}` };
}

/* ------------------------------------------------------------------ the 27 next best actions */
export interface NbaCard {
  key: string; no: number; title: string; why: string; sources: string[]; urgency: "high" | "med" | "low"; value?: number; agent: string; cta: string;
  prompt: string; accountId?: string; assetId?: string; offerId?: string; reportId?: string; itemId?: string; tenderId?: string; mleadId?: string; segment?: string;
  kind: "offer" | "brief" | "email" | "approval" | "review" | "lead" | "team" | "doc";
}
export const CATALOG: { no: number; title: string; persona: string; status: "live" | "coming" | "off"; trigger: string; agent: string }[] = ([
  [1, "Recent callback on assets", "REP, SC, MOD", "A callback on a unit in the last 14 days", "Sales Assistant, CRM Agent"],
  [2, "Contract changed after OBR", "REP", "Contract amended after an open OBR", "CRM Agent"],
  [3, "Contract cancelled or ending", "REP, SC, MOD", "Contract ends within 60 days", "CRM Agent, Churn Prediction"],
  [4, "High OBR with open MOD offer", "MOD", "5+ OBR in 90 days and an open MOD offer on the unit", "Price Pilot, MOD Propensity Scoring"],
  [5, "MOD on the same asset", "REP", "An open MOD offer exists on a unit the REP owns", "CRM Agent"],
  [6, "SC contract changes in offer", "SC", "Contract terms changed while an offer is open", "Contract Risk Reviewer"],
  [7, "Renewal at risk", "REP, SC", "Health below 45 and the contract ends within 90 days", "Customer Health Score, Churn Prediction"],
  [8, "Rising callbacks", "REP", "Callbacks up 40% on the 90 days before", "Customer Health Score, Sales Assistant"],
  [9, "Competitor-serviced units", "REP", "Snap & Lead found a lift serviced by another company", "Snap & Lead, CRM Agent"],
  [10, "Repair need in tech notes", "REP", "A technician note mentions a repair or part", "Repair Lead Generation"],
  [11, "Ageing units, frequent faults", "MOD", "25+ years old and 4+ faults in 90 days", "MOD Propensity Scoring, Price Pilot"],
  [12, "Obsolete parts or code change", "MOD", "A part on the unit is discontinued", "MOD Propensity Scoring"],
  [13, "EORD near, not final bidding", "NI, MOD, SC", "End of order date within 14 days, stage not final", "Tender Insight, CRM Agent"],
  [14, "Loss history with account", "NI", "We lost a bid at this account before", "Sales Assistant"],
  [15, "Matched tender or permit", "NI", "A new tender or permit matches the territory", "Project Lead Finder, Tender Insight"],
  [16, "Quote idle 14+ days", "NI, REP, SC, MOD", "Quote sent, no activity for 14 days", "Proposal Generator, CRM Agent"],
  [17, "Competitor spec in tender", "NI", "The tender names a competitor spec", "Tender Insight"],
  [18, "Stalled deals in pipeline", "Sales manager", "3+ deals with no movement for 21 days", "CRM Agent"],
  [19, "Discount above guideline", "Sales manager", "A quote's discount is above the guideline", "Price Pilot"],
  [20, "Coaching need on win rate", "Sales manager", "Team win-rate drivers. Off until works-council review", "CRM Agent"],
  [21, "Quote missing data", "Sales support", "A quote is missing configuration data", "Configuration Assistant"],
  [22, "Approval blocking a deal", "Sales support", "An approval waits more than 48 hours", "CRM Agent"],
  [23, "New unit handed over", "REP, Account manager", "New unit with no maintenance contract", "Conversion Alerts"],
  [24, "Key account silent too long", "Account manager", "No activity for 60 days", "CRM Agent, Customer Health Score"],
  [25, "Cross-sell NI, Service, MOD", "Account manager", "Active in one line, not in the others", "Handover Pack Generator, Conversion Alerts"],
  [26, "Ageing-portfolio cluster", "Marketing", "3+ units over 20 years in one area", "Customer Segmentation, Personalized Outreach"],
  [27, "Leads not followed up 48h", "Sales manager, Marketing", "Leads without action for 48 hours", "CRM Agent"],
] as [number, string, string, string, string][]).map(([no, title, persona, trigger, agent]) => ({ no, title, persona, trigger, agent, status: (no === 20 ? "off" : "live") as "live" | "off" }));

export const AGENTS: { name: string; group: string; status: "live" | "hold" | "new"; does: string; serves: string }[] = [
  { name: "Snap & Lead", group: "Opportunity", status: "live", does: "Reads lift photos and creates the right lead", serves: "REP, all employees" },
  { name: "Project Lead Finder", group: "Opportunity", status: "new", does: "Matches tenders and permits to the territory", serves: "NI" },
  { name: "MOD Propensity Scoring", group: "Opportunity", status: "new", does: "Ranks ageing, fault-prone units for modernisation", serves: "MOD" },
  { name: "Tender Insight", group: "Commercial", status: "live", does: "Summarises tenders, checks the EORD and competitor specs", serves: "NI, MOD, SC" },
  { name: "Price Pilot", group: "Commercial", status: "live", does: "Checks price and discount against the guideline and the area", serves: "All sellers, manager" },
  { name: "Configuration Assistant", group: "Commercial", status: "new", does: "Completes lift configurations and flags missing data", serves: "Sales support" },
  { name: "Proposal Generator", group: "Commercial", status: "new", does: "Drafts offers and follow-up emails", serves: "NI, REP, SC" },
  { name: "Contract Risk Reviewer", group: "Commercial", status: "new", does: "Explains contract changes and their price effect", serves: "SC" },
  { name: "Sales Assistant", group: "Engagement", status: "live", does: "Briefs sellers before visits and calls", serves: "All sellers" },
  { name: "Customer Segmentation", group: "Engagement", status: "live", does: "Builds audiences from the installed base", serves: "Marketing" },
  { name: "Personalized Outreach", group: "Engagement", status: "new", does: "Drafts campaign messages per segment", serves: "Marketing" },
  { name: "CRM Agent", group: "Retention and handover", status: "live", does: "Reads and writes NewCRM: pipeline, tasks, approvals", serves: "All personas" },
  { name: "Customer Health Score", group: "Retention and handover", status: "new", does: "Scores account and unit health", serves: "REP, SC, Account manager" },
  { name: "Conversion Alerts", group: "Retention and handover", status: "new", does: "Flags new units that need a contract", serves: "REP, Account manager" },
  { name: "Handover Pack Generator", group: "Retention and handover", status: "new", does: "Builds the pack when a lead moves to the next line", serves: "Account manager" },
  { name: "Churn Prediction", group: "Retention and handover", status: "hold", does: "Predicts which contracts will not renew", serves: "REP, SC" },
  { name: "Repair Lead Generation", group: "Retention and handover", status: "hold", does: "Turns technician notes into repair quotes", serves: "REP" },
];

const URG = { high: 0, med: 1, low: 2 } as const;
export function computeNbas(s: State, u: User): NbaCard[] {
  const now = nowS(s); const out: NbaCard[] = []; const sh = s.sherpa;
  if (!sh || !sh.tenders) return out;
  const hidden = (key: string) => { const st = sh.nba[key]; return !!st && (st.status !== "snoozed" || (st.until ?? 0) > now); };
  const add = (c: Omit<NbaCard, "kind"> & { kind?: NbaCard["kind"] }) => { if (!hidden(c.key)) out.push({ kind: "doc", ...c }); };
  const days = (t: number) => Math.round((t - now) / DAY);
  const openOffer = (assetId: string) => sh.offers.some((o) => o.assetId === assetId && ["draft", "awaiting", "changes", "approved", "sent"].includes(o.status));
  const name = (accId?: string) => accountOf(s, accId)?.name ?? "the customer";
  const unit = (a: Asset) => a.label.split(" · ")[0];
  const role = u.role;
  const mine = (a: Asset) => (role === "ei" ? a.owner === u.id : role === "sc" ? a.sc === u.id : role === "mod" ? a.mod === u.id : false);
  const modOpen = (a: Asset) => sh.offers.some((o) => o.assetId === a.id && o.product === "modernisation" && ["draft", "awaiting", "approved", "sent"].includes(o.status));

  /* ---- unit-based actions for EI/REP, SC and MOD ---- */
  if (role === "ei" || role === "sc" || role === "mod") {
    sh.assets.filter(mine).forEach((a) => {
      const left = a.contractEnd ? days(a.contractEnd) : undefined; const nm = name(a.accountId);
      const ending = left !== undefined && left <= 60 && left >= -30;
      const risk = !ending && a.health < 45 && left !== undefined && left <= 90;
      if (ending && !openOffer(a.id)) add({ key: `N3:${a.id}:${role}`, no: 3, title: `Contract ends in ${left} days: ${nm}`, why: `${unit(a)} is under contract until ${new Date(a.contractEnd!).toLocaleDateString("en-IN")}. ${a.callbacks14d ? `${a.callbacks14d} callbacks in the last 14 days. ` : ""}Renew before the customer asks others.`, sources: ["NewCRM contract", "SAP service history"], urgency: left <= 45 ? "high" : "med", value: (a.contractValue ?? 0) * 3, agent: "CRM Agent · Churn Prediction", cta: "Draft the renewal", prompt: `Draft the renewal for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id, kind: "offer" });
      if (risk && !openOffer(a.id)) add({ key: `N7:${a.id}:${role}`, no: 7, title: `Renewal at risk: ${nm}`, why: `Health score ${a.health} of 100. Callbacks ${a.callbacks90d} in 90 days (${a.callbacksPrev90d} before). Contract ends in ${left} days. Act early.`, sources: ["Customer Health Score", "NewCRM contract", "SAP service history"], urgency: "high", value: (a.contractValue ?? 0) * 3, agent: "Customer Health Score · Churn Prediction", cta: "Plan the renewal", prompt: `Plan the renewal for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (a.callbacks14d >= 1 && !ending && !risk) add({ key: `N1:${a.id}:${role}`, no: 1, title: `Recent callback: ${nm}`, why: `${a.callbacks14d} callback${a.callbacks14d > 1 ? "s" : ""} on ${unit(a)} in the last 14 days. A short call now builds trust.`, sources: ["SAP service callbacks"], urgency: "low", agent: "Sales Assistant · CRM Agent", cta: "Brief me", prompt: `Brief me on lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (a.callbacksPrev90d > 0 && a.callbacks90d / a.callbacksPrev90d >= 1.4 && a.callbacks90d >= 6 && !ending && !risk && role === "ei") add({ key: `N8:${a.id}`, no: 8, title: `Rising callbacks: ${nm}`, why: `${a.callbacks90d} callbacks in 90 days against ${a.callbacksPrev90d} before (up ${Math.round((a.callbacks90d / a.callbacksPrev90d - 1) * 100)}%) on ${unit(a)}. A retention visit now is cheaper than a lost contract.`, sources: ["SAP service callbacks", "Customer Health Score"], urgency: "med", value: (a.contractValue ?? 0) * 3, agent: "Customer Health Score · Sales Assistant", cta: "Prepare the visit", prompt: `Prepare the retention visit for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (a.contractChangedAfterObr && role === "ei") add({ key: `N2:${a.id}`, no: 2, title: `Contract changed after the OBR: ${nm}`, why: `The contract for ${unit(a)} was amended after the open OBR was raised. The back office needs a corrected OBR.`, sources: ["NewCRM contract history", "OBR"], urgency: "med", agent: "CRM Agent", cta: "Prepare the corrected OBR", prompt: `Correct the OBR for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (a.techNote && role === "ei") add({ key: `N10:${a.id}`, no: 10, title: `Repair need in a technician note: ${nm}`, why: `"${a.techNote.slice(0, 110)}…" This can become a repair quote today.`, sources: ["SAP service notes"], urgency: "med", value: 95000, agent: "Repair Lead Generation", cta: "Draft the repair quote", prompt: `Turn the notes for lift ${a.id.slice(1)} into a repair quote`, accountId: a.accountId, assetId: a.id });
      if (role === "ei" && modOpen(a)) add({ key: `N5:${a.id}`, no: 5, title: `Modernisation offer open on your unit: ${nm}`, why: `${unit(a)} has an open MOD offer. Align with ${NAMES[a.mod ?? "mia"]} so the customer sees one bundled plan.`, sources: ["NewCRM opportunities"], urgency: "med", agent: "CRM Agent", cta: "Align with MOD", prompt: `Align with MOD on lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (role === "mod" && (a.obr ?? 0) >= 5 && modOpen(a)) add({ key: `N4:${a.id}`, no: 4, title: `High OBR volume with an open MOD offer: ${nm}`, why: `${a.obr} OBRs in 90 days on ${unit(a)} while your modernisation offer is open. Use the service history as the argument and agree it with the EI rep.`, sources: ["OBR history", "NewCRM opportunities"], urgency: "high", value: 3200000, agent: "Price Pilot · MOD Propensity Scoring", cta: "Build the joint plan", prompt: `Build the joint EI and MOD plan for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (role === "mod" && a.ageYears >= 25 && a.faults90d >= 4) add({ key: `N11:${a.id}`, no: 11, title: `Ageing unit with frequent faults: ${nm}`, why: `${unit(a)} is ${a.ageYears} years old with ${a.faults90d} faults in 90 days. A modernisation case has a strong argument.`, sources: ["Installed base", "SAP service history", "MOD Propensity Scoring"], urgency: "high", value: 3200000, agent: "MOD Propensity Scoring · Price Pilot", cta: "Build the MOD case", prompt: `Build the MOD case for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
      if (role === "mod" && a.obsolete) add({ key: `N12:${a.id}`, no: 12, title: `Obsolete part: ${nm}`, why: a.obsolete, sources: ["Parts lifecycle list", "Installed base"], urgency: "med", value: 3200000, agent: "MOD Propensity Scoring", cta: "Alert the customer", prompt: `Alert the customer about the obsolete part on lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id });
    });
  }
  if (role === "ei") {
    sh.assets.filter((a) => a.owner === u.id && a.handedOver && !a.contractEnd && !openOffer(a.id)).forEach((a) => add({ key: `N23:${a.id}`, no: 23, title: `New unit handed over: ${name(a.accountId)}`, why: `${unit(a)} has no maintenance contract yet. Offer one while the building is being handed over.`, sources: ["Installed base", "Handover record"], urgency: "med", value: 125000 * 3, agent: "Conversion Alerts", cta: "Offer maintenance", prompt: `Draft a maintenance offer for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id, kind: "offer" }));
  }
  if (role === "am") {
    sh.assets.filter((a) => a.handedOver && !a.contractEnd && !openOffer(a.id)).forEach((a) => add({ key: `N23:${a.id}:am`, no: 23, title: `New unit handed over: ${name(a.accountId)}`, why: `${unit(a)} has no maintenance contract. The EI rep ${NAMES[a.owner]} owns it; check the offer is on its way.`, sources: ["Installed base", "Handover record"], urgency: "low", agent: "Conversion Alerts", cta: "Offer maintenance", prompt: `Draft a maintenance offer for lift ${a.id.slice(1)}`, accountId: a.accountId, assetId: a.id, kind: "offer" }));
    sh.accounts.filter((a) => a.key && now - a.lastActivity >= 60 * DAY).forEach((a) => add({ key: `N24:${a.id}`, no: 24, title: `Key account silent ${Math.floor((now - a.lastActivity) / DAY)} days: ${a.name}`, why: `No activity for ${Math.floor((now - a.lastActivity) / DAY)} days. ${sh.assets.filter((x) => x.accountId === a.id).length} units, ${sh.assets.filter((x) => x.accountId === a.id && x.health < 45).length} at risk. Review the whole account before a customer review.`, sources: ["NewCRM account", "Customer Health Score"], urgency: "high", agent: "CRM Agent · Customer Health Score", cta: "One view of the account", prompt: `One view of ${a.name}`, accountId: a.id }));
    sh.accounts.filter((a) => a.key && Object.values(a.lines).filter(Boolean).length === 1).forEach((a) => add({ key: `N25:${a.id}`, no: 25, title: `Cross-sell opportunity: ${a.name}`, why: `Active in ${Object.entries(a.lines).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ")} only. Service and modernisation are untouched. A handover pack gets the next line started.`, sources: ["NewCRM account", "Installed base"], urgency: "med", value: 125000 * 3, agent: "Handover Pack Generator · Conversion Alerts", cta: "Create the handover pack", prompt: `Create the handover pack for ${a.name}`, accountId: a.id }));
  }

  /* ---- tenders for NI, SC and MOD ---- */
  if (role === "ni" || role === "sc" || role === "mod") {
    sh.tenders.filter((t) => t.owner === u.id && !["submitted", "won", "lost"].includes(t.stage)).forEach((t) => {
      const left = days(t.eord);
      if (t.stage !== "final" && t.stage !== "matched" && left <= 14) add({ key: `N13:${t.id}`, no: 13, title: `End of order date in ${left} days: ${t.name}`, why: `Stage is "${t.stage}", not final bidding. ${t.checklist.filter((c) => !c.done).length} checklist items are still open.`, sources: ["Tender Insight", "NewCRM opportunity"], urgency: left <= 7 ? "high" : "med", value: t.value, agent: "Tender Insight · CRM Agent", cta: "Open the bid checklist", prompt: `Open the bid checklist for ${t.id}`, tenderId: t.id });
      if (role === "ni" && t.lossNote && t.stage !== "matched") add({ key: `N14:${t.id}`, no: 14, title: `We lost here before: ${name(t.accountId)}`, why: t.lossNote, sources: ["NewCRM loss history", "Sales Assistant"], urgency: "med", value: t.value, agent: "Sales Assistant", cta: "Why we lost", prompt: `Why did we lose at ${name(t.accountId)}?`, tenderId: t.id, accountId: t.accountId });
      if (role === "ni" && t.stage === "matched") add({ key: `N15:${t.id}`, no: 15, title: `Matched tender: ${t.name}`, why: `${t.summary} Found ${Math.abs(days(t.discovered))} days ago.`, sources: ["Project Lead Finder", "Building permits"], urgency: "high", value: t.value, agent: "Project Lead Finder · Tender Insight", cta: "Summarize and qualify", prompt: `Summarize ${t.id}`, tenderId: t.id });
      if (role === "ni" && t.competitorSpec && t.stage !== "matched") add({ key: `N17:${t.id}`, no: 17, title: `Competitor spec in the tender: ${name(t.accountId)}`, why: t.competitorSpec, sources: ["Tender Insight"], urgency: "med", value: t.value, agent: "Tender Insight", cta: "Prepare the counter-argument", prompt: `Prepare the counter-argument for ${t.id}`, tenderId: t.id });
    });
  }

  /* ---- my offers: approved, changes, idle, blocked ---- */
  if (["ei", "sc", "mod", "ni"].includes(role)) {
    sh.offers.filter((o) => o.createdBy === u.id).forEach((o) => {
      const acc = name(o.accountId);
      if (o.status === "sent" && o.sentAt && now - o.lastActivity >= 14 * DAY) add({ key: `N16:${o.id}`, no: 16, title: `Quote idle ${Math.floor((now - o.lastActivity) / DAY)} days: ${acc}`, why: `${o.id} (${inr(o.price)}) was sent and nothing has happened since. A short follow-up usually restarts it.`, sources: ["NewCRM quote", "Email log"], urgency: "med", value: o.price, agent: "Proposal Generator · CRM Agent", cta: "Draft follow-up", prompt: `Draft a follow-up email for ${o.id}`, offerId: o.id, kind: "email" });
      if (role === "sc" && o.contractChange && ["draft", "sent", "awaiting"].includes(o.status)) add({ key: `N6:${o.id}`, no: 6, title: `Contract changed while ${o.id} is open: ${acc}`, why: o.contractChange, sources: ["Contract Risk Reviewer", "NewCRM contract history"], urgency: "high", value: o.price, agent: "Contract Risk Reviewer", cta: "What changed?", prompt: `What changed in the contract for ${o.id}?`, offerId: o.id });
    });
  }

  /* ---- sales support ---- */
  if (role === "ss") {
    sh.offers.filter((o) => o.missing?.length).forEach((o) => add({ key: `N21:${o.id}`, no: 21, title: `Quote ${o.id} is missing data: ${name(o.accountId)}`, why: `Missing: ${o.missing!.join(", ")}. ${NAMES[o.createdBy]} cannot send it for approval until these are filled.`, sources: ["NewCRM quote", "Configuration Assistant"], urgency: "high", value: o.price, agent: "Configuration Assistant", cta: "Complete the configuration", prompt: `Complete the configuration for ${o.id}`, offerId: o.id }));
    sh.offers.filter((o) => o.status === "awaiting" && now - o.lastActivity > 48 * HOUR).forEach((o) => add({ key: `N22:${o.id}:ss`, no: 22, title: `Approval blocking a deal: ${name(o.accountId)}`, why: `${o.id} (${inr(o.price)}) has waited ${Math.round((now - o.lastActivity) / HOUR)} hours for ${o.approvals.filter((x) => x.status === "pending").map((x) => NAMES[x.by]).join(", ")}. Escalate with the context so it is a one-click decision.`, sources: ["Approval log", "Price Pilot"], urgency: "high", value: o.price, agent: "CRM Agent", cta: "Escalate with context", prompt: `Escalate ${o.id} with context`, offerId: o.id }));
  }

  /* ---- marketing ---- */
  if (role === "mkt") {
    const byArea: Record<string, Asset[]> = {};
    sh.assets.filter((a) => a.ageYears >= 20).forEach((a) => { (byArea[accountOf(s, a.accountId)?.area ?? "HYC"] ??= []).push(a); });
    Object.entries(byArea).filter(([area, l]) => l.length >= 3 && !sh.campaigns.some((c) => c.area === area && c.status === "live" && now - c.createdAt < 10 * DAY)).forEach(([area, l]) => add({ key: `N26:${area}`, no: 26, title: `Ageing-portfolio cluster in ${AREA_NAME[area]}`, why: `${l.length} lifts over 20 years old across ${new Set(l.map((x) => x.accountId)).size} customers, none with a campaign in the last 10 days. Ready for a targeted campaign.`, sources: ["Customer Segmentation", "Installed base"], urgency: "med", value: l.length * 3200000, agent: "Customer Segmentation · Personalized Outreach", cta: "Build the audience", prompt: `Build an audience for ${AREA_NAME[area]} ageing lifts`, segment: area }));
    const idle = sh.mleads.filter((l) => l.status === "new" && now - l.createdAt > 48 * HOUR);
    if (idle.length) add({ key: "N27M", no: 27, title: `${idle.length} lead${idle.length > 1 ? "s" : ""} not followed up in 48 hours`, why: `${idle.map((l) => l.name).join(", ")}. Nudge the owner or reassign so they do not go cold.`, sources: ["CRM Agent", "Campaign leads"], urgency: "high", agent: "CRM Agent", cta: "Chase these leads", prompt: "Which leads have not been followed up?", mleadId: idle[0].id });
  }

  /* ---- manager ---- */
  if (role === "mgr") {
    const stalled = sh.offers.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY);
    if (stalled.length >= 3) add({ key: "N18", no: 18, title: `${stalled.length} deals have stalled`, why: `No movement for 21+ days on ${stalled.map((o) => name(o.accountId)).join(", ")}. Worth ${inr(stalled.reduce((a, o) => a + o.price, 0))}.`, sources: ["NewCRM pipeline"], urgency: "high", value: stalled.reduce((a, o) => a + o.price, 0), agent: "CRM Agent", cta: "Show where to step in", prompt: "Summarize pipeline risk for my team", kind: "team" });
    const idle = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "lead" && !i.silent && i.status === "new" && now - i.createdAt > 48 * HOUR).map((i) => ({ r, i })));
    if (idle.length) add({ key: "N27", no: 27, title: `${idle.length} lead${idle.length > 1 ? "s" : ""} not followed up in 48 hours`, why: `${idle.map((x) => x.r.placeName).slice(0, 3).join(", ")}${idle.length > 3 ? " and more" : ""}. Nudge the owners or reassign.`, sources: ["Snap & Lead", "NewCRM leads"], urgency: "med", agent: "CRM Agent", cta: "Open exceptions", prompt: "Which leads have not been followed up?", kind: "team" });
    if (sh.flags.coaching) add({ key: "N20", no: 20, title: "Coaching theme for the team", why: "Team level only, after works-council review: quotes followed up within 3 days win about twice as often as quotes left for 14 days.", sources: ["CRM Agent", "Team win-rate drivers"], urgency: "low", agent: "CRM Agent", cta: "Show the coaching prompt", prompt: "Show me the coaching theme for my team", kind: "team" });
  }
  return out.sort((a, b) => URG[a.urgency] - URG[b.urgency] || (b.value ?? 0) - (a.value ?? 0));
}

/* ------------------------------------------------------------------ briefs */
export function assetBrief(s: State, a: Asset) {
  const now = nowS(s); const acc = accountOf(s, a.accountId);
  const left = a.contractEnd ? Math.round((a.contractEnd - now) / DAY) : undefined;
  const trend = a.callbacksPrev90d ? Math.round(((a.callbacks90d - a.callbacksPrev90d) / a.callbacksPrev90d) * 100) : 0;
  const ref = regionRef(s, acc?.area ?? "HYW", a.contractEnd ? "renewal" : "maintenance");
  const rows: [string, string][] = [
    ["Customer", `${acc?.name}${acc?.key ? " (key account)" : ""} · ${acc?.contact.name}, ${acc?.contact.role}`],
    ["Unit", `${a.label.split(" · ")[0]} · ${a.model} · ${a.ageYears ? `${a.ageYears} years old` : "new"}`],
    ["Contract", a.contractEnd ? `ends in ${left} days (${inr(a.contractValue ?? 0)} per year)` : "none yet"],
    ["Service calls", `${a.callbacks14d} in 14 days · ${a.callbacks90d} in 90 days${a.callbacksPrev90d ? ` (${trend >= 0 ? "up" : "down"} ${Math.abs(trend)}% on the 90 days before)` : ""}`],
    ["Health score", `${a.health} of 100${a.health < 45 ? " · at risk" : ""}`],
    ["Open offers", s.sherpa.offers.filter((o) => o.assetId === a.id && !["won", "lost", "rejected"].includes(o.status)).map((o) => o.id).join(", ") || "none"],
    ["In this area", ref.sells ? `We sell this in ${AREA_NAME[ref.area]}: ${ref.count} offers in 12 months, ${ref.winRate}% won` : `We do not sell this in ${AREA_NAME[ref.area]}`],
  ];
  return { title: a.label, rows, sources: ["NewCRM account and contract", "SAP service history", "Installed base"] };
}
