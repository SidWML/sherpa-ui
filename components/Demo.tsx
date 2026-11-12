"use client";
import { useApp } from "@/lib/store";
import { USERS, ROLE_LABEL } from "@/lib/data";
import { Btn, Icon } from "./ui";

export function DemoPanel({ onClose, onAtlas }: { onClose: () => void; onAtlas: () => void }) {
  const { s, mutate, advance, setOffline, reset, login, me } = useApp();
  const clockH = Math.round(s.clock / 3600000);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div><div className="text-base font-semibold">Demo controls</div><div className="text-xs text-muted">Prototype helpers. Not part of the product.</div></div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl border border-line"><Icon n="x" s={16} /></button>
        </div>

        <div className="mb-5 rounded-2xl bg-surface p-4">
          <div className="mb-1 text-sm font-semibold">Follow-up clock</div>
          <p className="mb-3 text-xs text-muted">Hot leads: owner reminded at 24 h, manager told at 48 h, manager reassigns at 72 h. Jump time to see it fire. Simulated time is now <b>+{clockH} h</b>.</p>
          <div className="flex flex-wrap gap-2">
            {[24, 48, 72, 120].map((h) => <Btn key={h} sm v="ghost" onClick={() => advance(h)}>+{h}h</Btn>)}
          </div>
        </div>

        <div className="mb-5 space-y-2 rounded-2xl bg-surface p-4">
          <div className="text-sm font-semibold">Conditions</div>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Phone offline (no signal)<span className="block text-xs text-muted">Reports queue, then sync when back online</span></span>
            <input type="checkbox" className="h-5 w-5 accent-[#e3001b]" checked={s.offline} onChange={(e) => setOffline(e.target.checked)} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Photo reader is down<span className="block text-xs text-muted">Employee gets manual entry</span></span>
            <input type="checkbox" className="h-5 w-5 accent-[#e3001b]" checked={!!s.readerDown} onChange={(e) => mutate((st) => { st.readerDown = e.target.checked; })} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Pause routing<span className="block text-xs text-muted">Admin kill switch: all leads go to the manager list</span></span>
            <input type="checkbox" className="h-5 w-5 accent-[#e3001b]" checked={s.cfg.paused} onChange={(e) => mutate((st) => { st.cfg.paused = e.target.checked; st.audit.unshift({ t: Date.now() + st.clock, by: "Demo", text: `Routing ${e.target.checked ? "paused" : "resumed"}` }); })} /></label>
        </div>

        <div className="mb-5">
          <div className="mb-2 text-sm font-semibold">Jump to a role</div>
          <div className="grid grid-cols-2 gap-2">
            {USERS.map((u) => (
              <button key={u.id} onClick={() => { login(u.id); onClose(); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${me?.id === u.id ? "border-brand bg-brand-soft" : "border-line bg-white hover:bg-surface"}`}>
                <div className="font-semibold">{u.name}</div><div className="text-muted">{ROLE_LABEL[u.role]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Btn v="soft" full onClick={() => { onAtlas(); onClose(); }}>Open the case atlas (145 cases)</Btn>
          <Btn v="ghost" full onClick={() => { if (confirm("Reset all demo data to the starting set?")) { reset(); onClose(); } }}>Reset demo data</Btn>
        </div>
      </div>
    </div>
  );
}
