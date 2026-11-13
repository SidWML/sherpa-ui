"use client";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Label } from "@/components/ui/label";

export type Option = string | { value: string; label: ReactNode; disabled?: boolean };
const norm = (o: Option) => (typeof o === "string" ? { value: o, label: o as ReactNode, disabled: false } : o);

/** A Base UI select with the same shape as a native one: a string value, a change handler and a list of options. An empty value shows the placeholder. */
export function Choice({ value, onChange, options, placeholder = "Choose…", className, size = "default", disabled, id, "aria-label": aria }: {
  value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; className?: string; size?: "sm" | "default"; disabled?: boolean; id?: string; "aria-label"?: string;
}) {
  const items = options.map(norm);
  const box = useRef<HTMLButtonElement>(null); const [side, setSide] = useState<"top" | "bottom">("bottom");
  /* a list near the bottom of the screen opens upwards, so it is never squeezed into a few pixels */
  const measure = (open: boolean) => { if (!open) return; const r = box.current?.getBoundingClientRect(); if (r) setSide(window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom ? "top" : "bottom"); };
  return (
        <Select items={items} value={value === "" ? null : value} onValueChange={(v) => onChange(v == null ? "" : String(v))} disabled={disabled} onOpenChange={measure}>
      <SelectTrigger ref={box} id={id} size={size} aria-label={aria} className={cn("w-full", className)}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent alignItemWithTrigger={false} side={side} className="max-h-[min(var(--available-height),18rem)] min-w-[12rem]">
        {items.map((o) => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** A checkbox with its label, the whole row clickable. */
export function Check({ checked, onChange, children, className, disabled }: { checked: boolean; onChange: (v: boolean) => void; children?: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-[13.5px] has-disabled:cursor-not-allowed has-disabled:opacity-50", className)}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} disabled={disabled} />
      {children}
    </label>
  );
}

/** Radio buttons from a list of options. */
export function Radios({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: Option[]; className?: string }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(String(v))} className={className}>
      {options.map(norm).map((o) => (
        <label key={o.value} className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]"><RadioGroupItem value={o.value} disabled={o.disabled} />{o.label}</label>
      ))}
    </RadioGroup>
  );
}
