"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { buildPins, OTHER_CLIENTS, LAYER_LABEL, type Layer, type Pin } from "@/lib/geo";
import { AREA_NAME, OP } from "@/lib/sherpa";
import { Icon } from "../ui";
import { involvedOpps } from "./parts";
import { T } from "../shared";

/* ------------------------------------------------------------------ web-mercator maths (no map library needed) */
const TS = 256;
const wx = (lng: number, z: number) => ((lng + 180) / 360) * TS * 2 ** z;
const wy = (lat: number, z: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TS * 2 ** z; };
const lngOf = (x: number, z: number) => (x / (TS * 2 ** z)) * 360 - 180;
const latOf = (y: number, z: number) => { const n = Math.PI - (2 * Math.PI * y) / (TS * 2 ** z); return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
interface View { z: number; lat: number; lng: number }

const LAYER: Record<Layer, { solid: string; bg: string; fg: string; icon: string }> = {
  lead: { solid: "#d42a2a", bg: T.red.bg, fg: T.red.fg, icon: "flame" },
  ours: { solid: "#1b5aa6", bg: T.blue.bg, fg: T.blue.fg, icon: "shield" },
  other: { solid: "#5d5d68", bg: T.grey.bg, fg: T.grey.fg, icon: "flag" },
};
const LAYERS: Layer[] = ["lead", "ours", "other"];

function fitView(pts: { lat: number; lng: number }[], w: number, h: number, pad = 70): View {
  if (!pts.length || w < 50) return { z: 11, lat: 17.4, lng: 78.45 };
  const la = pts.map((p) => p.lat), ln = pts.map((p) => p.lng);
  const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...ln), Math.max(...ln)];
  const dx = wx(d, 0) - wx(c, 0), dy = wy(a, 0) - wy(b, 0);
  const z = pts.length === 1 || (dx < 1e-9 && dy < 1e-9) ? 14 : Math.max(3, Math.min(15, Math.min(Math.log2(Math.max(40, w - pad * 2) / Math.max(dx, 1e-9)), Math.log2(Math.max(40, h - pad * 2) / Math.max(dy, 1e-9)))));
  return { z, lat: latOf((wy(a, z) + wy(b, z)) / 2, z), lng: (c + d) / 2 };
}

/* ------------------------------------------------------------------ the page */
export function TerritoryMap({ onOpenOpp, onAsk, onGoWork }: { onOpenOpp: (id: string) => void; onAsk: (prompt: string) => void; onGoWork?: () => void }) {
  const { s, me, now, mutate } = useApp();
  const mineIds = useMemo(() => new Set(involvedOpps(s, me!.id, me!.role).map((o) => o.id)), [s, me]);
  const all = useMemo(() => buildPins(s, me!.id, mineIds, now), [s, me, mineIds, now]);
  const [on, setOn] = useState<Record<Layer, boolean>>({ lead: true, ours: true, other: true });
  const [area, setArea] = useState("all"); const [q, setQ] = useState(""); const [mineOnly, setMineOnly] = useState(false); const [keyOnly, setKeyOnly] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null); const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ z: 11, lat: 17.42, lng: 78.44 }); const fitted = useRef(false);

  const lc = q.trim().toLowerCase();
  const base = all.filter((p) => (area === "all" || p.area === area) && (!mineOnly || p.mine || p.layer === "other") && (!keyOnly || p.key) && (!lc || `${p.name} ${p.sub}`.toLowerCase().includes(lc)));
  const shown = base.filter((p) => on[p.layer]);
  const count = (l: Layer) => base.filter((p) => p.layer === l).length;
  const picked = sel ? all.find((p) => p.id === sel) : undefined;

  /* size */
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = useCallback((list: Pin[]) => setView(fitView(list, size.w, size.h)), [size.w, size.h]);
  useEffect(() => { if (size.w > 50 && !fitted.current) { fitted.current = true; const mine = me!.areas?.length ? shown.filter((p) => me!.areas!.includes(p.area)) : []; fit(mine.length ? mine : shown.filter((p) => p.area !== "OUT")); } }); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  const pickArea = (a: string) => { setArea(a); setSel(null); const list = all.filter((p) => (a === "all" ? p.area !== "OUT" : p.area === a)); fit(list.length ? list : all); };

  /* gestures */
  const ptrs = useRef(new Map<number, { x: number; y: number }>()); const moved = useRef(false); const pinch = useRef<{ d: number; z: number } | null>(null);
  const zoomAt = useCallback((nz: number, px: number, py: number) => {
    setView((v) => {
      const z = Math.max(3, Math.min(17, nz)); if (z === v.z) return v;
      const cx = wx(v.lng, v.z), cy = wy(v.lat, v.z); const k = 2 ** (z - v.z);
      const ax = cx + (px - size.w / 2), ay = cy + (py - size.h / 2); // world point under the cursor
      const nx = ax * k - (px - size.w / 2), ny = ay * k - (py - size.h / 2);
      return { z, lat: latOf(ny, z), lng: lngOf(nx, z) };
    });
  }, [size.w, size.h]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fn = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(view.z - e.deltaY * 0.0022, e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener("wheel", fn, { passive: false }); return () => el.removeEventListener("wheel", fn);
  }, [view.z, zoomAt]);
  const down = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = false; if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z }; } };
  const move = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2 && pinch.current) { const [a, b] = [...ptrs.current.values()]; const r = box.current!.getBoundingClientRect(); moved.current = true; zoomAt(pinch.current.z + Math.log2(Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
    if (Math.abs(dx) + Math.abs(dy) > 0) moved.current = moved.current || Math.abs(dx) + Math.abs(dy) > 2;
    setView((v) => ({ ...v, lat: latOf(wy(v.lat, v.z) - dy, v.z), lng: lngOf(wx(v.lng, v.z) - dx, v.z) }));
  };
  const up = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; };

  /* project */
  const cx = wx(view.lng, view.z), cy = wy(view.lat, view.z);
  const at = (p: { lat: number; lng: number }) => ({ x: size.w / 2 + wx(p.lng, view.z) - cx, y: size.h / 2 + wy(p.lat, view.z) - cy });
  const projected = shown.map((p) => ({ p, ...at(p) }));
  const inView = projected.filter((q) => q.x > -20 && q.x < size.w + 20 && q.y > -20 && q.y < size.h + 20);

  /* cluster */
  const groups = useMemo(() => {
    const used = new Set<string>(); const out: { items: typeof inView; x: number; y: number }[] = [];
    const R = 30;
    for (const a of inView) {
      if (used.has(a.p.id)) continue;
      const near = inView.filter((b) => !used.has(b.p.id) && (b.p.id === a.p.id || (b.p.id !== sel && a.p.id !== sel && Math.hypot(a.x - b.x, a.y - b.y) < R)));
      near.forEach((b) => used.add(b.p.id));
      out.push({ items: near, x: near.reduce((t, b) => t + b.x, 0) / near.length, y: near.reduce((t, b) => t + b.y, 0) / near.length });
    }
    return out;
  }, [inView, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  /* tiles */
  const tz = Math.max(0, Math.min(18, Math.floor(view.z))); const sc = 2 ** (view.z - tz); const ts = TS * sc; const n = 2 ** tz;
  const tiles: { k: string; x: number; y: number; src: string }[] = [];
  if (size.w) {
    const x0 = Math.floor((cx / sc - size.w / 2 / sc) / TS), x1 = Math.floor((cx / sc + size.w / 2 / sc) / TS), y0 = Math.floor((cy / sc - size.h / 2 / sc) / TS), y1 = Math.floor((cy / sc + size.h / 2 / sc) / TS);
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue; const wxm = ((tx % n) + n) % n;
      tiles.push({ k: `${tz}/${tx}/${ty}`, x: size.w / 2 + tx * ts - cx, y: size.h / 2 + ty * ts - cy, src: `https://tile.openstreetmap.org/${tz}/${wxm}/${ty}.png` });
    }
  }

  const select = (p: Pin) => { setSel(p.id); setView((v) => { const z = Math.max(v.z, 13.5); return { z, lat: p.lat, lng: p.lng }; }); };
  const zoomBtn = (d: number) => zoomAt(view.z + d, size.w / 2, size.h / 2);
  const addLead = (p: Pin) => {
    const c = OTHER_CLIENTS.find((x) => x.id === p.id); if (!c) return; let id = "";
    mutate((st) => { const o = OP.create(st, { title: `Existing installation: ${c.name}`, kind: "existing", placeName: c.name, area: c.area, owner: me!.id, source: { type: "nba", itemId: c.id, label: "Added from the territory map" }, geo: { lat: c.lat, lng: c.lng } }); OP.accepted(st, o.id, me!.id); id = o.id; });
    if (id) setSel(id);
  };

  const list = [...inView.map((q) => q.p)].sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || Number(!!b.mine) - Number(!!a.mine) || a.name.localeCompare(b.name));
  const chip = (l: Layer) => (
    <button key={l} onClick={() => setOn({ ...on, [l]: !on[l] })} aria-pressed={on[l]} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition ${on[l] ? "bg-white" : "border-line bg-surface text-muted"}`} style={on[l] ? { borderColor: LAYER[l].solid } : undefined}>
      <span className="grid h-5 w-5 place-items-center rounded text-white" style={{ background: on[l] ? LAYER[l].solid : "#b9b9c2" }}><Icon n={LAYER[l].icon} s={12} /></span>
      {LAYER_LABEL[l]} <b className="num">{count(l)}</b>
    </button>
  );
  const toggle = (label: string, v: boolean, set: (b: boolean) => void) => <button onClick={() => set(!v)} aria-pressed={v} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] font-medium ${v ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-surface"}`}>{v && <Icon n="check" s={13} />}{label}</button>;

  return (
    <div className="@container absolute inset-0 flex flex-col bg-surface">
      {/* filters */}
      <div className="shrink-0 border-b border-line bg-white px-3 py-2.5 @3xl:px-5">
        <div className="scroll-hide flex items-center gap-2 overflow-x-auto @3xl:flex-wrap @3xl:overflow-visible">
          {LAYERS.map(chip)}
          <span className="mx-1 hidden h-6 w-px bg-line @3xl:block" />
          <label className="flex min-h-9 min-w-[11rem] flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-muted focus-within:border-brand @3xl:max-w-[18rem]"><Icon n="search" s={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place or client…" className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted" /></label>
          <select aria-label="Area" value={area} onChange={(e) => pickArea(e.target.value)} className="min-h-9 shrink-0 rounded-md border border-line bg-white px-2.5 text-[13px] outline-none focus:border-brand"><option value="all">All areas</option>{Object.entries(AREA_NAME).filter(([k]) => all.some((p) => p.area === k)).map(([k, v]) => <option key={k} value={k}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select>
          {toggle("My patch", mineOnly, setMineOnly)}
          {toggle("Key accounts", keyOnly, setKeyOnly)}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col @3xl:flex-row">
        {/* map */}
        <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={() => { if (!moved.current) setSel(null); }} className="relative min-h-[16rem] flex-[1.15] cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing @3xl:flex-1" style={{ background: "#e8ebe6" }}>
          {tiles.map((t) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={t.k} src={t.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: t.x, top: t.y, width: ts + 0.5, height: ts + 0.5, filter: "grayscale(.55) contrast(.92) brightness(1.06)" }} />)}
          {groups.map((g) => g.items.length > 1 ? (
            <button key={g.items.map((i) => i.p.id).join()} aria-label={`${g.items.length} places, zoom in`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setView(fitView(g.items.map((i) => i.p), size.w, size.h, 90)); }} className="absolute flex h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-md border-2 border-white bg-ink px-1.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,.3)] hover:bg-black" style={{ left: g.x, top: g.y }}>
              <span className="text-[14px] leading-none">{g.items.length}</span>
              <span className="mt-1 flex h-1 w-6 overflow-hidden rounded-sm">{LAYERS.map((l) => { const c = g.items.filter((i) => i.p.layer === l).length; return c ? <span key={l} style={{ flex: c, background: l === "other" ? "#b9b9c2" : l === "ours" ? "#6aa6e8" : "#f06a6a" }} /> : null; })}</span>
            </button>
          ) : (() => {
            const { p } = g.items[0]; const L = LAYER[p.layer]; const on_ = p.id === sel;
            return (
              <button key={p.id} aria-label={p.name} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); select(p); }} className="absolute -translate-x-1/2 -translate-y-full transition-transform" style={{ left: g.x, top: g.y, zIndex: on_ ? 30 : p.hot ? 10 : 5, transform: `translate(-50%,-100%) scale(${on_ ? 1.18 : 1})`, transformOrigin: "50% 100%" }}>
                <span className="relative grid h-9 w-9 place-items-center rounded-md border-2 border-white text-white shadow-[0_2px_8px_rgba(0,0,0,.35)]" style={{ background: L.solid, opacity: p.mine === false && p.layer !== "other" && mineOnly ? 0.5 : 1 }}>
                  <Icon n={L.icon} s={16} />
                  {p.hot && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white" style={{ background: "#e8a317" }} />}
                </span>
                <span className="mx-auto block h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent" style={{ borderTopColor: L.solid }} />
                {on_ && <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11.5px] font-semibold text-white">{p.name}</span>}
              </button>
            );
          })())}
          {/* controls */}
          <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_2px_8px_rgba(0,0,0,.18)]" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button aria-label="Zoom in" onClick={() => zoomBtn(1)} className="grid h-9 w-9 place-items-center border-b border-line hover:bg-surface"><Icon n="plus" s={16} /></button>
            <button aria-label="Zoom out" onClick={() => zoomBtn(-1)} className="grid h-9 w-9 place-items-center border-b border-line text-[20px] leading-none hover:bg-surface">−</button>
            <button aria-label="Show everything" title="Show everything" onClick={() => fit(shown.filter((p) => p.area !== "OUT" || area === "OUT"))} className="grid h-9 w-9 place-items-center hover:bg-surface"><Icon n="map" s={16} /></button>
          </div>
          <div className="pointer-events-none absolute bottom-1 right-2 rounded bg-white/80 px-1.5 text-[10px] text-muted">© OpenStreetMap contributors</div>
          {shown.length === 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="sheet pointer-events-auto p-5 text-center text-sm"><div className="font-semibold">Nothing matches these filters</div><button className="mt-2 text-[13px] font-semibold text-brand" onClick={() => { setOn({ lead: true, ours: true, other: true }); setMineOnly(false); setKeyOnly(false); setQ(""); pickArea("all"); }}>Clear filters</button></div></div>}
        </div>

        {/* side panel */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-line bg-white @3xl:w-[23rem] @3xl:flex-none @3xl:border-l @3xl:border-t-0">
          {picked ? <Detail p={picked} onBack={() => setSel(null)} onOpenOpp={onOpenOpp} onAsk={onAsk} onAdd={() => addLead(picked)} onGoWork={onGoWork} /> : (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3"><div><div className="text-[15px] font-semibold">In this view</div><div className="t-small">{list.length} place{list.length === 1 ? "" : "s"} · amber dot = needs attention</div></div><div className="flex gap-1.5">{LAYERS.map((l) => <span key={l} className="grid h-6 min-w-6 place-items-center rounded px-1 text-[11.5px] font-semibold" style={{ background: LAYER[l].bg, color: LAYER[l].fg }}>{list.filter((p) => p.layer === l).length}</span>)}</div></div>
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                {list.length === 0 && <div className="p-6 text-center text-sm text-muted">Nothing in this part of the map. Zoom out or press the map button.</div>}
                {list.map((p) => (
                  <button key={p.id} onClick={() => select(p)} className="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-surface">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ background: LAYER[p.layer].bg, color: LAYER[p.layer].fg }}><Icon n={LAYER[p.layer].icon} s={15} /></span>
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold">{p.name}</span>{p.key && <span className="shrink-0 rounded px-1.5 text-[10.5px] font-semibold" style={{ background: T.gold.bg, color: T.gold.fg }}>Key</span>}</span><span className="block truncate t-small">{p.why}</span></span>
                    {p.hot && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "#e8a317" }} title="Needs attention" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one place: what it is, why it matters, what to do */
function Detail({ p, onBack, onOpenOpp, onAsk, onAdd, onGoWork }: { p: Pin; onBack: () => void; onOpenOpp: (id: string) => void; onAsk: (prompt: string) => void; onAdd: () => void; onGoWork?: () => void }) {
  const L = LAYER[p.layer];
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3.5 text-[13.5px] font-semibold";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5"><button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted hover:bg-surface"><Icon n="back" s={15} /> All places</button></div>
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface p-3">
        <div className="sheet p-4">
          <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: L.bg, color: L.fg }}><Icon n={L.icon} s={13} />{p.layer === "lead" ? "Lead" : p.layer === "ours" ? "Schindler client" : "Other client"}{p.key ? " · Key account" : ""}</span>
          <h2 className="mt-2 text-[19px] font-semibold leading-tight tracking-tight">{p.name}</h2>
          <p className="t-small mt-0.5">{p.sub}</p>
        </div>
        <div className="sheet flex items-start gap-2.5 p-4" style={{ background: p.hot ? "#fff8e6" : undefined, borderColor: p.hot ? "#f3dfa6" : undefined }}>
          <span className="mt-0.5" style={{ color: "#b7791f" }}><Icon n={p.hot ? "flame" : "check"} s={17} /></span>
          <div><div className="t-label">{p.hot ? "Why now" : "Status"}</div><div className="mt-0.5 text-[14px] font-medium">{p.why}</div></div>
        </div>
        <div className="sheet divide-y divide-line px-4">{p.facts.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-[13.5px]"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div>
      </div>
      <div className="shrink-0 space-y-2 border-t border-line bg-white p-3">
        {p.layer === "lead" && p.oppId && <button onClick={() => { onGoWork?.(); onOpenOpp(p.oppId!); }} className={`${btn} w-full border-brand bg-brand text-white hover:opacity-90`}>Open opportunity</button>}
        {p.layer === "ours" && <button onClick={() => onAsk(`Brief me before my visit to ${p.name}`)} className={`${btn} w-full border-brand bg-brand text-white hover:opacity-90`}><Icon n="sparkle" s={15} /> Brief me before the visit</button>}
        {p.layer === "other" && <button onClick={onAdd} className={`${btn} w-full border-brand bg-brand text-white hover:opacity-90`}><Icon n="plus" s={15} /> Add as a lead</button>}
        <div className="grid grid-cols-2 gap-2">
          {p.layer === "lead" && p.oppId ? <button onClick={() => onAsk(`Where is ${p.oppId} (${p.name})?`)} className={`${btn} border-line bg-white hover:bg-surface`}><Icon n="sparkle" s={15} /> Ask SHERPA</button>
            : p.layer === "ours" ? <button onClick={() => onAsk(`Draft a renewal offer for ${p.name}`)} className={`${btn} border-line bg-white hover:bg-surface`}><Icon n="sparkle" s={15} /> Plan a renewal</button>
            : <span className={`${btn} border-line bg-surface text-muted`}>Becomes a lead for you</span>}
          <a href={dir} target="_blank" rel="noreferrer" className={`${btn} border-line bg-white hover:bg-surface`}><Icon n="pin" s={15} /> Directions</a>
        </div>
      </div>
    </div>
  );
}
