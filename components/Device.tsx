"use client";
import { createContext, useContext, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { PortalRoot } from "@/lib/portal";

type Device = "phone" | "desktop";

const subNarrow = (cb: () => void) => { const m = window.matchMedia("(max-width: 640px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useNarrow = () => useSyncExternalStore(subNarrow, () => window.matchMedia("(max-width: 640px)").matches, () => false);

/** Phone or desktop preview, remembered per app. On a real phone the app always fills the screen. */
export function useDevice(storeKey: string, fallback: Device) {
  const narrow = useNarrow();
  const [saved, setSaved] = useState<Device | null>(() => { try { const v = localStorage.getItem(storeKey); return v === "desktop" || v === "phone" ? v : null; } catch { return null; } });
  const dev = saved ?? fallback;
  const set = (d: Device) => { setSaved(d); try { localStorage.setItem(storeKey, d); } catch { /* ignore */ } };
  return { dev, set, narrow, phone: !narrow && dev === "phone" };
}

const DeviceCtx = createContext<ReturnType<typeof useDevice> | null>(null);
export const DeviceProvider = DeviceCtx.Provider;
/** Null on a real phone, where there is no preview to switch. */
export function useDeviceSwitch() {
  const d = useContext(DeviceCtx);
  return d && !d.narrow ? d : null;
}

/** iPhone 15 / 16, in points: the screen a layout really gets. */
export const SCREEN = { w: 393, h: 852, radius: 55, statusBar: 54, homeArea: 34 };
const BEZEL = 12;
const DEVICE = { w: SCREEN.w + BEZEL * 2, h: SCREEN.h + BEZEL * 2 };
const ROOM = 92;

const subResize = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
const useViewportHeight = () => useSyncExternalStore(subResize, () => window.innerHeight, () => DEVICE.h + ROOM);

/** The real screen size, scaled down as a whole when the window is shorter, so its proportions never change.
 *  The screen's transform keeps fixed overlays (sheets, toasts) inside it. */
export function Phone({ children, below }: { children: ReactNode; below?: ReactNode }) {
  const scale = Math.min(1, Math.max(0.4, (useViewportHeight() - ROOM) / DEVICE.h));
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-200 via-zinc-100 to-rose-100 p-4">
      <div className="relative shrink-0" style={{ width: DEVICE.w * scale, height: DEVICE.h * scale }}>
        <div className="absolute left-0 top-0 origin-top-left rounded-[67px] bg-zinc-900 shadow-[0_30px_80px_rgba(0,0,0,.35)] ring-2 ring-zinc-700" style={{ width: DEVICE.w, height: DEVICE.h, padding: BEZEL, transform: `scale(${scale})` }}>
          <div className="absolute -left-[3px] top-[180px] h-8 w-[3px] rounded-l bg-zinc-700" /><div className="absolute -left-[3px] top-[240px] h-16 w-[3px] rounded-l bg-zinc-700" /><div className="absolute -left-[3px] top-[320px] h-16 w-[3px] rounded-l bg-zinc-700" /><div className="absolute -right-[3px] top-[270px] h-24 w-[3px] rounded-r bg-zinc-700" />
          <div ref={setScreen} className="relative h-full w-full overflow-hidden bg-white" style={{ borderRadius: SCREEN.radius, transform: "translateZ(0)", "--safe-top": `${SCREEN.statusBar}px`, "--safe-bottom": `${SCREEN.homeArea}px` } as CSSProperties}>
            <div className="pointer-events-none absolute left-1/2 top-[11px] z-[60] h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
            <PortalRoot.Provider value={screen}>{children}</PortalRoot.Provider>
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-[60] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/80" />
          </div>
        </div>
      </div>
      {below}
    </div>
  );
}

/** Sits under the phone preview. On desktop the same choices live in the account menu. */
export function PreviewBar({ onRoles }: { onRoles: () => void }) {
  const d = useDeviceSwitch();
  if (!d) return null;
  const seg = (v: Device, label: string) => (
    <button onClick={() => d.set(v)} aria-pressed={d.dev === v} className={`rounded px-2.5 py-1 ${d.dev === v ? "bg-surface font-semibold text-ink" : "text-muted hover:text-ink"}`}>{label}</button>
  );
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1 text-[12px]">
      {seg("phone", "Phone")}{seg("desktop", "Desktop")}
      <span className="mx-1 h-4 w-px bg-line" />
      <button onClick={onRoles} className="rounded px-2.5 py-1 font-medium text-ink/80 hover:bg-surface hover:text-ink">Switch role</button>
    </div>
  );
}
