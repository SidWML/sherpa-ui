"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useThreads, type Thread } from "@/lib/chats";
import { Icon, ago } from "../ui";

/** Header button listing past conversations with the assistant. */
export function ChatHistory({ onPick }: { onPick: (t: Thread) => void }) {
  const { me } = useApp();
  const threads = useThreads(me?.id);
  const [open, setOpen] = useState(false); const [now, setNow] = useState(0);
  const list = threads;
  return (
    <div className="relative shrink-0">
      <button aria-label="Chat history" aria-expanded={open} onClick={() => { setNow(Date.now()); setOpen(!open); }} className={`grid h-8 w-8 place-items-center rounded-md border hover:bg-surface ${open ? "border-ink/40 bg-surface" : "border-line"}`}><Icon n="clock" s={16} /></button>
      {open && <>
        <button aria-label="Close history" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
        <div className="float pop fixed inset-x-3 top-[calc(var(--safe-top,0px)+3.75rem)] z-40 flex max-h-[min(30rem,70vh)] flex-col @xl:absolute @xl:inset-x-auto @xl:right-0 @xl:top-11 @xl:w-[22rem] overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <span className="text-[13.5px] font-semibold">Chat history</span>
            <span className="t-small">{list.length} {list.length === 1 ? "chat" : "chats"}</span>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {list.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-muted">No conversations yet. Chats with the assistant show up here.</div>}
            {list.map((t) => (
              <button key={t.id} onClick={() => { setOpen(false); onPick(t); }} className="flex w-full items-start gap-3 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-surface">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"><Icon n="sparkle" s={14} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-semibold">{t.title}</span><span className="shrink-0 text-[11.5px] text-muted">{ago(now - t.t)}</span></span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted">{t.last}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </>}
    </div>
  );
}
