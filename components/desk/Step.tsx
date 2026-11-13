"use client";
import type { ReactNode } from "react";
import { Card, Icon } from "../ui";
import { Input, Textarea } from "@/components/form";

export function Panel({ title, why, does, then, children }: { title: string; why: string; does?: string; then?: string; children: ReactNode }) {
  return (
    <Card className="border-brand/25">
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Your next step</div>
        <h2 className="mt-2 text-xl font-semibold leading-snug">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{why}</p>
        {(does || then) && <div className="mt-3 space-y-1 rounded-xl bg-surface p-3 text-[13px]">{does && <div><b>What happens:</b> {does}</div>}{then && <div><b>Then:</b> {then}</div>}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </Card>
  );
}

export const Field = ({ v, set, ph, area, type }: { v: string; set: (x: string) => void; ph: string; area?: boolean; type?: string }) => area
  ? <Textarea value={v} onChange={(e) => set(e.target.value)} placeholder={ph} aria-label={ph} />
  : <Input value={v} type={type} onChange={(e) => set(e.target.value)} placeholder={ph} aria-label={ph} />;

export const CHOICE = (k: string, opts: string[], v: string, set: (x: string) => void) => (
  <div role="group" aria-label={k} className="flex flex-wrap gap-1.5">{opts.map((x) => <button key={x} type="button" aria-pressed={v === x} onClick={() => set(x)} className={`min-h-10 rounded-lg border px-3 text-[13px] font-medium ${v === x ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-surface"}`}>{x}</button>)}</div>
);

export const Q = ({ label, children }: { label: string; children: ReactNode }) => <div className="space-y-1.5"><div className="text-[13px] font-semibold">{label}</div>{children}</div>;

export const Rows = ({ rows }: { rows: [string, ReactNode][] }) => (
  <div className="rounded-xl border border-line px-4 text-[13.5px]">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line/70 py-2.5 last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div>
);
