"use client";
import { useState } from "react";
import { Icon } from "../ui";
import { Input } from "@/components/form";
import { Button } from "@/components/ui/button";

export const PRESET_TAGS = ["Elevator", "Notice board", "Building map"];

/** Optional tag for one photo: a preset or the user's own, which stays available for the rest of the chat. */
export function TagPicker({ value, tags, onChange, onAdd, label = "Tag (optional)", dark }: { value?: string; tags: string[]; onChange: (t: string | null) => void; onAdd: (t: string) => void; label?: string; dark?: boolean }) {
  const [own, setOwn] = useState("");
  const add = () => { const t = own.trim(); if (!t) return; onAdd(t); onChange(t); setOwn(""); };
  const chip = (on: boolean) => on
    ? dark ? "border-white bg-white text-ink" : "border-ink bg-ink text-white"
    : dark ? "border-white/30 text-white/85 hover:bg-white/10" : "border-line text-ink/80 hover:bg-surface";
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[12px] font-medium ${dark ? "text-white/70" : "text-muted"}`}>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button key={t} type="button" aria-pressed={value === t} onClick={() => onChange(value === t ? null : t)} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium ${chip(value === t)}`}>
            <Icon n={value === t ? "check" : "tag"} s={12} w={2.2} />{t}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-1.5">
        <Input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Add your own tag" aria-label="Add your own tag" className={`h-9 min-w-0 flex-1 px-2.5 ${dark ? "border-white/30 bg-transparent text-white placeholder:text-white/50 focus-visible:border-white focus-visible:ring-white/30" : ""}`} />
        <Button type="submit" variant="outline" disabled={!own.trim()} className={`h-9 gap-1 px-2.5 text-[12.5px] ${dark ? "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}`}><Icon n="plus" s={13} />Add tag</Button>
      </form>
    </div>
  );
}
