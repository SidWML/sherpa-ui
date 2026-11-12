import { PLACES } from "./data";
import { isOpen, oppOf } from "./sherpa";
import type { Opp, State } from "./types";

/** The three things a seller wants to see on one map. */
export type Layer = "lead" | "ours" | "other";
export const LAYER_LABEL: Record<Layer, string> = { lead: "Leads", ours: "Schindler clients", other: "Other clients" };

export interface Pin {
  id: string; layer: Layer; name: string; sub: string; area: string; lat: number; lng: number;
  key?: boolean; mine?: boolean; hot?: boolean;
  /** lead: the opportunity. ours: the account. */
  oppId?: string; accountId?: string;
  facts: [string, string][];
  /** one-line reason to act, shown on the card */
  why: string;
}

/** Buildings served by other lift makers. These are the people we want to win over. Mock data. */
export const OTHER_CLIENTS: { id: string; name: string; addr: string; area: string; lat: number; lng: number; maker: string; lifts: number; age: number; contractEnds: string; note: string }[] = [
  { id: "oc1", name: "Mindspace Tower 9", addr: "Madhapur, Hyderabad", area: "HYW", lat: 17.4421, lng: 78.3796, maker: "OtherLift", lifts: 10, age: 9, contractEnds: "Mar 2027", note: "Contract with OtherLift ends in about 4 months" },
  { id: "oc2", name: "Hitex Business Park", addr: "Kondapur, Hyderabad", area: "HYW", lat: 17.4647, lng: 78.3636, maker: "KoneX", lifts: 14, age: 13, contractEnds: "Aug 2027", note: "13 years old, repeated breakdowns reported" },
  { id: "oc3", name: "Jubilee Heights Apartments", addr: "Jubilee Hills, Hyderabad", area: "HYC", lat: 17.4318, lng: 78.4071, maker: "OtherLift", lifts: 6, age: 17, contractEnds: "Jan 2027", note: "Modernisation candidate: lifts are 17 years old" },
  { id: "oc4", name: "Begumpet Corporate Centre", addr: "Begumpet, Hyderabad", area: "HYC", lat: 17.4440, lng: 78.4693, maker: "LocalLift", lifts: 5, age: 11, contractEnds: "Dec 2026", note: "Local service firm, contract ends next month" },
  { id: "oc5", name: "Hotel Nizam Grand", addr: "Abids, Hyderabad", area: "HYC", lat: 17.3920, lng: 78.4747, maker: "OtherLift", lifts: 4, age: 22, contractEnds: "Jun 2027", note: "22 years old, no recent upgrade" },
  { id: "oc6", name: "Sri Sai Residency", addr: "Himayatnagar, Hyderabad", area: "HYC", lat: 17.4005, lng: 78.4833, maker: "KoneX", lifts: 2, age: 19, contractEnds: "Open", note: "Replied to the ageing-lifts campaign" },
  { id: "oc7", name: "Uppal Metro Plaza", addr: "Uppal, Hyderabad", area: "SEC", lat: 17.4058, lng: 78.5591, maker: "LocalLift", lifts: 8, age: 8, contractEnds: "Sep 2027", note: "Mall with eight lifts and one service firm" },
  { id: "oc8", name: "Tarnaka Medical Institute", addr: "Tarnaka, Secunderabad", area: "SEC", lat: 17.4271, lng: 78.5362, maker: "OtherLift", lifts: 7, age: 15, contractEnds: "Feb 2027", note: "Hospital: lift downtime is a risk for them" },
  { id: "oc9", name: "Hanamkonda City Centre", addr: "Hanamkonda, Warangal", area: "WGL", lat: 17.9937, lng: 79.5602, maker: "OtherLift", lifts: 6, age: 12, contractEnds: "Apr 2027", note: "Closest competitor-served mall to Kakatiya Medical" },
  { id: "oc10", name: "Kazipet Railway Annexe", addr: "Kazipet, Warangal", area: "WGL", lat: 17.9698, lng: 79.5143, maker: "LocalLift", lifts: 3, age: 20, contractEnds: "Open", note: "Public building, no service contract on record" },
  { id: "oc11", name: "Financial District Block C", addr: "Nanakramguda, Hyderabad", area: "HYW", lat: 17.4181, lng: 78.3426, maker: "KoneX", lifts: 12, age: 6, contractEnds: "Oct 2028", note: "Newer tower, long contract. Keep warm" },
];

const jit = (k: string) => { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) | 0; return [((h & 255) / 255 - 0.5) * 0.0026, (((h >> 8) & 255) / 255 - 0.5) * 0.0026] as const; };

export function locateOpp(s: State, o: Opp): { lat: number; lng: number } | null {
  const rep = o.source.reportId ? s.reports.find((r) => r.id === o.source.reportId) : undefined;
  const pid = rep?.placeId ?? (o.tenderId ? s.sherpa.accounts.find((a) => a.id === s.sherpa.tenders.find((t) => t.id === o.tenderId)?.accountId)?.placeIds[0] : undefined)
    ?? PLACES.find((p) => p.name === o.placeName)?.id ?? s.sherpa.accounts.find((a) => a.id === o.accountId)?.placeIds[0];
  const p = PLACES.find((x) => x.id === pid);
  if (!p) return null;
  const [dy, dx] = jit(o.id);
  return { lat: p.lat + dy, lng: p.lng + dx };
}

const DAY = 86400000;
export function buildPins(s: State, meId: string, mineIds: Set<string>, now: number): Pin[] {
  const out: Pin[] = [];
  /* leads: every open opportunity with a place on the map */
  for (const o of s.sherpa.opps) {
    if (!isOpen(o)) continue;
    const at = locateOpp(s, o); if (!at) continue;
    const early = ["new", "contact", "visit", "qualify"].includes(o.stage);
    out.push({
      id: o.id, layer: "lead", name: o.title, sub: o.placeName, area: o.area, ...at, oppId: o.id, accountId: o.accountId, mine: mineIds.has(o.id), hot: early,
      key: !!s.sherpa.accounts.find((a) => a.id === o.accountId)?.key,
      facts: [["Opportunity", o.id], ["Stage", o.stage[0].toUpperCase() + o.stage.slice(1)], ["Value", o.value ? `₹${(o.value / 1e5).toFixed(1)} L` : "Not priced yet"], ["Source", o.source.label]],
      why: early ? "Early stage: the first call or visit decides this one" : "In progress",
    });
  }
  /* Schindler clients: one pin per account site */
  for (const a of s.sherpa.accounts) {
    for (const pid of a.placeIds) {
      const p = PLACES.find((x) => x.id === pid); if (!p) continue;
      const lifts = s.sherpa.assets.filter((x) => x.accountId === a.id && x.placeId === pid);
      if (!lifts.length) continue;
      const soon = lifts.map((x) => x.contractEnd).filter((x): x is number => !!x).sort()[0];
      const days = soon ? Math.round((soon - now) / DAY) : undefined;
      const weak = lifts.filter((x) => x.health < 50).length;
      const [dy, dx] = jit(a.id);
      out.push({
        id: "acc-" + a.id, layer: "ours", name: a.name, sub: p.addr, area: p.area, lat: p.lat - 0.0016 + dy, lng: p.lng + 0.0016 + dx, accountId: a.id, key: a.key,
        mine: lifts.some((x) => x.owner === meId || x.sc === meId || x.mod === meId) || a.owner === meId,
        hot: days !== undefined && days < 60,
        facts: [["Lifts we service", String(lifts.length)], ["Next contract end", days === undefined ? "None" : days < 0 ? "Ended" : `${days} days`], ["Lifts needing care", String(weak)], ["Contact", `${a.contact.name}, ${a.contact.role}`]],
        why: days !== undefined && days < 60 ? `Contract ends in ${days} days: time to renew` : weak ? `${weak} lift${weak > 1 ? "s" : ""} in poor health` : "Healthy account: keep in touch",
      });
    }
  }
  /* other clients: served by another maker */
  for (const c of OTHER_CLIENTS) {
    out.push({
      id: c.id, layer: "other", name: c.name, sub: c.addr, area: c.area, lat: c.lat, lng: c.lng,
      facts: [["Served by", c.maker], ["Lifts", String(c.lifts)], ["Lift age", `${c.age} years`], ["Contract ends", c.contractEnds]],
      why: c.note, hot: c.age >= 15 || /next month|4 months/.test(c.note),
    });
  }
  return out;
}
void oppOf;
