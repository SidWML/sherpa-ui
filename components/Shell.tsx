"use client";
import { useState, type ReactNode } from "react";
import { useApp, pointsOf } from "@/lib/store";
import { gameOf } from "@/lib/game";
import { LEVELS, ROLE_LABEL } from "@/lib/data";
import { Avatar, Icon, Logo, Pill } from "./ui";
import { SCREEN, useDeviceSwitch } from "./Device";

export interface NavItem { id: string; label: string; icon: string; badge?: number; narrowOnly?: boolean; inBell?: boolean }

export function levelOf(pts: number) {
  let i = 0; LEVELS.forEach((l, k) => { if (pts >= l.from) i = k; });
  const next = LEVELS[i + 1];
  return { name: LEVELS[i].name, next, pct: next ? Math.min(100, ((pts - LEVELS[i].from) / (next.from - LEVELS[i].from)) * 100) : 100 };
}

export function StatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between bg-white pl-[42px] pr-[30px] pt-1 text-[15px] font-semibold" style={{ height: SCREEN.statusBar }}>
      <span>9:41</span>
      <span className="flex items-center gap-1.5"><Icon n="wifi" s={14} /><svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="3" fill="none" stroke="currentColor" opacity=".5" /><rect x="2" y="2" width="14" height="7" rx="1.8" fill="currentColor" /><rect x="19.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity=".5" /></svg></span>
    </div>
  );
}

export function Shell({ nav, view, setView, children, onDemo, framed }: { nav: NavItem[]; view: string; setView: (v: string) => void; children: ReactNode; onDemo: () => void; framed?: boolean }) {
  const { s, me, setOffline } = useApp();
  const [menu, setMenu] = useState(false);
  const device = useDeviceSwitch();
  if (!me) return null;
  const unread = s.alerts.filter((a) => a.userId === me.id && !a.read).length;
  const pts = me.role === "reporter" ? pointsOf(s, me.id).confirmed : null;
  const xp = me.role !== "reporter" && me.role !== "admin" ? gameOf(s, me.id).xp : null;

  return (
    <div className={`@container flex w-full flex-col bg-surface ${framed ? "h-full" : "h-dvh"}`}>
      {framed && <StatusBar />}
      {s.offline && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 bg-ink px-3 py-1.5 text-center text-xs font-medium text-white">
          <Icon n="wifi" s={14} /> Offline. Leads are saved and sent when signal returns.
          <button onClick={() => setOffline(false)} className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">Go online</button>
        </div>
      )}
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 @3xl:px-5">
        <Logo />
        <div className="hidden flex-1 @3xl:block">
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted"><Icon n="search" s={16} /> Search leads, lift numbers…</div>
        </div>
        <div className="flex-1 @3xl:hidden" />
        {!framed && <button onClick={onDemo} className="hidden rounded-xl border border-dashed border-brand/50 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand @xl:block">Demo controls</button>}
        {xp !== null && <button onClick={() => setView("me")} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold"><span className="text-brand"><Icon n="star" s={14} /></span>{xp} XP</button>}
        {pts !== null && <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold"><span className="text-brand"><Icon n="star" s={14} /></span>{pts} pts</div>}
        <button aria-label="Alerts" onClick={() => setView("alerts")} className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white">
          <Icon n="bell" s={17} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{unread}</span>}
        </button>
        <div className="relative shrink-0">
          <button onClick={() => setMenu(!menu)} aria-label="Account"><Avatar initials={me.initials} /></button>
          {menu && (
            <div className="absolute right-0 top-11 z-40 w-64 rounded-2xl border border-line bg-white p-3 shadow-xl pop">
              <div className="text-sm font-semibold">{me.name}</div>
              <div className="text-xs text-muted">{me.title}</div>
              <div className="mt-1"><Pill tone="red">{ROLE_LABEL[me.role]}</Pill></div>
              <button onClick={() => { setMenu(false); onDemo(); }} className="mt-3 flex w-full items-center gap-2 rounded-lg bg-surface px-3 py-2 text-left text-sm font-medium"><Icon n="swap" s={15} /> Switch role</button>
              {device && <button onClick={() => { setMenu(false); device.set(device.dev === "phone" ? "desktop" : "phone"); }} className="mt-2 flex w-full items-center gap-2 rounded-lg bg-surface px-3 py-2 text-left text-sm font-medium"><Icon n="phone" s={15} /> {device.dev === "phone" ? "Desktop view" : "Phone view"}</button>}
            </div>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-white p-3 @3xl:flex">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === n.id ? "bg-brand-soft font-semibold text-brand" : "font-medium text-ink/75 hover:bg-surface"}`}>
              <Icon n={n.icon} s={18} />{n.label}
              {n.badge ? <span className="ml-auto rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{n.badge}</span> : null}
            </button>
          ))}
          <div className="mt-auto rounded-xl bg-surface p-3 text-[11px] leading-snug text-muted">Signed in as <b className="text-ink">{ROLE_LABEL[me.role]}</b> through single sign-on. You only see what this role may see.</div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden scroll-thin">{children}</main>
      </div>
      <nav className={`flex shrink-0 overflow-x-auto border-t border-line bg-white @3xl:hidden ${framed ? "pb-[34px]" : ""}`}>
        {nav.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} className={`relative flex min-w-16 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10.5px] font-medium ${view === n.id ? "text-brand" : "text-muted"}`}>
            <Icon n={n.icon} s={20} />{n.label}
            {n.badge ? <span className="absolute right-3 top-1 rounded-full bg-brand px-1 text-[9px] font-bold text-white">{n.badge}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
