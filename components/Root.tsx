"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Provider, useApp } from "@/lib/store";
import { ROLE_LABEL, USERS } from "@/lib/data";
import type { Preset } from "@/lib/types";
import { ReporterApp } from "./reporter/ReporterApp";
import { DeskApp } from "./desk/Desks";
import { DemoPanel } from "./Demo";
import { Atlas } from "./Atlas";
import { Avatar, Btn, Card, Icon, Logo, Pill } from "./ui";

function Login({ onDemo, onAtlas }: { onDemo: () => void; onAtlas: () => void }) {
  const { login } = useApp();
  const groups: [string, string[]][] = [
    ["Lead generator · standalone Snap & Lead app", ["reporter"]],
    ["Sellers and sales support · SHERPA", ["ni", "ei", "sc", "mod", "ss", "am", "mkt", "mgr"]],
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fbf3f4]">
      <header className="flex items-center justify-between px-5 py-4"><Logo /><div className="flex gap-2"><Btn sm v="ghost" onClick={onAtlas}>Case atlas</Btn><Btn sm v="soft" onClick={onDemo}>Demo controls</Btn></div></header>
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-6">
        <Pill tone="red">Proof of concept · Hyderabad and Telangana · mock AI and data</Pill>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight">SHERPA: one AI front door for every Schindler seller.</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">A working model of the whole product with mock agents and a mock NewCRM, set in Hyderabad and Telangana. Sign in as any of the 8 sales personas, or as the lead generator, who uses the separate Snap & Lead app. A lead from Snap & Lead becomes an opportunity for the right owner. Next Best Actions appear on each persona&apos;s Today page, the chat does the work with a human approving, and Snap & Lead sightings flow into the same system.</p>
        <div className="mt-5 flex flex-wrap gap-3 text-[13px]">
          {["Sign in as Eshwar (EI rep) and snap a new building in Hyderabad", "Then sign in as Naveen (NI rep), Shalini (Sales support) and Madhav (manager)", "Use Demo controls to jump the clock and see idle quotes appear"].map((t, i) => <div key={t} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-line"><span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">{i + 1}</span>{t}</div>)}
        </div>
        <div className="mt-8 space-y-7">
          {groups.map(([g, roles]) => (
            <div key={g}><h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{g}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {USERS.filter((u) => roles.includes(u.role) && !u.hidden).map((u) => (
                  <button key={u.id} onClick={() => login(u.id)} className="text-left"><Card className="h-full p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3"><Avatar initials={u.initials} tone={u.role === "reporter" ? "brand" : "ink"} /><div><div className="text-sm font-bold">{u.name}</div><div className="text-xs text-muted">{ROLE_LABEL[u.role]}</div></div><span className="ml-auto text-muted"><Icon n="chev" s={16} /></span></div>
                    <p className="mt-2 text-[12.5px] leading-snug text-muted">{u.blurb}</p></Card></button>
                ))}
              </div></div>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted"><button onClick={() => login("admin")} className="font-semibold underline">Admin sign-in</button> for the NBA catalogue, agent registry and write-back log. Single sign-on is simulated. Data is stored in this browser only. Nothing is sent anywhere.</p>
      </div>
    </div>
  );
}

const subNarrow = (cb: () => void) => { const m = window.matchMedia("(max-width: 640px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useNarrow = () => useSyncExternalStore(subNarrow, () => window.matchMedia("(max-width: 640px)").matches, () => false);

/** Device mockup: a phone-sized screen. Its transform keeps fixed overlays (sheets, toasts) inside the screen. */
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-rose-100 p-4">
      <div className="relative shrink-0 rounded-[56px] bg-zinc-900 p-3 shadow-[0_30px_80px_rgba(0,0,0,.35)] ring-2 ring-zinc-700" style={{ width: 414, height: "min(884px, calc(100dvh - 32px))" }}>
        <div className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-zinc-700" /><div className="absolute -left-[3px] top-44 h-14 w-[3px] rounded-l bg-zinc-700" /><div className="absolute -right-[3px] top-40 h-20 w-[3px] rounded-r bg-zinc-700" />
        <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-white" style={{ transform: "translateZ(0)" }}>
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-[60] h-[26px] w-24 -translate-x-1/2 rounded-full bg-black" />
          {children}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-[60] h-1 w-32 -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      </div>
    </div>
  );
}

function Inner() {
  const { me, login } = useApp();
  useEffect(() => { if (me?.hidden) login(null); }, [me, login]);
  const [demo, setDemo] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [launch, setLaunch] = useState<Preset | null>(null);
  const narrow = useNarrow();
  const [devSaved, setDevS] = useState<"phone" | "desktop" | null>(() => { try { const v = localStorage.getItem("snaplead-device"); return v === "desktop" || v === "phone" ? v : null; } catch { return null; } });
  const dev = devSaved ?? (me && ["ni", "ei", "sc", "mod", "reporter"].includes(me.role) ? "phone" : "desktop");
  const setDev = (d: "phone" | "desktop") => { setDevS(d); try { localStorage.setItem("snaplead-device", d); } catch { /* ignore */ } };
  const phone = !!me && !narrow && dev === "phone";
  const run = (p: Preset) => { setLaunch(p); setAtlas(false); login("ethan"); };
  return (
    <>
      {!me ? <Login onDemo={() => setDemo(true)} onAtlas={() => setAtlas(true)} /> : me.role === "reporter" ? (() => { const app = <ReporterApp key={launch?.id ?? "r" + me.id} framed={phone} launch={launch} clearLaunch={() => setLaunch(null)} onDemo={() => setDemo(true)} />; return phone ? <Phone>{app}</Phone> : app; })() : (() => { const app = <DeskApp key={me.id} framed={phone} onDemo={() => setDemo(true)} />; return phone ? <Phone>{app}</Phone> : app; })()}
      {me && !narrow && (
        <div className="fixed bottom-24 left-3 z-40 flex items-center gap-0.5 rounded-full bg-ink p-1 text-[11px] font-semibold text-white shadow-xl">
          {(["phone", "desktop"] as const).map((d) => <button key={d} onClick={() => setDev(d)} className={`rounded-full px-3 py-1.5 ${dev === d ? "bg-white text-ink" : "text-white/80"}`}>{d === "phone" ? "Phone" : "Desktop"}</button>)}
          <button onClick={() => setDemo(true)} className="rounded-full bg-brand px-3 py-1.5 text-white">Demo</button>
        </div>
      )}
      {demo && <DemoPanel onClose={() => setDemo(false)} onAtlas={() => setAtlas(true)} />}
      {atlas && <Atlas onClose={() => setAtlas(false)} onRun={run} />}
    </>
  );
}

export default function Root() {
  return <Provider><Inner /></Provider>;
}
