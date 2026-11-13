"use client";
import { StreamText, Thinking, streamMs, thinkMs } from "../Stream";
import { useEffect, useRef, useState } from "react";
import { A, H, effTier, useApp, userOf } from "@/lib/store";
import {
  AREA_NAME, GUIDE, KIND_LABEL, NAMES, inr, ping, stagesFor, dealNbas, reviewBrief, PRODUCT, SH, aboveLimit, accountOf, approversFor, assetBrief, assetOf, chaseEmail, chf, emailFor, ensureAccount, listPrice, offerOf,
  nowS, regionRef, variantsFor, winChance, DAY, computeNbas, isOpen, oppOf, tasksOfOpp, tenderOf, type Effect, type NbaCard,
} from "@/lib/sherpa";
import { DOC_NBAS, docFor, type Doc, type DocChip, type DocRef } from "@/lib/agents";
import type { Asset, Offer, ProductKey } from "@/lib/types";
import { Bot, Btn, Card, Icon, Pill, TierPill, ago } from "../ui";
import { OwnerDot } from "../shared";
import { DiscountGauge, OfferPill, RegionCard } from "./Offers";
import { statusLine, TaskPanel } from "./Opps";
import { lastLog, oppNba } from "./OppBrowser";
import { DashCard } from "../hub/parts";
import { Choice, Input, Textarea } from "@/components/form";
import { WinWhy } from "../Why";

interface Chip { label: string; run: () => void; tone?: "green" | "red" | "soft"; icon?: string; quiet?: boolean; sub?: string }
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
  | { k: "oppstatus"; id: string }
  | { k: "oppflow"; id: string }
  | { k: "idle" };
type Msg = Part & { mid: number };
export interface Seed { id: number; card: NbaCard }
interface Ops { card: (c: NbaCard) => void; open: (id: string) => void; opp: (id: string) => void; pick: (id: string, v: { term: number; disc: number }) => void; send: (id: string, e: { subject: string; body: string }, chase: boolean) => void; ask: (t: string) => void; go: (v: string) => void }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PRODUCT_WORDS: [RegExp, ProductKey][] = [[/moderni/i, "modernisation"], [/repair/i, "repair"], [/maintenance|take over|competitor/i, "maintenance"], [/renew/i, "renewal"]];

export function Sherpa({ seed, onOpenOffer, onOpenOpp, onOpenLead, noDash, go }: { seed: Seed | null; noDash?: boolean; onOpenOffer: (id: string) => void; onOpenOpp: (id: string) => void; onOpenLead: (reportId: string) => void; go: (v: string) => void }) {
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
      setTyping(true); await sleep(typeof p === "string" ? thinkMs(p) : 500);
      if (!alive.current) return;
      setTyping(false); push(typeof p === "string" ? say(p) : p);
      const t = typeof p === "string" ? p : p.k === "text" && p.from === "bot" ? p.text : "";
      if (t) await sleep(streamMs(t));
      if (!alive.current) return;
    }
    stage.current = st; setChips(cs); setBusy(false);
  }
  const me_ = () => app.current.me!;
  const sx = () => app.current.s.sherpa;

  /* ---------------------------------------------------------- suggestions per persona */
  function starters(): Chip[] {
    if (noDash) {
      const cards = computeNbas(app.current.s, me_()).slice(0, 3);
      return [...cards.map((c): Chip => ({ label: c.title, sub: `${c.cta || "Open"}${c.value ? ` · ${inr(c.value)} at stake` : ""}`, icon: c.urgency === "high" ? "warn" : "sparkle", quiet: true, run: () => runCard(c) })), { label: "What needs my action?", tone: "green", run: () => ops.ask("What needs my action?") }];
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
    const need = approversFor(disc, s.cfg);
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
      const need = approversFor(o.discountPct, s.cfg);
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
    const lastE = lastLog(best); const nba = oppNba(app.current.s, best, me_().id); const sl = statusLine(app.current.s, best, me_().id, Date.now() + app.current.s.clock);
    void bot([say(sl.mine ? `${best.id} needs you. Here is where it stands and what to do next.` : `Here is where ${best.id} stands and what happens next.`, ["Stage, last status and the next step come from the open to-dos and the timeline on the opportunity.", "The next step is the same one shown in the opportunity drawer."]), { k: "oppflow", id: best.id }], [{ label: "Open the opportunity", tone: "green", run: () => onOpenOpp(best.id) }, { label: "What needs my action?", run: () => ops.ask("What needs my action?") }]);
  }
  function approvals() {
    void bot([say("Here is where your approvals stand.", ["Reads the approval log on every offer."]), { k: "approvals" }], [{ label: "Open offers", run: () => go("offers") }, { label: "Back to my day", run: () => ops.ask("What needs my action?") }]);
  }
  function pipeline() {
    const now = nowS(app.current.s);
    const st = sx().offers.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY).sort((a, b) => b.price - a.price);
    void bot([say(st.length ? `${st.length} deal${st.length === 1 ? " has" : "s have"} gone quiet for 21+ days. Here is where the pipeline stands and where to step in.` : "Nothing has stalled. Here is where the pipeline stands.", ["Stalled = sent to the customer, no activity for 21+ days.", "Totals only: no ranking of people."]), { k: "pipeline" }], [
      ...(st.length ? [{ label: `Nudge all ${st.length} owners`, tone: "green" as const, icon: "bell", run: () => { app.current.mutate((x) => st.forEach((o) => { ping(x, o.createdBy, `${o.id} for ${accountOf(x, o.accountId)?.name ?? "the customer"} has had no movement for 21+ days. Please follow up.`, o.id); x.sherpa.offers.find((q) => q.id === o.id)?.log.push({ t: nowS(x), by: me_().name, text: "Manager nudged the owner" }); })); void bot([`Done. ${st.length} owner${st.length === 1 ? " has" : "s have"} a reminder in their alerts, and it is on each offer's timeline.`], starters()); } }, { label: `Open the biggest deal (${accountOf(app.current.s, st[0].accountId)?.name ?? st[0].id})`, icon: "chev", run: () => ops.open(st[0].id) }] : []),
      { label: "What needs my action?", run: () => ops.ask("What needs my action?") }]);
  }
  function idleLeads() {
    const now = nowS(app.current.s);
    const idle = app.current.s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "lead" && !i.silent && i.status === "new" && now - i.createdAt > 48 * H));
    void bot([say(idle.length ? `${idle.length} lead${idle.length === 1 ? " has" : "s have"} waited over 48 hours with nobody accepting. Nudge the owner, or open the lead to reassign it.` : "Every lead has been picked up within 48 hours.", ["Idle = new lead, not accepted, older than 48 hours."]), { k: "idle" }], [
      ...(idle.length ? [{ label: `Nudge all ${idle.length} owners`, tone: "green" as const, icon: "bell", run: () => { app.current.mutate((x) => idle.forEach((i) => A.nudge(x, i.id, me_().id))); void bot([`Nudged. Each owner has a reminder, and it is on the lead's log.`], starters()); } }] : []),
      { label: "What needs my action?", run: () => ops.ask("What needs my action?") }]);
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
    if (/\bop-\d+/i.test(t) && /where is|where.s|status of|what.s happening/.test(lc)) return whereIs(t);
    if (/\bsnap\b|spotted|saw a (lift|building)|report (a|this) lift|new lead from (a )?photo|building site/.test(lc)) return void bot(["Snap & Lead takes it from here. Add a few photos and I will read the details, ask two or three quick questions and route it to the right team. You stay on this page."], [{ label: "Snap a lead", icon: "camera", tone: "green", run: () => go("snap") }, ...starters().slice(0, 2)]);
    if (/open the approval brief|open (the )?offer/.test(lc) && c.offerId) return onOpenOffer(c.offerId);
    if (/remind the approver/.test(lc) && c.offerId) { app.current.mutate((st) => SH.remind(st, c.offerId!, me_().id)); return void bot([say("Reminded. The approver has a message with the context.")], [{ label: "Back to my day", run: () => ops.ask("What needs my action?") }]); }
    const di = docIntent(lc); if (di) return runDoc(di.no, di.ref);
    if (/open lead/.test(lc) && c.reportId) return onOpenLead(c.reportId);
    if (/needs? my action|waiting on me|my to.?do|my tasks|what should i do/.test(lc)) return myTasks();
    if (/where is|where.s|status of|who is .*(waiting|working)|why .*(delay|stuck|late)|what.s happening/.test(lc)) return whereIs(t);
    if (/\bapprovals?\b|stand\b/.test(lc)) return approvals();
    if (/pipeline|team|stalled/.test(lc) && !/draft|offer/.test(lc)) return pipeline();
    if (/not (been )?followed up|follow.?ed up|overdue lead/.test(lc)) return idleLeads();
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
      <div ref={box} className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden"><div className="w-full space-y-3.5 px-3 py-5 @3xl:px-4">
        {msgs.map((m) => <Bubble key={m.mid} m={m} ops={ops} />)}
        {typing && <Thinking />}
        {chips.length > 0 && !busy && <div className="pop flex flex-wrap gap-2 pt-1">{chips.map((c, k) => c.sub ? <button key={k} onClick={() => onChip(c)} className="group flex w-full items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/30"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${c.icon === "warn" ? "bg-red-50 text-red-700" : "bg-brand-soft text-brand"}`}><Icon n={c.icon ?? "sparkle"} s={16} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold leading-snug">{c.label}</span><span className="mt-0.5 block text-[12.5px] text-muted">{c.sub}</span></span><span className="mt-1 text-muted transition group-hover:translate-x-0.5"><Icon n="chev" s={14} /></span></button> : <button key={k} onClick={() => onChip(c)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${c.tone === "green" ? "border-brand bg-brand text-white hover:bg-brand-dark" : "border-line bg-white hover:bg-surface"}`}>{c.icon && <Icon n={c.icon} s={14} />}{c.label}</button>)}</div>}
      </div></div>
      <div className="shrink-0 bg-surface"><div className="w-full px-3 pb-2 pt-2.5">
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-1 rounded-lg border border-brand/60 bg-white p-1.5 focus-within:border-brand">
          <button type="button" aria-label="Snap a lead" title="Spotted a lift? Snap it as a lead" onClick={() => go("snap")} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/60 hover:bg-surface hover:text-ink"><Icon n="camera" s={18} /></button>
          <Input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder={busy ? "SHERPA is working…" : "Ask anything…"} className="min-w-0 flex-1 border-0 bg-transparent px-2.5 text-[14px] shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-60 md:text-[14px]" />
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
        <div className="sheet whitespace-pre-wrap break-words px-4 py-3 text-[14px] leading-[21px]"><StreamText text={m.text} /></div>
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
  if (m.k === "mytasks") return <MyTasksBoard onOpen={ops.opp} />;
  if (m.k === "oppstatus") {
    const o = oppOf(s, m.id); if (!o) return null; const st = statusLine(s, o, me!.id, now);
    return <Card className="p-4"><div className="text-[15px] font-semibold">{o.title}</div><div className="text-xs text-muted">{o.id} · {o.placeName} · owner {NAMES[o.owner]}</div><div className={"mt-3 rounded-xl px-3 py-2 text-[13px] " + (st.mine ? "bg-amber-50 text-amber-900" : "bg-surface")}>{st.text}</div>{tasksOfOpp(s, o.id).length > 0 && <ul className="mt-3 space-y-1.5 text-[13px]">{tasksOfOpp(s, o.id).map((t) => <li key={t.id} className="flex justify-between gap-3"><span>{t.title}</span><span className="shrink-0 text-xs text-muted">{NAMES[t.forUser ?? ""]}</span></li>)}</ul>}</Card>;
  }
  if (m.k === "oppflow") {
    const o = oppOf(s, m.id); if (!o) return null;
    const open = tasksOfOpp(s, o.id).sort((x, y) => x.due - y.due); const mine = open.filter((x) => x.forUser === me!.id);
    const nba = oppNba(s, o, me!.id); const last = lastLog(o); const sl = statusLine(s, o, me!.id, now); const stages = stagesFor(o);
    const idx = Math.max(0, stages.findIndex((x) => x[0] === o.stage)); const other = mine.length ? undefined : open[0];
    return (
      <div className="space-y-3">
        <Card className="overflow-hidden">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span>{o.tier && <TierPill tier={o.tier} />}<Pill tone="blue">{KIND_LABEL[o.kind]}</Pill>{sl.late && <Pill tone="red">Overdue</Pill>}</div>
            <div className="mt-1.5 text-[15px] font-semibold leading-snug">{o.title}</div>
            <div className="text-xs text-muted">{AREA_NAME[o.area] ?? o.area} · owner {NAMES[o.owner] ?? "not set"}{o.value ? ` · ${inr(o.value)}` : ""}</div>
            <ol className="mt-3 flex gap-1" aria-label="Stage">{stages.map(([k, l], i) => <li key={k} title={l} className={`h-1.5 flex-1 rounded-full ${i < idx || o.stage === "won" ? "bg-brand" : i === idx ? "bg-brand/60" : "bg-line"}`} />)}</ol>
            <div className="mt-1 text-[11.5px] font-medium text-muted">Stage {idx + 1} of {stages.length} · {stages[idx]?.[1] ?? o.stage}</div>
          </div>
          <div className="divide-y divide-line border-t border-line text-[13px]">
            <div className="flex gap-3 px-4 py-3"><span className="mt-0.5 text-muted"><Icon n="clock" s={15} /></span><div className="min-w-0"><div className="t-label">Last status</div><div className="mt-0.5 font-medium">{last ? last.text : "No activity yet"}</div>{last && <div className="text-xs text-muted">{last.by} · {ago(now - last.t)}</div>}</div></div>
            <div className={`flex gap-3 px-4 py-3 ${mine.length ? "bg-amber-50" : "bg-brand-soft/50"}`}><span className="mt-0.5 text-brand"><Icon n={mine.length ? "bolt" : "sparkle"} s={15} /></span><div className="min-w-0"><div className="t-label">{mine.length ? "Your next step" : "Next step"}</div><div className="mt-0.5 font-semibold">{nba.title}</div>{nba.why && <div className="text-xs text-muted">{nba.why}</div>}{other && <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium ring-1 ring-line"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Waiting on {NAMES[other.forUser ?? ""] ?? "someone"} · since {ago(now - other.createdAt)}</div>}</div></div>
          </div>
          <div className="flex border-t border-line"><button onClick={() => ops.opp(o.id)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-semibold text-brand hover:bg-brand-soft">Open full opportunity <Icon n="chev" s={13} /></button></div>
        </Card>
        {mine.map((x) => <TaskPanel key={x.id} o={o} t={x} openOffer={ops.open} />)}
      </div>
    );
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
  if (m.k === "pipeline") return <PipelineBoard onOpen={ops.open} />;
  if (m.k === "idle") return <IdleBoard onOpen={ops.opp} />;
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
        {PRODUCT[o.product].yearly && <Choice size="sm" value={String(o.term)} onChange={(v) => mutate((st) => SH.setTerms(st, o.id, me!.id, { term: Number(v) }))} options={[1, 3, 5].map((t) => ({ value: String(t), label: `${t} year${t > 1 ? "s" : ""}` }))} className="w-auto" aria-label="Term" />}
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
    return { ...v, total, unit, win, score: win * total, need: approversFor(v.disc, s.cfg), diff: ref.avg ? Math.round(((unit - ref.avg) / ref.avg) * 100) : 0 };
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
          <div className="mt-2 space-y-1 text-[12.5px]"><div className="flex justify-between"><WinWhy area={o.area} product={o.product} pct={v.disc}><span className="text-muted">Win chance</span></WinWhy><b className="num">{v.win}%</b></div><div className="flex justify-between"><span className="text-muted">Approval</span><b>{aboveLimit(v.disc) ? "Not possible here" : v.need.length === 0 ? "None" : "Manager"}</b></div></div>
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
      <Input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} disabled={sent} aria-label="Subject" className="mb-2 font-medium" />
      <Textarea value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} disabled={sent} aria-label="Message" className="min-h-48 leading-relaxed" />
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

/* ---------------------------------------------------------- "what needs my action": a visual board */
const TASK_ICON: Record<string, string> = { accept: "check", contact: "phone", followup: "phone", findContact: "search", research: "search", review: "flag", siteVisit: "pin", job: "gear", order: "gear", dealSetup: "layers", quoteBrief: "doc", config: "doc", tenderDoc: "doc", approveBid: "check", approveWin: "check", agreed: "check", bidReview: "doc", bidConfirm: "doc" };
const TASK_META = {
  late: { label: "Overdue", dot: "#e3001b", bg: "#fdecee", fg: "#b4121f" },
  today: { label: "Due today", dot: "#f59e0b", bg: "#fdf0cf", fg: "#9a6a00" },
  week: { label: "This week", dot: "#2563eb", bg: "#e6effd", fg: "#1d4ed8" },
  later: { label: "Later", dot: "#9ca3af", bg: "#eeeef1", fg: "#4a4a55" },
} as const;
function MyTasksBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const { s, me, now } = useApp();
  const mine = s.sherpa.tasks.filter((t) => !t.done && t.forUser === me!.id);
  const band = (due: number) => (due < now ? "late" : due - now < DAY ? "today" : due - now < 7 * DAY ? "week" : "later") as keyof typeof TASK_META;
  const groups = (["late", "today", "week", "later"] as const).map((k) => ({ k, rows: mine.filter((t) => band(t.due) === k).sort((a, b) => a.due - b.due) }));
  if (mine.length === 0) return <Card className="grid place-items-center gap-2 p-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon n="check" s={22} /></span><div className="text-[15px] font-semibold">All clear</div><div className="text-[13px] text-muted">Nothing is waiting on you.</div></Card>;
  const dueText = (t: { due: number }) => { const k = band(t.due); if (k === "late") return `${Math.max(1, Math.round((now - t.due) / DAY))}d late`; if (k === "today") return "Today"; const d = Math.ceil((t.due - now) / DAY); return d === 1 ? "Tomorrow" : `In ${d} days`; };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">{groups.map(({ k, rows }) => <div key={k} className="rounded-xl border border-line bg-white px-2 py-2.5 text-center" style={rows.length ? { background: TASK_META[k].bg, borderColor: "transparent" } : undefined}><div className="num text-[22px] font-semibold leading-none" style={{ color: rows.length ? TASK_META[k].fg : "var(--color-muted)" }}>{rows.length}</div><div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: rows.length ? TASK_META[k].fg : "var(--color-muted)" }}>{TASK_META[k].label}</div></div>)}</div>
      {groups.filter((g) => g.rows.length).map(({ k, rows }) => (
        <section key={k}>
          <h3 className="mb-1.5 flex items-center gap-2 px-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted"><span className="h-2 w-2 rounded-full" style={{ background: TASK_META[k].dot }} />{TASK_META[k].label}</h3>
          <div className="space-y-2">{rows.slice(0, 6).map((t) => {
            const o = oppOf(s, t.oppId); const stages = o ? stagesFor(o) : []; const idx = o ? Math.max(0, stages.findIndex((x) => x[0] === o.stage)) : 0;
            return (
              <button key={t.id} onClick={() => o && onOpen(o.id)} className="sheet group relative flex w-full gap-3 overflow-hidden p-3 text-left transition hover:bg-surface">
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: TASK_META[k].dot }} />
                <span className="ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: TASK_META[k].bg, color: TASK_META[k].fg }}><Icon n={TASK_ICON[t.kind ?? ""] ?? "bolt"} s={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2"><span className="text-[13.5px] font-semibold leading-snug">{t.title}</span><span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: TASK_META[k].bg, color: TASK_META[k].fg }}>{dueText(t)}</span></span>
                  {o && <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted"><span className="font-mono font-bold">{o.id}</span><span>{o.placeName}</span>{o.value ? <span className="num font-semibold text-ink/70">{inr(o.value)}</span> : null}</span>}
                  {o && stages.length > 0 && <span className="mt-2 flex items-center gap-2"><span className="flex flex-1 gap-0.5">{stages.map(([sk], i) => <span key={sk} className={`h-1 flex-1 rounded-full ${i < idx ? "bg-brand" : i === idx ? "bg-brand/50" : "bg-line"}`} />)}</span><span className="text-[11px] text-muted">{stages[idx]?.[1]}</span></span>}
                  <span className="mt-1.5 block text-[11.5px] text-muted">From {NAMES[t.by] ?? t.by}</span>
                </span>
                <span className="self-center text-muted transition group-hover:translate-x-0.5"><Icon n="chev" s={14} /></span>
              </button>);
          })}{rows.length > 6 && <div className="px-1 text-xs text-muted">+ {rows.length - 6} more {TASK_META[k].label.toLowerCase()}</div>}</div>
        </section>))}
    </div>
  );
}

/* ---------------------------------------------------------- pipeline risk: flow, split and the deals to chase */
const shortInr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L` : inr(n));
function PipelineBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const [nudged, setNudged] = useState<string[]>([]);
  const live = s.sherpa.offers.filter((o) => !["won", "lost", "rejected"].includes(o.status));
  const stalled = live.filter((o) => o.status === "sent" && now - o.lastActivity >= 21 * DAY).sort((a, b) => b.price - a.price);
  const quiet = new Set(stalled.map((o) => o.id));
  const sum = (l: { price: number }[]) => l.reduce((a, o) => a + o.price, 0);
  const steps = [
    { k: "draft", label: "Draft", icon: "doc", list: live.filter((o) => o.status === "draft"), fg: "#4a4a55", bg: "#eeeef1", bar: "#9ca3af" },
    { k: "approval", label: "Approval", icon: "flag", list: live.filter((o) => o.status === "awaiting" || o.status === "changes"), fg: "#9a6a00", bg: "#fdf0cf", bar: "#f59e0b" },
    { k: "ready", label: "Ready", icon: "check", list: live.filter((o) => o.status === "approved"), fg: "#1d4ed8", bg: "#e6effd", bar: "#3b82f6" },
    { k: "sent", label: "With customer", icon: "send", list: live.filter((o) => o.status === "sent" && !quiet.has(o.id)), fg: "#047857", bg: "#d9f3e7", bar: "#10b981" },
    { k: "stalled", label: "Gone quiet", icon: "warn", list: stalled, fg: "#b4121f", bg: "#fdecee", bar: "#e3001b" },
  ];
  const total = sum(live) || 1; const atStake = sum(stalled);
  const mine = me!.id;
  const nudge = (o: (typeof stalled)[number]) => { mutate((x) => { ping(x, o.createdBy, `${o.id} for ${accountOf(x, o.accountId)?.name ?? "the customer"} has had no movement for 21+ days. Please follow up.`, o.id); x.sherpa.offers.find((q) => q.id === o.id)?.log.push({ t: nowS(x), by: NAMES[mine] ?? mine, text: "Manager nudged the owner" }); }); setNudged((n) => [...n, o.id]); };
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="flex items-end justify-between gap-3 p-4">
          <div><div className="t-label">Open pipeline</div><div className="num mt-1 text-[26px] font-semibold leading-none">{shortInr(sum(live))}</div><div className="mt-1 text-xs text-muted">{live.length} live offer{live.length === 1 ? "" : "s"}</div></div>
          <div className="text-right"><div className="t-label">At risk</div><div className="num mt-1 text-[26px] font-semibold leading-none" style={{ color: stalled.length ? "#b4121f" : "#047857" }}>{shortInr(atStake)}</div><div className="mt-1 text-xs text-muted">{Math.round((atStake / total) * 100)}% of the value</div></div>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden bg-line" role="img" aria-label="Pipeline value by stage">{steps.map((st) => { const v = sum(st.list); return v ? <span key={st.k} title={`${st.label}: ${shortInr(v)}`} style={{ width: `${(v / total) * 100}%`, background: st.bar }} /> : null; })}</div>
        <div className="grid grid-cols-5 items-start gap-0.5 px-2 py-3" aria-label="Where the deals are">
          {steps.map((st, i) => (
            <div key={st.k} className="relative flex flex-col items-center text-center">
              <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: st.bg, color: st.fg, boxShadow: st.k === "stalled" && st.list.length ? "0 0 0 3px #fdecee" : undefined }}><Icon n={st.icon} s={16} /></span>
              <span className="num mt-1 text-[17px] font-semibold leading-none" style={{ color: st.list.length ? st.fg : "var(--color-muted)" }}>{st.list.length}</span>
              <span className="mt-0.5 text-[10.5px] font-medium leading-tight text-muted">{st.label}</span>
              <span className="num text-[10.5px] text-muted">{st.list.length ? shortInr(sum(st.list)) : "–"}</span>
              {i < steps.length - 1 && <span className="absolute -right-1 top-2.5 text-muted/60"><Icon n="chev" s={12} /></span>}
            </div>))}
        </div>
      </Card>
      {stalled.length === 0 ? <Card className="grid place-items-center gap-2 p-6 text-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon n="check" s={20} /></span><div className="text-[14px] font-semibold">Nothing has gone quiet</div><div className="text-xs text-muted">Every sent offer moved in the last 21 days.</div></Card> : (
        <section>
          <h3 className="mb-1.5 flex items-center gap-2 px-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted"><span className="h-2 w-2 rounded-full bg-[#e3001b]" />Step in here · biggest first</h3>
          <div className="space-y-2">{stalled.map((o) => {
            const days = Math.floor((now - o.lastActivity) / DAY); const pct = Math.min(100, (days / 45) * 100); const done = nudged.includes(o.id);
            return (
              <div key={o.id} className="sheet overflow-hidden">
                <button onClick={() => onOpen(o.id)} className="group flex w-full items-start gap-3 p-3 text-left transition hover:bg-surface">
                  <OwnerDot id={o.createdBy} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><span className="text-[13.5px] font-semibold leading-snug">{accountOf(s, o.accountId)?.name ?? o.id}</span><span className="num shrink-0 text-[14px] font-semibold">{shortInr(o.price)}</span></span>
                    <span className="mt-0.5 block text-xs text-muted">{PRODUCT[o.product].label} · {NAMES[o.createdBy] ?? o.createdBy}</span>
                    <span className="mt-2 block"><span className="relative block h-2 rounded-full bg-line"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: days >= 30 ? "#e3001b" : "#f59e0b" }} /><span className="absolute -top-0.5 h-3 w-0.5 bg-ink/40" style={{ left: `${(21 / 45) * 100}%` }} title="21-day limit" /></span><span className="mt-1 flex justify-between text-[11px] text-muted"><span><b className="text-ink">{days} days</b> without movement</span><span>limit 21</span></span></span>
                  </span>
                </button>
                <div className="flex divide-x divide-line border-t border-line text-[12.5px] font-semibold">
                  <button onClick={() => onOpen(o.id)} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 text-ink hover:bg-surface"><Icon n="doc" s={13} />Open offer</button>
                  <button disabled={done} onClick={() => nudge(o)} className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 ${done ? "text-emerald-700" : "text-brand hover:bg-brand-soft"}`}>{done ? <><Icon n="check" s={13} w={3} />Nudged</> : <><Icon n="bell" s={13} />Nudge {NAMES[o.createdBy]?.split(" ")[0]}</>}</button>
                </div>
              </div>); })}</div>
        </section>)}
    </div>
  );
}

/* ---------------------------------------------------------- leads nobody has picked up */
function IdleBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const [nudged, setNudged] = useState<string[]>([]);
  const rows = s.reports.filter((r) => r.status === "sent").flatMap((r) => r.items.filter((i) => i.kind === "lead" && !i.silent && i.status === "new" && now - i.createdAt > 48 * H).map((it) => ({ r, it }))).sort((a, b) => a.it.createdAt - b.it.createdAt);
  if (rows.length === 0) return <Card className="grid place-items-center gap-2 p-6 text-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon n="check" s={20} /></span><div className="text-[14px] font-semibold">Every lead is picked up</div></Card>;
  return (
    <div className="space-y-2">{rows.map(({ r, it }) => {
      const hrs = Math.floor((now - it.createdAt) / H); const pct = Math.min(100, (hrs / 120) * 100); const opp = s.sherpa.opps.find((o) => o.source.itemId === it.id); const done = nudged.includes(it.id);
      return (
        <div key={it.id} className="sheet overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <OwnerDot id={it.ownerId} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><span className="text-[13.5px] font-semibold leading-snug">{r.placeName}</span><TierPill tier={effTier(it)} /></div>
              <div className="mt-0.5 text-xs text-muted">{it.title} · owner {userOf(it.ownerId)?.name ?? "not assigned"}{it.nudges ? ` · nudged ${it.nudges}×` : ""}</div>
              <div className="mt-2"><span className="relative block h-2 rounded-full bg-line"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: hrs >= 96 ? "#e3001b" : "#f59e0b" }} /><span className="absolute -top-0.5 h-3 w-0.5 bg-ink/40" style={{ left: `${(48 / 120) * 100}%` }} title="48-hour limit" /></span><span className="mt-1 flex justify-between text-[11px] text-muted"><span><b className="text-ink">{hrs >= 72 ? `${Math.floor(hrs / 24)} days` : `${hrs} hours`}</b> waiting</span><span>limit 48 h</span></span></div>
            </div>
          </div>
          <div className="flex divide-x divide-line border-t border-line text-[12.5px] font-semibold">
            <button disabled={!opp} onClick={() => opp && onOpen(opp.id)} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 text-ink hover:bg-surface disabled:opacity-40"><Icon n="users" s={13} />Open and reassign</button>
            <button disabled={done} onClick={() => { mutate((st) => A.nudge(st, it.id, me!.id)); setNudged((n) => [...n, it.id]); }} className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 ${done ? "text-emerald-700" : "text-brand hover:bg-brand-soft"}`}>{done ? <><Icon n="check" s={13} w={3} />Nudged</> : <><Icon n="bell" s={13} />Nudge owner</>}</button>
          </div>
        </div>); })}</div>
  );
}
