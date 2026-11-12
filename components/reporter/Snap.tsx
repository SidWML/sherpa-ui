"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AREAS, CASES, GROUPS, PLACES, PRESETS, TEAM_NAME, TRACKS } from "@/lib/data";
import { evaluate, presetToInput, teamsOf } from "@/lib/engine";
import { A, createReport, stepsOf, useApp } from "@/lib/store";
import type { Equip, Input, Photo, Place, Preset } from "@/lib/types";
import { Bot, Btn, Card, Icon, PhotoTile, Pill, Track } from "../ui";

type Step = "intro" | "capture" | "reading" | "chat" | "preview" | "sent";
interface Sel { id: string; name: string; area: string; type: Place["type"]; key?: string; isNew?: boolean }
interface Msg { from: "bot" | "me"; text: string }

const EQ: Record<Equip, string> = { lift: "Lift / elevator", escalator: "Escalator", walk: "Moving walk" };
const word = (e: Equip) => (e === "lift" ? "lift" : e === "escalator" ? "escalator" : "moving walk");

async function compress(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 520 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

function samplePhotos(p: Preset): Photo[] {
  if (p.subject === "site") return [{ id: "s1", label: "Site hoarding", kind: "site", text: "New tower, Block C" }, { id: "s2", label: "Notice board", kind: "board", text: "Lift installation Q2" }];
  if (p.subject === "notice") return [{ id: "s1", label: "Notice", kind: "board", text: p.notice === "renovation" ? "Lift renovation" : p.notice === "tender" ? "Tender notice" : "Lift coming soon" }, { id: "s2", label: "Entrance", kind: "site", text: "Building" }];
  const n = p.reading.number;
  const out: Photo[] = [{ id: "s1", label: "Licence plate", kind: "plate", text: n ? `${p.reading.brand === "other" ? "Lift" : "Lift"} No. ${n}` : "(number not visible)" }, { id: "s2", label: "Button panel", kind: "panel" }];
  if (p.reading.servicer !== "unknown") out.push({ id: "s3", label: "Service sticker", kind: "sticker", text: p.reading.servicer === "other" ? "Serviced by OtherLift" : p.reading.servicer === "maker" ? "Serviced by maker" : "Serviced by Schindler" });
  out.push({ id: "s4", label: p.equip === "lift" ? "Cabin" : "Handrail", kind: "cabin" });
  return out;
}

export function Snap({ preset, onExit, onOpen }: { preset?: Preset | null; onExit: () => void; onOpen: (id: string) => void }) {
  const { s, me, mutate } = useApp();
  const [reportId] = useState(() => `SL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
  const [step, setStep] = useState<Step>(preset ? "capture" : "intro");
  const [scn, setScn] = useState<Preset | null>(preset ?? null);
  const [equip, setEquip] = useState<Equip>(preset?.equip ?? "lift");
  const [photos, setPhotos] = useState<Photo[]>(preset ? samplePhotos(preset) : []);
  const [mode, setMode] = useState<"gps" | "search" | "typed">(preset?.placeSrc === "typed" ? "typed" : "gps");
  const [place, setPlace] = useState<Sel | null>(null);
  const [later, setLater] = useState(preset?.placeSrc === "later");
  const [gps, setGps] = useState<"idle" | "ask" | "ok" | "denied" | "none">("idle");
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState({ name: preset?.placeSrc === "typed" ? "Skyline Business Centre" : "", addr: preset?.placeSrc === "typed" ? "Road No. 36, Jubilee Hills, Hyderabad" : "", area: "HYW" });
  const [warn, setWarn] = useState(false);
  const [input, setInput] = useState<Input | null>(null);
  const [phase, setPhase] = useState<"spin" | "found" | "lookup">("spin");
  const [fix, setFix] = useState(false);
  const [fixv, setFixv] = useState({ brand: "ours", number: "", age: 12, equip: "lift" });
  const [corrections, setCorrections] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [numInput, setNumInput] = useState<string | null>(null);
  const [safety, setSafety] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const mgr = s.cfg;

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, typing, step]);

  const sc = scn ?? PRESETS.find((p) => p.id === "C1")!;
  const geo = PLACES.find((p) => p.id === sc.place) ?? PLACES[0];

  /* ---------- build input ---------- */
  function buildInput(): Input {
    const pl: Sel = place ?? { id: geo.id, name: geo.name, area: geo.area, type: geo.type, key: geo.key };
    const base = presetToInput(sc, pl.id);
    return {
      ...base, equip, buildingType: pl.type, keyCustomer: !!pl.key, inArea: pl.area !== "OUT", newPlace: !!pl.isNew, offline: s.offline,
      dangerPhoto: !!sc.danger,
      placeSrc: later ? "later" : mode === "typed" ? "typed" : gps === "denied" ? "denied" : mode === "search" ? "search" : "gps",
    };
  }
  const placeName = place?.name ?? geo.name;
  const placeArea = place?.area ?? geo.area;
  const placeId = place?.id ?? geo.id;

  function say(text: string, delay = 600, then?: () => void) {
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, { from: "bot", text }]); setTyping(false); then?.(); }, delay);
  }

  /* ---------- capture -> reading ---------- */
  function analyse() {
    const i = buildInput();
    setInput(i); setFixv({ brand: i.brand, number: i.number ?? "", age: i.age, equip: i.equip });
    setPhase("spin"); setStep("reading");
    setTimeout(() => setPhase("found"), 1400);
  }

  function startChat(i: Input) {
    setStep("chat"); setMsgs([]); setAsked([]);
    const intro = i.subject === "site" ? "A building site. Nice catch! Let me ask two quick things." : i.subject === "notice" ? "A notice. Thanks for spotting it." : i.brand === "ours" ? `Looks like one of ours. A couple of quick questions.` : i.brand === "other" ? "That is another company's " + word(i.equip) + ". Good spot! A few quick questions." : "I could not tell the brand. A few quick questions.";
    say(intro, 400, () => ask(i, []));
  }

  /* ---------- chat ---------- */
  function nextQ(i: Input, a: string[]): string | null {
    const has = (k: string) => a.includes(k);
    if (i.subject === "site") { if (!has("stage")) return "stage"; if (!has("ordered")) return "ordered"; return null; }
    if (i.subject === "notice") return null;
    if (!i.number && !has("number")) return "number";
    if (!has("condition")) return "condition";
    if (i.condition === "unsafe") return null;
    if (scn?.danger && !has("danger")) return "danger";
    if (!has("sticker") && i.servicer === "unknown" && (i.brand === "other" || i.records === "missing" || (i.brand === "ours" && i.contract !== "active"))) return "sticker";
    if (!has("units") && (i.brand === "other" || i.records === "missing" || i.records === "placeOnly")) return "units";
    return null;
  }
  const QTEXT: Record<string, (i: Input) => string> = {
    number: (i) => `I could not find the ${word(i.equip)} number in your photos. It is usually on a plate near the doors or on the control panel. Please only check from public or common areas.`,
    condition: (i) => `How is the ${word(i.equip)} running?`,
    danger: () => "One of your photos seems to show exposed wiring. Is the equipment unsafe?",
    sticker: () => "Is there a service sticker? Who services it?",
    units: () => "How many lifts are in the building, roughly?",
    stage: () => "What stage is the building at?",
    ordered: () => "Does the developer say the lift is already ordered?",
  };
  function ask(i: Input, a: string[]) {
    const k = nextQ(i, a);
    if (!k) { say("Thanks! Here is what I will send. Nothing is created until you confirm.", 500, () => setCurQ("done")); return; }
    say(QTEXT[k](i), 500, () => setCurQ(k));
  }
  const [curQ, setCurQ] = useState<string | null>(null);

  function opts(k: string, i: Input): { v: string; t: string; sub?: string; tone?: string }[] {
    const e = i.equip !== "lift";
    switch (k) {
      case "number": return [{ v: "photo", t: "Take another photo" }, { v: "type", t: "Type the number" }, { v: "cant", t: "I cannot find it" }];
      case "condition": return [
        { v: "fine", t: "Running fine", tone: "g" }, { v: "minor", t: "Minor issues", sub: e ? "(noise, jerks, handrail speed)" : "(e.g. noisy, slow, door problem)" },
        { v: "out", t: e ? "Stopped" : "Out of service", sub: "(not working)" }, { v: "unsafe", t: "Unsafe", sub: "(risk to people)", tone: "r" }, { v: "unsure", t: "Not sure" }];
      case "danger": return [{ v: "yes", t: "Yes, it is unsafe", tone: "r" }, { v: "no", t: "No, it is fine" }];
      case "sticker": return i.brand === "other"
        ? [{ v: "other", t: "A local firm" }, { v: "maker", t: "Its own maker" }, { v: "staff", t: "Building staff" }, { v: "nobody", t: "None seen" }, { v: "unknown", t: "Not sure" }]
        : [{ v: "us", t: "Ours (Schindler)" }, { v: "other", t: "Another company" }, { v: "nobody", t: "None seen" }, { v: "unknown", t: "Not sure" }];
      case "units": return [{ v: "1", t: "Just this one" }, { v: "3", t: "2 to 4" }, { v: "6", t: "5 or more" }, { v: "0", t: "Not sure" }];
      case "stage": return [{ v: "early", t: "Early", sub: "(foundations, digging)" }, { v: "structure", t: "Structure going up" }, { v: "finishing", t: "Finishing work" }, { v: "unsure", t: "Not sure" }];
      case "ordered": return [{ v: "yes", t: "Yes, already ordered" }, { v: "no", t: "No" }, { v: "unsure", t: "Not sure / nobody to ask" }];
    }
    return [];
  }

  function answer(k: string, v: string, label: string, typedNum?: string) {
    if (!input) return;
    let i = { ...input };
    const a2 = [...asked, k];
    let react = "";
    switch (k) {
      case "number":
        if (v === "photo") { i = { ...i, number: sc.reading.number ?? "74821", records: sc.backend.records, quality: "ok", lowConfidence: false }; react = `Got it. I can read the number now: ${i.number}.`; }
        else if (v === "type") { i = { ...i, number: typedNum, records: sc.backend.records, quality: "ok", lowConfidence: false }; react = `Thanks, ${typedNum}.`; }
        else { i = { ...i, number: undefined, records: sc.backend.records === "found" || sc.backend.placeMatch ? "placeOnly" : sc.backend.records, quality: "brandOnly", lowConfidence: true }; react = "No problem. I will match by place and brand. The records team will confirm it."; }
        break;
      case "condition": i = { ...i, condition: v as Input["condition"] }; react = v === "fine" ? "Good to hear." : v === "minor" ? "Thanks, noted. Small issues can matter." : v === "out" ? "Thanks. I will flag this as urgent." : v === "unsure" ? "That is fine." : ""; break;
      case "danger": i = { ...i, condition: v === "yes" ? "unsafe" : i.condition }; break;
      case "sticker": i = { ...i, servicer: v as Input["servicer"] }; react = v === "unknown" ? "No problem. I will ask again after you send." : "Noted."; break;
      case "units": i = { ...i, units: Number(v) || 1 }; break;
      case "stage": i = { ...i, stage: v === "unsure" ? undefined : (v as Input["stage"]) }; break;
      case "ordered": i = { ...i, ordered: v === "yes" ? true : v === "no" ? false : undefined }; break;
    }
    setCurQ(null); setNumInput(null);
    setInput(i); setAsked(a2);
    setMsgs((m) => [...m, { from: "me", text: label }]);
    setAnswers((x) => [...x, { q: k, a: label }]);
    if (i.condition === "unsafe" && (k === "condition" || k === "danger")) { setMsgs((m) => [...m, { from: "bot", text: "Thank you for telling me. Is anyone trapped or hurt?" }]); setCurQ("hurt"); return; }
    if (react) say(react, 400, () => ask(i, a2)); else ask(i, a2);
  }

  /* ---------- create ---------- */
  function submit(i: Input, extraAnswers = answers) {
    mutate((st) => {
      if (st.reports.some((r) => r.id === reportId)) return;
      createReport(st, { id: reportId, reporterId: me!.id, input: { ...i, offline: st.offline }, photos, placeId, placeName, area: placeArea, answers: extraAnswers, corrections });
    });
    setSentId(reportId); setStep("sent"); setSafety(false);
  }
  function sendUnsafe(hurt: "yes" | "no" | "unsure") {
    const base = input ?? { ...buildInput(), quality: "ok" as const, brand: sc.reading.brand };
    submit({ ...base, quality: base.quality === "notLift" || base.quality === "duplicatePhoto" ? "ok" : base.quality === "unreadable" ? "ok" : base.quality, subject: "unit", condition: "unsafe", hurt, known: "none", offline: s.offline }, [...answers, { q: "hurt", a: hurt }]);
  }

  const out = useMemo(() => (input && step === "preview" ? evaluate(input, mgr) : null), [input, step, mgr]);
  const sentReport = sentId ? s.reports.find((r) => r.id === sentId) : undefined;

  /* ---------- UI pieces ---------- */
  const Header = (
    <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur">
      <button onClick={() => { if (step === "capture" && !preset) setStep("intro"); else if (step === "intro" || step === "sent") onExit(); else if (step === "reading") setStep("capture"); else if (step === "preview") { setStep("chat"); } else if (step === "chat") setStep("capture"); else onExit(); }} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl border border-line"><Icon n="back" s={16} /></button>
      <div className="flex-1 text-center text-[15px] font-semibold">Snap &amp; Lead</div>
      {step !== "sent" ? (
        <button onClick={() => setSafety(true)} className="flex items-center gap-1.5 rounded-full border-2 border-red-600 bg-white px-3 py-1.5 text-xs font-bold text-red-700"><Icon n="warn" s={14} /> Something unsafe?</button>
      ) : <div className="w-9" />}
    </div>
  );

  const stepNo = { intro: 1, capture: 2, reading: 3, chat: 4, preview: 5, sent: 6 }[step];

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10">
      {Header}
      {step !== "intro" && step !== "sent" && (
        <div className="mt-3 flex gap-1" aria-label={`Step ${stepNo - 1} of 4`}>{[2, 3, 4, 5].map((n) => <div key={n} className={`h-1 flex-1 rounded-full ${stepNo >= n ? "bg-brand" : "bg-line"}`} />)}</div>
      )}

      {/* INTRO */}
      {step === "intro" && (
        <div className="pop pt-6 text-center">
          <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-brand-soft to-white"><Bot size={72} /></div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">Spot a lift? Let&apos;s turn it into an <span className="text-brand">opportunity.</span></h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Upload photos of the lift, and I&apos;ll read the details and ask a few quick questions.</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-[11.5px] text-muted">
            {[["camera", "Up to 6 photos"], ["bolt", "AI reads the details"], ["flag", "Creates the right lead"]].map(([ic, t]) => (
              <div key={t} className="flex flex-col items-center gap-1.5"><div className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><Icon n={ic} s={20} /></div>{t}</div>
            ))}
          </div>
          <div className="mt-8"><Btn full onClick={() => setStep("capture")}><Icon n="camera" s={18} /> Take or Upload Photos</Btn></div>
          <p className="mt-4 text-[11.5px] text-muted">Check only from public or common areas. Never enter a machine room or restricted area. Do not use this while driving.</p>
        </div>
      )}

      {/* CAPTURE */}
      {step === "capture" && (
        <div className="pop pt-4">
          <h2 className="text-lg font-semibold">Add lift photos</h2>
          <p className="mt-1 text-[13px] text-muted">Include clear photos such as the licence plate, button panel, service sticker or capacity plate.</p>

          <div className="mt-3 rounded-xl border border-dashed border-brand/50 bg-brand-soft/60 p-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-brand">Demo: what do the photos show?</label>
            <select value={scn?.id ?? ""} onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value) ?? null; setScn(p); if (p) { setPhotos(samplePhotos(p)); setEquip(p.equip); setLater(p.placeSrc === "later"); if (p.placeSrc === "typed") { setMode("typed"); setTyped({ name: "Skyline Business Centre", addr: "Road No. 36, Jubilee Hills, Hyderabad", area: "HYW" }); } if (p.offline && !s.offline) mutate((st) => { st.offline = true; }); setPlace(null); setGps("idle"); } }} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm">
              <option value="">Choose a scenario to load sample photos…</option>
              {Object.entries(GROUPS).map(([g, gn]) => (
                <optgroup key={g} label={`${g} · ${gn}`}>
                  {PRESETS.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.pilot ? "● " : ""}{p.id} · {p.title}</option>)}
                </optgroup>
              ))}
            </select>
            {scn && <p className="mt-1.5 text-xs text-ink/80"><b>Tip:</b> {scn.tip}</p>}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {photos.map((p, k) => <PhotoTile key={p.id} p={p} onRemove={() => setPhotos(photos.filter((x) => x.id !== p.id))} onLeft={k > 0 ? () => { const a = [...photos]; [a[k - 1], a[k]] = [a[k], a[k - 1]]; setPhotos(a); } : undefined} />)}
            {photos.length < 6 && (
              <button onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-brand-soft/40 text-[11px] text-muted">
                <span className="text-brand"><Icon n="camera" s={22} /></span>{photos.length ? "Add more" : "Add photo"}<span>(up to 6)</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={async (e) => {
            const fl = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
            const add: Photo[] = [];
            for (const f of fl) { try { add.push({ id: `u${Date.now()}${add.length}`, label: "Your photo", kind: "user", url: await compress(f) }); } catch { /* skip */ } }
            setPhotos((p) => [...p, ...add]); e.target.value = "";
          }} />
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted"><Icon n="check" s={12} /> Photos are compressed before upload. Exact duplicates are blocked.</div>
          {(place?.type === "hospital" || place?.type === "gov" || place?.type === "transport" || warn) && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900"><b>Photography may not be allowed here.</b> Hospitals, government buildings and airports often restrict it. If so, describe the lift instead of photographing it.</div>
          )}

          <div className="mt-4">
            <div className="mb-1.5 text-[13px] font-semibold">What is it?</div>
            <div className="flex flex-wrap gap-2">{(Object.keys(EQ) as Equip[]).map((e) => <button key={e} onClick={() => setEquip(e)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${equip === e ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{EQ[e]}</button>)}</div>
            <p className="mt-1 text-[11px] text-muted">The photo reader will suggest this too. You can change it.</p>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold"><span>Where is it?</span>{place && <Pill tone="green">Place set</Pill>}</div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 text-xs font-semibold">
              {([["gps", "My location"], ["search", "Search"], ["typed", "Type address"]] as const).map(([m, l]) => <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-2 py-2 ${mode === m ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>)}
            </div>
            <div className="mt-3">
              {mode === "gps" && (
                <div className="rounded-xl border border-line p-3 text-sm">
                  {gps === "idle" && <Btn v="soft" full onClick={() => setGps("ask")}><Icon n="pin" s={16} /> Use my location</Btn>}
                  {gps === "ask" && (
                    <div className="pop rounded-xl bg-surface p-3">
                      <div className="text-[13px] font-semibold">Allow Snap &amp; Lead to use your location?</div>
                      <p className="mt-1 text-xs text-muted">Only when you report. We do not track you.</p>
                      <div className="mt-2 flex gap-2"><Btn sm onClick={() => { if (scn?.placeSrc === "denied") { setGps("denied"); setMode("search"); return; } if (scn?.placeSrc === "typed") { setGps("none"); setMode("typed"); return; } setGps("ok"); setPlace({ id: geo.id, name: geo.name, area: geo.area, type: geo.type, key: geo.key }); }}>Allow</Btn><Btn sm v="ghost" onClick={() => { setGps("denied"); setMode("search"); }}>Don&apos;t allow</Btn></div>
                    </div>
                  )}
                  {gps === "ok" && place && (
                    <div className="pop"><div className="flex items-start gap-2"><span className="mt-0.5 text-brand"><Icon n="pin" s={18} /></span><div><div className="font-semibold">{place.name}</div><div className="text-xs text-muted">Pinned · accuracy ±14 m · nearest known building within 200 m</div></div></div>
                      <div className="mt-2 text-xs text-muted">Not this building?</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">{PLACES.filter((p) => p.area !== "OUT" && p.id !== place.id).slice(0, 2).map((p) => <button key={p.id} onClick={() => setPlace({ id: p.id, name: p.name, area: p.area, type: p.type, key: p.key })} className="rounded-full border border-line px-2.5 py-1 text-xs">{p.name}</button>)}</div></div>
                  )}
                  {gps === "denied" && <div className="text-[13px]">Location permission was refused. No problem: search for the place or type an address.</div>}
                  {gps === "none" && <div className="text-[13px]">No known building within 200 m. Please type its name and address, and choose the sales area.</div>}
                </div>
              )}
              {mode === "search" && (
                <div className="rounded-xl border border-line p-3">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search known buildings…" className="min-h-10 w-full rounded-lg border border-line px-3 text-sm" />
                  <div className="mt-2 max-h-44 space-y-1 overflow-auto">{PLACES.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).map((p) => (
                    <button key={p.id} onClick={() => { setPlace({ id: p.id, name: p.name, area: p.area, type: p.type, key: p.key }); setWarn(p.type === "hospital" || p.type === "gov" || p.type === "transport"); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${place?.id === p.id ? "bg-brand-soft" : "hover:bg-surface"}`}><span>{p.name}<span className="block text-[11px] text-muted">{p.addr}</span></span>{place?.id === p.id && <Icon n="check" s={16} c="#e3001b" />}</button>
                  ))}</div>
                </div>
              )}
              {mode === "typed" && (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  <input value={typed.name} onChange={(e) => setTyped({ ...typed, name: e.target.value })} placeholder="Building name" className="min-h-10 w-full rounded-lg border border-line px-3 text-sm" />
                  <input value={typed.addr} onChange={(e) => setTyped({ ...typed, addr: e.target.value })} placeholder="Address" className="min-h-10 w-full rounded-lg border border-line px-3 text-sm" />
                  <select value={typed.area} onChange={(e) => setTyped({ ...typed, area: e.target.value })} className="min-h-10 w-full rounded-lg border border-line px-3 text-sm">{AREAS.map((a) => <option key={a.id} value={a.id}>Sales area: {a.name}</option>)}</select>
                  <Btn sm v="soft" disabled={!typed.name || !typed.addr} onClick={() => setPlace({ id: "new", name: typed.name, area: typed.area, type: "office", isNew: true })}>Use this new place</Btn>
                  {place?.isNew && <p className="text-xs text-emerald-700">New place saved. The records team will verify it. Your report routes by the area you chose until then.</p>}
                </div>
              )}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" className="accent-[#e3001b]" checked={later} onChange={(e) => setLater(e.target.checked)} /> I am not at the site now (report later)</label>
          </div>

          <div className="mt-6"><Btn full disabled={!photos.length} onClick={() => { if (!place) { setPlace({ id: geo.id, name: geo.name, area: geo.area, type: geo.type, key: geo.key }); } setTimeout(analyse, 0); }}>Analyse Photos <Icon n="sparkle" s={16} /></Btn>
            {!place && photos.length > 0 && <p className="mt-2 text-center text-[11.5px] text-muted">No place chosen: I will use the demo scenario&apos;s location ({geo.name}).</p>}</div>
        </div>
      )}

      {/* READING */}
      {step === "reading" && input && (
        <div className="pop pt-4">
          <div className="flex items-start gap-2"><Bot /><div className="rounded-2xl bg-surface px-3 py-2 text-sm">{phase === "spin" ? <span className="flex items-center gap-2">Great photos! I&apos;m reading the details now… <span className="spin inline-block h-3 w-3 rounded-full border-2 border-brand border-t-transparent" /></span> : "Great photos! Here is what I found:"}</div></div>
          {phase !== "spin" && s.readerDown && (
            <Card className="mt-3 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800"><Icon n="warn" s={16} /> The photo reader is not available</div>
              <p className="mb-3 text-xs text-muted">No problem: enter the details by hand. Your report is still accepted.</p>
              <ManualEntry v={fixv} set={setFixv} />
              <div className="mt-3"><Btn full onClick={() => { const i = { ...input, brand: fixv.brand as Input["brand"], number: fixv.number || undefined, age: fixv.age, equip: fixv.equip as Equip, quality: "ok" as const }; setInput(i); setCorrections(["Manual entry (reader down)"]); setPhase("lookup"); setTimeout(() => startChat(i), 1100); }}>Continue</Btn></div></Card>
          )}
          {phase === "found" && !s.readerDown && input.quality === "notLift" && (
            <div className="mt-3 space-y-2"><div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">That photo does not look like a lift or an escalator. Please retake it. No points for this one.</div><Btn full onClick={() => { setPhotos([]); setStep("capture"); }}>Retake photos</Btn></div>
          )}
          {phase === "found" && !s.readerDown && input.quality === "duplicatePhoto" && (
            <div className="mt-3 space-y-2"><div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">I have seen this exact photo before, so I cannot count it again. Try a new photo.</div><Btn full onClick={() => { setPhotos([]); setStep("capture"); }}>Choose another photo</Btn></div>
          )}
          {phase === "found" && !s.readerDown && input.quality === "unreadable" && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">I could not read the brand or the number. A clearer photo of the plate near the doors, or the button panel, would help.</div>
              <Btn full onClick={() => { const i = { ...input, quality: "ok" as const }; setInput(i); setPhase("lookup"); setTimeout(() => startChat(i), 1000); }}>Take a clearer photo</Btn>
              <Btn full v="ghost" onClick={() => { const i = { ...input }; setStep("chat"); setMsgs([{ from: "bot", text: "No problem. Send it now and add a clearer photo later from My reports." }]); setCurQ("sendRetake"); setInput(i); }}>Send now, retake later</Btn>
              <Btn full v="ghost" onClick={() => { const i = { ...input, declinedRetake: true }; setInput(i); setStep("preview"); }}>Skip: save as information</Btn>
            </div>
          )}
          {phase === "found" && !s.readerDown && (input.quality === "ok" || input.quality === "brandOnly") && (
            <div className="mt-3 pop">
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="doc" s={14} /></span>Here&apos;s what I found:</div>
                {(input.subject === "unit"
                  ? [
                    ["Equipment", EQ[input.equip], 92], ["Unit number", input.number ?? "Not found", sc.reading.conf.number], ["Brand", input.brand === "ours" ? "Schindler" : input.brand === "other" ? "OtherLift" : "Unclear", sc.reading.conf.brand],
                    ["Service sticker", sc.reading.servicer === "unknown" ? "Not seen" : sc.reading.servicer === "us" ? "Serviced by Schindler" : sc.reading.servicer === "maker" ? "Its own maker" : "Serviced by OtherLift", sc.reading.conf.sticker],
                    ["Capacity", sc.reading.capacity, sc.reading.conf.capacity], ["Estimated age", `~${input.age} years`, sc.reading.conf.age],
                  ]
                  : [["Equipment", EQ[input.equip], 90], ["What I see", input.subject === "site" ? "Building site, no lift yet" : "A notice about a lift", 88], ["Developer", "Not visible", 0]]
                ).map(([k, v, c]) => {
                  const nc = Number(c); const low = nc < 70;
                  return (
                    <div key={String(k)} className="flex items-center justify-between border-b border-line/70 py-2 text-[13.5px] last:border-0">
                      <span className="text-muted">{k}</span>
                      <span className="flex items-center gap-2 font-medium">{v}{nc === 0 ? <Pill tone="amber">missing</Pill> : low ? <Pill tone="amber">please check</Pill> : <span className="text-emerald-600"><Icon n="check" s={16} w={2.5} /></span>}</span>
                    </div>
                  );
                })}
                {input.subject === "unit" && !input.number && <p className="mt-2 text-xs text-amber-800">I could not find the unit number. I will ask about it next.</p>}
              </Card>
              {!fix ? (
                <div className="mt-3 flex items-start gap-2"><Bot size={30} /><div className="flex-1"><div className="inline-block rounded-2xl bg-surface px-3 py-2 text-sm font-medium">Is this correct?</div>
                  <div className="mt-2 space-y-2"><Btn full v="soft" onClick={() => { setPhase("lookup"); setTimeout(() => startChat(input), 1100); }}><Icon n="check" s={16} /> Yes, looks right</Btn><Btn full v="ghost" onClick={() => setFix(true)}><Icon n="edit" s={16} /> Let me fix something</Btn></div></div></div>
              ) : (
                <Card className="mt-3 p-4"><div className="mb-2 text-sm font-semibold">Fix a detail</div><ManualEntry v={fixv} set={setFixv} />
                  <div className="mt-3 flex gap-2"><Btn full onClick={() => {
                    const c: string[] = []; if (fixv.brand !== input.brand) c.push(`Brand: ${input.brand} → ${fixv.brand}`); if ((fixv.number || undefined) !== input.number) c.push(`Number: ${input.number ?? "none"} → ${fixv.number || "none"}`); if (fixv.age !== input.age) c.push(`Age: ${input.age} → ${fixv.age}`); if (fixv.equip !== input.equip) c.push(`Equipment: ${input.equip} → ${fixv.equip}`);
                    const i = { ...input, brand: fixv.brand as Input["brand"], number: fixv.number || undefined, age: fixv.age, equip: fixv.equip as Equip };
                    setInput(i); setCorrections(c); setFix(false); setPhase("lookup"); setTimeout(() => startChat(i), 1100);
                  }}>Save and continue</Btn><Btn v="ghost" onClick={() => setFix(false)}>Cancel</Btn></div></Card>
              )}
            </div>
          )}
          {phase === "lookup" && <div className="mt-4 flex items-center gap-2 text-sm text-muted"><span className="spin inline-block h-4 w-4 rounded-full border-2 border-brand border-t-transparent" /> Checking our records, open leads and earlier reports…</div>}
        </div>
      )}

      {/* CHAT */}
      {step === "chat" && input && (
        <div className="pt-4">
          <div className="space-y-3">
            {msgs.map((m, k) => (
              <div key={k} className={`pop flex ${m.from === "me" ? "justify-end" : "items-start gap-2"}`}>
                {m.from === "bot" && <Bot size={30} sad={input.condition === "unsafe"} />}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === "me" ? "bg-brand text-white" : "bg-surface"}`}>{m.text}</div>
              </div>
            ))}
            {typing && <div className="flex items-center gap-2"><Bot size={30} /><div className="rounded-2xl bg-surface px-3 py-2 text-sm text-muted">…</div></div>}
            <div ref={chatEnd} />
          </div>
          {!typing && curQ && curQ !== "done" && curQ !== "hurt" && curQ !== "sendRetake" && (
            <div className="pop mt-3 space-y-2">
              {opts(curQ, input).map((o) => (
                <button key={o.v} onClick={() => { if (curQ === "number" && o.v === "type") { setNumInput(""); return; } answer(curQ, o.v, o.t); }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${o.tone === "g" ? "border-emerald-300 bg-emerald-50" : o.tone === "r" ? "border-red-200 bg-white" : "border-line bg-white"}`}>
                  <span>{o.tone === "g" ? <span className="text-emerald-600"><Icon n="check" s={18} /></span> : o.tone === "r" ? <span className="text-red-600"><Icon n="warn" s={18} /></span> : o.v === "photo" ? <Icon n="camera" s={18} /> : <span className="w-[18px]" />}</span>
                  <span>{o.t}{o.sub && <span className="block text-xs font-normal text-muted">{o.sub}</span>}</span>
                </button>
              ))}
              {numInput !== null && (
                <div className="flex gap-2"><input autoFocus value={numInput} onChange={(e) => setNumInput(e.target.value)} placeholder="Unit number" className="min-h-11 flex-1 rounded-xl border border-line px-3 text-sm" /><Btn disabled={!numInput} onClick={() => answer("number", "type", numInput, numInput)}>Send</Btn></div>
              )}
              <button onClick={() => answer(curQ, curQ === "number" ? "cant" : "unsure", "Not sure")} className={`${curQ === "number" || curQ === "condition" || curQ === "sticker" || curQ === "units" || curQ === "stage" || curQ === "ordered" ? "hidden" : ""} text-xs text-muted underline`}>Not sure</button>
            </div>
          )}
          {!typing && curQ === "hurt" && (
            <div className="pop mt-3 space-y-2">{[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]].map(([v, t]) => <button key={v} onClick={() => sendUnsafe(v as "yes")} className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-sm font-semibold">{t}</button>)}</div>
          )}
          {!typing && curQ === "done" && <div className="mt-4"><Btn full onClick={() => setStep("preview")}>Show me the summary</Btn></div>}
          {!typing && curQ === "sendRetake" && <div className="mt-4"><Btn full onClick={() => submit({ ...input })}>Send report</Btn></div>}
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && input && out && (
        <div className="pop pt-4">
          <h2 className="text-lg font-semibold">Check and create</h2>
          <p className="text-[13px] text-muted">Nothing exists until you confirm.</p>
          <Card className="mt-3 divide-y divide-line">
            <Row k="Place" v={<span>{placeName}{place?.isNew ? " (new)" : ""}{later ? " · reported later" : ""}</span>} />
            <Row k="What we found" v={<div className="text-right"><b>{out.headline}</b>{out.plain.map((p, k) => <div key={k} className="text-xs font-normal text-muted">{p}</div>)}</div>} />
            <Row k="Who gets it" v={out.items.some((x) => !x.silent) ? (teamsOf(out).length ? teamsOf(out).map((t) => TEAM_NAME[t]).join(" + ") : "Saved, no team needed") : "Nobody yet"} />
            <div className="p-3">
              <div className="mb-2 text-[13px] text-muted">Progress you will see</div>
              <div className="space-y-4">{out.items.filter((x) => !x.silent).length ? out.items.filter((x) => !x.silent).map((x, k) => <Track key={k} item={{ track: x.track, step: x.step0 ?? 0, steps: x.steps, status: x.autoClose ? "closed" : "new" }} />) : <div className="text-xs text-muted">Submitted.</div>}</div>
            </div>
            <div className="p-3 text-sm">
              <div className="mb-1 text-[13px] text-muted">Points</div>
              {out.points.length ? out.points.map((p, k) => <div key={k} className="flex justify-between py-0.5"><span>{p.label}</span><span className="font-semibold">+{p.pts} <span className="text-xs font-normal text-muted">{p.status}</span></span></div>) : <div className="text-xs text-muted">No points for this one.</div>}
              {out.items.some((x) => x.kind === "lead" && !x.silent) && <p className="mt-1 text-xs text-muted">More as it moves: +20 accepted, +50 quote, +200 won.</p>}
              {out.points.some((p) => p.status === "held") && <p className="mt-1 text-xs text-amber-800">Points are held for a quick check.</p>}
            </div>
          </Card>
          <div className="mt-3 grid grid-cols-4 gap-2">{photos.slice(0, 4).map((p) => <PhotoTile key={p.id} p={p} />)}</div>
          {s.offline && <div className="mt-3 rounded-xl bg-ink p-3 text-xs text-white">No signal. Your report will be saved on the phone and sent when you are back online. <b>It will not be lost.</b></div>}
          <p className="mt-3 text-[11.5px] text-muted">You will never see contract or price details. Reports are checked before points are confirmed.</p>
          <div className="mt-4 space-y-2"><Btn full onClick={() => submit(input)}><Icon n="send" s={16} /> {s.offline ? "Save on phone" : "Create report"}</Btn><Btn full v="ghost" onClick={() => setStep("chat")}>Back</Btn></div>
        </div>
      )}

      {/* SENT */}
      {step === "sent" && (
        <SentView report={sentReport} onOpen={onOpen} onDone={onExit} />
      )}

      {/* SAFETY SHEET */}
      {safety && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 @3xl:items-center" onClick={() => setSafety(false)}>
          <div onClick={(e) => e.stopPropagation()} className="pop w-full max-w-md rounded-t-3xl bg-white p-5 @3xl:rounded-3xl">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700"><Icon n="shield" s={22} /></div><div><div className="text-lg font-semibold">Thank you for speaking up</div><div className="text-sm text-muted">I will alert the emergency desk right away. No sales lead is created.</div></div></div>
            <div className="mt-4 text-sm font-semibold">Is anyone trapped or hurt?</div>
            <div className="mt-2 grid grid-cols-3 gap-2">{[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]].map(([v, t]) => <button key={v} onClick={() => sendUnsafe(v as "yes")} className="rounded-xl border-2 border-red-200 py-3 text-sm font-bold text-red-800 hover:bg-red-50">{t}</button>)}</div>
            {s.offline && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">You are offline. Call the emergency desk now: <span className="underline">1800 000 0000</span>. The alert is sent when signal returns.</div>}
            <p className="mt-3 text-xs text-muted">Keep clear of the unit and follow the building&apos;s safety instructions. Never enter a machine room.</p>
            <button onClick={() => setSafety(false)} className="mt-3 w-full text-center text-sm text-muted underline">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 p-3 text-sm"><span className="shrink-0 text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>;
}

function ManualEntry({ v, set }: { v: { brand: string; number: string; age: number; equip: string }; set: (x: { brand: string; number: string; age: number; equip: string }) => void }) {
  const cls = "min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs text-muted">Equipment<select className={cls} value={v.equip} onChange={(e) => set({ ...v, equip: e.target.value })}><option value="lift">Lift / elevator</option><option value="escalator">Escalator</option><option value="walk">Moving walk</option></select></label>
      <label className="text-xs text-muted">Brand<select className={cls} value={v.brand} onChange={(e) => set({ ...v, brand: e.target.value })}><option value="ours">Schindler</option><option value="other">Another company</option><option value="unclear">Unclear</option></select></label>
      <label className="text-xs text-muted">Unit number<input className={cls} value={v.number} onChange={(e) => set({ ...v, number: e.target.value })} placeholder="e.g. 74821" /></label>
      <label className="text-xs text-muted">Estimated age (years)<input type="number" className={cls} value={v.age} onChange={(e) => set({ ...v, age: Number(e.target.value) })} /></label>
    </div>
  );
}

function SentView({ report, onOpen, onDone }: { report?: ReturnType<typeof useApp>["s"]["reports"][number]; onOpen: (id: string) => void; onDone: () => void }) {
  const { mutate } = useApp();
  const [open, setOpen] = useState<"" | "contact" | "note">("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState("");
  if (!report) return <div className="pt-10 text-center text-sm text-muted">Creating…</div>;
  const emerg = report.items.find((i) => i.kind === "emergency");
  const tracks = report.items.filter((i) => !i.silent);
  return (
    <div className="pop pt-6 text-center">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${emerg ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-600"}`}><Icon n={emerg ? "shield" : "check"} s={34} w={2.4} /></div>
      <h2 className="mt-3 text-xl font-bold">{emerg ? "Emergency desk alerted" : report.status === "queued" ? "Saved on your phone" : "Report created"}</h2>
      <p className="text-sm text-muted">Report ID <b className="text-ink">{report.id}</b>{report.status === "queued" ? " · waiting to send" : ""}</p>
      {emerg ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-left text-sm text-red-900">Please keep clear of the unit and follow the building&apos;s safety instructions. Do not enter a machine room. The emergency desk will acknowledge shortly.{report.input.offline && <b className="mt-2 block">No signal: call the emergency desk now on 1800 000 0000.</b>}</div>
      ) : report.plain.length > 0 && <p className="mx-auto mt-3 max-w-xs text-sm">{report.plain[0]}</p>}
      <Card className="mt-4 space-y-4 p-4 text-left">
        {report.status === "queued" ? <Track item={{ track: "queued", step: 0, status: "new" }} /> : tracks.map((it) => <Track key={it.id} item={it} />)}
        <div className="flex items-center justify-between border-t border-line pt-3 text-sm"><span className="text-muted">Points</span><span className="font-semibold">{report.points.filter((p) => p.status !== "reversed").reduce((a, p) => a + p.pts, 0)} <span className="text-xs font-normal text-muted">pending until checked</span></span></div>
      </Card>
      {!emerg && report.status === "sent" && report.verdict !== "retake" && (
        <Card className="mt-4 p-4 text-left">
          <div className="text-sm font-semibold">Add more for bonus points</div>
          <p className="text-xs text-muted">Optional. Visible only to the lead&apos;s owner and the sales manager.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
            <button onClick={() => setOpen(open === "contact" ? "" : "contact")} className="rounded-xl border border-line py-2.5">Contact +5</button>
            <button onClick={() => setOpen(open === "note" ? "" : "note")} className="rounded-xl border border-line py-2.5">Note +5</button>
            <AddPhoto id={report.id} />
          </div>
          {open === "contact" && <div className="mt-3 space-y-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name and role (e.g. Facility manager)" className="min-h-10 w-full rounded-lg border border-line px-3 text-sm" /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="min-h-10 w-full rounded-lg border border-line px-3 text-sm" /><Btn sm disabled={!name} onClick={() => { void applyExtra(mutate, report.id, "contact", `${name}${phone ? ` · ${phone}` : ""}`); setOpen(""); }}>Add contact</Btn></div>}
          {open === "note" && <div className="mt-3 space-y-2"><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else the owner should know?" className="min-h-20 w-full rounded-lg border border-line p-3 text-sm" /><Btn sm disabled={!note} onClick={() => { void applyExtra(mutate, report.id, "note", note); setOpen(""); }}>Add note</Btn></div>}
          <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted">{report.extras.contact && <Pill tone="green">Contact added</Pill>}{report.extras.note && <Pill tone="green">Note added</Pill>}{report.extras.photos > 0 && <Pill tone="green">{report.extras.photos} photo(s) added</Pill>}</div>
        </Card>
      )}
      <div className="mt-5 space-y-2"><Btn full onClick={() => onOpen(report.id)}>View report</Btn><Btn full v="ghost" onClick={onDone}>Done</Btn></div>
    </div>
  );
}

function applyExtra(mutate: ReturnType<typeof useApp>["mutate"], id: string, kind: "contact" | "note" | "photo" | "detail", text: string) {
  mutate((st) => A.extra(st, id, kind, text));
}
function AddPhoto({ id }: { id: string }) {
  const { mutate } = useApp();
  return <button onClick={() => applyExtra(mutate, id, "photo", "")} className="rounded-xl border border-line py-2.5">Photo +3</button>;
}
export { applyExtra, CASES, TRACKS, stepsOf };
