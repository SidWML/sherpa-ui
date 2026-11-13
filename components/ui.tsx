"use client";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import type { Item, Photo, Tier } from "@/lib/types";
import { TRACKS } from "@/lib/data";

const P: Record<string, string> = {
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  tag: "M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  flame: "M12 2c.8 3.6 5 5 5 10a5 5 0 01-10 0c0-2.2 1-3.4 2-4.4.2 1.8 1 2.6 2 2.8C11.2 8 11 5 12 2z",
  snow: "M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9",
  sliders: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M7 10v4M17 16v4",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  check: "M5 12l5 5 9-10",
  warn: "M12 3l10 18H2zM12 10v5M12 18v.5",
  x: "M6 6l12 12M18 6L6 18",
  chev: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  home: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  trophy: "M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M12 14v4M8 21h8",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  wifi: "M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5v.01",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  pin: "M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zM12 11a2 2 0 100-4 2 2 0 000 4z",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4l11-11-4-4L4 16zM13 7l4 4",
  send: "M3 11l18-8-8 18-2-8z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  users: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 100-6M21 20a6 6 0 00-4-5.6",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .6-1.4-1L15 4h-4l-.6 2.6-1.4 1L7 7l-2 4 2 1v1l-2 1 2 4 2-.6 1.4 1L11 20h4l.6-2.6 1.4-1 2 .6 2-4-2-1z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  menu: "M4 6h16M4 12h16M4 18h16",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  swap: "M7 4l-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
};
export function Icon({ n, s = 18, c = "currentColor", w = 1.8 }: { n: keyof typeof P | string; s?: number; c?: string; w?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[n] ?? P.star} />
    </svg>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`grid place-items-center rounded-lg bg-brand text-white ${small ? "h-7 w-7" : "h-8 w-8"}`}><Icon n="camera" s={small ? 15 : 17} /></div>
      <div className="text-[15px] font-semibold tracking-tight">Schindler <span className="font-normal text-muted">AI</span></div>
    </div>
  );
}

export function Avatar({ initials, tone = "brand" }: { initials: string; tone?: "brand" | "ink" }) {
  return <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${tone === "brand" ? "bg-brand" : "bg-ink"}`}>{initials}</div>;
}

type BtnProps = { children: ReactNode; onClick?: () => void; v?: "primary" | "ghost" | "soft" | "danger" | "dark"; disabled?: boolean; full?: boolean; sm?: boolean; className?: string; type?: "button" | "submit" };
export function Btn({ children, onClick, v = "primary", disabled, full, sm, className = "", type = "button" }: BtnProps) {
  const tone = {
    primary: { variant: "default", cls: "border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:opacity-100" },
    ghost: { variant: "outline", cls: "border-line bg-white text-ink hover:bg-surface hover:text-ink disabled:text-zinc-400 disabled:opacity-100" },
    soft: { variant: "secondary", cls: "bg-brand-soft text-brand hover:bg-red-100 hover:text-brand-dark disabled:opacity-60" },
    danger: { variant: "destructive", cls: "border-red-700 bg-red-700 text-white hover:bg-red-800 hover:text-white disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:opacity-100" },
    dark: { variant: "default", cls: "border-ink bg-ink text-white hover:bg-black hover:border-black disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:opacity-100" },
  } as const;
  const t = tone[v];
  return <Button type={type} disabled={disabled} onClick={onClick} variant={t.variant} className={cn(sm ? "h-auto min-h-9 px-3 text-[13px]" : "h-auto min-h-11 gap-2 px-4 text-sm", t.cls, full && "w-full", className)}>{children}</Button>;
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`sheet ${className}`}>{children}</div>;
}

export function Pill({ children, tone = "gray", className = "" }: { children: ReactNode; tone?: "gray" | "red" | "green" | "amber" | "blue" | "ink"; className?: string }) {
  const t = { gray: "bg-zinc-100 text-zinc-700 ring-zinc-200", red: "bg-red-50 text-red-700 ring-red-100", green: "bg-emerald-50 text-emerald-700 ring-emerald-100", amber: "bg-amber-50 text-amber-800 ring-amber-100", blue: "bg-sky-50 text-sky-700 ring-sky-100", ink: "bg-ink text-white ring-ink" }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${t} ${className}`}>{children}</span>;
}
export function TierPill({ tier }: { tier: Tier }) {
  const m = { Hot: "red", Warm: "amber", Cold: "blue", Info: "gray" } as const;
  return <Pill tone={m[tier]}>{tier === "Info" ? "Info only" : tier}</Pill>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center justify-between"><h3 className="t-label">{title}</h3>{right}</div>
      {children}
    </div>
  );
}

export function Field({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 text-[13.5px] last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white/70 px-6 py-10 text-center text-sm leading-relaxed text-muted">{text}</div>;
}

/* progress track */
export function Track({ item, compact, label = true }: { item: Pick<Item, "track" | "step" | "steps" | "status" | "outcome">; compact?: boolean; label?: boolean }) {
  const steps = item.steps ?? TRACKS[item.track].steps;
  return (
    <div>
      {label && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{TRACKS[item.track].label}{item.outcome ? ` · ${item.outcome}` : ""}</div>}
      <ol className={`flex ${compact ? "gap-1" : "gap-0"}`}>
        {steps.map((st, i) => {
          const done = i < item.step || (item.status === "closed" && i <= item.step);
          const cur = i === item.step && item.status !== "closed";
          return (
            <li key={i} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done || cur ? "bg-brand" : "bg-line"}`} />
                <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[9px] ${done ? "border-brand bg-brand text-white" : cur ? "border-brand bg-white text-brand pulse-ring" : "border-line bg-white text-transparent"}`}>{done ? <Icon n="check" s={11} w={3} /> : cur ? "●" : "·"}</div>
                <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "opacity-0" : done ? "bg-brand" : "bg-line"}`} />
              </div>
              {!compact && <div className={`mt-1 px-0.5 text-[10.5px] leading-tight ${done || cur ? "font-semibold text-ink" : "text-muted"}`}>{st}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
export function TrackList({ item }: { item: Pick<Item, "track" | "step" | "steps" | "status" | "outcome"> }) {
  const steps = item.steps ?? TRACKS[item.track].steps;
  return (
    <ol className="space-y-0">
      {steps.map((st, i) => {
        const done = i < item.step || (item.status === "closed" && i <= item.step);
        const cur = i === item.step && item.status !== "closed";
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`grid h-6 w-6 place-items-center rounded-full border-2 ${done ? "border-brand bg-brand text-white" : cur ? "border-brand bg-white pulse-ring" : "border-line bg-white"}`}>{done ? <Icon n="check" s={12} w={3} /> : cur ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}</div>
              {i < steps.length - 1 && <div className={`h-6 w-0.5 ${done ? "bg-brand" : "bg-line"}`} />}
            </div>
            <div className={`pt-0.5 text-sm ${done || cur ? "font-semibold" : "text-muted"}`}>{st}{cur && <span className="ml-2 text-xs font-normal text-brand">now</span>}</div>
          </li>
        );
      })}
    </ol>
  );
}

/* generated sample photo tiles */
export function PhotoTile({ p, className = "", onRemove, onLeft }: { p: Photo; className?: string; onRemove?: () => void; onLeft?: () => void }) {
  const base = `relative aspect-square overflow-hidden rounded-xl ${className}`;
  let inner: ReactNode;
  if (p.url) inner = /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.url} alt={p.label} className="h-full w-full object-cover" />;
  else if (p.kind === "plate") inner = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-zinc-400 to-zinc-600 p-2"><div className="rounded bg-zinc-200 px-2 py-1.5 text-center text-[11px] font-semibold text-zinc-800 shadow-inner">{p.text ?? "Lift No. 74821"}</div></div>;
  else if (p.kind === "panel") inner = <div className="grid h-full w-full place-items-center bg-gradient-to-b from-stone-600 to-stone-800"><div className="grid grid-cols-2 gap-1.5">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="grid h-5 w-5 place-items-center rounded-full bg-zinc-300 text-[9px] font-bold text-zinc-700">{n}</div>)}</div></div>;
  else if (p.kind === "sticker") inner = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-zinc-500 to-zinc-700 p-2"><div className="rounded bg-white px-2 py-1 text-center text-[10px] leading-tight text-zinc-800">{p.text ?? "Serviced by OtherLift"}<div className="text-[9px] text-zinc-500">Call 0800 123 456</div></div></div>;
  else if (p.kind === "cabin") inner = <div className="h-full w-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-500" />;
  else if (p.kind === "site") inner = <div className="grid h-full w-full place-items-end bg-gradient-to-b from-sky-200 to-stone-500 p-2"><div className="w-full rounded bg-amber-300 px-1.5 py-1 text-center text-[10px] font-bold text-stone-800">{p.text ?? "Construction site"}</div></div>;
  else inner = <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-700 to-emerald-900 p-2"><div className="rounded border-2 border-white/80 px-2 py-1 text-center text-[10px] font-bold text-white">{p.text ?? "Notice"}</div></div>;
  return (
    <div className={base}>
      {inner}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-[9.5px] font-medium text-white">{p.label}</div>
      {onRemove && <button aria-label="Remove photo" onClick={onRemove} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/80 text-white"><Icon n="x" s={12} w={2.5} /></button>}
      {onLeft && <button aria-label="Move earlier" onClick={onLeft} className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-ink"><Icon n="back" s={12} w={2.5} /></button>}
    </div>
  );
}

export function Bot({ size = 40, sad }: { size?: number; sad?: boolean }) {
  return (
    <div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-ink">
      <svg width={size * 0.6} height={size * 0.35} viewBox="0 0 30 18" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d={sad ? "M4 12q3-3 6 0M20 12q3-3 6 0" : "M4 8q3 4 6 0M20 8q3 4 6 0"} /></svg>
    </div>
  );
}

export const ago = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h} h ago`; return `${Math.round(h / 24)} days ago`;
};
