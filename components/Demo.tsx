"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { APPS, ROLE_LABEL } from "@/lib/data";
import type { Role, User } from "@/lib/types";
import { Avatar, Btn, Icon } from "./ui";

const SHERPA_GROUPS: [string, Role[]][] = [
  ["Sales reps", ["ni", "ei", "sc", "mod"]],
  ["Management and support", ["mgr", "am", "ss", "mkt"]],
  ["Product", ["admin"]],
];

function RoleRow({ u, current, onPick }: { u: User; current: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} aria-current={current} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${current ? "bg-brand-soft" : "hover:bg-surface"}`}>
      <Avatar initials={u.initials} tone={current ? "brand" : "ink"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{u.name}</span>
        <span className="block truncate t-small">{u.title}</span>
      </span>
      {current ? <span className="text-brand"><Icon n="check" s={16} /></span> : <span className="text-muted"><Icon n="chev" s={14} /></span>}
    </button>
  );
}

function AppLink({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 transition hover:bg-surface">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-white"><Icon n={icon} s={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="block t-small">{sub}</span>
      </span>
      <span className="text-muted"><Icon n="chev" s={14} /></span>
    </Link>
  );
}

export function DemoPanel({ onClose, onAtlas }: { onClose: () => void; onAtlas?: () => void }) {
  const { app, reset, login, me } = useApp();
  const snap = app === "snap";
  const users = APPS[app].users;
  const groups: [string, User[]][] = snap
    ? [[ROLE_LABEL.reporter, users]]
    : SHERPA_GROUPS.map(([label, roles]) => [label, users.filter((u) => roles.includes(u.role))]);
  const pick = (id: string) => { login(id); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div><div className="text-base font-semibold">Switch role</div><div className="t-small">Prototype helper. Not part of the product.</div></div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-md border border-line hover:bg-surface"><Icon n="x" s={16} /></button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.filter(([, list]) => list.length).map(([label, list]) => (
            <section key={label}>
              <h2 className="t-label mb-1 px-2.5">{label}</h2>
              <div className="space-y-0.5">{list.map((u) => <RoleRow key={u.id} u={u} current={me?.id === u.id} onPick={() => pick(u.id)} />)}</div>
            </section>
          ))}
          <section className="px-0.5">
            <h2 className="t-label mb-1.5 px-2">{snap ? "Sales app" : "Lead generation"}</h2>
            {snap
              ? <AppLink href="/" icon="sparkle" title="Open SHERPA" sub="Sellers, managers and admin" />
              : <AppLink href="/snap" icon="camera" title="Open Snap & Lead" sub="Spot a lift and create a lead" />}
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line p-4">
          {onAtlas && <Btn v="soft" full onClick={() => { onAtlas(); onClose(); }}>Open the case atlas (145 cases)</Btn>}
          <Btn v="ghost" full onClick={() => { if (confirm("Reset all demo data to the starting set?")) { reset(); onClose(); } }}>Reset demo data</Btn>
        </div>
      </div>
    </div>
  );
}
