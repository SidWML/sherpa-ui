"use client";
import { useState } from "react";
import { Provider, useApp } from "@/lib/store";
import type { Preset } from "@/lib/types";
import { ReporterApp } from "../reporter/ReporterApp";
import { DemoPanel } from "../Demo";
import { Atlas } from "../Atlas";
import { DeviceProvider, Phone, PreviewBar, useDevice } from "../Device";

function Inner() {
  const { me } = useApp();
  const [demo, setDemo] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [launch, setLaunch] = useState<Preset | null>(null);
  const device = useDevice("snaplead-device", "phone");
  if (!me) return null;
  const run = (p: Preset) => { setLaunch(p); setAtlas(false); };
  const app = <ReporterApp key={launch?.id ?? "r" + me.id} framed={device.phone} launch={launch} clearLaunch={() => setLaunch(null)} onDemo={() => setDemo(true)} />;
  return (
    <DeviceProvider value={device}>
      {device.phone ? <Phone below={<PreviewBar onRoles={() => setDemo(true)} />}>{app}</Phone> : app}
      {demo && <DemoPanel onClose={() => setDemo(false)} onAtlas={() => setAtlas(true)} />}
      {atlas && <Atlas onClose={() => setAtlas(false)} onRun={run} />}
    </DeviceProvider>
  );
}

export default function SnapRoot() {
  return <Provider app="snap"><Inner /></Provider>;
}
