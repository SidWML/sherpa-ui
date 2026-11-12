"use client";
import { useState } from "react";
import { pointsOf, useApp } from "@/lib/store";
import { LEAD_PEERS, LEVELS, USERS } from "@/lib/data";
import { levelOf } from "../Shell";
import { T } from "../shared";
import { Icon } from "../ui";

type Row = { id: string; name: string; initials: string; area: string; pts: number; leads: number; won: number; me: boolean };

/** Every lead generator in the region, ranked by confirmed points. Live for real users, demo figures for the rest. */
export function useBoard() {
  const { s, me } = useApp();
  const live: Row[] = USERS.filter((u) => u.role === "reporter").map((u) => {
    const mine = s.reports.filter((r) => r.reporterId === u.id);
    return { id: u.id, name: u.name, initials: u.initials, area: u.title.split("·")[1]?.trim() ?? "Hyderabad", pts: pointsOf(s, u.id).confirmed, leads: mine.length, won: mine.filter((r) => r.impact).length, me: u.id === me?.id };
  });
  const rows = [...live, ...LEAD_PEERS.map((p) => ({ ...p, me: false }))].sort((a, b) => b.pts - a.pts || b.leads - a.leads);
  const at = rows.findIndex((r) => r.me);
  return { rows, rank: at + 1, ahead: at > 0 ? rows[at - 1] : undefined, me: rows[at] };
}

const MEDAL = ["#c9a227", "#9aa3ad", "#b8743d"];

/** The level ladder: one segment per level, filled as points come in. */
export function LevelLadder({ pts }: { pts: number }) {
  const lv = levelOf(pts);
  return (
    <span className="flex gap-1">
      {LEVELS.slice(1).map((l, k) => { const from = LEVELS[k].from; const pct = Math.max(0, Math.min(100, ((pts - from) / (l.from - from)) * 100)); return (
        <span key={l.name} className="min-w-0 flex-1">
          <span className="block h-1.5 overflow-hidden rounded-sm bg-line"><span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: T.gold.fg }} /></span>
          <span className={`mt-1 block truncate text-[10.5px] ${pts >= l.from ? "font-semibold text-ink/80" : lv.next?.name === l.name ? "text-ink/70" : "text-muted"}`}>{l.name} <span className="font-normal text-muted">{l.from}</span></span>
        </span>); })}
    </span>
  );
}

export function Leaderboard() {
  const { rows, rank, ahead, me } = useBoard();
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.filter((r, i) => i < 5 || r.me);
  return (
    <section className="sheet overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div><h2 className="text-[15px] font-semibold">Leaderboard</h2><div className="t-small">Lead generators in Telangana · confirmed points</div></div>
        <span className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: T.gold.bg, color: T.gold.fg }}><Icon n="trophy" s={13} />You are #{rank}</span>
      </div>
      {ahead && me && <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[13px]"><span style={{ color: "var(--color-st-done)" }}><Icon n="bolt" s={14} /></span><span><b className="num">{ahead.pts - me.pts + 1}</b> points to pass {ahead.name.split(" ")[0]} for #{rank - 1}. A lead accepted by its owner is worth +20.</span></div>}
      {rank === 1 && <div className="border-b border-line bg-surface px-4 py-2.5 text-[13px]">You lead the board. Keep snapping to stay there.</div>}
      <ol>
        {shown.map((r) => { const i = rows.indexOf(r); const gap = !all && i >= 5 && rows.indexOf(shown[shown.indexOf(r) - 1]) !== i - 1; return (
          <li key={r.id}>
            {gap && <div className="border-b border-line px-4 py-1 text-center text-[12px] text-muted">⋯</div>}
            <div className={`flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 ${r.me ? "bg-brand-soft" : ""}`} style={r.me ? { boxShadow: "inset 3px 0 0 var(--color-brand)" } : undefined}>
              <span className="num grid w-6 shrink-0 place-items-center text-[13px] font-semibold text-ink/70">{i < 3 ? <span style={{ color: MEDAL[i] }}><Icon n="trophy" s={16} /></span> : i + 1}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold" style={r.me ? { background: "var(--color-brand)", color: "#fff" } : { background: T.grey.bg, color: T.grey.fg }}>{r.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{r.me ? "You" : r.name}</span>
                <span className="block truncate t-small">{r.area} · {r.leads} leads{r.won ? ` · ${r.won} won` : ""}</span>
              </span>
              <span className="text-right"><span className="num block text-[14px] font-semibold">{r.pts}</span><span className="block text-[11px] text-muted">{levelOf(r.pts).name}</span></span>
            </div>
          </li>); })}
      </ol>
      {rows.length > 6 && <button onClick={() => setAll(!all)} className="w-full border-t border-line px-4 py-2.5 text-[13px] font-medium text-ink/70 hover:bg-surface hover:text-ink">{all ? "Show top 5" : `Show all ${rows.length}`}</button>}
      <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-muted">Safety reports earn points but are never ranked.</p>
    </section>
  );
}
