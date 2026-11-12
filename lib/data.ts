import type { Area, Config, Place, Preset, Role, Team, TrackKey, User } from "./types";

export const TEAM_NAME: Record<Team, string> = {
  SC: "Service contract sales", EI: "Existing-installation sales", MOD: "Modernisation sales",
  NI: "New-installation sales", RS: "Records team", SVC: "Service team", ED: "Emergency desk",
  MGR: "Sales manager", AM: "Account manager", TENDER: "Tender team",
};

export const TRACKS: Record<TrackKey, { label: string; steps: string[] }> = {
  records: { label: "Records", steps: ["Submitted", "Records team checks", "Added or corrected"] },
  noted: { label: "Noted", steps: ["Submitted", "Noted"] },
  fault: { label: "Fault", steps: ["Submitted", "Service team told", "Engineer assigned", "Fixed"] },
  renewal: { label: "Renewal", steps: ["Submitted", "Assigned", "Contacted", "Offer sent", "Renewed or not"] },
  winback: { label: "Win-back", steps: ["Submitted", "Assigned", "Contacted", "Offer sent", "Won back or not"] },
  sales: { label: "Sales", steps: ["Submitted", "Assigned", "Contacted", "Visit", "Quote", "Won or closed"] },
  modernisation: { label: "Modernisation", steps: ["Submitted", "Assigned", "Site survey", "Proposal", "Won or closed"] },
  project: { label: "Project", steps: ["Submitted", "Assigned", "Developer contacted", "Tender or quote", "Won or closed"] },
  account: { label: "Account", steps: ["Submitted", "Account manager told", "Added to account plan"] },
  emergency: { label: "Emergency", steps: ["Alerted", "Acknowledged", "Engineer on the way", "Closed"] },
  info: { label: "Info", steps: ["Submitted", "Saved as information"] },
  merge: { label: "Merge", steps: ["Submitted", "Added to an existing lead", "Follows that lead"] },
  retake: { label: "Retake", steps: ["Submitted", "Clearer photo needed", "Resumes when sent"] },
  queued: { label: "Queued", steps: ["Saved on the phone", "Sent when signal returns"] },
};

export const AREAS: Area[] = [
  { id: "HYW", name: "Hyderabad West" },
  { id: "HYC", name: "Hyderabad Central" },
  { id: "SEC", name: "Secunderabad and East" },
  { id: "WGL", name: "Warangal (Telangana)" },
  { id: "OUT", name: "Outside Telangana" },
];

export const PLACES: Place[] = [
  { id: "riverside", name: "Cyber Gateway, Tower A", addr: "Madhapur, HITEC City, Hyderabad", area: "HYW", type: "office", lat: 17.4486, lng: 78.3908 },
  { id: "citymall", name: "Banjara Central Mall, Block B", addr: "Road No. 1, Banjara Hills, Hyderabad", area: "HYC", type: "mall", lat: 17.4126, lng: 78.4482 },
  { id: "techpark", name: "Deccan Tech Park, Tower 2", addr: "Gachibowli, Hyderabad", area: "HYW", type: "office", key: "Deccan Tech Parks Pvt Ltd", lat: 17.4401, lng: 78.3489 },
  { id: "baselhosp", name: "Kakatiya Medical Centre", addr: "Hanamkonda, Warangal", area: "WGL", type: "hospital", lat: 18.0037, lng: 79.5584 },
  { id: "cityhall", name: "Secretariat Annexe", addr: "Tank Bund Road, Hyderabad", area: "HYC", type: "gov", lat: 17.4239, lng: 78.4738 },
  { id: "station", name: "Secunderabad Railway Station Concourse", addr: "Sarojini Devi Road, Secunderabad", area: "SEC", type: "transport", lat: 17.4337, lng: 78.5014 },
  { id: "harbour", name: "Kokapet Skyline (building site)", addr: "Kokapet, Hyderabad", area: "HYC", type: "office", lat: 17.398, lng: 78.334 },
  { id: "rhine", name: "Hanamkonda Heights (building site)", addr: "Subedari, Hanamkonda, Warangal", area: "WGL", type: "office", lat: 18.0105, lng: 79.5513 },
  { id: "secbiz", name: "Secunderabad Business Hub", addr: "SD Road, Secunderabad", area: "SEC", type: "office", lat: 17.4399, lng: 78.4983 },
  { id: "geneva", name: "Lakeview Plaza, MG Road (Bengaluru)", addr: "MG Road, Bengaluru", area: "OUT", type: "office", lat: 12.9757, lng: 77.6063 },
];

export const USERS: User[] = [
  { id: "alex", name: "Arjun Rao", role: "reporter", title: "Lead generator · Hyderabad", initials: "AR", blurb: "Not a seller. Snaps a lift or building, answers a few quick questions and follows the lead until a seller wins it. This is the standalone Snap & Lead app." },
  { id: "tom", hidden: true, name: "Tarun Reddy", role: "reporter", title: "Field technician · Hyderabad", initials: "TR", blurb: "Second reporter. Used for duplicate-report scenarios." },
  { id: "noah", name: "Naveen Chowdary", role: "ni", team: "NI", areas: ["HYW", "HYC", "SEC"], title: "NI sales rep · new installations", initials: "NC", blurb: "Tenders, building sites and quotes. Next best actions: matched tender, EORD near, quote idle, competitor spec. No NI rep covers Warangal (exception demo)." },
  { id: "ethan", name: "Eshwar Varma", role: "ei", team: "EI", areas: ["HYW", "WGL"], title: "EI / REP sales rep · existing installations", initials: "EV", blurb: "Keeps and grows the installed base: callbacks, renewals at risk, competitor-serviced lifts from Snap & Lead." },
  { id: "elias", name: "Imran Baig", role: "ei", team: "EI", areas: ["HYC", "SEC"], title: "EI / REP sales rep · Hyderabad Central and Secunderabad", initials: "IB", blurb: "Second EI rep. Shows area-based routing and handed-over units." },
  { id: "sofia", name: "Sunita Murthy", role: "sc", team: "SC", areas: ["HYW", "HYC", "SEC", "WGL"], title: "SC sales rep · service contracts", initials: "SM", blurb: "Sells and renews service contracts. Contract ending, contract changed in offer, EORD." },
  { id: "mia", name: "Meera Krishnan", role: "mod", team: "MOD", areas: ["HYW", "HYC", "SEC"], title: "MOD sales rep · modernisation", initials: "MK", blurb: "Turns ageing units into projects: frequent faults, obsolete parts, open MOD offers." },
  { id: "marc", name: "Madhav Reddy", role: "mgr", team: "MGR", areas: ["HYW", "HYC", "SEC", "WGL"], title: "Sales manager · Telangana", initials: "MR", blurb: "Steers the team: stalled deals, discount approvals, leads not followed up. Team-level only." },
  { id: "shalini", name: "Shalini Nair", role: "ss", title: "Sales support · quotes, orders and changes", initials: "SN", blurb: "Unblocks quotes: missing data, blocked approvals. Completes configurations." },
  { id: "lena", name: "Lakshmi Prasad", role: "am", team: "AM", title: "Account manager · key accounts", initials: "LP", blurb: "One view of each key account across NI, EI, MOD and branches. Silent accounts, cross-sell." },
  { id: "manoj", name: "Manoj Verma", role: "mkt", title: "Marketing · campaigns and leads", initials: "MV", blurb: "Builds audiences, drafts campaigns, chases leads nobody followed up in 48 hours." },
  { id: "priya", hidden: true, name: "Priya Sharma", role: "rs", team: "RS", title: "Records steward", initials: "PS", blurb: "Mismatched, missing and duplicate lifts. Side-by-side review." },
  { id: "dimitri", hidden: true, name: "Dinesh Kumar", role: "ed", team: "ED", title: "Emergency desk", initials: "DK", blurb: "Unsafe-lift alerts. Acknowledge, dispatch, notify building, close." },
  { id: "jonas", hidden: true, name: "Jagan Mohan", role: "svc", team: "SVC", title: "Service team lead", initials: "JM", blurb: "Faults on lifts we maintain. Tickets, engineers, close." },
  { id: "karin", hidden: true, name: "Kavitha Rao", role: "lead", title: "Regional lead · Head of Sales and Service, Telangana", initials: "KR", blurb: "Approves discounts above 20%. Programme dashboard, totals only." },
  { id: "admin", name: "Product Admin", role: "admin", title: "SHERPA product team", initials: "PA", blurb: "Rules, NBA catalogue, agent registry, thresholds, owners, audit log, pause routing." },
];

export type AppId = "sherpa" | "snap";
/** Who can use each app. A reporter never appears in SHERPA and a seller never appears in Snap & Lead. */
export const APPS: Record<AppId, { name: string; home: string; users: User[] }> = {
  sherpa: { name: "SHERPA", home: "marc", users: USERS.filter((u) => u.role !== "reporter" && !u.hidden) },
  snap: { name: "Snap & Lead", home: "alex", users: USERS.filter((u) => u.role === "reporter") },
};

export const ROLE_LABEL: Record<Role, string> = {
  reporter: "Lead generator", sc: "SC sales rep", ei: "EI / REP sales rep", mod: "MOD sales rep",
  ni: "NI sales rep", am: "Account manager", mgr: "Sales manager", rs: "Records steward",
  ed: "Emergency desk", svc: "Service team", lead: "Regional lead", admin: "Administrator", ss: "Sales support", mkt: "Marketing",
};

export const DEFAULT_CFG: Config = {
  paused: false,
  tiers: { hot: 70, warm: 45, cold: 20 },
  base: { ourOther: 60, site: 60, ended: 55, ourMissingProblem: 45, keyCustomer: 45, ourProblem: 40, otherLocal: 40, veryOld: 35, otherMaker: 20 },
  followUp: { hot: [24, 48, 72], warm: [72, 120, 240] },
  dailyLimit: 5,
  owners: {
    HYW: { SC: "sofia", EI: "ethan", MOD: "mia", NI: "noah", AM: "lena", MGR: "marc" },
    HYC: { SC: "sofia", EI: "elias", MOD: "mia", NI: "noah", AM: "lena", MGR: "marc" },
    SEC: { SC: "sofia", EI: "elias", MOD: "mia", NI: "noah", AM: "lena", MGR: "marc" },
    WGL: { SC: "sofia", EI: "ethan", AM: "lena", MGR: "marc" },
  },
};

export const GLOBAL_OWNER: Partial<Record<Team, string>> = { RS: "priya", ED: "dimitri", SVC: "jonas" };

export const LEVELS = [
  { name: "Spotter", from: 0 }, { name: "Scout", from: 100 }, { name: "Pathfinder", from: 300 }, { name: "Champion", from: 700 },
];

/* ---------- Case catalogue: all 145 cases. [id, title, pilot] ---------- */
type C = [string, string, 0 | 1];
export const GROUPS: Record<string, string> = {
  A: "Safety", B: "Our lift or elevator", C: "Another company's lift", D: "Site and building",
  E: "Photo quality and identification", F: "Location", G: "Duplicates and history",
  H: "Routing and follow-up", I: "Information and privacy", J: "Technical", K: "Points and recognition",
  L: "Special situations", M: "Escalators and moving walks",
};
export const CASES: C[] = [
  ["A1", "Unsafe, someone trapped or hurt", 1], ["A2", "Unsafe, nobody hurt", 1], ["A3", "Unsafe, not our lift", 1],
  ["A4", "Unsafe, outside our area", 0], ["A5", "Unsafe, no signal", 1], ["A6", "Photo shows danger but employee said fine", 0],
  ["B1", "In records, contract active, running fine", 1], ["B2", "In records, active, minor problem", 1], ["B3", "In records, active, out of service", 1],
  ["B4", "Active, repeated breakdowns (4+ in 90 days)", 0], ["B5", "Contract ended", 1], ["B6", "Contract ending within 60 days", 0],
  ["B7", "In records, never had a contract", 0], ["B8", "Another company services it now", 1], ["B9", "Contract cancelled, on hold or in dispute", 0],
  ["B10", "New or under warranty, running fine", 0], ["B11", "Under warranty, with a problem", 0], ["B12", "20 years or older and faulty", 1],
  ["B13", "Not in records, running fine", 1], ["B14", "Not in records, with a problem", 1], ["B15", "Not in records, another firm's sticker", 0],
  ["B16", "Not in records, our own sticker", 0], ["B17", "In records but details wrong", 1], ["B18", "Number matches but building differs, or scrapped", 0],
  ["B19", "At a key customer's site", 0], ["B20", "Employee says ours but photo shows another brand", 0], ["B21", "Several of our units in one building", 0],
  ["C1", "A local or independent firm services it", 1], ["C2", "Its own maker services it", 1], ["C3", "The building's own staff service it", 0],
  ["C4", "Nobody visibly services it", 1], ["C5", "Sticker unreadable or not seen", 0], ["C6", "Problem or out of service", 0],
  ["C7", "20 years or older", 1], ["C8", "Inspection certificate expired or missing", 0], ["C9", "Modernisation or tender notice visible", 0],
  ["C10", "Installed less than 3 years ago", 0], ["C11", "Hospital, mall or premium building", 0], ["C12", "Another site of a key customer", 1],
  ["C13", "Government or public building", 0], ["C14", "Mixed brands in one building", 0], ["C15", "A competitor we recently lost a bid to", 0],
  ["C16", "Home-made or heavily modified unit", 0], ["C17", "Escalator or moving walk (see M)", 0],
  ["D1", "Building site, no lift yet", 1], ["D2", "A competitor is installing the lift", 0], ["D3", "Our company is installing", 0],
  ["D4", "\"Lift coming soon\" board", 0], ["D5", "Lift under renovation behind hoarding", 0], ["D6", "Private home lift or small residential", 0],
  ["D7", "Goods, freight or industrial lift", 0], ["D8", "Outside our service area", 1], ["D9", "No sales rep for the area", 0],
  ["D10", "Border between two areas", 0], ["D11", "Multi-tower complex", 0], ["D12", "Photography not allowed", 0],
  ["E1", "All details read", 1], ["E2", "Brand read, number not", 1], ["E3", "Number read, brand not", 0], ["E4", "Neither readable", 1],
  ["E5", "Not a lift or escalator", 0], ["E6", "Faces or personal data visible", 0], ["E7", "Several units in one photo", 0],
  ["E8", "Shaft or machine room only", 0], ["E9", "Same photo sent before", 0], ["E10", "Old gallery photo, date or place mismatch", 0],
  ["E11", "Unusual number format", 0], ["E12", "Number matches several units", 0], ["E13", "Photo reader down or cannot read", 0],
  ["E14", "Photo reader confidently wrong", 0],
  ["F1", "Use my location, known building within 200 m", 1], ["F2", "GPS weak indoors", 0], ["F3", "Location permission refused", 1],
  ["F4", "Several known buildings nearby", 0], ["F5", "No known building", 1], ["F6", "Reporting later, not at the site", 0],
  ["F7", "Location differs from photo location", 0], ["F8", "Suspected faked location", 0], ["F9", "Block, floor or lift name given", 0],
  ["G1", "Open lead exists for the same unit", 1], ["G2", "Same employee sent it before", 1], ["G3", "A colleague reported it minutes ago", 0],
  ["G4", "Same building, different unit", 0], ["G5", "A lead for this unit was lost recently", 0], ["G6", "We already won this unit", 0],
  ["G7", "An open service ticket exists", 0], ["G8", "Part of a larger deal in negotiation", 0], ["G9", "No number, same brand within 50 m", 0],
  ["G10", "Existing lead's owner has left", 0],
  ["H1", "Owner found", 1], ["H2", "No rep for that team in the area", 1], ["H3", "Owner on leave", 0], ["H4", "Owner declines with a reason", 0],
  ["H5", "No action in 24, 48 or 72 hours (Hot)", 1], ["H6", "One photo, two teams", 1], ["H7", "Key customer: AM and local rep", 0],
  ["H8", "Another business unit owns the customer", 0], ["H9", "The reporter is the sales owner", 0], ["H10", "Reporter from another region", 0],
  ["H11", "Lead closed", 1], ["H12", "Lead rejected as invalid", 0],
  ["I1", "A contact person is captured", 1], ["I2", "Contact is a guard, not a decision-maker", 0], ["I3", "Customer says do not contact", 0],
  ["I4", "Contact already exists in the CRM", 0], ["I5", "Competitor prices overheard", 0],
  ["J1", "No signal", 1], ["J2", "Weak signal", 0], ["J3", "Draft interrupted", 0], ["J4", "Retry after signal lost", 0],
  ["J5", "Salesforce is down", 0], ["J6", "Records system is down", 0], ["J7", "Conflict at sync", 0], ["J8", "Phone clock is wrong", 0],
  ["K1", "Normal report", 1], ["K2", "Duplicate or repeat", 0], ["K3", "Fake or junk report", 0], ["K4", "Two reporters, one lead", 0],
  ["K5", "A win comes months later", 0], ["K6", "Daily limit reached", 0], ["K7", "Safety report", 0], ["K8", "The employee leaves", 0],
  ["L1", "Technician on a service job at that customer", 0], ["L2", "Customer complains about our equipment", 0], ["L3", "Customer asks for a quote on the spot", 0],
  ["L4", "Several units in one building (batch)", 0], ["L5", "Employee prefers another language", 0], ["L6", "No camera access", 0], ["L7", "Competitor crew seen working", 0],
  ["M1", "Escalator unsafe, someone hurt", 0], ["M2", "Escalator unsafe, nobody hurt", 0], ["M3", "Ours, active, running fine", 0],
  ["M4", "Ours, active, minor problem", 0], ["M5", "Ours, active, stopped", 0], ["M6", "Ours, contract ended", 0],
  ["M7", "Ours, another company services it", 0], ["M8", "Ours, not in records, running fine", 0], ["M9", "Ours, not in records, with a problem", 0],
  ["M10", "Another company's, local firm", 0], ["M11", "Another company's, own maker", 0], ["M12", "Another company's, nobody services it", 0],
  ["M13", "Very old escalator", 0], ["M14", "Moving walk (travelator)", 0], ["M15", "Escalators planned, building under construction", 0],
  ["M16", "Escalators in a transport hub or government building", 0],
];

/* ---------- Scenario presets (what the photos would show) ---------- */
const DEF = {
  equip: "lift", subject: "unit", quality: "ok",
  reading: { brand: "ours", number: "74821", age: 12, servicer: "unknown", capacity: "1,000 kg (13 persons)", conf: { brand: 96, number: 94, sticker: 0, age: 78, capacity: 90 } },
  backend: { records: "found", contract: "active", known: "none", breakdowns: 0, placeMatch: false },
  place: "riverside", placeSrc: "gps",
} as const;

interface O {
  r?: Partial<Preset["reading"]>; c?: Partial<Preset["reading"]["conf"]>; b?: Partial<Preset["backend"]>;
  equip?: Preset["equip"]; subject?: Preset["subject"]; notice?: Preset["notice"]; quality?: Preset["quality"];
  place?: string; src?: Preset["placeSrc"]; offline?: boolean; x?: Preset["extra"]; danger?: boolean;
}
function p(id: string, tip: string, o: O = {}): Preset {
  const c = CASES.find((k) => k[0] === id)!;
  return {
    id, title: c[1], tip, pilot: c[2] === 1, group: id[0],
    equip: o.equip ?? DEF.equip, subject: o.subject ?? DEF.subject, notice: o.notice,
    quality: o.quality ?? DEF.quality,
    reading: { ...DEF.reading, ...(o.r ?? {}), conf: { ...DEF.reading.conf, ...(o.c ?? {}) } } as Preset["reading"],
    backend: { ...DEF.backend, ...(o.b ?? {}) } as Preset["backend"],
    place: o.place ?? DEF.place, placeSrc: o.src ?? DEF.placeSrc, offline: o.offline, extra: o.x, danger: o.danger,
  };
}
const other = { brand: "other" as const, number: "OL-5530" };
const esc = { equip: "escalator" as const, r: { capacity: "9,000 persons/h" } };
const oldOther = { r: { brand: "other" as const, number: "OL-5530", age: 24, servicer: "other" as const }, c: { sticker: 88 } };

export const PRESETS: Preset[] = [
  p("A1", "Tap Something unsafe, or answer Unsafe. Then: someone is trapped or hurt."),
  p("A2", "Answer Unsafe. Then: nobody is hurt."),
  p("A3", "Not our brand. Answer Unsafe.", { r: { brand: "other", number: "OL-5530" } }),
  p("A4", "Outside our area. Answer Unsafe.", { place: "geneva" }),
  p("A5", "Phone is offline. Answer Unsafe.", { offline: true }),
  p("A6", "Photo shows danger, you say fine. The assistant asks you to confirm.", { danger: true }),
  p("B1", "Answer: Running fine."),
  p("B2", "Answer: Minor issues."),
  p("B3", "Answer: Out of service."),
  p("B4", "Active contract, 5 breakdown calls in 90 days. Answer: Running fine.", { b: { breakdowns: 5 } }),
  p("B5", "Answer: Running fine. Sticker: not seen.", { b: { contract: "ended" } }),
  p("B6", "Early renewal lead.", { b: { contract: "ending" } }),
  p("B7", "Never had a contract.", { b: { contract: "never" } }),
  p("B8", "Sticker read as another company. Contract ended.", { b: { contract: "ended" }, r: { servicer: "other" }, c: { sticker: 86 } }),
  p("B9", "Cancelled or disputed contract.", { b: { contract: "cancelled" } }),
  p("B10", "Under warranty. Answer: Running fine.", { b: { contract: "warranty" }, r: { age: 1 } }),
  p("B11", "Under warranty. Answer: Minor issues.", { b: { contract: "warranty" }, r: { age: 1 } }),
  p("B12", "Age 24. Answer: Minor issues. Creates two leads.", { r: { age: 24 }, c: { age: 85 } }),
  p("B13", "Not in records. Answer: Running fine.", { b: { records: "missing" } }),
  p("B14", "Not in records. Answer: Minor issues.", { b: { records: "missing" } }),
  p("B15", "Not in records, another firm's sticker.", { b: { records: "missing" }, r: { servicer: "other" }, c: { sticker: 84 } }),
  p("B16", "Not in records, our own sticker.", { b: { records: "missing" }, r: { servicer: "us" }, c: { sticker: 90 } }),
  p("B17", "In records but address and model are wrong.", { b: { records: "wrong" } }),
  p("B18", "Number matches a unit recorded as scrapped.", { b: { records: "scrapped" } }),
  p("B19", "At a key customer's site (Tech Park). Contract ended.", { place: "techpark", b: { contract: "ended" } }),
  p("C1", "Sticker read as a local firm. Answer any condition.", { r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { brand: 91, number: 88, sticker: 88 } }),
  p("C2", "Sticker read as its own maker.", { r: { brand: "other", number: "OL-5530", servicer: "maker" }, c: { brand: 91, number: 88, sticker: 90 } }),
  p("C3", "Sticker not read. Answer sticker: Building staff.", { r: other }),
  p("C4", "Sticker not read. Answer sticker: None seen.", { r: other }),
  p("C5", "Sticker not read. Answer sticker: Not sure.", { r: other }),
  p("C6", "Local firm services it. Answer: Out of service.", { r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88, brand: 91, number: 88 } }),
  p("C7", "Age 24, local firm. Two leads: Sales and Modernisation.", oldOther),
  p("C8", "Inspection certificate expired.", { r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 }, x: { certExpired: true } }),
  p("C9", "Tender notice at a government building.", { subject: "notice", notice: "tender", place: "cityhall" }),
  p("C10", "Installed 2 years ago.", { r: { brand: "other", number: "OL-5530", age: 2, servicer: "other" }, c: { sticker: 88 } }),
  p("C11", "Mall. Score +10.", { place: "citymall", r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("C12", "Another site of a key customer (Tech Park).", { place: "techpark", r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("C13", "Government building: tender only.", { place: "cityhall", r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("C15", "Lost a bid to this competitor earlier.", { r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 }, x: { lostBid: true } }),
  p("D1", "Answer: stage Structure going up. Ordered: No. Optional contact.", { subject: "site", place: "harbour", r: { brand: "unclear", number: undefined, servicer: "unknown", age: 0, capacity: "n/a" }, c: { brand: 0, number: 0, age: 0, capacity: 0 } }),
  p("D2", "A competitor crew is installing the lift.", { subject: "site", place: "harbour", r: { brand: "unclear", number: undefined, age: 0 }, x: { competitorInstalling: true } }),
  p("D3", "Our company is installing.", { subject: "site", place: "harbour", r: { brand: "unclear", number: undefined, age: 0 }, x: { weInstalling: true } }),
  p("D4", "\"Lift coming soon\" board.", { subject: "notice", notice: "soon", place: "harbour", r: { brand: "unclear", number: undefined, age: 0 } }),
  p("D5", "Lift renovation behind hoarding.", { subject: "notice", notice: "renovation", place: "riverside", r: { brand: "unclear", number: undefined, age: 0 } }),
  p("D8", "Building is outside our service area.", { place: "geneva", r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("D9", "Building site in Basel. No NI rep: manager exception list.", { subject: "site", place: "rhine", r: { brand: "unclear", number: undefined, age: 0 } }),
  p("E1", "Everything is read: just confirm."),
  p("E2", "Number not read. Skip it: matched by place and brand.", { r: { number: undefined }, c: { number: 0 }, quality: "brandOnly", b: { placeMatch: true } }),
  p("E4", "Neither readable: retake once, or decline.", { quality: "unreadable" }),
  p("E5", "Photo is not a lift.", { quality: "notLift" }),
  p("E9", "Same photo uploaded before.", { quality: "duplicatePhoto" }),
  p("E10", "Old gallery photo: points held.", { x: { oldPhoto: true } }),
  p("E12", "Number matches several units.", { b: { records: "multiple" } }),
  p("F1", "Use my location. Known building suggested."),
  p("F3", "Location permission refused: search or type.", { src: "denied" }),
  p("F5", "No known building: type name and address, choose area.", { src: "typed", b: { records: "missing" } }),
  p("F6", "Reporting later, not at the site.", { src: "later" }),
  p("F7", "Location differs from photo location: points held.", { x: { locMismatch: true } }),
  p("G1", "An open lead exists for this lift.", { b: { known: "openLead" }, r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("G2", "You sent this lift before.", { b: { known: "sameReporter" } }),
  p("G3", "A colleague reported it minutes ago.", { b: { known: "colleague" }, r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("G5", "A lead on this unit was lost recently.", { b: { known: "lostRecent" }, r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("G6", "We already won this unit.", { b: { known: "won" } }),
  p("G7", "An open service ticket exists.", { b: { known: "openTicket" } }),
  p("G8", "Part of a larger deal.", { b: { known: "deal" } }),
  p("J1", "Phone is offline: saved and sent later.", { offline: true, r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("K1", "A clean normal report. Points pending until checked.", { r: { brand: "other", number: "OL-5530", servicer: "other" }, c: { sticker: 88 } }),
  p("M1", "Escalator. Answer Unsafe, then someone is hurt.", esc),
  p("M2", "Escalator. Answer Unsafe, nobody hurt.", esc),
  p("M3", "Escalator, ours. Answer: Running fine.", esc),
  p("M4", "Escalator, ours. Answer: Minor issues.", esc),
  p("M5", "Escalator, ours. Answer: Stopped.", esc),
  p("M6", "Escalator, contract ended.", { ...esc, b: { contract: "ended" } }),
  p("M7", "Escalator, serviced by another firm.", { ...esc, b: { contract: "ended" }, r: { servicer: "other", capacity: "9,000 persons/h" }, c: { sticker: 86 } }),
  p("M8", "Escalator not in records.", { ...esc, b: { records: "missing" } }),
  p("M9", "Escalator not in records. Answer: Minor issues.", { ...esc, b: { records: "missing" } }),
  p("M10", "Another company's escalator, local firm.", { equip: "escalator", r: { brand: "other", number: "OL-5530", servicer: "other", capacity: "9,000 persons/h" }, c: { sticker: 88 } }),
  p("M11", "Another company's escalator, own maker.", { equip: "escalator", r: { brand: "other", number: "OL-5530", servicer: "maker", capacity: "9,000 persons/h" }, c: { sticker: 90 } }),
  p("M12", "Another company's escalator, no sticker.", { equip: "escalator", r: { brand: "other", number: "OL-5530", capacity: "9,000 persons/h" } }),
  p("M13", "Very old escalator, age 24.", { equip: "escalator", r: { brand: "other", number: "OL-5530", age: 24, servicer: "other", capacity: "9,000 persons/h" }, c: { sticker: 88 } }),
  p("M14", "Moving walk, ours. Follows the matching escalator case.", { equip: "walk", r: { capacity: "n/a" } }),
  p("M15", "Escalators planned at a building site.", { equip: "escalator", subject: "site", place: "harbour", r: { brand: "unclear", number: undefined, age: 0 } }),
  p("M16", "Escalators at a transport hub: tender only.", { equip: "escalator", place: "station", r: { brand: "other", number: "OL-5530", servicer: "other", capacity: "9,000 persons/h" }, c: { sticker: 88 } }),
];

export const DESK_HINTS: Record<string, string> = {
  H1: "Run any lead report: the owner is found by team and area.",
  H2: "Run D9 (Warangal site) and open the Sales manager exception list.",
  H3: "Scale: backup owner when on leave.",
  H4: "Sales rep: decline a lead with a reason, then check the manager list.",
  H5: "Open Demo controls, move the clock +24h / +48h / +72h, then look at the owner and manager views.",
  H6: "Run B12 or C7: one photo, two leads, two tracks.",
  H9: "Not built in this PoC.",
  H11: "Sales rep: take a lead through to Won. The reporter sees a thank-you and an impact story.",
  H12: "Manager: reject an invalid lead.",
  I1: "After sending, add a contact: owner and manager only see it, score +10, +5 points.",
  K3: "Manager: spot-check points, reject a junk report.",
  K6: "Send more than five reports in a day: extra reports earn no points.",
  K7: "Safety reports earn +30 and a badge when the emergency desk confirms.",
  J2: "Covered by the offline queue.",
  J4: "A report ID is reused on retry, so no duplicates.",
};

export const roleHome: Record<Role, string> = {
  reporter: "home", sc: "leads", ei: "leads", mod: "leads", ni: "leads", am: "accounts", mgr: "exceptions",
  rs: "queue", ed: "inbox", svc: "tickets", lead: "dashboard", admin: "rules", ss: "today", mkt: "today",
};

/** Other lead generators in the region, for the leaderboard. Demo figures: confirmed points, leads sent and wins. */
export const LEAD_PEERS = [
  { id: "p-kiran", name: "Kiran Kumar", initials: "KK", area: "Secunderabad", pts: 620, leads: 21, won: 2 },
  { id: "p-ayesha", name: "Ayesha Khan", initials: "AK", area: "Gachibowli", pts: 480, leads: 17, won: 1 },
  { id: "p-ravi", name: "Ravi Teja", initials: "RT", area: "Kukatpally", pts: 410, leads: 15, won: 1 },
  { id: "p-sneha", name: "Sneha Patel", initials: "SP", area: "Banjara Hills", pts: 290, leads: 12, won: 0 },
  { id: "p-vikram", name: "Vikram Singh", initials: "VS", area: "Madhapur", pts: 240, leads: 10, won: 0 },
  { id: "p-deepa", name: "Deepa Iyer", initials: "DI", area: "Warangal", pts: 180, leads: 7, won: 0 },
  { id: "p-rahul", name: "Rahul Menon", initials: "RM", area: "Begumpet", pts: 120, leads: 5, won: 0 },
];
