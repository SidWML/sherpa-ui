"use client";
import { useState } from "react";
import { Assistant } from "../reporter/Assistant";
import { Icon } from "../ui";

/**
 * Snap & Lead's capture, opened inside SHERPA so a seller can report a lift they pass without leaving their work.
 * It stays mounted after the first open, so closing it mid-capture keeps the photos and answers.
 */
export function SnapSheet({ open, onClose, onOpenLead }: { open: boolean; onClose: () => void; onOpenLead: (reportId: string) => void }) {
  const [key, setKey] = useState(0);
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);
  if (!used) return null;
  return (
    <div className={open ? "" : "hidden"}>
      <button aria-label="Close Snap & Lead" onClick={onClose} className="fixed inset-0 z-40 bg-ink/35" />
      <aside role="dialog" aria-label="Snap & Lead" className="@container pop float fixed bottom-0 right-0 top-[var(--safe-top,0px)] z-50 flex w-full max-w-[30rem] flex-col border-l border-line bg-white pb-[var(--safe-bottom,0px)]">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-white"><Icon n="camera" s={16} /></span>
          <div className="min-w-0 flex-1"><div className="text-[14.5px] font-semibold leading-tight">Snap & Lead</div><div className="t-small truncate leading-tight">Spotted a lift? Snap it and it goes to the right team.</div></div>
          <button onClick={() => setKey((k) => k + 1)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-surface"><Icon n="plus" s={13} w={2.4} /> New</button>
          <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={15} /></button>
        </div>
        <div className="relative min-h-0 flex-1"><Assistant key={key} onOpen={onOpenLead} onNew={() => setKey((k) => k + 1)} /></div>
      </aside>
    </div>
  );
}
