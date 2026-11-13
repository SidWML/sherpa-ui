"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "../ui";
import { TagPicker } from "./PhotoTag";

type Status = "starting" | "live" | "blocked" | "not-found" | "busy" | "unsupported" | "failed";

const MESSAGE: Record<Exclude<Status, "live">, string> = {
  starting: "Starting the camera…",
  blocked: "Camera access is blocked. Allow the camera for this site in your browser settings and try again, or upload a photo instead.",
  "not-found": "No camera was found on this device. You can upload a photo instead.",
  busy: "Your camera is in use by another app. Close it and try again, or upload a photo instead.",
  unsupported: "This browser can't open the camera here. You can upload a photo instead.",
  failed: "The camera couldn't start. Try again, or upload a photo instead.",
};

const statusOf = (e: unknown): Status => {
  const n = (e as { name?: string } | null)?.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "blocked";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "not-found";
  if (n === "NotReadableError" || n === "AbortError") return "busy";
  return "failed";
};

/** Live camera over the chat. Each shot is previewed and optionally tagged, then goes to the same staging path as an uploaded photo. */
export function CameraPanel({ count, max = 6, tags, onAddTag, onShot, onUpload, onClose }: { count: number; max?: number; tags: string[]; onAddTag: (t: string) => void; onShot: (f: File, tag?: string) => void; onUpload: () => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [supported] = useState(() => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  const [status, setStatus] = useState<Status>(supported ? "starting" : "unsupported");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [several, setSeveral] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState<{ file: File; url: string; tag?: string } | null>(null);
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  useEffect(() => {
    if (!supported) return;
    let off = false; let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(async (s) => {
        if (off) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => undefined); }
        setStatus("live");
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!off) setSeveral(devices.filter((d) => d.kind === "videoinput").length > 1);
      })
      .catch((e) => { if (!off) setStatus(statusOf(e)); });
    return () => { off = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [supported, facing, attempt]);

  const full = count >= max;
  const shoot = () => {
    const v = video.current; if (!v || status !== "live" || full || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) setShot({ file: new File([b], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }), url: URL.createObjectURL(b) }); }, "image/jpeg", 0.92);
    setFlash(true); setTimeout(() => setFlash(false), 140);
  };
  const retry = () => { setStatus("starting"); setAttempt((n) => n + 1); };
  const live = status === "live";
  const use = () => { if (!shot) return; onShot(shot.file, shot.tag); setShot(null); };

  return (
    <div className="@container pop absolute inset-0 z-40 flex flex-col bg-zinc-950 text-white">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <button aria-label="Close camera" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md hover:bg-white/10"><Icon n="x" s={20} /></button>
        <div className="min-w-0 flex-1 text-center"><div className="text-[14px] font-semibold">Camera</div><div className="text-[12px] text-white/60">{count} of {max} photos</div></div>
        {several && live ? <button aria-label="Switch camera" onClick={() => { setStatus("starting"); setFacing((f) => (f === "environment" ? "user" : "environment")); }} className="grid h-10 w-10 place-items-center rounded-md hover:bg-white/10"><Icon n="swap" s={19} /></button> : <span className="w-10" />}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <video ref={video} playsInline muted className={`h-full w-full object-cover ${live ? "" : "invisible"}`} />
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {!live && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-xs text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/10">{status === "starting" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon n="camera" s={22} />}</span>
              <p className="mt-3 text-[14px] leading-relaxed text-white/85">{MESSAGE[status]}</p>
              {status !== "starting" && status !== "unsupported" && status !== "not-found" && <Button variant="outline" onClick={retry} className="mt-4 h-9 px-4 text-[13px] border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">Try again</Button>}
            </div>
          </div>
        )}
        {shot && (
          <div className="absolute inset-0 flex flex-col bg-zinc-950 @xl:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.url} alt="New photo" className="min-h-0 w-full flex-1 object-contain @xl:w-auto" />
            <div className="shrink-0 border-t border-white/10 p-4 @xl:w-72 @xl:border-l @xl:border-t-0"><TagPicker dark value={shot.tag} tags={tags} onChange={(t) => setShot({ ...shot, tag: t ?? undefined })} onAdd={onAddTag} /></div>
          </div>
        )}
        {live && full && <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-md bg-black/70 px-3 py-1.5 text-[12.5px]">{max} photos added. That is the limit.</div>}
      </div>

      {shot ? (
        <div className="flex shrink-0 justify-center gap-2 px-4 py-4">
          <Button variant="outline" onClick={() => setShot(null)} className="h-11 gap-2 px-4 text-[13.5px] border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Icon n="swap" s={15} />Retake</Button>
          <Button onClick={use} className="h-11 gap-2 px-5 text-[13.5px] font-semibold"><Icon n="check" s={15} w={2.4} />Use photo</Button>
        </div>
      ) : (
      <div className="grid shrink-0 grid-cols-3 items-center gap-2 px-4 py-4">
        <button onClick={onUpload} className={`justify-self-start rounded-md px-3 py-2.5 text-[13px] font-medium ${live ? "border border-white/30 hover:bg-white/10" : "bg-brand text-white hover:bg-brand-dark"}`}>Upload photo</button>
        <button aria-label="Take photo" onClick={shoot} disabled={!live || full} className="grid h-[68px] w-[68px] place-items-center justify-self-center rounded-full border-4 border-white/80 disabled:opacity-40"><span className="h-[52px] w-[52px] rounded-full bg-white transition active:scale-90" /></button>
        {count > 0 ? <button onClick={onClose} className="justify-self-end rounded-md bg-white px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-white/90">Done</button> : <span />}
      </div>
      )}
    </div>
  );
}
