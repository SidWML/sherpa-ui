"use client";
import { useEffect, useRef, useState } from "react";
import { pointsOf, useApp } from "@/lib/store";
import { levelOf } from "../Shell";
import { Icon } from "../ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/form";
import { reportStatus } from "./status";
import { useBoard } from "./Leaderboard";
import { StreamText, Thinking, streamMs, thinkMs } from "../Stream";

type Row = { id: string; title: string; sub: string };
type Msg = { id: number; me?: boolean; text: string; rows?: Row[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HINT_KEY = "snaplead-quickask-hint";
const CHIPS = [
  { k: "lift", label: "Is this lift ours?" },
  { k: "needs", label: "What needs me?" },
  { k: "points", label: "My points" },
  { k: "lead", label: "Status of a lead" },
] as const;

function liftAnswer(n: string) {
  if (/^7\d+/.test(n)) return `Lift ${n} is ours. It is in our records.`;
  if (/^ol/i.test(n)) return `Lift ${n} is not ours.`;
  return `Lift ${n} is not in our records. Snap it to add it.`;
}

export function QuickAsk({ onOpen, onChat }: { onOpen: (leadId: string) => void; onChat: () => void }) {
  const { s, me } = useApp();
  const board = useBoard();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(() => { try { return localStorage.getItem(HINT_KEY) !== "1"; } catch { return true; } });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [wait, setWait] = useState<"lift" | "lead" | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [msgs, busy]);

  if (!me) return null;
  const mine = s.reports.filter((r) => r.reporterId === me.id);

  const dismissHint = () => { setHint(false); try { localStorage.setItem(HINT_KEY, "1"); } catch { /* storage blocked */ } };
  const toggle = () => { dismissHint(); setOpen((o) => !o); };
  const add = (m: Omit<Msg, "id">) => { const id = ++seq.current; setMsgs((list) => [...list, { ...m, id }]); return id; };
  const reply = async ({ rows, ...m }: Omit<Msg, "id" | "me">) => {
    setBusy(true);
    await sleep(thinkMs(m.text));
    const id = add(m);
    await sleep(streamMs(m.text));
    if (rows) setMsgs((list) => list.map((x) => (x.id === id ? { ...x, rows } : x)));
    setBusy(false);
  };
  const leadRow = (id: string): Row | null => {
    const r = mine.find((x) => x.id.toLowerCase() === id.toLowerCase());
    return r ? { id: r.id, title: r.placeName, sub: `${r.id} · ${reportStatus(r).t}` } : null;
  };

  const answerNeeds = () => {
    const rows = mine.filter((r) => reportStatus(r).grp === "needs").map((r) => ({ id: r.id, title: r.placeName, sub: `${r.id} · Needs you` }));
    void reply(rows.length ? { text: `${rows.length} ${rows.length === 1 ? "lead needs" : "leads need"} you.`, rows } : { text: "Nothing needs you right now." });
  };
  const answerPoints = () => {
    const { confirmed, pending } = pointsOf(s, me.id); const lv = levelOf(confirmed);
    void reply({ text: `You have ${confirmed} confirmed points and ${pending} pending. Level: ${lv.name}, #${board.rank} of ${board.rows.length} on the leaderboard.${lv.next ? ` ${lv.next.from - confirmed} points to ${lv.next.name}.` : ""}` });
  };
  const answerLead = (id: string) => {
    const row = leadRow(id);
    void reply(row ? { text: `${row.title} is ${reportStatus(mine.find((r) => r.id === row.id)!).t.toLowerCase()}.`, rows: [row] } : { text: `I could not find ${id.toUpperCase()} in your leads.` });
  };

  const chip = (k: (typeof CHIPS)[number]["k"], label: string) => {
    if (busy) return;
    add({ me: true, text: label });
    if (k === "lift") { setWait("lift"); void reply({ text: "Type the lift number from the plate, e.g. 74821." }); }
    else if (k === "lead") { setWait("lead"); void reply({ text: "Type the lead ID, e.g. SL-1142." }); }
    else if (k === "needs") answerNeeds();
    else answerPoints();
  };

  const send = (raw: string) => {
    const t = raw.trim(); if (!t || busy) return;
    setText(""); add({ me: true, text: t });
    const id = t.match(/\bSL-\d+\b/i)?.[0];
    const num = t.match(/\b(7\d+|OL[-\w]*)\b/i)?.[0];
    const mode = wait; setWait(null);
    if (id) answerLead(id);
    else if (mode === "lift" || (num && /ours|lift|number/i.test(t))) void reply({ text: liftAnswer(num ?? t) });
    else if (mode === "lead") answerLead(t);
    else if (/need|todo|action/i.test(t)) answerNeeds();
    else if (/point|xp|level|reward/i.test(t)) answerPoints();
    else void reply({ text: "That one is better in the full chat.", rows: [] });
  };

  const empty = msgs.length === 0;
  return (
    <>
      {open && <button aria-label="Close quick ask" onClick={() => setOpen(false)} className="absolute inset-0 z-40 bg-ink/25 @xl:bg-transparent" />}

      {open && (
        <section aria-label="Quick ask" className="float pop absolute inset-x-0 bottom-0 z-50 flex max-h-[75%] flex-col rounded-t-lg border border-line bg-white @xl:inset-x-auto @xl:bottom-[4.5rem] @xl:right-4 @xl:max-h-[32rem] @xl:w-[22rem] @xl:rounded-lg">
          <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="sparkle" s={15} /></span>
            <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">Quick ask</div><div className="t-small">Short answers without leaving this page</div></div>
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); onChat(); }} className="text-[12.5px] text-ink/70">Open full chat</Button>
            <Button variant="outline" size="icon" aria-label="Close" onClick={() => setOpen(false)}><Icon n="x" s={15} /></Button>
          </header>

          <div ref={box} className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-surface px-3 py-3">
            {empty && <div className="rounded-md border border-line bg-white px-3 py-2.5 text-[13.5px]">Hi {me.name.split(" ")[0]}. Ask something quick, or pick one below.</div>}
            {msgs.map((m) => (
              <div key={m.id} className={m.me ? "flex justify-end" : ""}>
                <div className={`max-w-[85%] rounded-md px-3 py-2 text-[13.5px] leading-snug ${m.me ? "bg-ink text-white" : "border border-line bg-white"}`}>
                  {m.me ? m.text : <StreamText text={m.text} />}
                  {m.rows && m.rows.length > 0 && (
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-md border border-line">
                      {m.rows.map((r) => (
                        <button key={r.id} onClick={() => { setOpen(false); onOpen(r.id); }} className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-surface">
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{r.title}</span><span className="block truncate t-small">{r.sub}</span></span>
                          <span className="shrink-0 text-[12.5px] font-semibold text-brand">Open</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {m.rows && m.rows.length === 0 && <button onClick={() => { setOpen(false); onChat(); }} className="mt-2 block text-[12.5px] font-semibold text-brand hover:underline">Open full chat</button>}
                </div>
              </div>
            ))}
            {busy && <Thinking />}
          </div>

          <div className="shrink-0 border-t border-line bg-white px-3 pb-3 pt-2.5">
            <div className="scroll-hide -mx-3 mb-2.5 flex gap-1.5 overflow-x-auto px-3">
              {CHIPS.map((c) => <button key={c.k} onClick={() => chip(c.k, c.label)} disabled={busy} className="shrink-0 disabled:opacity-50 whitespace-nowrap rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-surface">{c.label}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-1 rounded-md border border-line bg-white p-1 focus-within:border-brand">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={wait === "lift" ? "Lift number, e.g. 74821" : wait === "lead" ? "Lead ID, e.g. SL-1142" : "Ask a quick question…"} className="h-9 min-w-0 flex-1 px-2 border-0 bg-transparent shadow-none focus-visible:ring-0" />
              <button type="submit" aria-label="Send" disabled={!text.trim() || busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-white disabled:opacity-35"><Icon n="send" s={15} /></button>
            </form>
          </div>
        </section>
      )}

      <div className={`absolute bottom-3 right-3 z-50 flex items-center gap-2 ${open ? "@max-xl:hidden" : ""}`}>
        {hint && !open && (
          <div className="float pop flex items-center gap-1 rounded-md border border-line bg-white py-1 pl-3 pr-1 text-[12.5px] font-medium">
            <button onClick={toggle}>Quick question?</button>
            <button aria-label="Dismiss" onClick={dismissHint} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface hover:text-ink"><Icon n="x" s={12} /></button>
          </div>
        )}
        <button aria-label={open ? "Close quick ask" : "Quick ask"} aria-expanded={open} onClick={toggle} className={`float grid h-14 w-14 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark active:scale-95 ${hint && !open ? "pulse-ring" : ""}`}>
          <Icon n={open ? "x" : "sparkle"} s={22} />
        </button>
      </div>
    </>
  );
}
