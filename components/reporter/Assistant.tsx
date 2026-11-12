"use client";
import { StreamText, Thinking, streamMs, thinkMs } from "../Stream";
import { getThread, saveThread } from "@/lib/chats";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { AREAS, GROUPS, PLACES, PRESETS, TEAM_NAME, TRACKS } from "@/lib/data";
import { evaluate, presetToInput, teamsOf } from "@/lib/engine";
import { A, createReport, pointsOf, stepsOf, useApp } from "@/lib/store";
import type { Equip, Input, Photo, Place, Preset } from "@/lib/types";
import { readPhotos, type Reading } from "@/lib/reader";
import { levelOf } from "../Shell";
import { Card, Icon, PhotoTile, Pill, Track } from "../ui";
import { reportStatus } from "./status";
import { SnapHero } from "./SnapHero";

/* ------------------------------------------------------------------ types */
interface Sel { id: string; name: string; area: string; type: Place["type"]; key?: string; isNew?: boolean }
interface Chip { label: string; run: () => void; tone?: "red" | "green" | "soft"; icon?: string; quiet?: boolean; sub?: string; card?: boolean }
type TrackItem = ComponentProps<typeof Track>["item"];
type Part =
  | { k: "text"; from: "bot" | "me"; text: string; photos?: Photo[] }
  | { k: "reading"; rows: [string, string, number][]; note?: string; ask?: string }
  | { k: "form"; intro: string; fields: FField[]; initial: Record<string, string> }
  | { k: "summary"; place: string; headline: string; plain: string[]; who: string; intro?: string; tracks: TrackItem[]; points: { label: string; pts: number; status: string }[]; photos: Photo[]; offline: boolean; more: boolean; held: boolean }
  | { k: "report"; id: string; intro?: string; outro?: string }
  | { k: "points" }
  | { k: "update"; text: string }
  | { k: "needs"; id: string; retake: boolean }
  | { k: "stage" }
  | { k: "hero" };
type Msg = Part & { mid: number; old?: boolean };
const LIVE_ONLY = new Set(["stage", "hero", "form"]);
const slim = (p: Photo) => (p.url && p.url.length > 60000 ? { ...p, url: undefined } : p);

const EQ: Record<Equip, string> = { lift: "Lift / elevator", escalator: "Escalator", walk: "Moving walk" };
const word = (e: Equip) => (e === "lift" ? "lift" : e === "escalator" ? "escalator" : "moving walk");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function compress(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 520 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export function samplePhotos(p: Preset): Photo[] {
  if (p.subject === "site") return [{ id: "s1", label: "Site hoarding", kind: "site", text: "New tower, Block C" }, { id: "s2", label: "Notice board", kind: "board", text: "Lift installation Q2" }];
  if (p.subject === "notice") return [{ id: "s1", label: "Notice", kind: "board", text: p.notice === "renovation" ? "Lift renovation" : p.notice === "tender" ? "Tender notice" : "Lift coming soon" }, { id: "s2", label: "Entrance", kind: "site", text: "Building" }];
  const n = p.reading.number;
  const out: Photo[] = [{ id: "s1", label: "Licence plate", kind: "plate", text: n ? `Lift No. ${n}` : "(number not visible)" }, { id: "s2", label: "Button panel", kind: "panel" }];
  if (p.reading.servicer !== "unknown") out.push({ id: "s3", label: "Service sticker", kind: "sticker", text: p.reading.servicer === "other" ? "Serviced by OtherLift" : p.reading.servicer === "maker" ? "Serviced by maker" : "Serviced by Schindler" });
  out.push({ id: "s4", label: p.equip === "lift" ? "Cabin" : "Handrail", kind: "cabin" });
  return out;
}

/* ------------------------------------------------------- the question bank */
function nextQ(i: Input, a: string[], danger: boolean): string | null {
  const has = (k: string) => a.includes(k);
  if (i.subject === "site") { for (const k of ["stage", "units", "installer", "ordered"]) if (!has(k)) return k; return null; }
  if (i.subject === "notice") return null;
  if (!i.number && !has("number")) return "number";
  if (!has("condition")) return "condition";
  if (i.condition === "unsafe") return null;
  if (danger && !has("danger")) return "danger";
  if (!has("sticker") && i.servicer === "unknown" && (i.brand === "other" || i.records === "missing" || (i.brand === "ours" && i.contract !== "active"))) return "sticker";
  if (!has("units") && (i.brand === "other" || i.records === "missing" || i.records === "placeOnly")) return "units";
  return null;
}
const QTEXT: Record<string, (i: Input) => string> = {
  number: (i) => `I could not find the ${word(i.equip)} number in your photos. It is usually on a plate near the doors or on the control panel. Please only check from public or common areas.`,
  condition: (i) => `How is the ${word(i.equip)} running?`,
  danger: () => "One of your photos seems to show exposed wiring. Is the equipment unsafe?",
  sticker: () => "Is there a service sticker? Who services it?",
  units: (i) => (i.subject === "site" ? `About how many ${word(i.equip)}s will the building need? A tall tower usually needs several.` : "Roughly how many lifts are in the building?"),
  installer: (i) => `Can you see who is installing the ${word(i.equip)}s? Look for a crane, a hoist, or a supplier sign on the hoarding.`,
  stage: () => "What stage is the building at?",
  ordered: () => "Does the developer say the lift is already ordered?",
};
interface Opt { v: string; t: string; sub?: string; tone?: "red" | "green"; kw?: RegExp }
interface FField { key: string; label: string; opts: Opt[]; req?: boolean; text?: boolean }
const LABEL: Record<string, (i: Input) => string> = {
  number: (i) => `${word(i.equip)[0].toUpperCase()}${word(i.equip).slice(1)} number`, condition: (i) => `How is the ${word(i.equip)} running?`, danger: () => "Is it unsafe?",
  sticker: () => "Who services it?", units: (i) => (i.subject === "site" ? "How many will the building need?" : "How many lifts in the building?"),
  installer: () => "Who is installing?", stage: () => "What stage is the building at?", ordered: () => "Already ordered?",
};
const DEFAULT: Record<string, string> = { number: "cant", danger: "no", sticker: "unknown", units: "0", installer: "none", stage: "unsure", ordered: "unsure" };
/** Every question that applies to this input, in one list, so the user fills one form. */
function formFields(i: Input, danger: boolean): FField[] {
  const asked: string[] = []; const out: FField[] = [];
  for (let n = 0; n < 10; n++) {
    const k = nextQ(i, asked, danger); if (!k) break; asked.push(k);
    out.push({ key: k, label: LABEL[k](i), opts: k === "number" ? [] : opts(k, i), req: k === "condition" || k === "stage", text: k === "number" });
  }
  return out;
}
/** One answer applied to the input. Used by both the form and the one-by-one fallback. */
function applyOne(i0: Input, k: string, v: string, typedNum: string | undefined, scn: Preset): { i: Input; react: string } {
  let i = { ...i0 }; let react = "";
  switch (k) {
    case "number":
      if (v === "photo") { i = { ...i, number: scn.reading.number ?? "74821", records: scn.backend.records, quality: "ok", lowConfidence: false }; react = `Got it. I can read the number now: ${i.number}.`; }
      else if (v === "type") { i = { ...i, number: typedNum, records: scn.backend.records, quality: "ok", lowConfidence: false }; react = `Thanks, ${typedNum}.`; }
      else { i = { ...i, number: undefined, records: scn.backend.records === "found" || scn.backend.placeMatch ? "placeOnly" : scn.backend.records, quality: "brandOnly", lowConfidence: true }; react = "No problem. I will match by place and brand. The records team will confirm it."; }
      break;
    case "condition": i = { ...i, condition: v as Input["condition"] }; react = v === "fine" ? "Good to hear." : v === "minor" ? "Thanks, noted. Small issues can matter." : v === "out" ? "Thanks. I will flag this as urgent." : v === "unsure" ? "That is fine." : ""; break;
    case "danger": i = { ...i, condition: v === "yes" ? "unsafe" : i.condition }; break;
    case "sticker": i = { ...i, servicer: v as Input["servicer"] }; react = v === "unknown" ? "No problem. I will ask again after you send." : "Noted."; break;
    case "units": i = { ...i, units: Number(v) || 1 }; break;
    case "installer": i = { ...i, competitorInstalling: v === "comp", weInstalling: v === "us" }; react = v === "none" ? "Fine, that is useful to know." : "Valuable to know, thanks."; break;
    case "stage": i = { ...i, stage: v === "unsure" ? undefined : (v as Input["stage"]) }; break;
    case "ordered": i = { ...i, ordered: v === "yes" ? true : v === "no" ? false : undefined }; break;
  }
  return { i, react };
}
function opts(k: string, i: Input): Opt[] {
  const e = i.equip !== "lift";
  switch (k) {
    case "number": return [{ v: "photo", t: "Take another photo" }, { v: "type", t: "Type the number" }, { v: "cant", t: "I cannot find it", kw: /can.?t find|cannot find|no number|don.?t see/ }];
    case "condition": return [
      { v: "fine", t: "Running fine", tone: "green", kw: /fine|ok\b|okay|good|working|normal|no issue|no problem/ },
      { v: "minor", t: "Minor issues", sub: e ? "(noise, jerks, handrail speed)" : "(e.g. noisy, slow, door problem)", kw: /minor|nois|slow|jerk|rattl|squeak|vibrat|door|sticking|flicker/ },
      { v: "out", t: e ? "Stopped" : "Out of service", sub: "(not working)", kw: /out of (service|order)|broken|not working|stopped|down\b|dead|isn.?t working|offline|closed/ },
      { v: "unsafe", t: "Unsafe", sub: "(risk to people)", tone: "red", kw: /unsafe|danger|risk|hazard/ },
      { v: "unsure", t: "Not sure", kw: /not sure|unsure|don.?t know|no idea|dunno/ }];
    case "danger": return [{ v: "yes", t: "Yes, it is unsafe", tone: "red", kw: /\byes\b|yeah|yep|unsafe/ }, { v: "no", t: "No, it is fine", kw: /\bno\b|nope|fine|safe/ }];
    case "sticker": return i.brand === "other"
      ? [{ v: "other", t: "A local firm", kw: /local|other|firm|company/ }, { v: "maker", t: "Its own maker", kw: /maker|manufactur|oem/ }, { v: "staff", t: "Building staff", kw: /staff|in.?house|building/ }, { v: "nobody", t: "None seen", kw: /none|no sticker|nothing|nobody/ }, { v: "unknown", t: "Not sure", kw: /not sure|unsure|don.?t know/ }]
      : [{ v: "us", t: "Ours (Schindler)", kw: /schindler|ours|us\b/ }, { v: "other", t: "Another company", kw: /other|another|local|firm/ }, { v: "nobody", t: "None seen", kw: /none|no sticker|nothing|nobody/ }, { v: "unknown", t: "Not sure", kw: /not sure|unsure|don.?t know/ }];
    case "units": return [{ v: "1", t: "Just this one", kw: /\b1\b|one|single|just/ }, { v: "3", t: "2 to 4", kw: /\b[234]\b|two|three|four|few/ }, { v: "6", t: "5 or more", kw: /\b([5-9]|\d{2,})\b|five|many|lots|several/ }, { v: "0", t: "Not sure", kw: /not sure|unsure|don.?t know/ }];
    case "installer": return [{ v: "comp", t: "A competitor is installing", kw: /competi|other|kone|otis|thyssen/ }, { v: "us", t: "Schindler is installing", kw: /schindler|ours|\bwe\b/ }, { v: "none", t: "Nothing visible", kw: /none|nothing|no sign|can.?t see|not sure|unsure/ }];
    case "stage": return [{ v: "early", t: "Early", sub: "(foundations, digging)", kw: /early|found|dig|start/ }, { v: "structure", t: "Structure going up", kw: /structure|frame|going up|floors/ }, { v: "finishing", t: "Finishing work", kw: /finish|fit.?out|nearly|almost/ }, { v: "unsure", t: "Not sure", kw: /not sure|unsure|don.?t know/ }];
    case "ordered": return [{ v: "yes", t: "Yes, already ordered", kw: /\byes\b|yeah|ordered|yep/ }, { v: "no", t: "No", kw: /\bno\b|nope|not yet/ }, { v: "unsure", t: "Not sure / nobody to ask", kw: /not sure|unsure|don.?t know|nobody/ }];
  }
  return [];
}

/* ------------------------------------------------------- free-text intents */
const UNSAFE = /unsafe|danger|trapped|people (are )?stuck|stuck (in|inside)|smoke|\bfire\b|spark|burning|exposed wir|injur|\bhurt\b|emergency|free.?fall|plunge|cable snap/i;
const STATUS = /status|where is|where.?s|progress|track|what happened|my (reports?|leads?)|any news|follow.?up|heard back|how is my|how.?s my|update on/i;
const POINTS = /\bpoints?\b|reward|level|badge|score|earn|leaderboard/i;
const NEEDS = /need(s)? (me|my|action)|waiting (on|for) me|to.?do|anything for me/i;
const HELP = /^(help|hi|hello|hey|hola|start)\b|what can you|how (do|does|can)|what do i/i;
const SITE = /construction|building site|hoarding|being built|under construction|new tower|new development/i;
const LIFTY = /lift|elevator|escalator|moving walk|travelator|photo|snap|saw|spotted|spot |building|site|report|lead|machine/i;

interface Hints { place?: string; condition?: Input["condition"]; equip?: Equip; site?: boolean }
function parseHints(t: string): Hints {
  const h: Hints = {};
  const lc = t.toLowerCase();
  const pl = PLACES.find((p) => { const w = p.name.split(" ")[0].toLowerCase(); return lc.includes(p.name.toLowerCase()) || (w.length >= 4 && lc.includes(w)); });
  if (pl) h.place = pl.id;
  if (/escalator/.test(lc)) h.equip = "escalator"; else if (/moving walk|travelator/.test(lc)) h.equip = "walk";
  if (SITE.test(lc)) h.site = true;
  for (const o of opts("condition", {} as Input)) { if (o.kw?.test(lc) && o.v !== "unsure") { h.condition = o.v as Input["condition"]; break; } }
  return h;
}
function matchOpt(k: string, text: string, i: Input): Opt | null {
  const lc = text.toLowerCase().trim();
  const list = opts(k, i);
  const exact = list.find((o) => o.t.toLowerCase() === lc);
  if (exact) return exact;
  if (/^(not sure|unsure|don.?t know|dunno|no idea|skip)$/.test(lc)) return list.find((o) => o.v === "unsure" || o.v === "unknown" || o.v === "cant" || o.v === "0") ?? null;
  return list.find((o) => o.kw?.test(lc)) ?? null;
}

/* ===================================================================== */
const fresh = () => ({
  id: `SL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  scn: null as Preset | null, equip: "lift" as Equip, photos: [] as Photo[], place: null as Sel | null, later: false,
  gps: "idle" as "idle" | "ok" | "denied" | "none", input: null as Input | null, asked: [] as string[], answers: [] as { q: string; a: string }[],
  ov: {} as Partial<Input>, sample: "", rd: null as Reading | null, corrections: [] as string[], extras: {} as { contact?: string; note?: string }, hints: {} as Hints, typed: { name: "", addr: "" },
});

export function Assistant({ preset, onOpen, onNew, restore }: { preset?: Preset | null; onOpen: (id: string) => void; onNew: () => void; restore?: string }) {
  const { s, me, mutate, setOffline } = useApp();
  const ctx = useRef({ s, me, mutate, setOffline, onOpen });
  useEffect(() => { ctx.current = { s, me, mutate, setOffline, onOpen }; });
  const D = useRef(fresh());
  const [tid] = useState(() => restore ?? `home-${Date.now()}`);
  const [msgs, setMsgs] = useState<Msg[]>(() => (restore && me ? ((getThread(me.id, restore)?.msgs ?? []) as Msg[]).map((m, k) => ({ ...m, mid: k + 1, old: true })) : []));
  const [chips, setChips] = useState<Chip[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(true);
  const [stage, setStageS] = useState("busy");
  const stageRef = useRef("busy");
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState(false);
  const [staged, setStaged] = useState<Photo[]>([]);
  const stagedRef = useRef<Photo[]>([]); const hasStage = useRef(false); const formKeys = useRef<string[]>([]);
  const idc = useRef(msgs.length);
  const alive = useRef(true);
  const started = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tracked = useRef(new Set<string>());
  const lastId = useRef<string | null>(null);
  const seenAlerts = useRef(new Set<string>());
  const stepSeen = useRef(new Map<string, number>());
  const needsShown = useRef(new Set<string>());
  const demoStep = useRef<Record<string, number>>({});

  const setStage = (x: string) => { stageRef.current = x; setStageS(x); };
  const push = (p: Part) => setMsgs((m) => [...m, { ...p, mid: ++idc.current } as Msg]);
  const userSays = (t: string, photos?: Photo[]) => { setMsgs((m) => m.filter((x) => x.k !== "hero")); push({ k: "text", from: "me", text: t, photos }); };

  async function bot(parts: (string | Part)[], cs: Chip[] = [], next = "idle") {
    setChips([]); setStage("busy"); setBusy(true);
    for (const p of parts) {
      setTyping(true);
      await sleep(typeof p === "string" ? thinkMs(p) : 500);
      if (!alive.current) return;
      setTyping(false);
      push(typeof p === "string" ? { k: "text", from: "bot", text: p } : p);
      if (typeof p === "string") await sleep(streamMs(p));
      if (!alive.current) return;
    }
    setStage(next); setChips(cs); setBusy(false);
  }

  /* ----- lifecycle: greeting, live updates ----- */
  useEffect(() => {
    const el = box.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, chips]);

  useEffect(() => {
    if (!me) return;
    const todo: Part[] = [];
    s.alerts.filter((a) => a.userId === me.id && a.reportId && tracked.current.has(a.reportId) && !seenAlerts.current.has(a.id)).sort((a, b) => a.t - b.t).forEach((a) => { seenAlerts.current.add(a.id); todo.push({ k: "update", text: a.text }); });
    const hadAlert = todo.length > 0;
    tracked.current.forEach((rid) => {
      const r = s.reports.find((x) => x.id === rid); if (!r) return;
      r.items.filter((i) => !i.silent).forEach((it) => {
        const cur = it.status === "closed" ? -2 : it.step; const prev = stepSeen.current.get(it.id);
        stepSeen.current.set(it.id, cur);
        if (prev !== undefined && cur !== prev && cur >= 0 && !hadAlert) todo.push({ k: "update", text: `${TRACKS[it.track].label}: now at “${stepsOf(it)[it.step]}”` });
      });
      const needs = r.items.some((i) => i.flags.includes("needsInfo") || i.kind === "retake");
      if (needs && r.status === "sent" && !needsShown.current.has(r.id)) { needsShown.current.add(r.id); todo.push({ k: "needs", id: r.id, retake: r.items.some((i) => i.kind === "retake") }); }
    });
    if (todo.length) { const t = setTimeout(() => todo.forEach(push), 0); return () => clearTimeout(t); }
  }, [s, me]);

  /* ----- helpers ----- */
  const sc = () => D.current.scn ?? PRESETS.find((p) => p.id === "C1")!;
  const geo = () => PLACES.find((p) => p.id === sc().place) ?? PLACES[0];
  const placeNow = (): Sel => D.current.place ?? { id: geo().id, name: geo().name, area: geo().area, type: geo().type, key: geo().key };
  const toSel = (p: Place): Sel => ({ id: p.id, name: p.name, area: p.area, type: p.type, key: p.key });
  function buildInput(): Input {
    const d = D.current; const pl = placeNow(); const base = presetToInput(sc(), pl.id);
    return {
      ...base, equip: d.hints.equip ?? d.equip, buildingType: pl.type, keyCustomer: !!pl.key, inArea: pl.area !== "OUT", newPlace: !!pl.isNew, offline: ctx.current.s.offline,
      dangerPhoto: !!sc().danger, placeSrc: d.later ? "later" : d.place?.isNew ? "typed" : d.gps === "denied" ? "search" : "gps",
      ...d.ov,
    };
  }
  const idleChips = (): Chip[] => {
    const cs: Chip[] = [{ label: "Add photos", icon: "camera", tone: "green", quiet: true, run: () => fileRef.current?.click() }, { label: "Try sample photos", icon: "sparkle", quiet: true, run: () => sampleMenu() }];
    if (ctx.current.s.reports.some((r) => r.reporterId === ctx.current.me?.id)) cs.push({ label: "Where are my leads?", run: () => void trackIntent() });
    cs.push({ label: "My points", run: () => void pointsIntent() });
    return cs;
  };
  const mineReports = () => ctx.current.s.reports.filter((r) => r.reporterId === ctx.current.me?.id);

  /* ----- greeting ----- */
  async function greet() {
    const name = ctx.current.me?.name.split(" ")[0] ?? "there";
    const needs = mineReports().filter((r) => reportStatus(r).grp === "needs");
    void name; const parts: (string | Part)[] = [{ k: "hero" }]; hasStage.current = false;
    const cs = idleChips().filter((c) => c.label !== "Add photos");
    if (needs.length) {
      needs.slice(0, 2).forEach((r) => { needsShown.current.add(r.id); tracked.current.add(r.id); });
      parts.push(`${needs.length === 1 ? "One of your leads needs" : `${needs.length} of your leads need`} a little more from you:`);
      needs.slice(0, 2).forEach((r) => parts.push({ k: "report", id: r.id }, { k: "needs", id: r.id, retake: r.items.some((i) => i.kind === "retake") }));
    }
    await bot(parts, cs);
  }

  /* ----- photos ----- */
  async function onFiles(files: File[]) {
    const d = D.current; const room = 6 - d.photos.length;
    const add: Photo[] = [];
    for (const f of files.slice(0, Math.max(room, 0))) { try { add.push({ id: `u${++idc.current}`, label: "Your photo", kind: "user", url: await compress(f) }); } catch { /* skip */ } }
    if (!add.length) return;
    if (stageRef.current === "noBrand") {
      d.photos.push(...add); userSays("Close-up photo", add); setStage("busy"); setBusy(true); setTyping(true);
      const rd = await readPhotos(add, "A close-up of the plate or button panel, to find the brand and number.");
      if (!alive.current) return; setTyping(false);
      if (rd && rd.subject === "unit" && (rd.brand !== "unclear" || rd.number)) { applyReading(rd); await bot([`Thanks, that helps.${rd.number ? ` I can read the number: ${rd.number}.` : ""}`]); return analyse(); }
      return void bot(["Thanks! I cannot read text from photos automatically here. What does it say? Type the brand and number, for example “Schindler 74821”."], [{ label: "I cannot find it", run: cantFind }], "typeBrand");
    }
    if (stageRef.current === "q:number") { d.photos.push(...add); userSays("Another photo of the plate", add); return answer("number", "photo", "Another photo"); }
    addToStage(add);
  }
  function addToStage(add: Photo[]) {
    const next = [...stagedRef.current, ...add].slice(0, 6); stagedRef.current = next; setStaged(next);
    if (!hasStage.current) { hasStage.current = true; push({ k: "stage" }); }
  }
  function beginStage() { setMsgs((m) => m.filter((x) => x.k !== "hero")); hasStage.current = true; push({ k: "stage" }); }
  function removeStaged(id: string) { const next = stagedRef.current.filter((p) => p.id !== id); stagedRef.current = next; setStaged(next); }
  async function analyseStaged() {
    const ph = stagedRef.current; if (!ph.length) return;
    D.current.photos.push(...ph); stagedRef.current = []; setStaged([]); hasStage.current = false;
    setMsgs((m) => m.filter((x) => x.k !== "stage"));
    userSays(`${ph.length} photo${ph.length > 1 ? "s" : ""}`, ph);
    await afterPhotos();
  }
  async function loadScenario(p: Preset, fromLaunch = false) {
    const d = D.current; setSheet(false); hasStage.current = false; stagedRef.current = []; setStaged([]); setMsgs((m) => m.filter((x) => x.k !== "stage" && x.k !== "hero"));
    D.current = { ...fresh(), id: d.id, hints: d.hints, typed: d.typed };
    const n = D.current; n.scn = p; n.equip = p.equip; n.photos = samplePhotos(p); n.later = p.placeSrc === "later";
    if (p.offline && !ctx.current.s.offline) ctx.current.setOffline(true);
    userSays(`Demo scenario ${p.id}: ${p.title}`, n.photos);
    if (fromLaunch) setStage("busy");
    await bot([`Demo tip: ${p.tip}`], [], "busy");
    await afterPhotos();
  }
  async function afterPhotos() {
    const d = D.current; const n = d.photos.length;
    if (d.hints.place && !d.place) { const p = PLACES.find((x) => x.id === d.hints.place); if (p) { d.place = toSel(p); await bot([`Thanks, ${n} photo${n > 1 ? "s" : ""}. You mentioned ${p.name}, so I will use that.`]); return analyse(); } }
    await bot([`Thanks, ${n} photo${n > 1 ? "s" : ""}. Where is it?`], placeChips(), "place");
  }

  /* ----- place ----- */
  function placeChips(withGps = true): Chip[] {
    const cs: Chip[] = [];
    if (withGps) cs.push({ label: "Use my location", icon: "pin", tone: "green", run: gpsAsk });
    cs.push({ label: "Search for a building", run: () => void bot(["Type part of the building name, or pick one:"], [...PLACES.filter((p) => p.area !== "OUT").slice(0, 4).map((p) => ({ label: p.name, run: () => void choosePlace(toSel(p)) }))], "searchPlace") });
    cs.push({ label: "Type an address", run: () => void bot(["Type the building name and address, for example “Skyline Business Centre, Road No. 36, Jubilee Hills”."], [], "typeAddress") });
    cs.push({ label: "I am not at the site now", run: () => { D.current.later = true; void choosePlace(placeNow(), `Noted: you are reporting this later. I will use ${geo().name} for now.`); } });
    return cs;
  }
  function gpsAsk() {
    void bot(["Allow Snap & Lead to use your location? Only while you add a lead. We do not track you."], [
      { label: "Allow", tone: "green", run: () => {
        const p = sc().placeSrc;
        if (p === "denied") { D.current.gps = "denied"; return void bot(["Location permission was refused. No problem: search for the place or type an address."], placeChips(false), "place"); }
        if (p === "typed") { D.current.gps = "none"; return void bot(["No known building within 200 m. Please type its name and address."], [], "typeAddress"); }
        D.current.gps = "ok"; D.current.place = toSel(geo());
        void bot([`Pinned: ${geo().name}. Accuracy about 14 m, nearest known building within 200 m. Is that right?`], [
          { label: "Yes, that is it", tone: "green", run: () => void choosePlace(placeNow()) },
          ...PLACES.filter((x) => x.area !== "OUT" && x.id !== geo().id).slice(0, 2).map((x) => ({ label: x.name, run: () => void choosePlace(toSel(x)) })),
          { label: "Search instead", run: () => void bot(["Type part of the building name."], [], "searchPlace") },
        ], "place");
      } },
      { label: "Do not allow", run: () => { D.current.gps = "denied"; void bot(["No problem. Search for the place or type an address."], placeChips(false), "place"); } },
    ], "gps");
  }
  async function choosePlace(p: Sel, say?: string) {
    D.current.place = p;
    const restricted = p.type === "hospital" || p.type === "gov" || p.type === "transport";
    const parts: string[] = [];
    if (say) parts.push(say);
    if (restricted) parts.push("Photography may not be allowed here. Hospitals, government buildings and airports often restrict it. If so, describe the lift instead of photographing it.");
    if (parts.length) await bot(parts);
    return analyse();
  }
  function gotSearch(t: string) {
    const lc = t.toLowerCase();
    const hits = PLACES.filter((p) => p.name.toLowerCase().includes(lc) || p.addr.toLowerCase().includes(lc)).slice(0, 5);
    if (!hits.length) return void bot(["I could not find that building. Try another word, or type its address."], [{ label: "Type an address", run: () => void bot(["Type the building name and address."], [], "typeAddress") }], "searchPlace");
    void bot([`I found ${hits.length === 1 ? "one match" : `${hits.length} matches`}. Which one?`], hits.map((p) => ({ label: `${p.name} · ${p.addr}`, run: () => void choosePlace(toSel(p)) })), "searchPlace");
  }
  function gotAddress(t: string) {
    const [name, ...rest] = t.split(",").map((x) => x.trim());
    D.current.typed = { name, addr: rest.join(", ") };
    void bot([`Got it: ${name}${rest.length ? `, ${rest.join(", ")}` : ""}. Which sales area is it in?`], AREAS.map((a) => ({ label: a.name, run: () => { void choosePlace({ id: "new", name: D.current.typed.name, area: a.id, type: "office", isNew: true }, "New place saved. The records team will verify it. Until then I route this lead by the area you chose."); } })), "typeArea");
  }

  /* ----- reading ----- */
  function readRows(i: Input): [string, string, number][] {
    const rr = D.current.rd;
    const r = rr ? { servicer: rr.servicer, capacity: rr.capacity ?? "Not seen", conf: { number: rr.number ? 90 : 0, brand: rr.brand === "unclear" ? 0 : 90, sticker: rr.servicer === "unknown" ? 0 : 85, capacity: rr.capacity ? 85 : 0, age: 60 } } : sc().reading;
    return i.subject === "unit"
      ? [["Equipment", EQ[i.equip], 92], ["Unit number", i.number ?? "Not found", r.conf.number], ["Brand", i.brand === "ours" ? "Schindler" : i.brand === "other" ? "OtherLift" : "Unclear", r.conf.brand],
        ["Service sticker", r.servicer === "unknown" ? "Not seen" : r.servicer === "us" ? "Serviced by Schindler" : r.servicer === "maker" ? "Its own maker" : "Serviced by OtherLift", r.conf.sticker], ["Capacity", r.capacity, r.conf.capacity], ["Estimated age", `~${i.age} years`, r.conf.age]]
      : i.subject === "site"
        ? [["What I see", `Building site, no ${word(i.equip)} installed yet`, 88], ["Planned equipment", D.current.hints.equip ? `${EQ[D.current.hints.equip]} (from your message)` : "Not visible", D.current.hints.equip ? 80 : 0], ["Developer or contractor", D.current.extras.contact ?? "Not visible", D.current.extras.contact ? 85 : 0]]
        : [["What I see", "A notice about a lift", 88], ["The notice says", i.notice === "renovation" ? "Lift renovation" : i.notice === "tender" ? "A tender notice" : "A lift is coming soon", 80], ["Developer or contractor", D.current.extras.contact ?? "Not visible", D.current.extras.contact ? 85 : 0]];
  }
  async function analyse() {
    const d = D.current;
    if (!d.scn && d.ov.subject === undefined && !ctx.current.s.readerDown) {
      setStage("busy"); setBusy(true); setTyping(true);
      const rd = await readPhotos(d.photos, d.hints.condition ? `The user says it is ${d.hints.condition}.` : "");
      if (!alive.current) return; setTyping(false);
      if (!rd) return triage();
      applyReading(rd);
    }
    const i = buildInput(); d.input = i;
    if (ctx.current.s.readerDown) {
      return void bot(["The photo reader is not available right now. No problem, you can tell me the details and your lead is still accepted. Whose " + word(i.equip) + " is it?"], [
        { label: "Schindler", run: () => manual("ours") }, { label: "Another company", run: () => manual("other") }, { label: "Not sure", run: () => manual("unclear") }], "manualBrand");
    }
    await bot(["Great photos! I am reading the details now…"]);
    setTyping(true); await sleep(900); if (!alive.current) return; setTyping(false);
    if (i.quality === "notLift") return void bot(["That photo does not look like a lift or an escalator. Please retake it. There are no points for this one."], [{ label: "Retake photos", tone: "green", quiet: true, run: () => { d.photos = []; fileRef.current?.click(); } }, { label: "Try sample photos", quiet: true, run: () => sampleMenu() }], "idle");
    if (i.quality === "duplicatePhoto") return void bot(["I have seen this exact photo before, so I cannot count it again. Try a new photo."], [{ label: "Choose another photo", tone: "green", quiet: true, run: () => { d.photos = []; fileRef.current?.click(); } }], "idle");
    if (i.quality === "unreadable" && i.subject === "unit") return noBrandGuide();
    await bot([{ k: "reading", rows: readRows(i), note: i.subject === "unit" && !i.number ? "I could not find the unit number. You can type it in the next step." : undefined, ask: "Is this correct?" }], [
      { label: "Yes, looks right", tone: "green", icon: "check", run: () => void startQuestions() },
      { label: "Let me fix something", icon: "edit", run: fixMenu }], "confirmRead");
  }
  function applyReading(rd: Reading) {
    const d = D.current; d.rd = rd;
    const subject = rd.subject === "none" ? "unit" : rd.subject;
    if (subject === "site") d.scn = PRESETS.find((p) => p.id === "D1") ?? null;
    else if (subject === "notice") d.scn = PRESETS.find((p) => p.subject === "notice") ?? null;
    const quality: Input["quality"] = rd.subject === "none" ? "notLift" : subject !== "unit" ? "ok" : rd.brand === "unclear" && !rd.number ? "unreadable" : !rd.number ? "brandOnly" : "ok";
    const found = rd.brand === "ours" ? (rd.number ? (/^7/.test(rd.number) ? "found" : "missing") : "placeOnly") : "missing";
    d.ov = {
      subject, equip: rd.equip, brand: subject === "site" ? "unclear" : rd.brand, number: rd.number || undefined, servicer: rd.servicer, quality, lowConfidence: quality !== "ok",
      ...(subject === "unit" ? { records: found as Input["records"], contract: (found === "found" ? "active" : "never") as Input["contract"], ...(rd.ageGuess ? { age: rd.ageGuess } : {}) } : {}),
    };
  }
  function triage() {
    const base = { equip: D.current.hints.equip ?? D.current.equip, servicer: "unknown" as const };
    const go = (rd: Reading) => { applyReading(rd); void analyse(); };
    void bot(["I could not read the photos automatically here (no photo reader is connected), so help me out: what am I looking at?"], [
      { label: "A lift or escalator", run: () => void bot(["Can you see a brand name or logo on it?"], [
        { label: "Schindler", run: () => go({ ...base, subject: "unit", brand: "ours", sees: "A lift" }) },
        { label: "Another brand", run: () => void bot(["Which brand, and the number if you can see it? For example “Otis 55120”."], [], "typeBrand") },
        { label: "I cannot see one", run: () => go({ ...base, subject: "unit", brand: "unclear", sees: "A lift" }) }], "triageBrand") },
      { label: "A building under construction", run: () => go({ ...base, subject: "site", brand: "unclear", sees: "A building site" }) },
      { label: "A notice about a lift", run: () => go({ ...base, subject: "notice", brand: "unclear", sees: "A notice" }) }], "triage");
  }
  function parseBrand(t: string): { brand?: Input["brand"]; number?: string } {
    const num = t.match(/[A-Za-z]{0,3}\d{4,}[A-Za-z0-9-]*/)?.[0];
    const words = t.replace(num ?? "", "").trim();
    const brand: Input["brand"] | undefined = /schindler/i.test(words) ? "ours" : words.length > 1 ? "other" : undefined;
    return { brand, number: num };
  }
  function gotBrand(t: string) {
    const d = D.current; const p = parseBrand(t);
    if (!p.brand && !p.number) return void bot(["I did not catch a brand or a number. Try something like “Schindler 74821”, or say you cannot find it."], [{ label: "I cannot find it", run: cantFind }], "typeBrand");
    const rd: Reading = { ...(d.rd ?? { subject: "unit", equip: d.hints.equip ?? d.equip, brand: "unclear", servicer: "unknown", sees: "A lift" }), subject: "unit", brand: p.brand ?? d.rd?.brand ?? "unclear", number: p.number ?? d.rd?.number };
    applyReading(rd);
    void bot([`Thanks, noted${p.brand ? (p.brand === "ours" ? " a Schindler" : " another brand") : ""}${p.number ? ` with number ${p.number}` : ""}.`]).then(() => analyse());
  }
  function cantFind() {
    const d = D.current; const i = d.input ?? buildInput();
    d.input = { ...i, quality: "brandOnly", lowConfidence: true }; d.ov = { ...d.ov, quality: "brandOnly", lowConfidence: true };
    void bot(["No problem. I will match it by place and the records team will confirm the brand and number."]).then(() => startQuestions());
  }
  function noBrandGuide() {
    const d = D.current;
    const cs: Chip[] = [{ label: "Add a close-up photo", icon: "camera", tone: "green", quiet: true, run: () => fileRef.current?.click() }];
    if (d.sample === "nobrand") cs.push({ label: "Use sample close-up", icon: "sparkle", quiet: true, run: () => void sampleCloseup() });
    cs.push({ label: "Type what I can see", run: () => void bot(["Type the brand and number as you see them, for example “Schindler 74821”."], [{ label: "I cannot find it", run: cantFind }], "typeBrand") }, { label: "I cannot find it", run: cantFind });
    void bot(["I can see a lift, but I cannot make out the brand or the number. Here is where to look:\n• The ID plate near the doors or on the car frame: it carries the unit number\n• The logo on the button panel or the door frame\n• The service sticker, often on the panel or the door\nPlease only check from public areas, never from a machine room. One sharp close-up of any of these is all I need."], cs, "noBrand");
  }
  async function sampleCloseup() {
    const d = D.current; const ph: Photo = { id: "s9", label: "Close-up: plate", kind: "plate", text: "Lift No. 74821" };
    d.photos.push(ph); d.scn = PRESETS.find((p) => p.id === "B2") ?? d.scn; d.rd = null;
    d.ov = { brand: "ours", number: "74821", quality: "ok", lowConfidence: false };
    userSays("Close-up of the plate", [ph]);
    await bot(["Much better! That is a Schindler plate and I can read the number: 74821."]);
    return analyse();
  }
  function sampleMenu() {
    void bot(["Pick a sample photo set and I will take it from there:"], [
      { label: "A new building site", quiet: true, run: () => void loadSample("site") },
      { label: "A lift, brand not visible", quiet: true, run: () => void loadSample("nobrand") },
      { label: "A lift with a clear plate", quiet: true, run: () => void loadSample("plate") },
      { label: "More scenarios…", quiet: true, run: () => setSheet(true) }], "idle");
  }
  async function loadSample(key: "site" | "nobrand" | "plate") {
    const d = D.current; const p = PRESETS.find((x) => x.id === (key === "site" ? "D1" : key === "nobrand" ? "E4" : "C1"))!;
    D.current = { ...fresh(), id: d.id, hints: d.hints, typed: d.typed };
    const n = D.current; n.scn = p; n.equip = p.equip; n.sample = key;
    n.photos = key === "nobrand" ? [{ id: "s1", label: "Cabin", kind: "cabin" }, { id: "s2", label: "Button panel", kind: "panel" }] : samplePhotos(p);
    if (key === "nobrand") n.ov = { brand: "unclear", number: undefined, quality: "unreadable", servicer: "unknown" };
    userSays(key === "site" ? "Photos of a new building site" : key === "nobrand" ? "Photos of a lift" : "Photos of a lift and its plate", n.photos);
    await afterPhotos();
  }
  function manual(b: Input["brand"]) {
    const d = D.current; d.input = { ...d.input!, brand: b, quality: "ok" }; d.corrections = ["Manual entry (reader down)"];
    void bot(["Thanks. What is the unit number? You can skip it."], [{ label: "I cannot find it", run: () => { d.input = { ...d.input!, number: undefined }; void startQuestions(); } }], "typeNumber2");
  }
  function refreshReading(text: string) {
    const rows = readRows(D.current.input!);
    setMsgs((m) => { let at = -1; m.forEach((x, k) => { if (x.k === "reading") at = k; }); return at < 0 ? m : m.map((x, k) => (k === at && x.k === "reading" ? { ...x, rows } : x)); });
    void bot([text, "Anything else to fix?"], [{ label: "Looks right now", tone: "green", run: () => void startQuestions() }, { label: "Fix another", run: fixMenu }], "confirmRead");
  }
  function fixSite() {
    const d = D.current; const i = d.input!;
    void bot(["What should I change?"], [
      { label: "What will be installed", run: () => void bot(["What is planned for this building?"], (Object.keys(EQ) as Equip[]).map((e) => ({ label: EQ[e], run: () => { d.hints.equip = e; d.input = { ...i, equip: e }; d.ov = { ...d.ov, equip: e }; d.corrections.push(`Planned equipment: ${EQ[e]}`); refreshReading(`Updated: planned equipment is ${word(e)}.`); } })), "fix") },
      { label: "Developer or contractor", run: () => void bot(["Type the developer or contractor name from the hoarding."], [], "fixDev") },
      { label: "It is an existing lift", run: () => { d.scn = null; d.hints.site = false; d.corrections.push("Changed from building site to existing lift"); d.rd = null; d.ov = {}; applyReading({ subject: "unit", equip: d.hints.equip ?? "lift", brand: "unclear", servicer: "unknown", sees: "A lift" }); void bot(["Thanks, I will treat it as an existing lift."]).then(() => analyse()); } },
      { label: "Nothing, continue", tone: "green", run: () => void startQuestions() },
    ], "fix");
  }
  function fixMenu() {
    if (D.current.input && D.current.input.subject !== "unit") return fixSite();
    void bot(["What should I change?"], [
      { label: "Brand", run: () => void bot(["Whose is it?"], [["ours", "Schindler"], ["other", "Another company"], ["unclear", "Unclear"]].map(([v, t]) => ({ label: t, run: () => applyFix("brand", v, t) })), "fix") },
      { label: "Unit number", run: () => void bot(["Type the correct unit number."], [], "fixNumber") },
      { label: "Age", run: () => void bot(["About how old is it?"], [[3, "Under 5 years"], [10, "5 to 15 years"], [20, "15 to 25 years"], [30, "Over 25 years"]].map(([v, t]) => ({ label: String(t), run: () => applyFix("age", String(v), String(t)) })), "fix") },
      { label: "Equipment", run: () => void bot(["What is it?"], (Object.keys(EQ) as Equip[]).map((e) => ({ label: EQ[e], run: () => applyFix("equip", e, EQ[e]) })), "fix") },
      { label: "Nothing, continue", tone: "green", run: () => void startQuestions() },
    ], "fix");
  }
  function applyFix(f: "brand" | "number" | "age" | "equip", v: string, label: string) {
    const d = D.current; const i = d.input!; const n = { ...i }; let c = "";
    if (f === "brand") { n.brand = v as Input["brand"]; c = `Brand: ${i.brand} → ${v}`; }
    if (f === "number") { n.number = v || undefined; c = `Number: ${i.number ?? "none"} → ${v || "none"}`; }
    if (f === "age") { n.age = Number(v); c = `Age: ${i.age} → ${v}`; }
    if (f === "equip") { n.equip = v as Equip; c = `Equipment: ${i.equip} → ${v}`; }
    d.input = n; d.corrections.push(c);
    const rows = readRows(n);
    setMsgs((m) => { let at = -1; m.forEach((x, k) => { if (x.k === "reading") at = k; }); return at < 0 ? m : m.map((x, k) => (k === at && x.k === "reading" ? { ...x, rows } : x)); });
    void bot([`Updated: ${label}. The card above now shows the change.`, "Anything else to fix?"], [{ label: "Looks right now", tone: "green", run: () => void startQuestions() }, { label: "Fix another", run: fixMenu }], "confirmRead");
  }

  /* ----- questions ----- */
  async function startQuestions() {
    const d = D.current; const cur = d.input!;
    const intro = cur.subject === "site" ? `A building site with no ${word(cur.equip)} yet. Nice catch! Tick what you can see. Everything is optional except the first question.` : cur.subject === "notice" ? "A notice. Thanks for spotting it." : cur.brand === "ours" ? "Looks like one of ours. Tick what applies." : cur.brand === "other" ? `That is another company's ${word(cur.equip)}. Good spot! Tick what applies.` : "I could not tell the brand. Tick what applies.";
    const fields = formFields(cur, !!sc().danger);
    if (!fields.length) return void enrich(intro);
    formKeys.current = fields.map((x) => x.key);
    const initial: Record<string, string> = d.hints.condition && cur.subject === "unit" ? { condition: d.hints.condition } : {};
    await bot([{ k: "form", intro, fields, initial }], [], "form");
  }
  function finishForm(vals: Record<string, string>, typed: string, extras: { contact: string; note: string }) {
    const d = D.current; let i = d.input!;
    for (const k of formKeys.current) {
      const installing = vals.installer === "comp" || vals.installer === "us";
      const v = k === "number" ? (typed.trim() ? "type" : "cant") : k === "ordered" && installing ? "yes" : vals[k] ?? DEFAULT[k] ?? "unsure";
      i = applyOne(i, k, v, typed.trim() || undefined, sc()).i;
      d.asked.push(k); d.answers.push({ q: k, a: k === "number" ? (typed.trim() || "not found") : opts(k, i).find((o) => o.v === v)?.t ?? v });
    }
    d.input = i;
    if (extras.contact.trim()) d.extras.contact = extras.contact.trim();
    if (extras.note.trim()) d.extras.note = extras.note.trim();
    if (i.condition === "unsafe") return void bot(["Thank you for telling me. I am treating this as a safety report. Is anyone trapped or hurt?"], hurtChips(), "hurt");
    void showSummary();
  }
  function askNext(prefix?: string) {
    const d = D.current; const i = d.input!; const k = nextQ(i, d.asked, !!sc().danger);
    if (!k) return void enrich(prefix);
    const cs: Chip[] = opts(k, i).map((o) => ({
      label: o.t, tone: o.tone, quiet: false,
      run: () => {
        if (k === "number" && o.v === "photo") { fileRef.current?.click(); return; }
        if (k === "number" && o.v === "type") return void bot(["Type the unit number."], [{ label: "I cannot find it", run: () => answer("number", "cant", "I cannot find it") }], "typeNumber");
        answer(k, o.v, o.t);
      },
    }));
    void bot([...(prefix ? [prefix] : []), QTEXT[k](i)], cs, `q:${k}`);
  }
  function answer(k: string, v: string, label: string, typedNum?: string) {
    const d = D.current; if (!d.input) return;
    const ar = applyOne(d.input, k, v, typedNum, sc()); const i = ar.i; const react = ar.react;
    d.input = i; d.asked.push(k); d.answers.push({ q: k, a: label });
    if (i.condition === "unsafe" && (k === "condition" || k === "danger")) return void bot(["Thank you for telling me. I am treating this as a safety report. Is anyone trapped or hurt?"], hurtChips(), "hurt");
    askNext(react || undefined);
  }
  const hurtChips = (): Chip[] => [["yes", "Yes, someone is hurt"], ["no", "No"], ["unsure", "Not sure"]].map(([v, t]) => ({ label: t, tone: v === "yes" ? "red" as const : undefined, run: () => sendUnsafe(v as "yes" | "no" | "unsure") }));

  /* ----- optional enrichment, summary, submit ----- */
  function enrich(prefix?: string) {
    void bot([...(prefix ? [prefix] : []), (D.current.input?.subject === "site" ? "That is everything I need. Do you know the developer's or contractor's name? It helps the sales team. Type it, or skip." : "That is everything I need. One optional extra earns bonus points and helps the owner: do you know a contact there, like the facility manager? Type their name and role, or skip.")], [{ label: "Skip", run: () => enrichNote() }], "optContact");
  }
  function enrichNote() {
    void bot(["Anything else the owner should know? Type a note (+5 points), or skip."], [{ label: "Skip", run: () => void showSummary() }], "optNote");
  }
  async function showSummary() {
    const d = D.current; const i = { ...d.input!, contact: !!d.extras.contact || d.input!.contact }; d.input = i;
    const out = evaluate(i, ctx.current.s.cfg);
    const live = out.items.filter((x) => !x.silent);
    const part: Part = {
      k: "summary", place: placeNow().name + (placeNow().isNew ? " (new)" : "") + (d.later ? " · reported later" : ""), headline: out.headline, plain: out.plain,
      who: live.length ? (teamsOf(out).length ? teamsOf(out).map((t) => TEAM_NAME[t]).join(" + ") : "Saved, no team needed") : "Nobody yet",
      tracks: live.map((x) => ({ track: x.track, step: x.step0 ?? 0, steps: x.steps, status: x.autoClose ? "closed" : "new" }) as TrackItem), points: out.points.map((p) => ({ label: p.label, pts: p.pts, status: p.status })),
      photos: d.photos.slice(0, 4), offline: ctx.current.s.offline, more: out.items.some((x) => x.kind === "lead" && !x.silent), held: out.points.some((p) => p.status === "held"),
    };
    await bot([{ ...part, intro: "Please check this summary. Nothing is created until you confirm." } as Part], [
      { label: ctx.current.s.offline ? "Save on phone" : "Create lead", tone: "green", icon: "send", run: () => submit(i) },
      { label: "Add a contact or note", run: () => void bot(["Type a contact (name and role), or start with “note:” to add a note."], [{ label: "Back", run: () => void showSummary() }], "optBoth") },
      { label: "Start over", run: reset }], "confirm");
  }
  function submit(i: Input, answers = D.current.answers) {
    const d = D.current; const c = ctx.current; const pl = placeNow(); const id = d.id;
    const out = evaluate({ ...i, offline: c.s.offline }, c.s.cfg);
    c.mutate((st) => {
      createReport(st, { id, reporterId: c.me!.id, input: { ...i, offline: st.offline }, photos: d.photos, placeId: pl.id, placeName: pl.name, area: pl.area, answers, corrections: d.corrections });
      if (d.extras.contact) A.extra(st, id, "contact", d.extras.contact);
      if (d.extras.note) A.extra(st, id, "note", d.extras.note);
    });
    tracked.current.add(id); lastId.current = id;
    const emerg = out.items.some((x) => x.kind === "emergency");
    const queued = c.s.offline;
    const next = (): Chip[] => [
      { label: "Open the opportunity", tone: "soft", run: () => ctx.current.onOpen(lastId.current ?? "") },
      ...(emerg ? [] : [{ label: "Add a photo (+3)", run: () => { c.mutate((st) => A.extra(st, id, "photo", "")); void bot(["Added. Thank you (+3 points)."], next(), "sent"); } }]),
      { label: "Open full details", quiet: true, run: () => c.onOpen(id) },
      { label: "Add another lead", run: reset },
    ];
    const parts: (string | Part)[] = emerg
      ? ["Emergency desk alerted. Thank you for speaking up. Please keep clear of the unit and follow the building's safety instructions. Do not enter a machine room.", ...(i.offline || c.s.offline ? ["No signal: call the emergency desk now on 1800 000 0000."] : []), { k: "report", id, outro: "I will tell you here as soon as the desk acknowledges it." }]
      : queued ? [{ k: "report", id, intro: "Saved on your phone. It will be sent as soon as you are back online. It will not be lost." }]
      : [{ k: "report", id, intro: `Lead ${id} created. ${out.plain[0] ?? ""}`.trim(), outro: "I will keep you posted right here as it moves, and ask you if the owner needs anything. You also earn more points as it progresses: +20 accepted, +50 quote, +200 won." }];
    if (queued) void bot(parts, [{ label: "Demo: back online", tone: "soft", run: () => { c.setOffline(false); void bot(["Back online. Your lead was sent without creating a duplicate."], next(), "sent"); } }, { label: "Add another lead", run: reset }], "sent");
    else void bot(parts, next(), "sent");
  }
  function sendUnsafe(hurt: "yes" | "no" | "unsure") {
    const d = D.current;
    const base = d.input ?? { ...buildInput(), quality: "ok" as const, brand: sc().reading.brand };
    submit({ ...base, quality: base.quality === "notLift" || base.quality === "duplicatePhoto" || base.quality === "unreadable" ? "ok" : base.quality, subject: "unit", condition: "unsafe", hurt, known: "none", offline: ctx.current.s.offline }, [...d.answers, { q: "hurt", a: hurt }]);
  }
  function reset() {
    D.current = fresh(); setSheet(false);
    void bot(["Okay, let's start a new one. Send photos, or tell me what you saw."], idleChips());
  }

  /* ----- safety, tracking, points, help ----- */
  function safetyFlow() {
    const off = ctx.current.s.offline;
    void bot(["Thank you for speaking up. I am alerting the emergency desk right away. No sales lead is created. Is anyone trapped or hurt?", ...(off ? ["You are offline. Call the emergency desk now: 1800 000 0000. The alert is sent when signal returns."] : [])], hurtChips(), "hurt");
  }
  function trackIntent(rid?: string) {
    const mine = mineReports();
    if (!mine.length) return void bot(["You have no leads yet. Send me your first photo and I will take care of the rest."], idleChips());
    const picked = rid ? mine.filter((r) => r.id === rid) : lastId.current ? mine.filter((r) => r.id === lastId.current) : mine.slice(0, 3);
    const list = picked.length ? picked : mine.slice(0, 3);
    const cs: Chip[] = list.slice(0, 1).flatMap((r) => [{ label: `Open ${r.id} in full`, quiet: true, run: () => ctx.current.onOpen(r.id) }]);
    list.forEach((r) => tracked.current.add(r.id));
    void bot([list.length === 1 ? "Here is where it stands:" : `Here are your ${list.length} latest leads:`, ...list.map((r) => ({ k: "report", id: r.id }) as Part), ...(lastId.current && list.some((r) => r.id === lastId.current) ? ["I will message you here when something changes."] : [])], [...cs, ...(lastId.current ? [{ label: "Open the opportunity", tone: "soft" as const, run: () => ctx.current.onOpen(lastId.current ?? "") }] : []), { label: "Add a new lead", run: reset }, { label: "My points", run: () => void pointsIntent() }], "idle");
  }
  function needsIntent() {
    const n = mineReports().filter((r) => reportStatus(r).grp === "needs");
    if (!n.length) return void bot(["Nothing is waiting on you. Nice work."], idleChips());
    n.forEach((r) => tracked.current.add(r.id));
    void bot([`${n.length} lead${n.length > 1 ? "s" : ""} need${n.length > 1 ? "" : "s"} you:`, ...n.slice(0, 3).flatMap((r) => [{ k: "report", id: r.id } as Part, { k: "needs", id: r.id, retake: r.items.some((i) => i.kind === "retake") } as Part])], idleChips());
  }
  function pointsIntent() {
    void bot([{ k: "points" }, "You earn most points when a lead becomes a real result: +10 sent, +30 missing lift added, +20 accepted, +50 quote, +200 won, +5 for a contact or a note, +3 per extra photo. There is a daily limit of 5 paid leads, and safety reports are never ranked."], [{ label: "Add a lead now", tone: "green", run: reset }, { label: "Where are my leads?", run: () => void trackIntent() }], "idle");
  }
  function helpIntent() {
    void bot(["Here is what I can do:\n• Read photos of a lift, escalator, building site or notice\n• Ask the few questions that matter, then create the lead and send it to the right team\n• Show where each lead stands, and ask you if the owner needs something\n• Handle anything unsafe straight away\n• Tell you about your points and level\nJust type, or tap a suggestion."], idleChips());
  }
  function startFromText(t: string) {
    const d = D.current; d.hints = { ...d.hints, ...parseHints(t) };
    if (d.hints.site && !d.scn) { const site = PRESETS.find((p) => p.subject === "site"); if (site) d.scn = site; }
    const bits = [d.hints.equip ? word(d.hints.equip) : null, d.hints.condition && d.hints.condition !== "fine" ? `“${d.hints.condition === "out" ? "out of service" : d.hints.condition}”` : null, d.hints.place ? `at ${PLACES.find((p) => p.id === d.hints.place)?.name}` : null, d.hints.site ? "a building site" : null].filter(Boolean);
    void bot([bits.length ? `Thanks, I noted: ${bits.join(" ")}. To log it properly I need a photo. A clear shot of the plate or button panel is best, taken from a public area.` : "Happy to log that. To do it properly I need a photo. A clear shot of the plate or button panel is best, taken from a public area."], [
      { label: "Add photos", icon: "camera", tone: "green", quiet: true, run: () => fileRef.current?.click() }, { label: "Try sample photos", icon: "sparkle", quiet: true, run: () => sampleMenu() }], "idle");
  }

  /* ----- demo: simulate the desk ----- */
  function demoNext() {
    const c = ctx.current; const id = lastId.current; if (!id) return;
    const r = c.s.reports.find((x) => x.id === id);
    if (!r) return void bot(["The lead is still being created. Try again in a second."], [{ label: "Open the opportunity", tone: "soft", run: () => ctx.current.onOpen(lastId.current ?? "") }], "sent");
    const it = r.items.find((i) => !i.silent && i.status !== "closed");
    if (!it) return void bot(["Everything on this lead is done. Thank you!"], idleChips());
    const by = it.ownerId ?? c.s.cfg.owners[r.area]?.MGR ?? "marc"; const n = demoStep.current[it.id] ?? 0; demoStep.current[it.id] = n + 1;
    c.mutate((st) => {
      const x = st.reports.find((q) => q.id === id)?.items.find((q) => q.id === it.id); if (!x) return;
      if (!x.ownerId) { A.reassign(st, [x.id], st.cfg.owners[r.area]?.[x.team ?? "SC"] ?? "marc", "marc"); return; }
      if (x.kind === "emergency") { if (n === 0) A.ack(st, x.id, by); else if (n === 1) A.dispatch(st, x.id, by); else A.closeEmergency(st, x.id, by); }
      else if (x.kind === "records") A.records(st, x.id, by, r.input.records === "missing" || r.input.records === "placeOnly" ? "create" : "confirm");
      else if (x.kind === "ticket") { if (n === 0) A.assignEngineer(st, x.id, by, "Jonas"); else A.closeTicket(st, x.id, by, "Door roller replaced"); }
      else if (x.kind === "lead") { if (n === 0) A.accept(st, x.id, by); else if (n === 1) A.visit(st, x.id, by); else if (n === 2) A.quote(st, x.id, by); else A.outcome(st, x.id, by, "won"); }
      else A.accept(st, x.id, by);
    });
    void bot(["(Demo) A colleague on the desk just acted. Watch the progress update here."], [{ label: "▶ Demo: next step", tone: "soft", run: demoNext }, { label: "Where does it stand?", run: () => void trackIntent(id) }, { label: "Add another lead", run: reset }], "sent");
  }

  /* ----- composer ----- */
  function send(raw: string) {
    const t = raw.trim(); if (!t || busy) return;
    setText(""); userSays(t);
    const lc = t.toLowerCase(); const st = stageRef.current; const d = D.current;
    if (st === "typeNumber") return answer("number", "type", t, t);
    if (st === "typeNumber2") { d.input = { ...d.input!, number: t }; return void startQuestions(); }
    if (st === "typeBrand") return gotBrand(t);
    if (st === "fixNumber") return applyFix("number", t, t);
    if (st === "fixDev") { d.extras.contact = t; d.corrections.push(`Developer or contractor: ${t}`); return refreshReading(`Updated: developer or contractor is ${t}.`); }
    if (st === "typeAddress") return gotAddress(t);
    if (st === "searchPlace" || (st === "place" && !UNSAFE.test(t))) return gotSearch(t);
    if (st === "optContact") { if (/^(skip|no|none|nope|no thanks)\b/.test(lc)) return enrichNote(); d.extras.contact = t; return void bot(["Added (+5 points once sent). I will share it only with the lead's owner and the sales manager."]).then(enrichNote); }
    if (st === "optNote") { if (/^(skip|no|none|nope|no thanks)\b/.test(lc)) return void showSummary(); d.extras.note = t; return void bot(["Added (+5 points once sent)."]).then(() => showSummary());
    }
    if (st === "optBoth") { if (/^note:/i.test(t)) d.extras.note = t.replace(/^note:\s*/i, ""); else d.extras.contact = t; return void bot(["Added."]).then(() => showSummary()); }
    if (UNSAFE.test(t) && st !== "hurt") return safetyFlow();
    if (st === "hurt") { const v = /\b(yes|yeah|hurt|trapped|injur)/.test(lc) ? "yes" : /\b(no|nobody|none|nope|fine)\b/.test(lc) ? "no" : "unsure"; return sendUnsafe(v); }
    if (st.startsWith("q:")) {
      const k = st.slice(2); const i = d.input!;
      if (k === "number") { const m = t.match(/[A-Za-z]{0,3}\d{3,}[A-Za-z0-9-]*/); if (m) return answer("number", "type", m[0], m[0]); }
      const m = matchOpt(k, t, i); if (m && m.v !== "photo" && m.v !== "type") return answer(k, m.v, m.t);
      if (!STATUS.test(lc) && !POINTS.test(lc) && !HELP.test(lc)) return void bot(["I did not quite catch that. Tap one of these, or say it another way:"], opts(k, i).filter((o) => o.v !== "photo").map((o) => ({ label: o.t, tone: o.tone, run: () => (k === "number" && o.v === "type" ? void bot(["Type the unit number."], [{ label: "I cannot find it", run: () => answer("number", "cant", "I cannot find it") }], "typeNumber") : answer(k, o.v, o.t)) })), st);
    }
    const idm = t.match(/SL-[A-Z0-9]+/i);
    if (idm) return trackIntent(idm[0].toUpperCase());
    if (NEEDS.test(lc)) return needsIntent();
    if (STATUS.test(lc)) return trackIntent();
    if (POINTS.test(lc)) return pointsIntent();
    if (/^(cancel|start over|reset|new chat|another|new (report|lead))/.test(lc)) return reset();
    if (HELP.test(lc) && !LIFTY.test(lc.replace(/^(hi|hello|hey)\b/, ""))) return helpIntent();
    if (st === "confirm" && /^(yes|yep|ok|okay|create|send|confirm|go)\b/.test(lc)) return submit(d.input!);
    if (st === "confirmRead") { if (/^(yes|yep|ok|okay|correct|right|looks)/.test(lc)) return void startQuestions(); if (/^(no|fix|wrong|change)/.test(lc)) return fixMenu(); }
    if (st === "sent") { const x = lastId.current; if (/photo/.test(lc)) { ctx.current.mutate((q) => A.extra(q, x!, "photo", "")); return void bot(["Added a photo (+3 points)."], [{ label: "Open the opportunity", tone: "soft", run: () => ctx.current.onOpen(lastId.current ?? "") }], "sent"); } if (/^note:?\s*(.+)/i.test(t)) { ctx.current.mutate((q) => A.extra(q, x!, "note", t.replace(/^note:?\s*/i, ""))); return void bot(["Note added (+5 points). It is visible to the owner and the sales manager only."], [{ label: "Open the opportunity", tone: "soft", run: () => ctx.current.onOpen(lastId.current ?? "") }], "sent"); } if (/contact/.test(lc)) { ctx.current.mutate((q) => A.extra(q, x!, "contact", t)); return void bot(["Contact added (+5 points). Shared only with the lead's owner and the sales manager."], [{ label: "Open the opportunity", tone: "soft", run: () => ctx.current.onOpen(lastId.current ?? "") }], "sent"); } }
    if (LIFTY.test(lc)) return startFromText(t);
    void bot(["I am not sure I can help with that yet. I can read photos of lifts, escalators and building sites, track your leads, or tell you about your points."], idleChips());
  }

  useEffect(() => {
    alive.current = true;
    ctx.current.s.alerts.forEach((a) => seenAlerts.current.add(a.id));
    const t = setTimeout(() => {
      if (started.current) return; started.current = true;
      if (restore) { setStage("idle"); setChips(idleChips()); setBusy(false); return; }
      if (preset) void loadScenario(preset, true); else void greet();
    }, 0);
    return () => { alive.current = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me || msgs.every((m) => m.old) || !msgs.some((m) => m.k === "text" && m.from === "me")) return;
    const texts = msgs.filter((m): m is Msg & { k: "text" } => m.k === "text");
    const first = texts.find((m) => m.from === "me")!; const last = texts[texts.length - 1];
    saveThread(me.id, {
      id: tid, kind: "home", title: first.text.length > 48 ? `${first.text.slice(0, 47)}…` : first.text, last: `${last.from === "me" ? "You: " : ""}${last.text}`, t: Date.now(),
      msgs: msgs.filter((m) => !LIVE_ONLY.has(m.k)).map((x) => ({ ...x, old: undefined })).map((m) => (m.k === "text" && m.photos ? { ...m, photos: m.photos.map(slim) } : m.k === "summary" ? { ...m, photos: m.photos.map(slim) } : m)),
    });
  }, [msgs, me]);

  const onChip = (c: Chip) => { if (busy) return; setChips([]); if (!c.quiet) userSays(c.label); c.run(); };
  const placeholder = stage === "typeNumber" || stage === "typeNumber2" || stage === "fixNumber" ? "Type the unit number…" : stage === "fixDev" ? "Developer or contractor name…" : stage === "typeBrand" ? "Brand and number, e.g. Schindler 74821…" : stage === "typeAddress" ? "Building name, address…" : stage === "searchPlace" || stage === "place" ? "Search for a building…" : stage === "optContact" ? "Name and role, or skip…" : stage === "optNote" ? "Add a note, or skip…" : "Ask anything or describe what you saw…";

  return (
    <div className="absolute inset-0 flex flex-col bg-surface">

      <div ref={box} className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden"><div className="mx-auto w-full max-w-3xl space-y-3.5 px-3 py-5 @3xl:px-4">
        {msgs.map((m) => <Bubble key={m.mid} m={m} onOpen={onOpen} onNeeds={(t) => { userSays(t); }} stage={{ photos: staged, add: () => fileRef.current?.click(), remove: removeStaged, analyse: () => void analyseStaged(), begin: beginStage, form: finishForm, busy }} />)}
        {typing && <Thinking />}
        {chips.length > 0 && !busy && (
          <div className="pop flex flex-wrap gap-2 pt-1">
            {chips.map((c, k) => (
              <button key={k} onClick={() => onChip(c)} className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${c.tone === "red" ? "border-brand/50 bg-white text-brand hover:bg-brand-soft" : c.tone === "green" ? "border-brand bg-brand text-white hover:bg-brand-dark" : c.tone === "soft" ? "border-dashed border-brand/50 bg-white text-brand hover:bg-brand-soft" : "border-line bg-white hover:bg-surface"}`}>
                {c.icon && <Icon n={c.icon} s={14} />}{c.label}
              </button>
            ))}
          </div>
        )}
      </div></div>

      <div className="shrink-0 bg-surface"><div className="mx-auto w-full max-w-3xl px-3 pb-2 pt-2.5">
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-1 rounded-lg border border-brand/60 bg-white p-1.5 focus-within:border-brand">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { const fl = Array.from(e.target.files ?? []); e.target.value = ""; if (fl.length) void onFiles(fl); }} />
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder={busy ? "Assistant is typing…" : placeholder} className="min-h-10 min-w-0 flex-1 bg-transparent px-2.5 text-[14px] outline-none placeholder:text-muted disabled:opacity-60" />
          <button type="button" aria-label="Add photos" onClick={() => fileRef.current?.click()} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/70 hover:bg-surface disabled:opacity-50"><Icon n="camera" s={19} /></button>
          <button type="submit" aria-label="Send" disabled={busy || !text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-white disabled:opacity-35"><Icon n="send" s={17} /></button>
        </form>
      </div></div>

      {sheet && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/50" onClick={() => setSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} className="pop flex max-h-[80%] w-full flex-col rounded-t-3xl bg-white">
            <div className="shrink-0 border-b border-line p-4"><div className="text-base font-bold">Demo: what do the photos show?</div><p className="text-xs text-muted">Picks sample photos so you can try any of the {PRESETS.length} situations. ● marks the pilot scenarios.</p></div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
              {Object.entries(GROUPS).map(([g, gn]) => (
                <div key={g} className="mb-3"><div className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{g} · {gn}</div>
                  {PRESETS.filter((p) => p.group === g).map((p) => <button key={p.id} onClick={() => void loadScenario(p)} className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface"><span className="w-9 shrink-0 text-xs font-bold text-brand">{p.id}</span><span>{p.pilot ? "● " : ""}{p.title}</span></button>)}
                </div>
              ))}
            </div>
            <button onClick={() => setSheet(false)} className="shrink-0 border-t border-line py-3 text-sm font-semibold text-muted">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- message views */
interface StageApi { form: (v: Record<string, string>, typed: string, extras: { contact: string; note: string }) => void; photos: Photo[]; add: () => void; remove: (id: string) => void; analyse: () => void; begin: () => void; busy: boolean }
function Bubble({ m, onOpen, onNeeds, stage }: { m: Msg; onOpen: (id: string) => void; onNeeds: (t: string) => void; stage: StageApi }) {
  const { s, me } = useApp();
  if (m.k === "text") {
    if (m.from === "me") return (
      <div className="pop flex justify-end"><div className="max-w-[80%] rounded-lg bg-brand px-4 py-2.5 text-[14px] leading-[21px] text-white">
        {m.photos && m.photos.length > 0 && <div className="mb-2 flex max-w-[17rem] flex-wrap justify-end gap-1.5">{m.photos.slice(0, 6).map((p) => <PhotoTile key={p.id} p={p} className="!h-24 !w-24 shrink-0 !rounded-md" />)}</div>}
        <span className="whitespace-pre-wrap break-words">{m.text}</span></div></div>
    );
    return <div className="pop"><div className="sheet whitespace-pre-wrap break-words px-4 py-3 text-[14px] leading-[21px]">{m.old ? m.text : <StreamText text={m.text} />}</div></div>;
  }
  const wrap = (c: React.ReactNode) => <div className="pop min-w-0">{c}</div>;
  if (m.k === "form") return wrap(<FormCard m={m} onDone={stage.form} />);
  if (m.k === "hero") return wrap(<SnapHero onSnap={stage.begin} />);
  if (m.k === "stage") return wrap(
    <div className="sheet p-4">
      <div className="t-title">Add lift photos</div>
      <p className="t-small mt-1">Include clear photos such as the licence plate, button panel, service sticker or capacity plate. A building site or a notice works too.</p>
      <div className="mt-3 grid grid-cols-3 gap-2 @xl:grid-cols-4">
        {stage.photos.map((p) => <PhotoTile key={p.id} p={p} className="!rounded-md" onRemove={() => stage.remove(p.id)} />)}
        {stage.photos.length < 6 && <button onClick={stage.add} className="grid aspect-square place-items-center rounded-md border border-dashed border-brand/50 bg-brand-soft px-1 text-center text-[12px] leading-snug text-brand"><span className="flex flex-col items-center gap-1"><Icon n="camera" s={20} />Add {stage.photos.length ? "more" : "photos"}<span className="text-muted">(up to 6)</span></span></button>}
      </div>
      <button onClick={stage.analyse} disabled={!stage.photos.length || stage.busy} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">Analyse photos <Icon n="sparkle" s={15} /></button>
    </div>);
  if (m.k === "reading") return wrap(
    <Card className="p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="doc" s={14} /></span>Here&apos;s what I found</div>
      {m.rows.map(([k, v, c]) => (
        <div key={k} className="flex items-center justify-between gap-2 border-b border-line/70 py-1.5 text-[13px] last:border-0"><span className="text-muted">{k}</span>
          <span className="flex items-center gap-1.5 text-right font-medium">{v}{c === 0 ? <Pill tone="amber">missing</Pill> : c < 70 ? <Pill tone="amber">please check</Pill> : <span className="text-emerald-600"><Icon n="check" s={15} w={2.5} /></span>}</span></div>
      ))}
      {m.note && <p className="mt-1.5 text-xs text-amber-800">{m.note}</p>}
      {m.ask && <p className="mt-2 border-t border-line pt-2 text-[13.5px] font-medium">{m.ask}</p>}
    </Card>);
  if (m.k === "summary") return wrap(
    <Card className="divide-y divide-line text-sm">
      {m.intro && <p className="p-3 text-[13.5px]">{m.intro}</p>}
      <div className="flex justify-between gap-3 p-3"><span className="text-muted">Place</span><span className="text-right font-medium">{m.place}</span></div>
      <div className="flex justify-between gap-3 p-3"><span className="shrink-0 text-muted">What we found</span><div className="text-right"><b>{m.headline}</b>{m.plain.map((p, k) => <div key={k} className="text-xs font-normal text-muted">{p}</div>)}</div></div>
      {m.photos.length > 0 && <div className="grid grid-cols-4 gap-2 p-3">{m.photos.map((p) => <PhotoTile key={p.id} p={p} />)}</div>}
      <p className="p-3 text-[11.5px] text-muted">{m.offline ? "No signal: it will be saved on the phone and sent later. " : ""}Check the details. Once you create the lead, I show where it goes and how it progresses.</p>
    </Card>);
  if (m.k === "report") {
    const r = s.reports.find((x) => x.id === m.id);
    if (!r) return wrap(<Card className="p-3 text-sm text-muted">Creating…</Card>);
    const st = reportStatus(r); const live = r.items.filter((i) => !i.silent);
    return wrap(
      <Card className="p-3">
        {m.intro && <p className="mb-3 border-b border-line pb-3 text-[13.5px]">{m.intro}</p>}
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-bold">{r.placeName}</div><div className="truncate text-[11px] text-muted">{r.id}{r.input.number ? ` · Lift No. ${r.input.number}` : ""}</div></div><Pill tone={st.tone}>{st.t}</Pill></div>
        <div className="mt-1 text-[13px]">{r.headline}</div>
        <div className="mt-3 space-y-3">{live.length ? live.slice(0, 2).map((it) => <Track key={it.id} item={it} />) : <Track item={{ track: r.status === "queued" ? "queued" : "info", step: 0, status: "new" }} />}</div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs"><span className="text-muted">{r.points.filter((p) => p.status !== "reversed").reduce((a, p) => a + p.pts, 0)} points{r.impact ? " · 🎉 won" : ""}</span><button onClick={() => onOpen(r.id)} className="font-semibold text-brand">Full details →</button></div>
        {m.outro && <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">{m.outro}</p>}
      </Card>);
  }
  if (m.k === "points" && me) {
    const { confirmed, pending } = pointsOf(s, me.id); const lv = levelOf(confirmed);
    return wrap(
      <Card className="p-3"><div className="flex items-end justify-between"><div><div className="text-xs text-muted">Confirmed points</div><div className="text-3xl font-bold">{confirmed}</div><div className="text-[11px] text-muted">+{pending} pending checks</div></div><div className="text-right"><Pill tone="red">{lv.name}</Pill><div className="mt-1 text-xs text-muted">{lv.next ? `${lv.next.from - confirmed} pts to ${lv.next.name}` : "Top level"}</div></div></div>
        <div className="mt-2 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-brand" style={{ width: `${lv.pct}%` }} /></div></Card>);
  }
  if (m.k === "update") return wrap(<div className="flex items-start gap-2 rounded-2xl border border-brand/30 bg-brand-soft px-3 py-2 text-sm"><span className="mt-0.5 text-brand"><Icon n="bell" s={15} /></span><span><b className="text-[11px] uppercase tracking-wide text-brand">Update</b><br />{m.text}</span></div>);
  if (m.k === "needs") return wrap(<NeedsCard id={m.id} retake={m.retake} onDone={onNeeds} />);
  return null;
}

function NeedsCard({ id, retake, onDone }: { id: string; retake: boolean; onDone: (t: string) => void }) {
  const { mutate } = useApp();
  const [v, setV] = useState(""); const [done, setDone] = useState(false);
  if (done) return <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Thank you. I passed that on to the team.</div>;
  return (
    <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <div className="text-sm font-bold text-amber-900">Needs you · {id}</div>
      <p className="mt-1 text-sm text-amber-900">{retake ? "A clearer photo of the plate or button panel would let us continue." : "I could not read the servicing firm. Can you add it? Check the sticker from a public area."}</p>
      <div className="mt-2 flex gap-2">
        {retake
          ? <button onClick={() => { mutate((st) => A.resumeRetake(st, id)); onDone("Sent a clearer photo"); setDone(true); }} className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white"><Icon n="camera" s={14} /> Send a clearer photo</button>
          : <><input value={v} onChange={(e) => setV(e.target.value)} placeholder="e.g. OtherLift" className="min-h-9 min-w-0 flex-1 rounded-full border border-line bg-white px-3 text-sm" /><button disabled={!v} onClick={() => { mutate((st) => A.extra(st, id, "detail", v)); onDone(`Servicing firm: ${v}`); setDone(true); }} className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Add</button></>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- one form, not twenty questions */
function FormCard({ m, onDone }: { m: Extract<Msg, { k: "form" }>; onDone: (v: Record<string, string>, typed: string, extras: { contact: string; note: string }) => void }) {
  const [v, setV] = useState<Record<string, string>>(m.initial);
  const [typed, setTyped] = useState(""); const [contact, setContact] = useState(""); const [note, setNote] = useState(""); const [done, setDone] = useState(false);
  const ready = m.fields.filter((f) => f.req).every((f) => v[f.key]);
  const ico = (o: string) => (o === "fine" ? "check" : o === "minor" || o === "unsafe" ? "warn" : o === "out" ? "x" : "");
  return (
    <div className="sheet p-4">
      <p className="text-[14px]">{m.intro}</p>
      <div className="mt-3 space-y-4">
        {m.fields.filter((f) => !(f.key === "ordered" && (v.installer === "comp" || v.installer === "us"))).map((f) => (
          <div key={f.key}>
            <div className="mb-1.5 text-[13px] font-semibold">{f.label}{f.req && <span className="text-brand"> *</span>}</div>
            {f.text ? (
              <div className="flex flex-wrap items-center gap-2">
                <input disabled={done} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type it, e.g. 74821" className="min-h-10 w-44 rounded-lg border border-line bg-white px-3 text-[14px] outline-none focus:border-brand disabled:bg-surface" />
                <span className="text-[12px] text-muted">or leave empty if you cannot find it</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {f.opts.map((o) => { const sel = v[f.key] === o.v; return (
                  <button key={o.v} type="button" disabled={done} onClick={() => setV({ ...v, [f.key]: o.v })} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[13px] transition ${sel ? (o.tone === "red" ? "border-brand bg-brand-soft font-semibold text-brand" : "border-brand bg-brand-soft font-semibold text-brand") : "border-line bg-white hover:bg-surface"} ${done && !sel ? "opacity-40" : ""}`}>
                    {sel ? <Icon n="check" s={13} w={2.5} /> : ico(o.v) ? <span className={o.v === "fine" ? "text-emerald-600" : o.v === "minor" ? "text-amber-600" : "text-brand"}><Icon n={ico(o.v)} s={14} /></span> : null}
                    <span>{o.t}{o.sub && <span className="ml-1 text-[11.5px] font-normal text-muted">{o.sub}</span>}</span>
                  </button>); })}
              </div>
            )}
            {f.key === "installer" && (v.installer === "comp" || v.installer === "us") && <p className="mt-1.5 text-[12px] text-muted">Someone is already installing, so the lift is ordered.</p>}
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[12px] text-muted">Contact on site (optional, +5 points)</span><input disabled={done} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Name and role" className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none focus:border-brand disabled:bg-surface" /></label>
          <label className="block"><span className="mb-1 block text-[12px] text-muted">Note for the owner (optional, +5 points)</span><input disabled={done} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything useful" className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none focus:border-brand disabled:bg-surface" /></label>
        </div>
      </div>
      <button type="button" disabled={!ready || done} onClick={() => { setDone(true); onDone(v, typed, { contact, note }); }} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">{done ? "Details saved" : ready ? "Review the lead" : "Answer the first question to continue"}</button>
    </div>
  );
}
