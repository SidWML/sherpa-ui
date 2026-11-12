"use client";
import { useEffect, useState } from "react";

const STEP_MS = 45;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tokens = (text: string) => text.split(/(\s+)/).filter(Boolean);

/** How long a reply takes to stream, so the caller can wait before showing what comes after it. */
export const streamMs = (text: string) => (reduced() ? 0 : Math.ceil(tokens(text).length / 2) * STEP_MS);

/** A pause that feels like the model is working: longer for longer answers, with a little jitter. */
export const thinkMs = (text = "") => 450 + Math.min(700, text.length * 4) + Math.round(Math.random() * 250);

/** Reveals an answer a few words at a time, the way a model streams its reply. */
export function StreamText({ text }: { text: string }) {
  const [shown, setShown] = useState(() => (reduced() ? Infinity : 0));
  const parts = tokens(text);
  const done = shown >= parts.length;
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => n + 2), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, done]);
  return <>{parts.slice(0, shown).join("")}{!done && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-brand" />}</>;
}

/** Shown while the reply is being worked out. */
export function Thinking({ label = "Thinking" }: { label?: string }) {
  return (
    <div className="pop flex items-center">
      <div className="sheet flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-muted">
        <span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70 [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70 [animation-delay:240ms]" /></span>
        {label}…
      </div>
    </div>
  );
}
