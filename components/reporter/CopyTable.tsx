"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "../ui";

/** Copies field/value rows as tab-separated text, so they paste as a table into a sheet or an email. */
export function CopyTable({ rows }: { rows: [string, string][] }) {
  const [note, setNote] = useState("");
  const copy = async () => {
    const tsv = [["Field", "Value"], ...rows].map((r) => r.map((c) => c.replace(/[\t\n]+/g, " ")).join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); setNote("Table copied"); } catch { setNote("The table couldn't be copied."); }
    setTimeout(() => setNote(""), 2000);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="outline" onClick={() => void copy()} className="gap-1.5 px-2.5 text-[12.5px]"><Icon n="doc" s={13} /> Copy as table</Button>
      {note && <span className="pop text-[12px] text-muted" role="status">{note}</span>}
    </span>
  );
}
