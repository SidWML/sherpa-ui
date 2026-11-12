"use client";
import { Icon } from "../ui";

const TS = 256;
const Z = 15;
const wx = (lng: number) => ((lng + 180) / 360) * TS * 2 ** Z;
const wy = (lat: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TS * 2 ** Z; };

/** A still map centred on the lead's building, from the same tiles the territory map uses. */
export function LeadMap({ lat, lng, className = "h-44" }: { lat: number; lng: number; className?: string }) {
  const px = wx(lng), py = wy(lat); const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  const tiles = [];
  for (let dx = -3; dx <= 3; dx++) for (let dy = -1; dy <= 1; dy++) tiles.push({ x: tx + dx, y: ty + dy, left: (tx + dx) * TS - px, top: (ty + dy) * TS - py });
  return (
    <div className={`relative overflow-hidden bg-[#eef0f2] ${className}`}>
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${t.x}/${t.y}`} src={`https://tile.openstreetmap.org/${Z}/${t.x}/${t.y}.png`} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: `calc(50% + ${t.left}px)`, top: `calc(50% + ${t.top}px)`, width: TS + 0.5, height: TS + 0.5, filter: "grayscale(.55) contrast(.92) brightness(1.06)" }} />
      ))}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-brand drop-shadow-[0_2px_2px_rgba(0,0,0,.25)]"><svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 37s13-12.3 13-22A13 13 0 002 15c0 9.7 13 22 13 22z" fill="currentColor" stroke="#fff" strokeWidth="2" /><circle cx="15" cy="15" r="5" fill="#fff" /></svg></span>
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="float absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] font-semibold hover:bg-surface"><Icon n="pin" s={13} /> Directions</a>
      <span className="absolute bottom-0 right-0 bg-white/80 px-1 text-[9.5px] text-muted">© OpenStreetMap</span>
    </div>
  );
}
