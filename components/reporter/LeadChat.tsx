"use client";
import { useEffect, useRef, useState } from "react";
import { A, useApp } from "@/lib/store";
import type { Report } from "@/lib/types";
import { Icon } from "../ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/form";
import { StreamText, Thinking, streamMs, thinkMs } from "../Stream";

export type LeadFacts = {
  where: string; next?: string; closed: boolean; owner?: { name: string; role: string }; teams: string[];
  canAdd: boolean; pending: number; confirmed: number; read: string; empty: string[];
};
type Msg = { id: number; me?: boolean; text: string };
type Topic = "where" | "next" | "owner" | "earn" | "note" | "read" | "empty";

const CHIPS: [Topic, string][] = [["read", "What did the AI read?"], ["empty", "Which details are missing?"], ["where", "Where is it now?"], ["owner", "Who owns it?"], ["next", "What happens next?"], ["note", "Add a note for the owner"]];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A chat scoped to one lead for field technicians: ask about the lift and the lead, or leave the owner a note, without leaving the details. */
export function LeadChat({ r, facts, onClose, className = "" }: { r: Report; facts: LeadFacts; onClose?: () => void; className?: string }) {
  const { mutate } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState<"note" | null>(null);
  const [text, setText] = useState("");
  const seq = useRef(0); const box = useRef<HTMLDivElement>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const add = (m: Omit<Msg, "id">) => setMsgs((l) => [...l, { ...m, id: ++seq.current }]);
  const reply = async (t: string) => {
    setBusy(true); await sleep(thinkMs(t)); if (!alive.current) return;
    add({ text: t }); await sleep(streamMs(t)); if (alive.current) setBusy(false);
  };
  const first = facts.owner?.name.split(" ")[0];
  const answer = (k: Topic) => {
    if (k === "where") return reply(facts.where);
    if (k === "read") return reply(facts.read);
    if (k === "empty") return reply(facts.empty.length ? `Still empty: ${facts.empty.join(", ")}. ${r.status === "sent" ? "Use Edit details to fill them in. The owner sees the changes straight away." : "Details can be edited once the lead is sent."}` : "Every detail is filled in. Nothing missing.");
    if (k === "next") return reply(facts.closed ? "Nothing more to do. This lead is closed." : facts.next ? `Next step: ${facts.next}. ${first ? `${first} moves it forward` : "The owner moves it forward"}, and I will tell you here when it changes.` : "It is with the team now. I will tell you here when it moves.");
    if (k === "owner") return reply(facts.owner ? `${facts.owner.name}, ${facts.owner.role}. They see your photos and answers. Contract and price details stay private.` : `No owner yet. It went to ${facts.teams.join(" and ") || "the right team"}, and someone picks it up soon.`);
    if (k === "earn") {
      if (!facts.canAdd) return reply("This lead is closed for updates, so no more points here. Snap a new lift to keep earning.");
      const left = [!r.extras.contact && "a site contact (+5)", !r.extras.note && "a note for the owner (+5)", r.extras.photos < 3 && `${3 - r.extras.photos} more photos (+3 each)`].filter(Boolean);
      return reply(`You have +${facts.confirmed} confirmed${facts.pending ? ` and +${facts.pending} pending` : ""} on this lead. ${left.length ? `Add ${left.join(", ")}.` : "You have added every bonus already."}`);
    }
    if (r.extras.note) return reply("You already left a note on this lead. The owner has it.");
    if (!facts.canAdd) return reply("Updates are closed on this lead.");
    setWait("note");
    return reply("What should the owner know? Keep it to what you saw, for example who manages the building. No prices or contract terms.");
  };
  const ask = (k: Topic, label: string) => { if (busy) return; setWait(null); add({ me: true, text: label }); void answer(k); };
  const send = (raw: string) => {
    const t = raw.trim(); if (!t || busy) return;
    setText(""); add({ me: true, text: t });
    if (wait === "note") { setWait(null); mutate((z) => A.extra(z, r.id, "note", t)); return void reply("Added for the owner. +5 points pending until they confirm it."); }
    const k: Topic | null = /missing|empty|fill|incomplete/i.test(t) ? "empty" : /read|brand|number|plate|servic|lift|escalator|unit|detect|ai saw/i.test(t) ? "read" : /who|owner|assign/i.test(t) ? "owner" : /next|when|how long/i.test(t) ? "next" : /point|earn|bonus|reward/i.test(t) ? "earn" : /note|tell the owner/i.test(t) ? "note" : /where|status|now|stage/i.test(t) ? "where" : null;
    if (k) return void answer(k);
    void reply("I can tell you what the AI read from the photos, which details are missing, where this lead is, who owns it and what happens next. For a new sighting, start a new lead.");
  };

  return (
    <div className={`flex h-full min-h-0 flex-col bg-white ${className}`}>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        {onClose && <Button variant="ghost" size="icon" aria-label="Back to lead" onClick={onClose} className="-ml-1.5"><Icon n="back" s={16} /></Button>}
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand text-white"><Icon n="sparkle" s={14} /></span>
        <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold leading-tight">Ask AI</div><div className="t-small truncate leading-tight">{r.id} · {r.placeName}</div></div>
      </div>
      <div ref={box} className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-surface p-3">
        <div className="sheet px-3.5 py-2.5 text-[13.5px] leading-snug">Ask me about the lift at {r.placeName}, what is missing on this lead, or leave the owner a note.</div>
        {msgs.map((m) => (
          <div key={m.id} className={m.me ? "pop flex justify-end" : "pop"}>
            <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-md px-3.5 py-2.5 text-[13.5px] leading-snug ${m.me ? "bg-brand text-white" : "sheet"}`}>{m.me ? m.text : <StreamText text={m.text} />}</div>
          </div>
        ))}
        {busy && <Thinking />}
      </div>
      <div className="shrink-0 border-t border-line bg-white p-3">
        <div className="scroll-hide -mx-3 mb-2.5 flex gap-1.5 overflow-x-auto px-3">
          {CHIPS.map(([k, l]) => <button key={k} disabled={busy} onClick={() => ask(k, l)} className="shrink-0 whitespace-nowrap rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-surface disabled:opacity-50">{l}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-1 rounded-md border border-line bg-white p-1 focus-within:border-brand">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={wait === "note" ? "Your note for the owner…" : "Ask about this lead…"} className="h-9 min-w-0 flex-1 px-2 border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <button type="submit" aria-label="Send" disabled={!text.trim() || busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-white disabled:opacity-35"><Icon n="send" s={15} /></button>
        </form>
      </div>
    </div>
  );
}
