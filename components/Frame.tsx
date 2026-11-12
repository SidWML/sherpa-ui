"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { gameOf } from "@/lib/game";
import { ROLE_LABEL } from "@/lib/data";
import { Avatar, Icon, Pill } from "./ui";
import { StatusBar, type NavItem } from "./Shell";
import { SCREEN, useDeviceSwitch } from "./Device";

/**
 * The app frame for every agent inside Schindler AI.
 * Header: back to the platform home, agent name, XP, alerts, account.
 * Below it: one row of tabs. Same on phone and desktop.
 */
export function Frame({ agent, sub = "Sales Transformation Hub", icon = "sparkle", tabs, view, setView, onDemo, framed, side, onWide, actions, xp: showXp = true, children }: {
  agent: string; sub?: string; icon?: string; tabs: NavItem[]; view: string; setView: (v: string) => void; onDemo: () => void; framed?: boolean;
  /** Fixed panel on the right, shown on wide screens whichever tab is open. */
  side?: ReactNode; onWide?: (wide: boolean) => void; xp?: boolean;
  /** Extra header buttons, placed before the alerts bell. */
  actions?: ReactNode; children: ReactNode | ((wide: boolean) => ReactNode);
}) {
  const { s, me } = useApp();
  const device = useDeviceSwitch();
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null); const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = root.current; if (!el) return;
    const ro = new ResizeObserver(() => { const w = el.clientWidth >= 1180; setWide(w); onWide?.(w); }); ro.observe(el);
    return () => ro.disconnect();
  }, [onWide]);
  if (!me) return null;
  const unread = s.alerts.filter((a) => a.userId === me.id && !a.read).length;
  const xp = gameOf(s, me.id).xp;
  const shown = tabs.filter((t) => !(wide && t.narrowOnly));
  return (
    <div ref={root} className={`@container flex w-full flex-col bg-surface ${framed ? "h-full" : "h-dvh"}`}>
      {framed && <StatusBar />}
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-3 @3xl:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand text-white"><Icon n={icon} s={15} /></span>
          <span className="truncate text-[16px] font-semibold tracking-tight">{agent}</span>
          <span className="hidden h-4 w-px bg-line @xl:block" />
          <span className="hidden text-[12.5px] text-muted @xl:block">{sub}</span>
        </div>
        <div className="flex-1" />
        {showXp && <button onClick={() => setView("me")} className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-surface"><span className="text-brand"><Icon n="star" s={13} /></span><span className="num">{xp}</span><span className="hidden text-muted @xl:inline">XP</span></button>}
        {actions}
        <button aria-label="Alerts" onClick={() => setView("alerts")} className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line hover:bg-surface">
          <Icon n="bell" s={16} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{unread}</span>}
        </button>
        <div className="relative shrink-0">
          <button onClick={() => setMenu(!menu)} aria-label="Account"><Avatar initials={me.initials} /></button>
          {menu && (
            <div className="float pop absolute right-0 top-11 z-40 w-64 rounded-lg border border-line bg-white p-3">
              <div className="text-sm font-semibold">{me.name}</div>
              <div className="t-small">{me.title}</div>
              <div className="mt-1.5"><Pill tone="red">{ROLE_LABEL[me.role]}</Pill></div>
              <button onClick={() => { setMenu(false); onDemo(); }} className="mt-3 flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-left text-[13px] font-medium hover:bg-surface"><Icon n="swap" s={14} /> Switch role</button>
              {device && <button onClick={() => { setMenu(false); device.set(device.dev === "phone" ? "desktop" : "phone"); }} className="mt-2 flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-left text-[13px] font-medium hover:bg-surface"><Icon n="phone" s={14} /> {device.dev === "phone" ? "Desktop view" : "Phone view"}</button>}
            </div>
          )}
        </div>
      </header>
      {shown.length > 1 && <nav className="scroll-hide flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-white px-2 @3xl:px-4">
        {shown.map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} className={`relative shrink-0 items-center gap-2 px-2.5 py-3 text-[13.5px] transition @xl:px-3 ${t.inBell ? "hidden @xl:flex" : "flex"} ${view === t.id ? "font-semibold text-brand" : "font-medium text-ink/70 hover:text-ink"}`}>
            {t.label}
            {t.badge ? <span className="num rounded-full bg-surface px-1.5 text-[11px] font-semibold text-ink/70">{t.badge}</span> : null}
            {view === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </nav>}
      <div className="flex min-h-0 flex-1">
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">{typeof children === "function" ? children(wide) : children}</main>
        {wide && side && <aside className="relative flex w-[27rem] shrink-0 flex-col border-l border-line bg-white">{side}</aside>}
      </div>
      {framed && <div className="shrink-0 bg-surface" style={{ height: SCREEN.homeArea }} />}
    </div>
  );
}
