import type { Asset, Config, Reason } from "./types";

export interface Part { label: string; pts: number }
export interface Explained { score: number; start?: number; parts: Part[]; rule: string[] }

const cap = (n: number, max: number) => Math.min(n, max);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function unitHealth(a: Pick<Asset, "ageYears" | "callbacks90d" | "callbacksPrev90d" | "callbacks14d" | "faults90d" | "obsolete">): Explained {
  const rising = Math.max(0, a.callbacks90d - a.callbacksPrev90d);
  const parts: Part[] = [
    { label: `Age ${a.ageYears} years (1 per year over 5)`, pts: -cap(Math.max(0, a.ageYears - 5), 25) },
    { label: `${a.callbacks90d} callbacks in 90 days (3 each)`, pts: -cap(a.callbacks90d * 3, 30) },
    { label: `Callbacks rising: ${rising} more than the 90 days before (3 each)`, pts: -cap(rising * 3, 15) },
    { label: `${a.faults90d} out-of-service faults in 90 days (4 each)`, pts: -cap(a.faults90d * 4, 20) },
    { label: `${a.callbacks14d} callbacks in the last 14 days (2 each)`, pts: -a.callbacks14d * 2 },
    ...(a.obsolete ? [{ label: "A part is discontinued", pts: -10 }] : []),
  ].filter((p) => p.pts !== 0);
  return {
    start: 100, parts, score: clamp(100 + parts.reduce((t, p) => t + p.pts, 0)),
    rule: ["Starts at 100 and loses points for age, callbacks, faults and discontinued parts, from SAP service data.", "Below 45 is at risk. 45 to 69 needs watching. 70 and above is good."],
  };
}

export function accountHealth(units: Pick<Asset, "health">[], ending: number, faults: number): Explained {
  const avg = units.length ? Math.round(units.reduce((t, u) => t + u.health, 0) / units.length) : 70;
  const parts: Part[] = [
    ...(ending ? [{ label: `${ending} contract${ending > 1 ? "s" : ""} ending within 90 days (10 each)`, pts: -ending * 10 }] : []),
    ...(faults ? [{ label: `${faults} faults in 90 days across all lifts (2 each, at most 20)`, pts: -cap(faults * 2, 20) }] : []),
  ];
  return {
    start: avg, parts, score: clamp(avg + parts.reduce((t, p) => t + p.pts, 0)),
    rule: [units.length ? `Starts at the average health of the account's ${units.length} lift${units.length > 1 ? "s" : ""}.` : "No lifts on record, so it starts at 70.", "Below 50 shows in Health below 50."],
  };
}

export function leadScore(reasons: Reason[], cfg: Pick<Config, "tiers">): Explained {
  const sum = reasons.reduce((t, r) => t + r.pts, 0);
  return {
    parts: reasons.map((r) => ({ label: r.label, pts: r.pts })), score: clamp(sum),
    rule: [
      "Base points for what was spotted, plus or minus points for what makes it more or less likely to sell. Lines starting with History come from our past quotes and customers in the area.",
      `Hot ${cfg.tiers.hot} and above · Warm ${cfg.tiers.warm} to ${cfg.tiers.hot - 1} · Cold ${cfg.tiers.cold} to ${cfg.tiers.warm - 1} · Info below ${cfg.tiers.cold}. Capped at 100.`,
    ],
  };
}

export function marketingScore(reasons: Reason[] | undefined, score: number): Explained {
  return {
    parts: (reasons ?? []).map((r) => ({ label: r.label, pts: r.pts })), score,
    rule: ["Fit (does the customer have lifts we can sell to) plus engagement (opened, clicked, replied).", "60 and above is marked Ready for sales. Marketing decides whether to send it to the Sales Manager or nurture it."],
  };
}
