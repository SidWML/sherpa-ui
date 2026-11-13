"use client";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Explained } from "@/lib/scores";
import type { ProductKey } from "@/lib/types";
import { useApp } from "@/lib/store";
import { AREA_NAME, PRODUCT, winChanceWhy } from "@/lib/sherpa";

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Opens beside a score and shows how it was reached. Nested inside clickable rows, so it never lets the click through. */
export function Why({ title, e, children, extra, side = "bottom" }: { title: string; e?: Explained; children?: ReactNode; extra?: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<span role="button" tabIndex={0} />}
        aria-label={`How ${title.toLowerCase()} is worked out`}
        onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => ev.stopPropagation()}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm align-middle text-inherit outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        {children}
        <Info className="size-3.5 shrink-0 text-muted" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-80 gap-2 p-3.5 text-[13px]" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-baseline justify-between gap-3"><b className="text-[13.5px]">{title}</b>{e && <span className="num text-[15px] font-semibold">{e.score}</span>}</div>
        {e?.rule.map((r) => <p key={r} className="leading-snug text-muted">{r}</p>)}
        {e && (e.parts.length > 0 || e.start !== undefined) && (
          <div className="rounded-md border border-line">
            {e.start !== undefined && <div className="flex justify-between gap-3 px-2.5 py-1.5"><span className="text-muted">Starting point</span><span className="num font-medium">{e.start}</span></div>}
            {e.parts.map((p) => <div key={p.label} className="flex justify-between gap-3 border-t border-line px-2.5 py-1.5 first:border-t-0"><span>{p.label}</span><span className={`num shrink-0 font-semibold ${p.pts < 0 ? "text-brand" : "text-emerald-700"}`}>{sign(p.pts)}</span></div>)}
            <div className="flex justify-between gap-3 border-t border-line bg-surface px-2.5 py-1.5 font-semibold"><span>Score</span><span className="num">{e.score}</span></div>
          </div>
        )}
        {extra}
      </PopoverContent>
    </Popover>
  );
}

export function WinWhy({ area, product, pct, children }: { area: string; product: ProductKey; pct: number; children: ReactNode }) {
  const { s } = useApp();
  const w = winChanceWhy(s, area, product, pct);
  return (
    <Why title="Win chance" extra={
      <div className="space-y-2">
        <p className="leading-snug text-muted">The share of our past {PRODUCT[product].label.toLowerCase()} offers in {AREA_NAME[area] ?? area} that the customer accepted{w.close ? `, counting only offers with a discount of ${w.lo}% to ${w.hi}%` : ". There are fewer than 3 offers near this discount, so all discounts count"}.</p>
        <div className="rounded-md border border-line">
          <div className="flex justify-between px-2.5 py-1.5"><span className="text-muted">Offers compared</span><span className="num font-medium">{w.n}</span></div>
          <div className="flex justify-between border-t border-line px-2.5 py-1.5"><span className="text-muted">Won</span><span className="num font-medium">{w.won}</span></div>
          <div className="flex justify-between border-t border-line bg-surface px-2.5 py-1.5 font-semibold"><span>Win chance</span><span className="num">{w.pct}%</span></div>
        </div>
        <p className="leading-snug text-muted">A bigger discount usually raises it. It is history, not a promise.</p>
      </div>}>{children}</Why>
  );
}
