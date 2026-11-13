"use client";
import { useState } from "react";
import { CASES, DESK_HINTS, GROUPS, PRESETS } from "@/lib/data";
import type { Preset } from "@/lib/types";
import { Btn, Icon, Pill } from "./ui";
import { Check, Input } from "@/components/form";

export function Atlas({ onClose, onRun }: { onClose: () => void; onRun: (p: Preset) => void }) {
  const [g, setG] = useState("all");
  const [q, setQ] = useState("");
  const [pilot, setPilot] = useState(false);
  const rows = CASES.filter((c) => (g === "all" || c[0][0] === g) && (!pilot || c[2] === 1) && (c[0] + c[1]).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <div className="p-4 md:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Case atlas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">All 145 cases from the PRD in 13 groups. Cases with a scenario run end to end in the reporter flow: the rules engine decides the situation, tier, owner and progress track. A dot marks the 36 pilot cases.</p>
          </div>
          <Btn v="ghost" onClick={onClose}><Icon n="x" s={16} /> Close</Btn>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cases…" aria-label="Search cases" className="w-auto min-w-56" />
          <button onClick={() => setG("all")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${g === "all" ? "bg-ink text-white" : "bg-white border border-line"}`}>All</button>
          {Object.entries(GROUPS).map(([k, v]) => <button key={k} onClick={() => setG(k)} title={v} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${g === k ? "bg-brand text-white" : "bg-white border border-line"}`}>{k}</button>)}
          <Check checked={pilot} onChange={setPilot} className="ml-auto text-xs font-medium">Pilot only</Check>
        </div>
        <div className="space-y-5">
          {Object.entries(GROUPS).filter(([k]) => g === "all" || g === k).map(([k, name]) => {
            const list = rows.filter((c) => c[0][0] === k);
            if (!list.length) return null;
            return (
              <div key={k}>
                <h2 className="mb-2 text-sm font-semibold"><span className="mr-2 rounded bg-brand px-1.5 py-0.5 text-xs text-white">{k}</span>{name}</h2>
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  {list.map((c, i) => {
                    const p = PRESETS.find((x) => x.id === c[0]);
                    return (
                      <div key={c[0]} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm ${i ? "border-t border-line/70" : ""}`}>
                        <span className="w-10 shrink-0 font-mono text-xs font-semibold">{c[0]}{c[2] ? <span className="text-brand"> ●</span> : ""}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{c[1]}</div>
                          <div className="text-xs text-muted">{p ? p.tip : DESK_HINTS[c[0]] ?? "Decided by the rules. Documented in the PRD, no dedicated scenario in this PoC."}</div>
                        </div>
                        {p ? <Btn sm v="soft" onClick={() => onRun(p)}>Run as reporter</Btn> : DESK_HINTS[c[0]] ? <Pill tone="blue">Desk demo</Pill> : <Pill>Rule only</Pill>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
