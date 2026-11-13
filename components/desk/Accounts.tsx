"use client";
import { Choice, Input, Textarea } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { USERS } from "@/lib/data";
import { AC, LINES, accountView, accountsFor } from "@/lib/accounts";
import { AREA_NAME, KIND_LABEL, NAMES, STAGES, inr, inrShort } from "@/lib/sherpa";
import type { Account, Opp } from "@/lib/types";
import { Btn, Card, Empty, Icon, Pill, ago } from "../ui";
import { Drawer, Stat2, StatRow, T } from "../shared";
import { Label } from "./Action";
import { Page } from "./Common";
import { ContractPill } from "./Contract";
import { Why } from "../Why";
import { unitHealth } from "@/lib/scores";

const touched = (a: Account) => Math.max(a.lastActivity, a.activity?.[a.activity.length - 1]?.t ?? 0);
const healthTone = (h: number) => (h < 45 ? T.red : h < 70 ? T.gold : T.green);

function Health({ h }: { h: number }) {
  const t = healthTone(h);
  return <span className="inline-flex items-center gap-2"><span className="block h-1.5 w-8 overflow-hidden rounded-sm bg-line @md:w-16"><span className="block h-full rounded-sm" style={{ width: `${h}%`, background: t.fg }} /></span><span className="num text-[13px] font-semibold" style={{ color: t.fg }}>{h}</span></span>;
}

export function Accounts({ openOpp, openOffer }: { openOpp: (id: string) => void; openOffer: (id: string) => void }) {
  const { s, me, now } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "key" | "risk" | "ending">("all");
  const list = accountsFor(s, me!);
  const views = list.map((a) => ({ a, v: accountView(s, a) }));
  const cur = views.find((x) => x.a.id === openId);
  const rows = views.filter(({ a, v }) => filter === "all" || (filter === "key" ? a.key : filter === "risk" ? v.health < 50 : v.ending.length > 0)).sort((x, y) => touched(y.a) - touched(x.a));
  const actions = s.sherpa.tasks.filter((t) => !t.done && t.forUser === me!.id && t.kind === "accountAction").sort((a, b) => b.createdAt - a.createdAt);
  const all = ["am", "mgr", "lead", "admin"].includes(me!.role);
  return (
    <Page title={all ? "Accounts" : "My accounts"} sub={all ? "Every customer: their lifts, contracts, open deals and health. Plan the key accounts and raise new opportunities." : "Customers whose lifts or deals you look after."}>
      <StatRow>
        <Stat2 icon="users" label="Accounts" value={views.length} tone={T.blue} active={filter === "all"} onClick={() => setFilter("all")} />
        <Stat2 icon="star" label="Key accounts" value={views.filter((x) => x.a.key).length} tone={T.purple} active={filter === "key"} onClick={() => setFilter("key")} />
        <Stat2 icon="warn" label="Health below 50" value={views.filter((x) => x.v.health < 50).length} tone={T.red} active={filter === "risk"} onClick={() => setFilter("risk")} />
        <Stat2 icon="clock" label="Contract ending in 90 days" value={views.filter((x) => x.v.ending.length).length} tone={T.orange} active={filter === "ending"} onClick={() => setFilter("ending")} />
        <Stat2 icon="chart" label="Yearly service value" value={inrShort(views.reduce((t, x) => t + x.v.annual, 0))} tone={T.green} />
      </StatRow>
      {actions.length > 0 && (
        <div className="mt-5">
          <div className="t-label mb-2">Your account actions</div>
          <div className="space-y-2">{actions.map((t) => (
            <button key={t.id} onClick={() => t.accountId && setOpenId(t.accountId)} className="sheet flex w-full items-center gap-3 p-3.5 text-left hover:bg-surface">
              <Icon n="flag" s={15} /><span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{t.title}</span><span className="block text-xs text-muted">{t.due < now ? "Overdue" : `Due in ${Math.max(0, Math.round((t.due - now) / 86400000))} days`} · from {NAMES[t.by] ?? t.by}</span></span><Icon n="chev" s={14} />
            </button>))}</div>
        </div>
      )}
      <div className="mt-5 space-y-2.5">
        {rows.length === 0 && <Empty text="No accounts in this filter." />}
        {rows.map(({ a, v }) => (
          <button key={a.id} onClick={() => setOpenId(a.id)} className="sheet group flex w-full flex-col gap-3 p-4 text-left hover:bg-surface @2xl:flex-row @2xl:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">{a.key && <Pill tone="amber">Key account</Pill>}<span className="text-xs text-muted">{AREA_NAME[a.area] ?? a.area} · {NAMES[a.owner] ?? a.owner}</span></div>
              <div className="mt-1 truncate text-[15px] font-semibold">{a.name}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">{(Object.keys(LINES) as (keyof Account["lines"])[]).map((k) => <span key={k} className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${a.lines[k] ? "bg-emerald-50 text-emerald-800" : "bg-surface text-muted line-through"}`}>{LINES[k].team}</span>)}</div>
            </div>
            <div className="grid shrink-0 grid-cols-4 gap-3 text-[12px] text-muted @2xl:w-[26rem]">
              <div><div className="mb-1">Health</div><Why title="Account health" e={v.healthWhy}><Health h={v.health} /></Why></div>
              <div><div className="mb-1">Lifts</div><b className="num text-[13px] text-ink">{v.units.length}</b></div>
              <div><div className="mb-1">Open deals</div><b className="num text-[13px] text-ink">{v.open.length}</b></div>
              <div><div className="mb-1">Last contact</div><b className={`text-[13px] ${v.silentDays >= 60 ? "text-brand" : "text-ink"}`}>{v.silentDays} d</b></div>
            </div>
            <span className="hidden text-muted transition group-hover:translate-x-0.5 @2xl:block"><Icon n="chev" s={16} /></span>
          </button>
        ))}
      </div>
      {cur && <Drawer wide label={cur.a.key ? "Key account" : "Account"} title={cur.a.name} onClose={() => setOpenId(null)}><AccountPage a={cur.a} openOpp={openOpp} openOffer={openOffer} /></Drawer>}
    </Page>
  );
}

function AccountPage({ a, openOpp, openOffer }: { a: Account; openOpp: (id: string) => void; openOffer: (id: string) => void }) {
  const { s, me, now, mutate } = useApp();
  const v = accountView(s, a); const by = me!.id;
  const canPlan = ["am", "mgr", "lead"].includes(me!.role) || a.owner === by;
  const [raised, setRaised] = useState<string[]>([]);
  const stage = (o: Opp) => STAGES.find((x) => x[0] === o.stage)?.[1] ?? o.stage;
  return (
    <div className="p-4 @2xl:p-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5">{a.key && <Pill tone="amber">Key account</Pill>}<Pill>{AREA_NAME[a.area] ?? a.area}</Pill><span className="text-xs text-muted">Account owner {NAMES[a.owner] ?? a.owner}</span></div>
        <p className="mt-2 text-sm text-muted">{a.contact.name}, {a.contact.role} · {a.contact.email} · last contact {ago(now - a.lastActivity)}</p>
      </header>
      <StatRow>
        <Stat2 icon="shield" label="Health" value={<Why title="Account health" e={v.healthWhy}>{v.health}</Why>} tone={healthTone(v.health)} />
        <Stat2 icon="layers" label="Lifts" value={v.units.length} tone={T.blue} />
        <Stat2 icon="chart" label="Yearly service value" value={inrShort(v.annual)} tone={T.green} />
        <Stat2 icon="bolt" label="Open pipeline" value={inrShort(v.pipeline)} tone={T.purple} />
      </StatRow>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="border-brand/25 p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Next best actions</div>
            <p className="mt-1 text-[13px] text-muted">From the lifts, the contracts and what the account does not buy yet. Raising one sends it to {NAMES.marc} for review, like any lead.</p>
            <ul className="mt-3 space-y-2">{v.next.length === 0 && <li className="text-sm text-muted">Nothing stands out. The account is in good shape.</li>}
              {v.next.map((n) => { const done = raised.includes(n.title); return (
                <li key={n.title} className="flex flex-col gap-2 rounded-xl border border-line p-3 @xl:flex-row @xl:items-center">
                  <span className="min-w-0 flex-1 text-[13.5px]"><b>{n.title}</b><span className="block text-xs text-muted">{n.why}</span></span>
                  {done ? <Pill tone="green">{n.kind ? "Sent for review" : "Added to the plan"}</Pill> : <Btn sm v="ghost" onClick={() => { const kind = n.kind; mutate((st) => { if (kind) AC.raise(st, a.id, by, kind, n.title); else AC.addAction(st, a.id, by, n.title.split(":")[0], by, 2); }); setRaised((r) => [...r, n.title]); }}>{n.kind ? "Raise for review" : "Add to my plan"}</Btn>}
                </li>); })}</ul>
          </Card>
          <Card className="p-5">
            <Label>Lines of business</Label>
            <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">{(Object.keys(LINES) as (keyof Account["lines"])[]).map((k) => <div key={k} className={`rounded-xl p-3 text-[13px] ${a.lines[k] ? "bg-emerald-50 text-emerald-900" : "border border-dashed border-line text-muted"}`}><b>{LINES[k].label}</b><span className="block text-xs">{a.lines[k] ? "Active" : "White space"}</span></div>)}</div>
          </Card>
          <Card className="p-5">
            <Label>Lifts</Label>
            {v.units.length === 0 ? <div className="text-sm text-muted">No lifts in the installed base yet.</div> :
              <div className="divide-y divide-line/70 rounded-xl border border-line text-[13px]">{v.units.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                  <span className="min-w-0 flex-1"><b>{u.label}</b><span className="block text-xs text-muted">{u.model} · {u.ageYears} years · {u.brand === "ours" ? "Schindler" : "other brand"} · serviced by {u.servicer}</span></span>
                  <span className="text-xs text-muted">{u.contractEnd ? `Contract to ${new Date(u.contractEnd).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : "No contract"}</span>
                  <Why title="Lift health" e={unitHealth(u)}><Health h={u.health} /></Why>
                </div>))}</div>}
          </Card>
          <Card className="p-5">
            <Label>Deals and contracts</Label>
            <div className="space-y-2">
              {v.contracts.map((c) => <button key={c.id} onClick={() => openOffer(c.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left text-[13.5px] hover:bg-surface"><span className="min-w-0"><b>{c.id} · {c.title}</b><span className="block text-xs text-muted">{inr(c.value)} · starts {new Date(c.start).toLocaleDateString("en-IN")}</span></span><ContractPill c={c} /></button>)}
              {v.opps.map((o) => <button key={o.id} onClick={() => openOpp(o.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left text-[13.5px] hover:bg-surface"><span className="min-w-0"><b>{o.id} · {o.title}</b><span className="block text-xs text-muted">{KIND_LABEL[o.kind]} · owner {NAMES[o.owner] ?? o.owner}{o.value ? ` · ${inr(o.value)}` : ""}</span></span><Pill tone={o.stage === "won" ? "green" : "gray"}>{stage(o)}</Pill></button>)}
              {v.contracts.length + v.opps.length === 0 && <div className="text-sm text-muted">No deals yet.</div>}
            </div>
          </Card>
          <Activity a={a} />
        </div>
        <div className="space-y-5 @4xl:sticky @4xl:top-4">
          <Plan a={a} canPlan={canPlan} />
          <Contacts a={a} />
        </div>
      </div>
    </div>
  );
}

function Plan({ a, canPlan }: { a: Account; canPlan: boolean }) {
  const { me, now, mutate } = useApp();
  const [goal, setGoal] = useState(a.plan?.goal ?? ""); const [editing, setEditing] = useState(!a.plan?.goal);
  const [text, setText] = useState(""); const [owner, setOwner] = useState(me!.id); const [days, setDays] = useState("7");
  const people = USERS.filter((u) => !u.hidden && ["am", "ei", "sc", "mod", "ni", "mgr"].includes(u.role));
  return (
    <Card className="p-5">
      <Label>Account plan</Label>
      {editing && canPlan ? (
        <form onSubmit={(e) => { e.preventDefault(); mutate((st) => AC.setGoal(st, a.id, me!.id, goal)); setEditing(false); }} className="space-y-2">
          <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What do we want from this account this year?" aria-label="Plan goal" className="min-h-20" />
          <Btn sm type="submit" disabled={!goal.trim()}>Save the goal</Btn>
        </form>
      ) : (
        <div className="rounded-xl bg-surface p-3 text-[13.5px]">{a.plan?.goal || "No plan yet."}{a.plan && <span className="mt-1 block text-xs text-muted">{a.plan.updatedBy} · {ago(now - a.plan.updatedAt)}</span>}{canPlan && <button onClick={() => setEditing(true)} className="mt-1 block text-xs font-semibold text-brand">Edit</button>}</div>
      )}
      <ul className="mt-3 space-y-2">{(a.plan?.actions ?? []).map((x) => (
        <li key={x.id} className="flex items-start gap-2.5 text-[13px]">
          <Checkbox checked={x.done} disabled={!canPlan && x.owner !== me!.id} onCheckedChange={() => mutate((st) => AC.toggleAction(st, a.id, me!.id, x.id))} aria-label={x.text} className="mt-0.5" />
          <span className={x.done ? "text-muted line-through" : ""}>{x.text}<span className="block text-xs text-muted">{NAMES[x.owner]} · {x.done ? "done" : x.due < now ? "overdue" : `due in ${Math.max(0, Math.round((x.due - now) / 86400000))} days`}</span></span>
        </li>))}</ul>
      {canPlan && (
        <form onSubmit={(e) => { e.preventDefault(); mutate((st) => AC.addAction(st, a.id, me!.id, text, owner, Number(days))); setText(""); }} className="mt-3 space-y-2 border-t border-line pt-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an action" aria-label="New plan action" />
          <div className="flex gap-2">
            <Choice value={owner} onChange={setOwner} aria-label="Owner" className="min-w-0 flex-1" options={people.map((u) => ({ value: u.id, label: u.name }))} />
            <Choice value={days} onChange={setDays} aria-label="Due" className="w-auto" options={[{ value: "3", label: "3 days" }, { value: "7", label: "1 week" }, { value: "14", label: "2 weeks" }, { value: "30", label: "1 month" }]} />
            <Btn sm type="submit" disabled={!text.trim()}>Add</Btn>
          </div>
        </form>
      )}
    </Card>
  );
}

function Contacts({ a }: { a: Account }) {
  const { me, mutate } = useApp();
  const [f, setF] = useState({ name: "", role: "", phone: "" }); const [adding, setAdding] = useState(false);
  const all = [{ name: a.contact.name, role: a.contact.role, email: a.contact.email, phone: undefined as string | undefined }, ...(a.contacts ?? []).map((c) => ({ ...c, email: c.email ?? "" }))];
  return (
    <Card className="p-5">
      <Label>Contacts</Label>
      <ul className="space-y-2 text-[13px]">{all.map((c, i) => <li key={c.name + i} className="rounded-lg bg-surface px-3 py-2"><b>{c.name}</b>{i === 0 && <span className="ml-1.5 text-xs text-muted">main</span>}<span className="block text-xs text-muted">{[c.role, c.phone, c.email].filter(Boolean).join(" · ")}</span></li>)}</ul>
      {adding ? (
        <form onSubmit={(e) => { e.preventDefault(); mutate((st) => AC.addContact(st, a.id, me!.id, { name: f.name, role: f.role || "Contact", phone: f.phone || undefined })); setF({ name: "", role: "", phone: "" }); setAdding(false); }} className="mt-3 space-y-2">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" aria-label="Contact name" />
          <Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role" aria-label="Contact role" />
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" aria-label="Contact phone" />
          <div className="flex gap-2"><Btn sm type="submit" disabled={!f.name.trim()}>Save</Btn><Btn sm v="ghost" onClick={() => setAdding(false)}>Cancel</Btn></div>
        </form>
      ) : <button onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand"><Icon n="plus" s={14} /> Add a contact</button>}
    </Card>
  );
}

function Activity({ a }: { a: Account }) {
  const { me, now, mutate } = useApp();
  const [how, setHow] = useState("Meeting"); const [text, setText] = useState("");
  const log = [...(a.activity ?? [])].reverse();
  return (
    <Card className="p-5">
      <Label>Activity</Label>
      <form onSubmit={(e) => { e.preventDefault(); mutate((st) => AC.log(st, a.id, me!.id, how, text)); setText(""); }} className="flex flex-wrap gap-2">
        <Choice value={how} onChange={setHow} aria-label="Type" className="w-auto" options={["Meeting", "Call", "Email", "Site visit"]} />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="What was discussed?" aria-label="Activity note" className="min-w-0 flex-1" />
        <Btn type="submit" disabled={!text.trim()}>Log</Btn>
      </form>
      {log.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing logged yet.</p> :
        <ol className="mt-3 space-y-3 text-[13px]">{log.map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by} · {ago(now - l.t)}</span></span></li>)}</ol>}
    </Card>
  );
}
