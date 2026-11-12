"use client";
import { useEffect, useRef, useState } from "react";
import { useApp, userOf } from "@/lib/store";
import {
  AREA_NAME, GUIDE, NAMES, PRODUCT, SH, aboveLimit, accountOf, approversFor, assetBrief, assetOf, chaseEmail, chf, emailFor, ensureAccount, listPrice, offerOf,
  nowS, regionRef, variantsFor, winChance, DAY, computeNbas, isOpen, oppOf, tasksOfOpp, tenderOf, type Effect, type NbaCard,
} from "@/lib/sherpa";
import { DOC_NBAS, docFor, type Doc, type DocChip, type DocRef } from "@/lib/agents";
import type { Asset, Offer, ProductKey } from "@/lib/types";
import { Bot, Btn, Card, Icon, Pill } from "../ui";
import { DiscountGauge, OfferPill, RegionCard } from "./Offers";
import { statusLine } from "./Opps";
import { DashCard } from "../hub/parts";

interface Chip { label: string; run: () => void; tone?: "green" | "red" | "soft"; icon?: string; quiet?: boolean }
interface Ctx { assetId?: string; accountId?: string; offerId?: string; tenderId?: string; product?: ProductKey; reportId?: string; itemId?: string; nbaKey?: string; term?: number }
type Part =
  | { k: "text"; from: "bot" | "me"; text: string; why?: string[] }
  | { k: "brief"; title: string; rows: [string, string][]; sources: string[] }
  | { k: "offer"; id: string }
  | { k: "compare"; id: string }
  | { k: "region"; id: string }
  | { k: "email"; id: string; chase?: boolean }
  | { k: "approvals" }
  | { k: "pipeline" }
  | { k: "risk" }
  | { k: "account"; id: string }
  | { k: "doc"; doc: Doc }
  | { k: "mytasks" }
  | { k: "dash" }
  | { k: "oppstatus"; id: string };
type Msg = Part & { mid: number };
export interface Seed { id: number; card: NbaCard }
interface Ops { snap: () => void; card: (c: NbaCard) => void; open: (id: string) => void; opp: (id: string) => void; pick: (id: string, v: { term: number; disc: number }) => void; send: (id: string, e: { subject: string; body: string }, chase: boolean) => void; ask: (t: string) => void; go: (v: string) => void }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PRODUCT_WORDS: [RegExp, ProductKey][] = [[/moderni/i, "modernisation"], [/repair/i, "repair"], [/maintenance|take over|competitor/i, "maintenance"], [/renew/i, "renewal"]];

export function Sherpa({ seed, onOpenOffer, onOpenOpp, onOpenLead, onSnap, noDash, go }: { seed: Seed | null; onSnap?: () => void; noDash?: boolean; onOpenOffer: (id: string) => void; onOpenOpp: (id: string) => void; onOpenLead: (reportId: string) => void; go: (v: string) => void }) {
  const { s, me, mutate } = useApp();
  const app = useRef({ s, me, mutate });
  useEffect(() => { app.current = { s, me, mutate }; });
  const ctx = useRef<Ctx>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(true);
  const busyRef = useRef(true); const echoed = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const [text, setText] = useState("");
  const idc = useRef(0); const alive = useRef(true); const box = useRef<HTMLDivElement>(null);
  const started = useRef(false); const lastSeed = useRef(0);
  const stage = useRef<string>("idle");

  const push = (p: Part) => setMsgs((m) => [...m, { ...p, mid: ++idc.current } as Msg]);
  const say = (text: string, why?: string[]): Part => ({ k: "text", from: "bot", text, why });
  async function bot(parts: (string | Part)[], cs: Chip[] = [], st = "idle") {
    setChips([]); setBusy(true); stage.current = "busy";
    for (const p of parts) {
      setTyping(true); await sleep(typeof p === "string" ? Math.min(800, 300 + p.length * 4) : 420);
      if (!alive.current) return;
      setTyping(false); push(typeof p === "string" ? say(p) : p);
    }
    stage.current = st; setChips(cs); setBusy(false);
  }
  const me_ = () => app.current.me!;
  const sx = () => app.current.s.sherpa;

  /* ---------------------------------------------------------- suggestions per persona */
  function starters(): Chip[] {
    if (noDash) {
      const cards = computeNbas(app.current.s, me_()).slice(0, 3);
      return [...cards.map((c): Chip => ({ label: c.title.length > 50 ? c.title.slice(0, 48) + "…" : c.title, quiet: true, run: () => runCard(c) })), { label: "What needs my action?", tone: "green", run: () => ops.ask("What needs my action?") }];
    }
    return [{ label: "What needs my action?", tone: "green", run: () => ops.ask("What needs my action?") }, ...baseStarters().map((c) => ({ ...c, tone: undefined }))];
  }
  function baseStarters(): Chip[] {
    const r = me_().role; const q = (t: string, tone?: Chip["tone"]): Chip => ({ label: t, tone, run: () => ops.ask(t) });
    if (r === "mgr") return [q("Summarize pipeline risk for my team", "green"), q("Where do my approvals stand?"), q("Which leads have not been followed up?")];
    if (r === "lead") return [q("Where do my approvals stand?", "green"), q("Summarize pipeline risk for my team")];
    if (r === "am") return [q("One view of Deccan Tech Parks Pvt Ltd", "green"), q("Create the handover pack for Secunderabad Business Hub Pvt Ltd"), q("Which accounts are at risk this quarter?")];
    if (r === "ni") return [q("Summarize T-102", "green"), q("Open the bid checklist for T-101"), q("Prepare the counter-argument for T-103"), q("Why did we lose at Kokapet Skyline Developers?")];
    if (r === "sc") return [q("What changed in the contract for OF-906?", "green"), q("Draft the renewal"), q("Where do my approvals stand?")];
    if (r === "mod") return [q("Build the MOD case for lift 61102", "green"), q("Alert the customer about the obsolete part on lift 61102"), q("Where do my approvals stand?")];
    if (r === "ss") return [q("Complete the configuration for OF-910", "green"), q("Escalate OF-911 with context"), q("Where do my approvals stand?")];
    if (r === "mkt") return [q("Build an audience for Hyderabad Central ageing lifts", "green"), q("Which leads have not been followed up?")];
    return [q("Which of my accounts are at risk this quarter?", "green"), q("Brief me before my visit"), q("Turn the notes for lift 77300 into a repair quote"), q("Where do my approvals stand?")];
  }

  /* ---------------------------------------------------------- entities */
  function entity(t: string): Partial<Ctx> {
    const x = sx(); const o: Partial<Ctx> = {};
    const num = t.match(/\b(\d{5})\b/)?.[1];
    if (num) { const a = x.assets.find((q) => q.id === "a" + num); if (a) { o.assetId = a.id; o.accountId = a.accountId; } }
    const of = t.match(/OF-\d+/i)?.[0].toUpperCase(); if (of && offerOf(app.current.s, of)) o.offerId = of;
    const sl = t.match(/SL-[A-Z0-9]+/i)?.[0].toUpperCase(); if (sl) o.reportId = sl;
    const lc = t.toLowerCase();
    const tid = t.match(/\bT-\d+/i)?.[0].toUpperCase(); if (tid && tenderOf(app.current.s, tid)) { o.tenderId = tid; o.accountId = tenderOf(app.current.s, tid)!.accountId; }
    const acc = lc.includes("secunderabad business") || lc.includes("secbiz") ? "secbiz" : lc.includes("deccan") || lc.includes("tech park") ? "deccan" : lc.includes("cyber") ? "cyber" : lc.includes("banjara") || lc.includes("mall") ? "banjara" : lc.includes("kakatiya") || lc.includes("warangal") ? "kakatiya" : lc.includes("kokapet") ? "kokapet" : lc.includes("telangana state") || lc.includes("tsic") || lc.includes("secretariat") ? "tsic" : null;
    if (acc && !o.accountId) { o.accountId = acc; const a = x.assets.find((q) => q.accountId === acc); if (a && !o.assetId) o.assetId = a.id; }
    for (const [re, p] of PRODUCT_WORDS) if (re.test(t)) { o.product = p; break; }
    return o;
  }

  /* ---------------------------------------------------------- flows */
  function pickEntity(then: () => void, label: string) {
    const x = sx(); const mine = x.assets.filter((a) => a.owner === me_().id); const list = (mine.length ? mine : x.assets).slice(0, 4);
    void bot([label], list.map((a) => ({ label: a.label.split(" · ").slice(0, 2).join(" · "), run: () => { ctx.current.assetId = a.id; ctx.current.accountId = a.accountId; then(); } })), "idle");
  }

  function brief() {
    const c = ctx.current;
    if (!c.assetId && !c.accountId) return pickEntity(brief, "Which lift or account should I brief you on?");
    const a = assetOf(app.current.s, c.assetId) ?? sx().assets.find((q) => q.accountId === c.accountId);
    if (!a) return void bot(["I could not find that unit."], starters());
    const b = assetBrief(app.current.s, a); c.assetId = a.id; c.accountId = a.accountId;
    const prod = a.contractEnd ? "renewal" : "maintenance";
    void bot([say(`Here is your brief for ${a.label.split(" · ")[0]}. The main point: ${a.contractEnd ? `the contract ends in ${Math.round((a.contractEnd - nowS(app.current.s)) / DAY)} days` : "there is no contract yet"}${a.health < 45 ? " and the health score is low" : ""}.`, ["Contract and service data come from NewCRM and SAP (mock).", "Health score is a fixed rule: callbacks, faults and age."]), { k: "brief", ...b }], [
      { label: a.contractEnd ? "Draft the renewal offer" : "Draft a maintenance offer", tone: "green", run: () => { ctx.current.product = prod; void startOffer(); } },
      { label: "Check the price in this area", run: () => void priceCheck() },
      { label: "One view of the account", run: () => void accountView() },
      { label: "Not now", run: () => void bot(["Okay. I am here when you need me."], starters()) },
    ]);
  }

  async function startOffer() {
    const c = ctx.current; const s0 = app.current.s;
    const rep = c.reportId ? s0.reports.find((r) => r.id === c.reportId) : undefined;
    const tn = tenderOf(s0, c.tenderId);
    if (rep || tn) c.assetId = undefined;
    if (!rep && !tn && !c.assetId && !c.accountId) return pickEntity(() => void startOffer(), "Which lift or account is the offer for?");
    const asset = tn ? undefined : assetOf(s0, c.assetId); const acc = accountOf(s0, tn?.accountId ?? c.accountId ?? asset?.accountId);
    const area = tn?.area ?? rep?.area ?? acc?.area ?? "HYW";
    const product: ProductKey = tn ? "newinstall" : c.product ?? (rep ? "maintenance" : asset?.contractEnd ? "renewal" : asset ? "maintenance" : "renewal");
    c.product = product;
    const ref = regionRef(s0, area, product);
    const customer = rep?.placeName ?? acc?.name ?? "the customer";
    if (!ref.sells) return void bot([`We do not sell ${PRODUCT[product].label.toLowerCase()} in ${AREA_NAME[area]}. I will not draft an offer there without the regional lead.`], starters());
    const disc = Math.min(GUIDE.seller, Math.round(ref.avgDiscount));
    const term = PRODUCT[product].yearly ? 3 : 1;
    const why = [`List price: ${chf(PRODUCT[product].list)} per year base × ${AREA_NAME[area]} price level.`, `Region reference: ${ref.count} offers in 12 months, ${ref.winRate}% won, average discount ${ref.avgDiscount.toFixed(0)}%.`, `I stay within your ${GUIDE.seller}% limit so you can send it without approval.`];
    await bot([say(`${PRODUCT[product].label} for ${customer}. In ${AREA_NAME[area]} we made ${ref.count} similar offers in the last 12 months and won ${ref.winRate}%. I suggest ${PRODUCT[product].yearly ? `${term} years at ` : ""}${disc}% off, about ${chf(listPrice(area, product, term) * (1 - disc / 100))}${PRODUCT[product].yearly ? ` over ${term} years` : ""}.`, why)], [
      { label: "Use this suggestion", tone: "green", run: () => makeOffer(area, product, term, disc) },
      { label: "Customer wants more: 15% off", run: () => makeOffer(area, product, term, 15) },
      ...(PRODUCT[product].yearly ? [{ label: "Choose term and discount", run: () => askTerm(area, product) }] : []),
    ]);
  }
  function askTerm(area: string, product: ProductKey) {
    void bot(["For how many years?"], [1, 3, 5].map((t) => ({ label: `${t} year${t > 1 ? "s" : ""}`, run: () => askDiscount(area, product, t) })));
  }
  function askDiscount(area: string, product: ProductKey, term: number) {
    void bot([`And the discount? ${GUIDE.seller}% you can send alone, up to ${GUIDE.manager}% the manager approves, above that needs the regional lead in writing, outside this app.`], [0, 5, 10, 15, 25].map((d) => ({ label: d === 0 ? "No discount" : `${d}%`, run: () => makeOffer(area, product, term, d) })));
  }
  function makeOffer(area: string, product: ProductKey, term: number, disc: number) {
    const c = ctx.current; const a = app.current; const id = `OF-${a.s.sherpa.seq}`;
    const rep = c.reportId ? a.s.reports.find((r) => r.id === c.reportId) : undefined;
    a.mutate((st) => {
      const r = c.reportId ? st.reports.find((x) => x.id === c.reportId) : undefined;
      const accountId = c.accountId ?? (r ? ensureAccount(st, r, a.me!.id).id : accountOf(st, assetOf(st, c.assetId)?.accountId)?.id ?? "");
      SH.makeOffer(st, { id, accountId, assetId: c.assetId, area, product, term, discountPct: disc, by: a.me!.id, fromNba: c.nbaKey, source: r && c.itemId ? { reportId: r.id, itemId: c.itemId } : undefined });
    });
    c.offerId = id; void rep;
    const need = approversFor(disc);
    void bot([say(`Here is the draft. Drag the discount to try other terms: I check the guideline as you go.`, [`${disc}% off ${aboveLimit(disc) ? `is above the ${GUIDE.manager}% a manager can approve, so it cannot be sent for approval here` : need.length ? `is above the ${GUIDE.seller}% limit, so ${need.map((u) => NAMES[u]).join(" and ")} must approve` : `is within the ${GUIDE.seller}% limit, so no approval is needed`}.`, "Price = list price × area level × term, minus the discount."]), { k: "offer", id }], offerChips());
  }
  function offerChips(): Chip[] {
    return [
      { label: "Compare 3 options", icon: "chart", run: () => void compare() },
      { label: "Check the price in this area", run: () => void priceCheck() },
      { label: "Send it on", tone: "green", icon: "send", run: () => void proceed() },
    ];
  }
  function current(): Offer | undefined { return offerOf(app.current.s, ctx.current.offerId); }

  async function proceed() {
    const o = current(); if (!o) return void bot(["There is no offer yet. Tell me what to draft."], starters());
    if (o.status === "draft" || o.status === "changes") {
      if (aboveLimit(o.discountPct)) return void bot([say(`${o.discountPct}% is more than a manager can approve (${GUIDE.manager}%). Lower the discount, or get the regional lead's written approval outside this app.`)], [{ label: "Compare 3 options", run: () => void compare() }]);
      const need = approversFor(o.discountPct);
      app.current.mutate((st) => SH.submit(st, o.id, me_().id));
      if (need.length) return void bot([say(`Sent for approval to ${need.map((u) => NAMES[u]).join(" and then ")}. ${o.discountPct}% is above the ${GUIDE.seller}% guideline. I will tell you here and in your Today feed when there is a decision.`, ["Guideline: up to 10% you send alone; up to 20% manager; above 20% the regional lead too."])], [
        { label: "Where do my approvals stand?", run: () => ops.ask("Where do my approvals stand?") }, { label: "Open the offer", run: () => onOpenOffer(o.id) }, { label: "Back to my day", run: () => ops.ask("What needs my action?") }]);
      return void emailStep(false);
    }
    if (o.status === "approved") return void emailStep(false);
    if (o.status === "awaiting") return void bot(["It is still waiting for approval. You can remind the approver on the offer page."], [{ label: "Open the offer", run: () => onOpenOffer(o.id) }]);
    if (o.status === "sent") return void emailStep(true);
    void bot([`This offer is ${o.status}.`], starters());
  }
  function emailStep(chase: boolean) {
    const o = current(); if (!o) return void bot(["Which offer is the email for?"], starters());
    void bot([say(chase ? "Here is a follow-up. It is short and offers to adjust the start date." : "Here is the email. Edit anything, then press send. Nothing goes out until you do.", ["Written from the offer, the customer contact and the account history."]), { k: "email", id: o.id, chase }], [{ label: "Back to my day", run: () => ops.ask("What needs my action?") }, { label: "Compare 3 options", run: () => void compare() }]);
  }

  async function compare() {
    const c = ctx.current; const o = current();
    if (!o) { if (!c.assetId && !c.accountId && !c.reportId) return pickEntity(() => { void startOffer(); }, "Which lift or account should I compare offers for?"); await bot(["Let me draft one first, then we can compare."]); return void startOffer(); }
    await bot([say("Three ways to offer it, checked against the guideline and what we won before in this area.", ["Win chance = share of past offers won at about this discount, in this area and product.", "Recommended = highest win chance × price."]), { k: "compare", id: o.id }], [
      { label: "Check the price in this area", run: () => void priceCheck() }, { label: "Send it on", tone: "green", run: () => void proceed() }]);
  }
  async function priceCheck() {
    const o = current();
    if (!o) {
      const c = ctx.current; const acc = accountOf(app.current.s, c.accountId); const area = acc?.area ?? "HYW"; const product = c.product ?? "renewal"; const ref = regionRef(app.current.s, area, product);
      return void bot([say(ref.sells ? `We sell ${PRODUCT[product].label.toLowerCase()} in ${AREA_NAME[area]}: ${ref.count} offers in 12 months, ${ref.winRate}% won, average ${chf(ref.avg)}${PRODUCT[product].yearly ? " per year" : ""}.` : `We do not sell this in ${AREA_NAME[area]}.`)], [{ label: "Draft an offer", tone: "green", run: () => void startOffer() }]);
    }
    await bot([say("Here is the price check for this area.", ["Reference = our own offers in this area and product, last 12 months."]), { k: "region", id: o.id }], [{ label: "Compare 3 options", run: () => void compare() }, { label: "Send it on", tone: "green", run: () => void proceed() }]);
  }
  function accountView() {
    const c = ctx.current; const id = c.accountId; if (!id) return pickEntity(accountView, "Which account?");
    void bot([say("One view of the account: all units, offers and leads, with overlaps flagged.", ["Joins NewCRM accounts, installed base, open offers and Snap & Lead leads."]), { k: "account", id }], [
      { label: "Brief me on the weakest unit", run: () => { const a = sx().assets.filter((q) => q.accountId === id).sort((p, q) => p.health - q.health)[0]; if (a) { ctx.current.assetId = a.id; brief(); } } },
      { label: "Draft the renewal", run: () => { ctx.current.product = "renewal"; void startOffer(); } }]);
  }
  function myTasks() {
    void bot([say("Here is everything waiting on you, most urgent first.", ["Reads the open to-dos assigned to you across every opportunity.", "Each one was handed to you by a colleague or by a rule such as a 24-hour accept limit."]), { k: "mytasks" }], [{ label: "Back to my day", tone: "green", run: () => ops.ask("What needs my action?") }]);
  }
  function whereIs(t: string) {
    const x = sx(); const words = t.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 3 && !["where", "status", "waiting", "what", "this", "that", "with", "about", "lead", "tender", "offer"].includes(w));
    const score = (o: { id: string; title: string; placeName: string }) => words.filter((w) => `${o.id} ${o.title} ${o.placeName}`.toLowerCase().includes(w)).length;
    const best = x.opps.filter((o) => score(o) > 0).sort((p, q) => score(q) - score(p))[0] ?? x.opps.filter((o) => isOpen(o) && o.owner === me_().id)[0];
    if (!best) return void bot(["I could not find an opportunity like that. Try the place name, for example “where is the Kokapet lead?”."], starters());
    void bot([say(`${best.id} is at the "${best.stage}" stage.`, ["Stage and whose move it is come from the open to-dos on the opportunity."]), { k: "oppstatus", id: best.id }], [{ label: "Open the opportunity", tone: "green", run: () => onOpenOpp(best.id) }, { label: "What needs my action?", run: () => ops.ask("What needs my action?") }]);
  }
  function approvals() {
    void bot([say("Here is where your approvals stand.", ["Reads the approval log on every offer."]), { k: "approvals" }], [{ label: "Open offers", run: () => go("offers") }, { label: "Back to my day", run: () => ops.ask("What needs my action?") }]);
  }
  function pipeline() {
    const now = nowS(app.current.s);
    const st = sx().offers.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY);
    void bot([say(`${st.length} deal${st.length === 1 ? "" : "s"} have not moved in 21 days. Here is where to step in.`, ["Stalled = sent, no activity for 21+ days.", "Totals only: no ranking of people."]), { k: "pipeline" }], [
      { label: `Nudge the owners (${st.length})`, tone: "green", run: () => { app.current.mutate((x) => st.forEach((o) => { SH.remind(x, o.id, me_().id); x.sherpa.offers.find((q) => q.id === o.id)?.log.push({ t: nowS(x), by: me_().name, text: "Manager nudged the owner" }); })); void bot(["Nudged. They will see it in their Today feed."], starters()); } },
      { label: "Open offers", run: () => go("offers") }]);
  }
  function risk() {
    void bot([say("These units look most at risk this quarter.", ["Health below 45 or a contract ending within 90 days."]), { k: "risk" }], [{ label: "Brief me on Lift 74821", run: () => ops.ask("Brief me on lift 74821") }, { label: "Draft the renewal", run: () => ops.ask("Draft the renewal for lift 74821") }]);
  }
  function help() {
    void bot(["I am SHERPA. I can brief you on a unit or account, draft offers and emails, compare options against what we sold in each area, send discounts for approval, and keep an eye on stalled deals. Tap a suggestion or just type."], starters());
  }

  /* ---------------------------------------------------------- agent documents */
  function chipFor(c: DocChip): Chip {
    if (c.effect) {
      const e = c.effect as Effect;
      return { label: c.label, tone: c.tone, run: () => { app.current.mutate((st) => SH.apply(st, me_().id, e)); void bot([say(c.done ?? "Done. Written to NewCRM.", ["Every chip that changes something writes a line to the NewCRM log. Admin can see it."])], [{ label: "Back to my day", tone: "green", run: () => ops.ask("What needs my action?") }, { label: "Ask something else", run: () => help() }]); } };
    }
    if (c.ask) return { label: c.label, tone: c.tone, run: () => handle(c.ask!) };
    return { label: c.label, tone: c.tone, run: () => void bot(["Okay. Nothing changed."], starters()) };
  }
  function runDoc(no: number, ref: DocRef) {
    const d = docFor(app.current.s, no, ref, me_());
    if (!d) return void bot(["I could not find the data for that. Tell me which unit, tender or account you mean."], starters());
    void bot([say(d.intro, d.why), { k: "doc", doc: d }], [...d.chips.map(chipFor), { label: "Back to my day", run: () => ops.ask("What needs my action?") }]);
  }
  function docIntent(lc: string): { no: number; ref: DocRef } | null {
    const c = ctx.current; const x = sx(); const me = me_();
    const mine = (f: (a: Asset) => boolean) => x.assets.find((a) => a.id === c.assetId && f(a)) ?? x.assets.find((a) => f(a) && (a.owner === me.id || a.sc === me.id || a.mod === me.id)) ?? x.assets.find(f);
    const myTender = () => tenderOf(app.current.s, c.tenderId) ?? x.tenders.find((t) => t.owner === me.id) ?? x.tenders[0];
    const key = ctx.current.nbaKey;
    if (/what changed|contract change/.test(lc)) { const o = offerOf(app.current.s, c.offerId) ?? x.offers.find((q) => q.contractChange); return o ? { no: 6, ref: { offerId: o.id, key } } : null; }
    if (/mod case|price this moderni|business case/.test(lc)) { const a = mine((q) => q.ageYears >= 20); return a ? { no: 11, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/summari[sz]e (this )?(t-\d+|tender)|tender summary/.test(lc)) { const t = myTender(); return t ? { no: 15, ref: { tenderId: t.id, key } } : null; }
    if (/checklist/.test(lc)) { const t = myTender(); return t ? { no: 13, ref: { tenderId: t.id, key } } : null; }
    if (/counter.?argument|competitor spec/.test(lc)) { const t = x.tenders.find((q) => q.id === c.tenderId && q.competitorSpec) ?? x.tenders.find((q) => q.competitorSpec); return t ? { no: 17, ref: { tenderId: t.id, key } } : null; }
    if (/why did we lose|loss history|why we lost/.test(lc)) { const t = x.tenders.find((q) => q.id === c.tenderId) ?? x.tenders.find((q) => q.lossNote); return t ? { no: 14, ref: { tenderId: t.id, accountId: t.accountId, key } } : null; }
    if (/notes? (for|to)|repair quote from|technician note/.test(lc) && /repair|notes/.test(lc)) { const a = mine((q) => !!q.techNote); return a ? { no: 10, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/complete (this |the )?config/.test(lc)) { const o = offerOf(app.current.s, c.offerId) ?? x.offers.find((q) => q.missing?.length); return o ? { no: 21, ref: { offerId: o.id, key } } : null; }
    if (/escalate/.test(lc)) { const o = offerOf(app.current.s, c.offerId) ?? x.offers.find((q) => q.status === "awaiting"); return o ? { no: 22, ref: { offerId: o.id, key } } : null; }
    if (/audience|campaign/.test(lc) && me.role === "mkt") { const seg = /west|hitec|gachibowli/.test(lc) ? "HYW" : /secunderabad|east/.test(lc) ? "SEC" : "HYC"; return { no: 26, ref: { segment: seg, key } }; }
    if (/handover pack|cross.?sell/.test(lc)) { const acc = c.accountId ?? x.accounts.find((q) => q.key && Object.values(q.lines).filter(Boolean).length === 1)?.id; return acc ? { no: 25, ref: { accountId: acc, key } } : null; }
    if (/not (been )?followed up|follow.?ed up/.test(lc) && me.role === "mkt") return { no: 27, ref: { key } };
    if (/corrected obr|correct the obr|\bobr\b/.test(lc)) { const a = mine((q) => !!q.contractChangedAfterObr); return a ? { no: 2, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/joint|align with mod/.test(lc)) { const a = mine((q) => (q.obr ?? 0) >= 5); return a ? { no: me.role === "mod" ? 4 : 5, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/obsolete|alert the customer/.test(lc)) { const a = mine((q) => !!q.obsolete); return a ? { no: 12, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/retention visit|prepare the visit/.test(lc)) { const a = mine((q) => q.callbacksPrev90d > 0 && q.callbacks90d / q.callbacksPrev90d >= 1.4); return a ? { no: 8, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/plan the renewal|renewal plan/.test(lc)) { const a = mine((q) => q.health < 45); return a ? { no: 7, ref: { assetId: a.id, accountId: a.accountId, key } } : null; }
    if (/coaching/.test(lc)) return x.flags.coaching ? { no: 20, ref: { key } } : null;
    if (/account review/.test(lc)) { const acc = c.accountId; return acc ? { no: 24, ref: { accountId: acc, key } } : null; }
    return null;
  }

  /* ---------------------------------------------------------- router */
  function handle(t: string) {
    const lc = t.toLowerCase();
    Object.assign(ctx.current, entity(t));
    const c = ctx.current;
    if (/open the approval brief|open (the )?offer/.test(lc) && c.offerId) return onOpenOffer(c.offerId);
    if (/remind the approver/.test(lc) && c.offerId) { app.current.mutate((st) => SH.remind(st, c.offerId!, me_().id)); return void bot([say("Reminded. The approver has a message with the context.")], [{ label: "Back to my day", run: () => ops.ask("What needs my action?") }]); }
    const di = docIntent(lc); if (di) return runDoc(di.no, di.ref);
    if (/open lead/.test(lc) && c.reportId) return onOpenLead(c.reportId);
    if (/needs? my action|waiting on me|my to.?do|my tasks|what should i do/.test(lc)) return myTasks();
    if (/where is|where.s|status of|who is .*(waiting|working)|why .*(delay|stuck|late)|what.s happening/.test(lc)) return whereIs(t);
    if (/\bapprovals?\b|stand\b/.test(lc)) return approvals();
    if (/pipeline|team|stalled/.test(lc) && !/draft|offer/.test(lc)) return pipeline();
    if (/not (been )?followed up|follow.?ed up|overdue lead/.test(lc)) return void bot(["The exceptions list has them, with reassign and nudge."], [{ label: "Open exceptions", tone: "green", run: () => go("exceptions") }]);
    if (/at risk|risk this/.test(lc)) return risk();
    if (/(follow.?up|chase)/.test(lc) && /email|draft|write/.test(lc)) { const o = c.offerId ? offerOf(app.current.s, c.offerId) : undefined; if (!o) return void bot(["Which offer should I follow up on?"], starters()); return emailStep(o.status === "sent"); }
    if (/email|mail/.test(lc)) return emailStep(false);
    if (/compare|options|variants/.test(lc)) return void compare();
    if (/one view|account view/.test(lc)) return accountView();
    if (/price|guideline|region|how much/.test(lc) && !/draft|offer for/.test(lc)) return void priceCheck();
    if (/draft|offer|renew|propos|quote|maintenance|repair|moderni/.test(lc)) return void startOffer();
    if (/brief|prepare|visit|tell me about|what do we know/.test(lc)) return brief();
    if (/^(hi|hello|hey|help)\b|what can you/.test(lc)) return help();
    help();
  }
  const ops: Ops = {
    open: onOpenOffer, opp: onOpenOpp,
    go,
    snap: () => onSnap?.(),
    card: (c) => { if (busyRef.current) return; runCard(c); },
    ask: (t) => { if (busyRef.current) return; setChips([]); if (!echoed.current) push({ k: "text", from: "me", text: t }); handle(t); },
    pick: (id, v) => { app.current.mutate((st) => SH.setTerms(st, id, me_().id, { term: v.term, discountPct: v.disc })); },
    send: (id, e, chase) => {
      const was = offerOf(app.current.s, id); if (!was) return;
      app.current.mutate((st) => { if (chase) SH.chase(st, id, me_().id); else SH.send(st, id, me_().id, e); });
      void bot([say(chase ? "Follow-up sent. I logged it on the offer." : `Sent to ${accountOf(app.current.s, was.accountId)?.contact.name}. I set a follow-up for 14 days. If nothing happens by then it shows up in your Today feed.`, ["Quote idle 14+ days is a Next Best Action. It will appear automatically."])], [
        { label: "Back to my day", tone: "green", run: () => ops.ask("What needs my action?") }, { label: "Open the offer", run: () => onOpenOffer(id) }, { label: "Draft something else", run: () => help() }]);
    },
  };

  /* ---------------------------------------------------------- lifecycle */
  useEffect(() => {
    alive.current = true;
    const t = setTimeout(() => {
      if (started.current) return; started.current = true;
      if (seed) return;
      void bot([`Hi ${me_().name.split(" ")[0]}. ${noDash ? "Here is what I would do next. Or ask me anything, or use Ask on a row in the table." : "Here is your day. Tap a row or a suggestion, or just ask."}`, ...(noDash ? [] : [{ k: "dash" as const }])], starters());
    }, 0);
    return () => { alive.current = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const last = msgs[msgs.length - 1]; box.current?.scrollTo({ top: last?.k === "dash" && msgs.length <= 4 ? 0 : box.current.scrollHeight, behavior: "smooth" }); }, [msgs, typing, chips]);
  useEffect(() => {
    if (!seed || seed.id === lastSeed.current) return;
    const t = setTimeout(() => {
      if (lastSeed.current === seed.id) return; lastSeed.current = seed.id;
      runCard(seed.card);
    }, 60);
    return () => clearTimeout(t);
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  function runCard(c: NbaCard) {
    {
      ctx.current = { assetId: c.assetId, accountId: c.accountId, offerId: c.offerId, tenderId: c.tenderId, reportId: c.reportId, itemId: c.itemId, nbaKey: c.key };
      if (c.no === 3) ctx.current.product = "renewal"; if (c.no === 9 || c.no === 23) ctx.current.product = "maintenance";
      setChips([]); push({ k: "text", from: "me", text: c.prompt });
      const doc = DOC_NBAS.includes(c.no) && !(c.no === 27 && me_().role !== "mkt") && !(c.no === 22 && c.kind === "approval");
      if (doc) runDoc(c.no, { key: c.key, assetId: c.assetId, accountId: c.accountId, tenderId: c.tenderId, offerId: c.offerId, segment: c.segment, mleadId: c.mleadId });
      else handle(c.prompt);
    }
  }

  const send = (raw: string) => { const t = raw.trim(); if (!t || busy) return; setText(""); ops.ask(t); };
  const onChip = (c: Chip) => { if (busy) return; setChips([]); if (!c.quiet) { push({ k: "text", from: "me", text: c.label }); echoed.current = true; } try { c.run(); } finally { echoed.current = false; } };

  return (
    <div className="absolute inset-0 flex flex-col bg-surface">
      <div ref={box} className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden"><div className="mx-auto w-full max-w-3xl space-y-3.5 px-3 py-5 @3xl:px-4">
        {msgs.map((m) => <Bubble key={m.mid} m={m} ops={ops} />)}
        {typing && <div className="flex items-center"><div className="sheet flex gap-1 px-3.5 py-3"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" /></div></div>}
        {chips.length > 0 && !busy && <div className="pop flex flex-wrap gap-2 pt-1">{chips.map((c, k) => <button key={k} onClick={() => onChip(c)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-medium transition hover:bg-surface ${c.tone === "green" ? "border-brand bg-brand text-white hover:bg-brand-dark" : "border-line bg-white"}`}>{c.icon && <Icon n={c.icon} s={14} />}{c.label}</button>)}</div>}
      </div></div>
      <div className="shrink-0 bg-surface"><div className="mx-auto w-full max-w-3xl px-3 pb-2 pt-2.5">
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-1 rounded-lg border border-brand/60 bg-white p-1.5 focus-within:border-brand">
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder={busy ? "SHERPA is working…" : "Ask anything, or add a photo of a lift…"} className="min-h-10 min-w-0 flex-1 bg-transparent px-2.5 text-[14px] outline-none placeholder:text-muted disabled:opacity-60" />
          {onSnap && <button type="button" aria-label="Snap a lift" onClick={onSnap} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/70 hover:bg-surface"><Icon n="camera" s={19} /></button>}
          <button type="submit" aria-label="Send" disabled={busy || !text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-white disabled:opacity-35"><Icon n="send" s={17} /></button>
        </form>
        <div className="mt-1.5 hidden text-center text-[11.5px] text-muted @xl:block">SHERPA · Simulated agents, mock NewCRM data · Nothing is sent without your confirmation</div>
      </div></div>
    </div>
  );
}

/* ------------------------------------------------------------------ message views */
function Bubble({ m, ops }: { m: Msg; ops: Ops }) {
  if (m.k === "text") {
    if (m.from === "me") return <div className="pop flex justify-end"><div className="max-w-[80%] rounded-lg bg-brand px-4 py-2.5 text-[14px] leading-[21px] text-white">{m.text}</div></div>;
    return (
      <div className="pop"><div>
        <div className="sheet whitespace-pre-wrap break-words px-4 py-3 text-[14px] leading-[21px]">{m.text}</div>
        {m.why && <details className="group mt-1 px-1 text-[12px] text-muted"><summary className="cursor-pointer list-none font-medium hover:text-ink [&::-webkit-details-marker]:hidden"><span className="inline-block transition group-open:rotate-90">›</span> Why this answer</summary><ul className="mt-1 list-disc space-y-0.5 pl-5">{m.why.map((w, k) => <li key={k}>{w}</li>)}</ul></details>}
      </div></div>
    );
  }
  return <div className="pop min-w-0"><CardView m={m} ops={ops} /></div>;
}

function CardView({ m, ops }: { m: Msg; ops: Ops }) {
  const { s, me, mutate, now } = useApp();
  if (m.k === "brief") return <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="doc" s={14} /></span>{m.title}</div>{m.rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-line/70 py-2 text-[13px] last:border-0"><span className="shrink-0 text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}<div className="mt-2 text-[11px] text-muted">Sources: {m.sources.join(" · ")}</div></Card>;
  if (m.k === "doc") return <DocCard doc={m.doc} />;
  if (m.k === "dash") return <DashCard onOpen={ops.opp} onDo={ops.card} go={ops.go} />;
  if (m.k === "mytasks") {
    const mine = s.sherpa.tasks.filter((t) => !t.done && t.forUser === me!.id).sort((a, b) => a.due - b.due);
    return <Card className="divide-y divide-line">{mine.length === 0 && <div className="p-4 text-sm text-muted">Nothing is waiting on you.</div>}{mine.slice(0, 8).map((t) => { const o = oppOf(s, t.oppId); return <button key={t.id} onClick={() => o && ops.opp(o.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{t.title}</div><div className="text-xs text-muted">{o ? o.id + " · " + o.title : "Task"} · from {NAMES[t.by]} · {t.due < now ? "overdue" : "due in " + Math.max(0, Math.round((t.due - now) / DAY)) + " days"}</div></div><Icon n="chev" s={14} /></button>; })}</Card>;
  }
  if (m.k === "oppstatus") {
    const o = oppOf(s, m.id); if (!o) return null; const st = statusLine(s, o, me!.id, now);
    return <Card className="p-4"><div className="text-[15px] font-semibold">{o.title}</div><div className="text-xs text-muted">{o.id} · {o.placeName} · owner {NAMES[o.owner]}</div><div className={"mt-3 rounded-xl px-3 py-2 text-[13px] " + (st.mine ? "bg-amber-50 text-amber-900" : "bg-surface")}>{st.text}</div>{tasksOfOpp(s, o.id).length > 0 && <ul className="mt-3 space-y-1.5 text-[13px]">{tasksOfOpp(s, o.id).map((t) => <li key={t.id} className="flex justify-between gap-3"><span>{t.title}</span><span className="shrink-0 text-xs text-muted">{NAMES[t.forUser ?? ""]}</span></li>)}</ul>}</Card>;
  }
  if (m.k === "offer") return <OfferCard id={m.id} />;
  if (m.k === "region") { const o = offerOf(s, m.id); return o ? <Card className="p-4"><RegionCard o={o} /></Card> : null; }
  if (m.k === "compare") return <CompareCard id={m.id} ops={ops} />;
  if (m.k === "email") return <EmailCard id={m.id} chase={m.chase} ops={ops} />;
  if (m.k === "approvals") {
    const mgr = me!.role === "mgr" || me!.role === "lead";
    const list = s.sherpa.offers.filter((o) => (mgr ? o.approvals.length > 0 && ["awaiting", "approved", "changes", "rejected"].includes(o.status) : o.createdBy === me!.id && (o.approvals.length > 0 || ["draft", "approved"].includes(o.status))));
    return <Card className="divide-y divide-line">{list.length === 0 && <div className="p-4 text-sm text-muted">No approvals open.</div>}{list.slice(0, 6).map((o) => <button key={o.id} onClick={() => ops.open(o.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{accountOf(s, o.accountId)?.name} · {o.id}</div><div className="text-xs text-muted">{o.discountPct}% off · {chf(o.price)}{o.approvals.length ? ` · ${o.approvals.map((x) => `${NAMES[x.by]}: ${x.status}`).join(", ")}` : ""}</div></div><OfferPill o={o} /></button>)}</Card>;
  }
  if (m.k === "pipeline") {
    const st = s.sherpa.offers.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY);
    return <Card className="divide-y divide-line">{st.length === 0 && <div className="p-4 text-sm text-muted">Nothing stalled.</div>}{st.map((o) => <button key={o.id} onClick={() => ops.open(o.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{accountOf(s, o.accountId)?.name}</div><div className="text-xs text-muted">{o.title} · idle {Math.floor((now - o.lastActivity) / DAY)} days · {userOf(o.createdBy)?.name}</div></div><b className="num text-sm">{chf(o.price)}</b></button>)}{st.length > 0 && <div className="flex justify-between p-3 text-[13px]"><span className="text-muted">At stake</span><b className="num">{chf(st.reduce((a, o) => a + o.price, 0))}</b></div>}</Card>;
  }
  if (m.k === "risk") {
    const list = s.sherpa.assets.filter((a) => a.health < 45 || (a.contractEnd && a.contractEnd - now < 90 * DAY && a.health < 60)).sort((p, q) => p.health - q.health);
    return <Card className="divide-y divide-line">{list.map((a) => <div key={a.id} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{accountOf(s, a.accountId)?.name}</div><div className="text-xs text-muted">{a.label.split(" · ")[0]} · {a.contractEnd ? `contract ends in ${Math.round((a.contractEnd - now) / DAY)} days` : "no contract"} · {a.callbacks90d} callbacks in 90 days</div></div><Pill tone={a.health < 45 ? "red" : "amber"}>Health {a.health}</Pill></div>)}</Card>;
  }
  if (m.k === "account") {
    const a = accountOf(s, m.id); if (!a) return null;
    const units = s.sherpa.assets.filter((x) => x.accountId === a.id); const offers = s.sherpa.offers.filter((o) => o.accountId === a.id);
    const leads = s.reports.filter((r) => r.placeId && a.placeIds.includes(r.placeId) && r.status === "sent");
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2"><div><div className="text-[15px] font-semibold">{a.name}</div><div className="text-xs text-muted">{AREA_NAME[a.area]} · {a.contact.name}, {a.contact.role}</div></div>{a.key && <Pill tone="amber">Key account</Pill>}</div>
        <div className="mt-1 text-xs text-muted">Last activity {Math.floor((now - a.lastActivity) / DAY)} days ago</div>
        <div className="mt-3 t-label">Units</div>
        {units.map((u) => <div key={u.id} className="flex items-center justify-between border-b border-line/70 py-1.5 text-[13px] last:border-0"><span>{u.label.split(" · ")[0]}</span><span className="text-muted">{u.contractEnd ? `ends in ${Math.round((u.contractEnd - now) / DAY)} d` : "no contract"}</span><Pill tone={u.health < 45 ? "red" : u.health < 70 ? "amber" : "green"}>Health {u.health}</Pill></div>)}
        <div className="mt-3 t-label">Offers and leads</div>
        {offers.length + leads.length === 0 && <div className="text-[13px] text-muted">None open.</div>}
        {offers.map((o) => <button key={o.id} onClick={() => ops.open(o.id)} className="flex w-full items-center justify-between py-1.5 text-left text-[13px]"><span>{o.id} · {o.title}</span><OfferPill o={o} /></button>)}
        {leads.map((r) => <div key={r.id} className="flex items-center justify-between py-1.5 text-[13px]"><span>{r.id} · {r.headline}</span><Pill tone="blue">Snap &amp; Lead</Pill></div>)}
      </Card>
    );
  }
  void mutate;
  return null;
}

function OfferCard({ id }: { id: string }) {
  const { s, me, mutate } = useApp();
  const o = offerOf(s, id); if (!o) return <Card className="p-4 text-sm text-muted">Creating the draft…</Card>;
  const acc = accountOf(s, o.accountId); const editable = ["draft", "changes"].includes(o.status) && o.createdBy === me!.id;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[15px] font-semibold">{acc?.name}</div><div className="text-xs text-muted">{o.id} · {o.title} · {AREA_NAME[o.area]}</div></div><OfferPill o={o} /></div>
      <div className="mt-3 flex items-end justify-between gap-3"><div><div className="num text-2xl font-semibold tracking-tight">{chf(o.price)}</div><div className="text-xs text-muted">{PRODUCT[o.product].yearly ? `${chf(o.price / o.term)} per year × ${o.term}` : "one-off"}{o.discountPct ? ` · list ${chf(o.listPrice)}` : ""}</div></div></div>
      <div className="mt-3"><DiscountGauge pct={o.discountPct} /></div>
      {editable && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3">
        {PRODUCT[o.product].yearly && <select value={o.term} onChange={(e) => mutate((st) => SH.setTerms(st, o.id, me!.id, { term: Number(e.target.value) }))} className="min-h-9 rounded-lg border border-line bg-white px-2 text-[13px]">{[1, 3, 5].map((t) => <option key={t} value={t}>{t} year{t > 1 ? "s" : ""}</option>)}</select>}
        <label className="flex min-w-40 flex-1 items-center gap-2 text-xs text-muted">Discount<input type="range" min={0} max={30} value={o.discountPct} onChange={(e) => mutate((st) => SH.setTerms(st, o.id, me!.id, { discountPct: Number(e.target.value) }))} className="flex-1 accent-[#e3001b]" /></label>
      </div>}
    </Card>
  );
}

function CompareCard({ id, ops }: { id: string; ops: Ops }) {
  const { s, me } = useApp();
  const o = offerOf(s, id); if (!o) return null;
  const ref = regionRef(s, o.area, o.product);
  const rows = variantsFor(o.product).map((v) => {
    const total = Math.round(listPrice(o.area, o.product, v.term) * (1 - v.disc / 100));
    const unit = PRODUCT[o.product].yearly ? total / v.term : total;
    const win = winChance(s, o.area, o.product, v.disc);
    return { ...v, total, unit, win, score: win * total, need: approversFor(v.disc), diff: ref.avg ? Math.round(((unit - ref.avg) / ref.avg) * 100) : 0 };
  });
  const best = rows.reduce((a, b) => (b.score > a.score ? b : a));
  const editable = ["draft", "changes"].includes(o.status) && o.createdBy === me!.id;
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">{rows.map((v) => (
        <div key={v.key} className={`rounded-xl border p-3 ${v.key === best.key ? "border-brand ring-2 ring-brand/15" : "border-line"}`}>
          <div className="flex items-center justify-between"><b className="text-sm">Option {v.key}</b>{v.key === best.key && <Pill tone="red">Recommended</Pill>}</div>
          <div className="mt-0.5 text-xs text-muted">{v.label}</div>
          <div className="num mt-2 text-xl font-semibold">{chf(v.total)}</div>
          <div className="text-[11.5px] text-muted">{PRODUCT[o.product].yearly ? `${chf(v.unit)} per year` : "one-off"} · {Math.abs(v.diff)}% {v.diff <= 0 ? "below" : "above"} area average</div>
          <div className="mt-2 space-y-1 text-[12.5px]"><div className="flex justify-between"><span className="text-muted">Win chance</span><b className="num">{v.win}%</b></div><div className="flex justify-between"><span className="text-muted">Approval</span><b>{aboveLimit(v.disc) ? "Not possible here" : v.need.length === 0 ? "None" : "Manager"}</b></div></div>
          <Btn sm full v={v.key === best.key ? "primary" : "ghost"} className="mt-3" disabled={!editable || (o.term === v.term && o.discountPct === v.disc)} onClick={() => ops.pick(o.id, { term: v.term, disc: v.disc })}>{o.term === v.term && o.discountPct === v.disc ? "In use" : `Use ${v.key}`}</Btn>
        </div>))}
      </div>
    </Card>
  );
}

function EmailCard({ id, chase, ops }: { id: string; chase?: boolean; ops: Ops }) {
  const { s, me } = useApp();
  const o = offerOf(s, id);
  const [mail, setMail] = useState(() => (o ? (chase ? chaseEmail(s, o, me!.name) : emailFor(s, o, me!.name)) : { subject: "", body: "" }));
  const [sent, setSent] = useState(false);
  if (!o) return null;
  const acc = accountOf(s, o.accountId);
  const ready = chase ? o.status === "sent" : o.status === "approved";
  return (
    <Card className="p-4">
      <div className="mb-2 t-label">Email to {acc?.contact.name} · {acc?.contact.email}</div>
      <input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} disabled={sent} className="mb-2 min-h-10 w-full rounded-lg border border-line px-3 text-sm font-medium" />
      <textarea value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} disabled={sent} className="min-h-48 w-full rounded-lg border border-line p-3 text-sm leading-relaxed" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn disabled={sent || !ready} onClick={() => { setSent(true); ops.send(o.id, mail, !!chase); }}><Icon n="send" s={15} /> {sent ? "Sent" : chase ? "Send follow-up" : "Send to customer"}</Btn>
        {!ready && !sent && <span className="text-xs text-amber-800">{o.status === "awaiting" ? "Waiting for approval first." : "Needs approval or a ready offer first."}</span>}
      </div>
    </Card>
  );
}

function DocCard({ doc }: { doc: Doc }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="doc" s={14} /></span>{doc.title}</div></div>
      <div className="space-y-4">
        {doc.blocks.map((b, i) => (
          <div key={i}>
            {b.h && <div className="mb-1.5 t-label">{b.h}</div>}
            {b.text && <p className="text-[13.5px] leading-relaxed">{b.text}</p>}
            {b.rows && <div className="rounded-xl border border-line px-3">{b.rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-line/70 py-2 text-[13px] last:border-0"><span className="shrink-0 text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div>}
            {b.bullets && <ul className="space-y-1 text-[13.5px]">{b.bullets.map((x, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{x}</span></li>)}</ul>}
            {b.table && <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-[13px]"><thead className="bg-surface text-left text-xs text-muted"><tr>{b.table.head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{b.table.rows.map((r, k) => <tr key={k} className="border-t border-line">{r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium" : ""}`}>{c}</td>)}</tr>)}</tbody></table></div>}
          </div>
        ))}
        {doc.draft && (
          <div>
            <div className="mb-1.5 t-label">{doc.draft.label}</div>
            <div className="rounded-xl bg-surface p-3 text-[13px] leading-relaxed">{doc.draft.subject && <div className="mb-1 font-semibold">{doc.draft.subject}</div>}<div className="whitespace-pre-wrap">{doc.draft.text}</div></div>
          </div>
        )}
      </div>
      <div className="mt-3 text-[11px] text-muted">{doc.agent} · simulated · Sources: {doc.sources.join(" · ")}</div>
    </Card>
  );
}
