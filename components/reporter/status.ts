import type { Report } from "@/lib/types";

/** The one-word state of a report, as the reporter sees it. */
export function reportStatus(r: Report) {
  if (r.status === "queued") return { t: "Waiting to send", tone: "amber" as const, grp: "progress" };
  const needs = r.items.some((i) => i.flags.includes("needsInfo") || i.kind === "retake");
  if (needs) return { t: "Needs you", tone: "red" as const, grp: "needs" };
  const live = r.items.filter((i) => !i.silent);
  const lead = live.find((i) => i.kind === "lead");
  if (lead?.status === "closed") return /Won/.test(lead.outcome ?? "") ? { t: "Won", tone: "green" as const, grp: "done" } : { t: "Done", tone: "gray" as const, grp: "done" };
  if (live.length && live.every((i) => i.status === "closed")) {
    const o = live.map((i) => i.outcome ?? "").join(" ");
    return { t: /Won/.test(o) ? "Won" : "Done", tone: /Won/.test(o) ? ("green" as const) : ("gray" as const), grp: "done" };
  }
  const first = live[0];
  if (!first) return { t: "Submitted", tone: "blue" as const, grp: "progress" };
  if (first.kind === "records") return { t: "Records update", tone: "blue" as const, grp: "progress" };
  if (first.kind === "emergency") return { t: "Emergency", tone: "red" as const, grp: "progress" };
  return { t: "In progress", tone: "red" as const, grp: "progress" };
}
