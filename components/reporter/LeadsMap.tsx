"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui";

export type MapLead = { id: string; lat: number; lng: number; color: string; title: string; sub: string; status: string };

const TS = 256;
const wx = (lng: number, z: number) => ((lng + 180) / 360) * TS * 2 ** z;
const wy = (lat: number, z: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TS * 2 ** z; };

function fit(pts: { lat: number; lng: number }[], w: number, h: number) {
  const la = pts.map((p) => p.lat), ln = pts.map((p) => p.lng);
  const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...ln), Math.max(...ln)];
  const dx = wx(d, 0) - wx(c, 0), dy = wy(a, 0) - wy(b, 0);
  const z = dx < 1e-9 && dy < 1e-9 ? 14 : Math.floor(Math.max(3, Math.min(15, Math.min(Math.log2((w - 120) / Math.max(dx, 1e-9)), Math.log2((h - 120) / Math.max(dy, 1e-9))))));
  return { z, cx: (wx(c, z) + wx(d, z)) / 2, cy: (wy(a, z) + wy(b, z)) / 2 };
}

/** Every lead with a known building on one still map. Leads at the same building share a pin with a count. */
export function LeadsMap({ leads, focus, onFocus, onOpen, className = "h-[26rem]" }: { leads: MapLead[]; focus: string | null; onFocus: (id: string | null) => void; onOpen: (id: string) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const groups = new Map<string, MapLead[]>();
  leads.forEach((l) => { const k = `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`; groups.set(k, [...(groups.get(k) ?? []), l]); });
  const pins = [...groups.values()];
  const open = pins.find((g) => g.some((l) => l.id === focus));
  if (!leads.length) return <div className={`grid place-items-center rounded-md bg-surface text-[13px] text-muted ${className}`}>None of these leads have a map location.</div>;
  const v = size.w ? fit(leads, size.w, size.h) : null;
  const tiles: { k: string; x: number; y: number; src: string }[] = [];
  if (v) {
    const n = 2 ** v.z; const x0 = Math.floor((v.cx - size.w / 2) / TS), x1 = Math.floor((v.cx + size.w / 2) / TS), y0 = Math.floor((v.cy - size.h / 2) / TS), y1 = Math.floor((v.cy + size.h / 2) / TS);
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) if (ty >= 0 && ty < n) tiles.push({ k: `${tx}/${ty}`, x: tx * TS - v.cx + size.w / 2, y: ty * TS - v.cy + size.h / 2, src: `https://tile.openstreetmap.org/${v.z}/${((tx % n) + n) % n}/${ty}.png` });
  }
  const pos = (l: MapLead) => (v ? { x: wx(l.lng, v.z) - v.cx + size.w / 2, y: wy(l.lat, v.z) - v.cy + size.h / 2 } : { x: 0, y: 0 });
  return (
    <div ref={box} className={`relative overflow-hidden rounded-md bg-[#eef0f2] ${className}`}>
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={t.k} src={t.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: t.x, top: t.y, width: TS + 0.5, height: TS + 0.5, filter: "grayscale(.55) contrast(.92) brightness(1.06)" }} />
      ))}
      <button aria-label="Close map card" className="absolute inset-0 cursor-default" onClick={() => onFocus(null)} />
      {pins.map((g) => { const p = pos(g[0]); const on = g === open; return (
        <button key={g[0].id} aria-label={`${g[0].title}${g.length > 1 ? `, ${g.length} leads` : ""}`} onClick={() => onFocus(on ? null : g[0].id)} className={`absolute -translate-x-1/2 -translate-y-full transition ${on ? "z-20 scale-110" : "z-10 hover:scale-110"}`} style={{ left: p.x, top: p.y }}>
          <svg width="30" height="38" viewBox="0 0 30 38" className="drop-shadow-[0_2px_2px_rgba(0,0,0,.25)]"><path d="M15 37s13-12.3 13-22A13 13 0 002 15c0 9.7 13 22 13 22z" fill={g[0].color} stroke="#fff" strokeWidth="2" /></svg>
          <span className="num absolute inset-x-0 top-[7px] text-center text-[11px] font-bold text-white">{g.length}</span>
        </button>); })}
      {open && (() => { const p = pos(open[0]); const below = p.y < 200; return (
        <div className="float pop absolute z-30 w-64 -translate-x-1/2 rounded-md border border-line bg-white" style={{ left: Math.min(Math.max(p.x, 136), size.w - 136), top: below ? p.y + 8 : undefined, bottom: below ? undefined : size.h - p.y + 44 }}>
          <div className="border-b border-line px-3 py-2"><div className="truncate text-[13px] font-semibold">{open[0].title}</div><div className="t-small">{open.length} {open.length === 1 ? "lead" : "leads"} here</div></div>
          <div className="max-h-48 overflow-y-auto">{open.map((l) => (
            <button key={l.id} onClick={() => onOpen(l.id)} className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-surface">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{l.id} · {l.status}</span><span className="block truncate text-[11.5px] text-muted">{l.sub}</span></span>
              <Icon n="chev" s={13} />
            </button>))}</div>
        </div>); })()}
      <span className="absolute bottom-0 right-0 bg-white/80 px-1 text-[9.5px] text-muted">© OpenStreetMap</span>
    </div>
  );
}
