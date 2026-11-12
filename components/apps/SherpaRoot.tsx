"use client";
import { useState } from "react";
import { Provider, useApp } from "@/lib/store";
import { DeskApp } from "../desk/Desks";
import { DemoPanel } from "../Demo";
import { DeviceProvider, Phone, PreviewBar, useDevice } from "../Device";

const PHONE_ROLES = ["ni", "ei", "sc", "mod"];

function Inner() {
  const { me } = useApp();
  const [demo, setDemo] = useState(false);
  const device = useDevice("sherpa-device", me && PHONE_ROLES.includes(me.role) ? "phone" : "desktop");
  if (!me) return null;
  const app = <DeskApp key={me.id} framed={device.phone} onDemo={() => setDemo(true)} />;
  return (
    <DeviceProvider value={device}>
      {device.phone ? <Phone below={<PreviewBar onRoles={() => setDemo(true)} />}>{app}</Phone> : app}
      {demo && <DemoPanel onClose={() => setDemo(false)} />}
    </DeviceProvider>
  );
}

export default function SherpaRoot() {
  return <Provider app="sherpa"><Inner /></Provider>;
}
