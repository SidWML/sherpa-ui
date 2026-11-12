export type Team = "SC" | "EI" | "MOD" | "NI" | "RS" | "SVC" | "ED" | "MGR" | "AM" | "TENDER";
export type Role = "reporter" | "sc" | "ei" | "mod" | "ni" | "am" | "mgr" | "rs" | "ed" | "svc" | "lead" | "admin" | "ss" | "mkt";
export type Tier = "Hot" | "Warm" | "Cold" | "Info";
export type TrackKey =
  | "records" | "noted" | "fault" | "renewal" | "winback" | "sales" | "modernisation"
  | "project" | "account" | "emergency" | "info" | "merge" | "retake" | "queued";
export type Equip = "lift" | "escalator" | "walk";
export type BuildingType = "office" | "mall" | "hospital" | "gov" | "transport" | "residential" | "industrial";

export interface User {
  id: string; name: string; role: Role; title: string; initials: string;
  team?: Team; areas?: string[]; blurb: string;
  /** Not offered at sign-in. Kept so older records still show a name. */
  hidden?: boolean;
}
export interface Place { id: string; name: string; addr: string; area: string; type: BuildingType; key?: string; lat: number; lng: number }
export interface Area { id: string; name: string }

export interface Reason { label: string; pts: number }

export interface Input {
  equip: Equip;
  subject: "unit" | "site" | "notice";
  notice?: "soon" | "renovation" | "tender";
  quality: "ok" | "brandOnly" | "unreadable" | "notLift" | "duplicatePhoto";
  brand: "ours" | "other" | "unclear";
  number?: string;
  records: "found" | "wrong" | "missing" | "multiple" | "scrapped" | "otherBuilding" | "placeOnly";
  contract: "active" | "ended" | "ending" | "never" | "cancelled" | "warranty";
  servicer: "us" | "other" | "maker" | "staff" | "nobody" | "unknown";
  condition: "fine" | "minor" | "out" | "unsafe" | "unsure";
  hurt?: "yes" | "no" | "unsure";
  age: number;
  units: number;
  buildingType: BuildingType;
  keyCustomer: boolean;
  inArea: boolean;
  placeSrc: "gps" | "search" | "typed" | "later" | "denied";
  newPlace: boolean;
  known: "none" | "sameReporter" | "openLead" | "colleague" | "lostRecent" | "won" | "openTicket" | "deal";
  breakdowns: number;
  stage?: "early" | "structure" | "finishing";
  ordered?: boolean;
  competitorInstalling?: boolean;
  weInstalling?: boolean;
  contact: boolean;
  offline: boolean;
  oldPhoto: boolean;
  locMismatch: boolean;
  certExpired: boolean;
  declinedRetake: boolean;
  lowConfidence: boolean;
  dangerPhoto?: boolean;
  lostBid?: boolean;
}

export interface Draft {
  kind: "lead" | "records" | "ticket" | "emergency" | "info" | "note" | "merge" | "retake";
  team: Team | null;
  track: TrackKey;
  caseId: string;
  title: string;
  summary: string;
  score: number;
  tier: Tier;
  reasons: Reason[];
  also: Team[];
  flags: string[];
  silent?: boolean;
  steps?: string[];
  step0?: number;
  autoClose?: string;
}

export interface Outcome {
  items: Draft[];
  cases: string[];
  points: { key: string; label: string; pts: number; status: PointStatus }[];
  plain: string[];
  headline: string;
  verdict: "ours" | "notours" | "retake" | "unsure";
  notes: string[];
}

export type PointStatus = "pending" | "confirmed" | "held" | "reversed";
export interface PointEvent { id: string; key: string; label: string; pts: number; status: PointStatus; at: number }

export interface LogEntry { t: number; by: string; text: string }

export interface Item extends Draft {
  id: string; reportId: string;
  ownerId?: string;
  routed: "owner" | "exception" | "none";
  status: "new" | "accepted" | "declined" | "snoozed" | "closed" | "waiting";
  step: number;
  outcome?: string;
  createdAt: number; acceptedAt?: number; lastActionAt: number; snoozeUntil?: number;
  clockLevel: number; nudges: number;
  override?: { from: Tier; to: Tier; reason: string; by: string };
  declineReason?: string;
  serviceOrder?: string; engineer?: string;
  buildingInformed?: boolean;
  quoted?: boolean;
  log: LogEntry[];
}

export interface Photo { id: string; label: string; kind: "plate" | "panel" | "sticker" | "cabin" | "site" | "board" | "user"; text?: string; url?: string }

export interface Report {
  id: string; reporterId: string; createdAt: number;
  status: "queued" | "sent";
  placeName: string; placeId: string; area: string;
  input: Input; photos: Photo[];
  answers: { q: string; a: string }[]; corrections: string[];
  items: Item[]; cases: string[]; points: PointEvent[];
  timeline: LogEntry[];
  extras: { contact?: string; note?: string; photos: number };
  headline: string; verdict: Outcome["verdict"]; plain: string[];
  impact?: boolean; fake?: boolean; trusted: boolean;
}

export interface Alert { id: string; userId: string; t: number; text: string; reportId?: string; offerId?: string; read: boolean }
export interface Audit { t: number; by: string; text: string }

export interface Config {
  paused: boolean;
  tiers: { hot: number; warm: number; cold: number };
  base: { ourOther: number; site: number; ended: number; ourMissingProblem: number; keyCustomer: number; ourProblem: number; otherLocal: number; veryOld: number; otherMaker: number };
  followUp: { hot: [number, number, number]; warm: [number, number, number] };
  dailyLimit: number;
  owners: Record<string, Partial<Record<Team, string>>>;
}

export interface State {
  reports: Report[]; alerts: Alert[]; audit: Audit[]; cfg: Config;
  clock: number; offline: boolean; userId: string | null; seq: number; readerDown?: boolean;
  sherpa: Sherpa;
  /** Schema version. A saved state with another version is replaced by fresh seed data. */
  v: number;
}

export interface Preset {
  id: string; title: string; tip: string; pilot: boolean; group: string;
  equip: Equip; subject: Input["subject"]; notice?: Input["notice"];
  quality: Input["quality"];
  reading: { brand: Input["brand"]; number?: string; age: number; servicer: Input["servicer"]; capacity: string; conf: { brand: number; number: number; sticker: number; age: number; capacity: number } };
  backend: { records: Input["records"]; contract: Input["contract"]; known: Input["known"]; breakdowns: number; placeMatch: boolean };
  place: string; placeSrc: Input["placeSrc"]; offline?: boolean;
  extra?: Partial<Input>;
  danger?: boolean;
}

/* ---------- SHERPA: mock NewCRM data, offers and next best actions ---------- */
export type ProductKey = "renewal" | "maintenance" | "repair" | "modernisation" | "newinstall";
export interface Account {
  id: string; name: string; area: string; key?: boolean; placeIds: string[]; owner: string; lastActivity: number;
  contact: { name: string; role: string; email: string }; lines: { ni: boolean; ei: boolean; sc: boolean; mod: boolean }; lostBids?: string;
}
export interface Asset {
  id: string; accountId: string; placeId: string; label: string; model: string; ageYears: number; brand: "ours" | "other";
  contractEnd?: number; contractValue?: number; callbacks14d: number; callbacks90d: number; callbacksPrev90d: number; faults90d: number;
  health: number; handedOver?: boolean; servicer: string; owner: string; sc?: string; mod?: string;
  obr?: number; contractChangedAfterObr?: boolean; techNote?: string; obsolete?: string;
}
export interface Tender {
  id: string; name: string; accountId: string; area: string; owner: string; line: "ni" | "sc" | "mod";
  stage: "matched" | "qualifying" | "bidding" | "final" | "submitted" | "won" | "lost"; eord: number; value: number; lifts: number;
  summary: string; competitorSpec?: string; lossNote?: string; discovered: number; oppId?: string; checklist: { t: string; done: boolean }[];
  /** Set when the Sales Manager has created the bid. */
  bid?: { by: string; at: number; discountPct: number };
}
export interface MLead { id: string; name: string; source: string; area: string; createdAt: number; owner?: string; status: "new" | "working" | "converted" | "dropped"; interest: string; score: number }
export interface Campaign { id: string; name: string; segment: string; area: string; size: number; status: "draft" | "live" | "done"; createdBy: string; createdAt: number; message?: { subject: string; body: string }; leads: number }
export type TaskKind = "accept" | "findContact" | "research" | "contact" | "visit" | "qualify" | "config" | "bid" | "compliance" | "approve" | "revise" | "send" | "followup" | "handover" | "assign" | "other";
export interface Task { id: string; title: string; detail?: string; by: string; forUser?: string; accountId?: string; oppId?: string; kind?: TaskKind; due: number; done: boolean; createdAt: number; doneAt?: number; result?: string; source: string }
/** One record from the first sighting to the won deal. Lead, tender and offer are stages of it, not separate lists. */
export type OppStage = "new" | "contact" | "visit" | "qualify" | "bid" | "offer" | "sent" | "won" | "lost" | "closed";
export interface Opp {
  id: string; title: string; kind: "newbuild" | "existing" | "renewal" | "modernisation" | "project";
  accountId?: string; placeName: string; area: string; owner: string; unrouted?: boolean;
  stage: OppStage; createdAt: number; closedAt?: number; value?: number;
  source: { type: "snap" | "tender" | "nba" | "campaign"; reportId?: string; itemId?: string; reporter?: string; label: string };
  contact?: { name: string; role: string; phone?: string; email?: string; via: string };
  tenderId?: string; offerId?: string; visitBy?: string; visited?: boolean;
  /** Where it is on the map, when the place is not in the places list. */
  geo?: { lat: number; lng: number };
  log: LogEntry[];
}
export interface Past { id: string; area: string; product: ProductKey; price: number; discountPct: number; outcome: "won" | "lost"; at: number; customer: string }
export interface Approval { by: string; status: "pending" | "approved" | "changes" | "rejected"; reason?: string; at?: number }
export interface Offer {
  id: string; accountId: string; assetId?: string; area: string; product: ProductKey; title: string; term: number;
  listPrice: number; price: number; discountPct: number;
  status: "draft" | "awaiting" | "changes" | "approved" | "rejected" | "sent" | "won" | "lost";
  createdBy: string; createdAt: number; sentAt?: number; lastActivity: number;
  approvals: Approval[]; email?: { subject: string; body: string };
  source?: { reportId: string; itemId: string }; fromNba?: string; log: LogEntry[];
  missing?: string[]; contractChange?: string; oppId?: string;
}
export interface NbaStatus { status: "snoozed" | "dismissed" | "done"; at: number; until?: number }
export interface Sherpa {
  accounts: Account[]; assets: Asset[]; tenders: Tender[]; opps: Opp[]; past: Past[]; offers: Offer[]; mleads: MLead[]; campaigns: Campaign[]; tasks: Task[];
  crm: { t: number; by: string; text: string }[]; nba: Record<string, NbaStatus>; flags: { coaching: boolean }; seq: number;
}
