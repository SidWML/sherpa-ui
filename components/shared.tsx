"use client";
import { useApp, userOf } from "@/lib/store";
import { Btn, Empty, Icon, ago } from "./ui";

/** Palette for tags and states. Same hue family for background and text, so every tag reads at a glance. */
export const T = {
  red: { bg: "#fde6e6", fg: "#c02626" }, orange: { bg: "#fdeed8", fg: "#b45309" }, blue: { bg: "#e3effb", fg: "#1b5aa6" }, green: { bg: "#e2f4ea", fg: "#1d7a45" },
  purple: { bg: "#ece9fb", fg: "#4b36b8" }, pink: { bg: "#fbe6f0", fg: "#b02a66" }, grey: { bg: "#eeeef1", fg: "#4a4a55" }, gold: { bg: "#fdf0cf", fg: "#9a6a00" },
} as const;
export type Tone = (typeof T)[keyof typeof T];

/** One thin line in the state colour. */
export function Line({ total, at, closed, color }: { total: number; at: number; closed: boolean; color: string }) {
  const pct = closed ? 100 : Math.min(96, Math.round(((at + 0.5) / Math.max(total, 2)) * 100));
  return <span className="block h-1.5 w-full overflow-hidden rounded-sm bg-line"><span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: closed ? "var(--color-st-done)" : color }} /></span>;
}

const AVATAR = [T.pink, T.blue, T.green, T.purple, T.orange];
export function OwnerDot({ id, size = 30 }: { id?: string; size?: number }) {
  const u = userOf(id);
  if (!u) return <span title="Not assigned yet" style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full border border-dashed border-line text-[11px] text-muted">–</span>;
  const t = AVATAR[(u.id.charCodeAt(0) + u.id.length) % AVATAR.length];
  return <span title={u.name} style={{ width: size, height: size, background: t.bg, color: t.fg }} className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold">{u.initials}</span>;
}

export function pageList(cur: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, cur - 1, cur, cur + 1, pages - 1, pages].filter((p) => p >= 1 && p <= pages));
  const arr = Array.from(set).sort((x, y) => x - y); const out: (number | "…")[] = [];
  arr.forEach((p, i) => { if (i && p - arr[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
}

/** Stat cards: one swipeable row on a phone, a five-column grid from 56rem. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="scroll-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-0.5 @4xl:mx-0 @4xl:mt-5 @4xl:grid @4xl:grid-cols-5 @4xl:gap-3 @4xl:overflow-visible @4xl:px-0">{children}</div>;
}

export function Stat2({ icon, label, value, tone, active, onClick, chevron, extra }: { icon: string; label: string; value: React.ReactNode; tone: Tone; active?: boolean; onClick?: () => void; chevron?: boolean; extra?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="sheet flex min-w-0 shrink-0 items-center gap-2.5 px-3 py-2.5 text-left transition hover:shadow-md @4xl:gap-3 @4xl:px-4 @4xl:py-3.5" style={active ? { background: tone.bg, borderColor: tone.fg } : undefined}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md @4xl:h-11 @4xl:w-11" style={{ background: active ? "#fff" : tone.bg, color: tone.fg }}><Icon n={icon} s={19} /></span>
      <span className="min-w-0 flex-1"><span className="t-small block whitespace-nowrap @4xl:whitespace-normal">{label}</span><span className="flex flex-wrap items-baseline gap-x-2"><span className="num whitespace-nowrap text-[22px] font-semibold leading-tight tracking-tight @4xl:text-[28px]">{value}</span>{extra}</span></span>
      {chevron && <span className="hidden text-muted @4xl:inline"><Icon n="chev" s={15} /></span>}
    </button>
  );
}

export function Alerts({ onOpen }: { onOpen?: (reportId: string) => void }) {
  const { s, me, mutate, now } = useApp();
  const list = s.alerts.filter((a) => a.userId === me!.id);
  return (
    <div className="mx-auto max-w-2xl p-4 @3xl:p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Alerts</h1><Btn sm v="ghost" onClick={() => mutate((st) => { st.alerts.forEach((a) => { if (a.userId === me!.id) a.read = true; }); })}>Mark all read</Btn></div>
      <div className="mt-3 space-y-2">{list.length === 0 && <Empty text="No alerts yet." />}
        {list.map((a) => (
          <button key={a.id} onClick={() => { mutate((st) => { const x = st.alerts.find((y) => y.id === a.id); if (x) x.read = true; }); if (a.reportId) onOpen?.(a.reportId); }} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${a.read ? "border-line bg-white" : "border-brand/30 bg-brand-soft"}`}>
            <span className="mt-0.5 text-brand"><Icon n="bell" s={16} /></span><div className="flex-1 text-sm">{a.text}<div className="text-xs text-muted">{ago(now - a.t)}</div></div>
          </button>
        ))}</div>
    </div>
  );
}
