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
  /* the side chat can be dragged wider or narrower; the choice is remembered on this device */
  const [sideW, setSideW] = useState(432); const [drag, setDrag] = useState(false);
  useEffect(() => { try { const v = Number(localStorage.getItem("sherpa.sideW")); if (v >= 320) setSideW(v); } catch { /* storage can be blocked */ } }, []);
  const clampW = (w: number) => Math.round(Math.max(320, Math.min(w, Math.max(320, (root.current?.clientWidth ?? 1400) - 560))));
  const saveW = (w: number) => { try { localStorage.setItem("sherpa.sideW", String(w)); } catch { /* ignore */ } };
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault(); setDrag(true);
    const move = (ev: PointerEvent) => { const r = root.current?.getBoundingClientRect(); if (r) setSideW(clampW(r.right - ev.clientX)); };
    const up = (ev: PointerEvent) => { const r = root.current?.getBoundingClientRect(); if (r) saveW(clampW(r.right - ev.clientX)); setDrag(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const nudge = (e: React.KeyboardEvent) => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); const w = clampW(sideW + (e.key === "ArrowLeft" ? 32 : -32)); setSideW(w); saveW(w); };
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
    <div ref={root} className={`@container flex w-full flex-col bg-surface ${framed ? "h-full" : "h-dvh"} ${drag ? "select-none cursor-col-resize" : ""}`}>
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
        {wide && side && <aside style={{ width: clampW(sideW) }} className="relative flex shrink-0 flex-col border-l border-line bg-white">
          <div role="separator" aria-orientation="vertical" aria-label="Resize the chat. Drag, or use the left and right arrow keys." tabIndex={0} onPointerDown={startDrag} onKeyDown={nudge} onDoubleClick={() => { setSideW(432); saveW(432); }} title="Drag to resize · double-click to reset" className="group absolute -left-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize items-center justify-center outline-none">
            <span className={`h-full w-0.5 transition ${drag ? "bg-brand" : "bg-transparent group-hover:bg-brand/60 group-focus-visible:bg-brand"}`} />
            <span className={`absolute top-1/2 grid h-10 w-3.5 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-[8px] leading-none text-muted shadow-sm transition ${drag ? "border-brand text-brand" : "group-hover:border-brand/60"}`}>⋮</span>
          </div>
          {side}
        </aside>}
      </div>
      {framed && <div className="shrink-0 bg-surface" style={{ height: SCREEN.homeArea }} />}
    </div>
  );
}
