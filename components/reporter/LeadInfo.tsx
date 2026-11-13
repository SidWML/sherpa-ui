"use client";
import { useEffect } from "react";
import { PLACES } from "@/lib/data";
import type { LeadInfo, Photo, Report } from "@/lib/types";
import { Choice, Input } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Icon, PhotoTile } from "../ui";

type Key = keyof LeadInfo;
type Field = { k: Key; label: string; req?: boolean; digits?: boolean; wide?: boolean; type?: "tel" | "email" | "country" };

export const INFO_SECTIONS: { title: string; fields: Field[] }[] = [
  { title: "Contact info", fields: [{ k: "contactName", label: "Contact name" }, { k: "contactPhone", label: "Contact phone", type: "tel" }, { k: "contactEmail", label: "Contact email", type: "email" }, { k: "role", label: "Role" }] },
  { title: "Address details", fields: [{ k: "address", label: "Address", req: true, wide: true }, { k: "city", label: "City" }, { k: "postalCode", label: "Postal code", digits: true }, { k: "country", label: "Country", req: true, type: "country" }] },
  { title: "Elevator info", fields: [{ k: "manufacturer", label: "Manufacturer" }, { k: "serialNumber", label: "Serial number" }, { k: "maintainer", label: "Current maintainer" }, { k: "elevators", label: "Number of elevators", digits: true }, { k: "floors", label: "Number of floors", digits: true }, { k: "capacity", label: "Capacity" }] },
];
const FIELDS = INFO_SECTIONS.flatMap((x) => x.fields);
export const emptyFields = (v: LeadInfo) => FIELDS.filter((f) => !v[f.k].trim()).map((f) => f.label);
const COUNTRIES = ["India", "Bangladesh", "Nepal", "Sri Lanka", "Singapore", "United Arab Emirates", "Germany", "Switzerland", "Spain", "Portugal"];
const SERVICER: Record<string, string> = { us: "Schindler", other: "Local firm", maker: "Original maker", staff: "Building staff", nobody: "None", unknown: "" };

/** Saved details, or what the report already tells us when nothing has been saved yet. */
export function infoOf(r: Report): LeadInfo {
  if (r.info) return r.info;
  const addr = PLACES.find((p) => p.id === r.placeId)?.addr ?? r.placeName;
  const [name, ...role] = (r.extras.contact ?? "").split(",");
  return {
    contactName: name.trim(), contactPhone: "", contactEmail: "", role: role.join(",").trim(),
    address: addr, city: addr.split(",").pop()?.trim() ?? "", postalCode: "", country: "India",
    manufacturer: r.input.brand === "ours" ? "Schindler" : "", serialNumber: r.input.number ?? "", maintainer: SERVICER[r.input.servicer] ?? "",
    elevators: r.input.units > 0 ? String(r.input.units) : "", floors: "", capacity: "",
  };
}

export function checkInfo(v: LeadInfo) {
  const errors: Partial<Record<Key, string>> = {};
  FIELDS.forEach((f) => {
    const val = v[f.k].trim();
    if (f.req && !val) errors[f.k] = "Required field";
    else if (f.digits && val && !/^\d+$/.test(val)) errors[f.k] = "Only numbers allowed";
  });
  const missing = FIELDS.filter((f) => f.req && !v[f.k].trim()).map((f) => f.label);
  return { errors, missing, ok: Object.keys(errors).length === 0 };
}

const dash = <span className="text-muted">—</span>;
function shown(f: Field, v: string) {
  if (!v.trim()) return dash;
  if (f.type === "tel") return <a href={`tel:${v.replace(/\s/g, "")}`} className="font-medium text-brand hover:underline">Call {v}</a>;
  if (f.type === "email") return <a href={`mailto:${v}`} className="break-all font-medium text-brand hover:underline">Email {v}</a>;
  return v;
}

export function InfoView({ info, onEdit, canEdit }: { info: LeadInfo; onEdit: () => void; canEdit: boolean }) {
  return (
    <div className="sheet">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[15px] font-semibold">Lead details</h3>
        {canEdit && <Button variant="outline" onClick={onEdit}><Icon n="edit" s={13} /> Edit details</Button>}
      </div>
      {INFO_SECTIONS.map((sec) => (
        <section key={sec.title} className="border-b border-line px-4 py-3 last:border-0">
          <div className="t-label mb-2">{sec.title}</div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 @xl:grid-cols-2">
            {sec.fields.map((f) => <div key={f.k} className={`min-w-0 ${f.wide ? "@xl:col-span-2" : ""}`}><dt className="t-small">{f.label}</dt><dd className="mt-0.5 break-words text-[13.5px]">{shown(f, info[f.k])}</dd></div>)}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function InfoForm({ value, onChange, focus }: { value: LeadInfo; onChange: (v: LeadInfo) => void; focus?: Key }) {
  const { errors } = checkInfo(value);
  return (
    <div className="sheet">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[15px] font-semibold">Edit lead details</h3>
        <span className="t-small">(*) Mandatory fields</span>
      </div>
      {INFO_SECTIONS.map((sec) => (
        <fieldset key={sec.title} className="border-b border-line px-4 py-3 last:border-0">
          <legend className="sr-only">{sec.title}</legend>
          <div className="t-label mb-2">{sec.title}</div>
          <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
            {sec.fields.map((f) => {
              const err = errors[f.k]; const id = `info-${f.k}`;
              const set = (v: string) => onChange({ ...value, [f.k]: v });
              return (
                <label key={f.k} htmlFor={id} className={`block min-w-0 ${f.wide ? "@xl:col-span-2" : ""}`}>
                  <span className="mb-1 block text-[12.5px] font-medium text-ink/80">{f.label}{f.req && <span className="text-brand"> *</span>}</span>
                  {f.type === "country"
                    ? <Choice id={id} value={value[f.k]} onChange={set} placeholder="Select a country" className={err ? "border-brand" : undefined} options={COUNTRIES.includes(value.country) || !value.country ? COUNTRIES : [value.country, ...COUNTRIES]} />
                    : <Input id={id} value={value[f.k]} aria-invalid={!!err} autoFocus={focus === f.k} type={f.type ?? "text"} inputMode={f.digits ? "numeric" : undefined} placeholder={`Enter ${f.label.toLowerCase()}`} onChange={(e) => set(e.target.value)} />}
                  {err && <span className="mt-1 block text-[12px] text-brand">{err}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function Gallery({ photos, at, setAt, onOpen }: { photos: Photo[]; at: number; setAt: (i: number) => void; onOpen: (i: number) => void }) {
  if (!photos.length) return <div className="sheet p-8 text-center text-sm text-muted">No photos for this lead.</div>;
  const i = Math.min(at, photos.length - 1); const p = photos[i];
  const nav = (d: number) => setAt((i + d + photos.length) % photos.length);
  return (
    <div className="sheet p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <h3 className="text-[15px] font-semibold">Photos</h3>
        <span className="num rounded-md bg-surface px-2 py-0.5 text-[12px] font-semibold text-ink/70">{photos.length}</span>
      </div>
      <div className="relative">
        <button onClick={() => onOpen(i)} aria-label="Open photo full screen" className="block w-full"><PhotoTile p={p} className="!aspect-[4/3] w-full !rounded-md" /></button>
        {photos.length > 1 && <>
          <button aria-label="Previous photo" onClick={() => nav(-1)} className="float absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white hover:bg-surface"><Icon n="back" s={16} /></button>
          <button aria-label="Next photo" onClick={() => nav(1)} className="float absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white hover:bg-surface"><Icon n="chev" s={16} /></button>
        </>}
      </div>
      <p className="t-small mt-2 px-1">Photo {i + 1} of {photos.length} · {p.label}</p>
      {photos.length > 1 && (
        <div role="group" aria-label="Choose a photo" className="scroll-hide mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {photos.map((q, k) => <button key={q.id} aria-label={`Photo ${k + 1}`} aria-pressed={k === i} onClick={() => setAt(k)} className={`w-16 shrink-0 rounded-md ${k === i ? "ring-2 ring-brand ring-offset-1" : "opacity-70 hover:opacity-100"}`}><PhotoTile p={q} className="!rounded-md" /></button>)}
        </div>
      )}
    </div>
  );
}

/** Full-screen photo inside the lead panel, so it stays within the phone preview. */
export function Lightbox({ photos, at, setAt, onClose }: { photos: Photo[]; at: number; setAt: (i: number) => void; onClose: () => void }) {
  const i = Math.min(at, photos.length - 1); const p = photos[i];
  const nav = (d: number) => setAt((i + d + photos.length) % photos.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") nav(-1); if (e.key === "ArrowRight") nav(1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  if (!p) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="pop absolute inset-0 z-40 flex flex-col bg-ink/95 text-white">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <span className="text-[13px]">Photo {i + 1} of {photos.length} · {p.label}</span>
        <button aria-label="Close photo" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md bg-white/10 hover:bg-white/20"><Icon n="x" s={16} /></button>
      </div>
      <div className="relative grid min-h-0 flex-1 place-items-center p-4">
        <div className="aspect-[4/3] w-full max-w-3xl"><PhotoTile p={p} className="!aspect-[4/3] h-full w-full !rounded-md" /></div>
        {photos.length > 1 && <>
          <button aria-label="Previous photo" onClick={() => nav(-1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25"><Icon n="back" s={18} /></button>
          <button aria-label="Next photo" onClick={() => nav(1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25"><Icon n="chev" s={18} /></button>
        </>}
      </div>
    </div>
  );
}
