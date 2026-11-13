"use client";
import { Input, Textarea } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { CT } from "@/lib/contracts";
import { MANAGER, NAMES, SUPPORT, accountOf, inr, oppOf } from "@/lib/sherpa";
import type { Contract, State } from "@/lib/types";
import { draftView } from "@/lib/drafts";
import { DraftEditor, printDraft } from "./DraftEditor";
import { Btn, Card, Icon, Pill, ago } from "../ui";
import { Fold, Label } from "./Action";

const STEPS: [Contract["status"], string][] = [["draft", "Draft"], ["check", "Sales support check"], ["approval", "Manager approval"], ["signature", "Signature"], ["active", "Active"]];
const fmt = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function ContractPill({ c }: { c: Contract }) {
  const [tone, label] = ({ draft: ["amber", "Draft"], check: ["blue", "In check"], approval: ["blue", "For approval"], signature: ["amber", "Out for signature"], active: ["green", "Active"] } as const)[c.status];
  return <Pill tone={tone}>{label}</Pill>;
}

function downloadContract(s: State, c: Contract, customer: string) {
  const v = draftView(s, { kind: "contract", id: c.id }); if (!v) return;
  const head: [string, string][] = [["Customer", customer], ["Contract", c.id], ["Value", inr(c.value)], ["Term", c.term > 1 ? `${c.term} years` : "One-off"], ["Start", fmt(c.start)]];
  printDraft({ ...v, title: c.title }, head, c.signedAt ? `<p><b>Signed electronically</b> by ${c.signedBy ?? ""} on ${fmt(c.signedAt)}.</p>` : "<p><b>Not signed yet.</b></p>");
}

export function ContractPage({ id, openOpp }: { id: string; openOpp?: (id: string) => void }) {
  const { s, me, mutate, now } = useApp();
  const c = s.sherpa.contracts.find((x) => x.id === id);
  const [note, setNote] = useState("");
  if (!c) return <div className="p-8 text-sm text-muted">Contract not found.</div>;
  const o = oppOf(s, c.oppId); const acc = accountOf(s, c.accountId);
  const by = me!.id; const isOwner = o?.owner === by;
  const editing = c.status === "draft" && isOwner;
  const checking = c.status === "check" && (by === SUPPORT || me!.role === "ss");
  const approving = c.status === "approval" && (by === MANAGER || me!.role === "mgr");
  const signing = c.status === "signature" && isOwner;
  const sent = c.log.some((l) => /e-signature/.test(l.text));
  const at = STEPS.findIndex((x) => x[0] === c.status);
  const waiting = c.status === "draft" ? NAMES[o?.owner ?? ""] : c.status === "check" ? NAMES[SUPPORT] : c.status === "approval" ? NAMES[MANAGER] : c.status === "signature" ? (sent ? acc?.contact.name ?? "the customer" : NAMES[o?.owner ?? ""]) : undefined;
  const run = (f: Parameters<typeof mutate>[0]) => { mutate(f); setNote(""); };

  return (
    <div className="p-4 @2xl:p-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{c.id}</span><ContractPill c={c} />{o && <button onClick={() => openOpp?.(o.id)} className="text-xs font-semibold text-brand hover:underline">{o.id}</button>}</div>
        <p className="mt-2 text-sm text-muted">{inr(c.value)} · {c.term > 1 ? `${c.term} years` : "one-off"} · starts {fmt(c.start)} · signer {acc?.contact.name ?? "not known"}</p>
      </header>

      <Card className="mb-5 p-5">
        <ol className="flex items-center">{STEPS.map(([k, l], i) => (
          <li key={k} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center"><div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : i <= at ? "bg-brand" : "bg-line"}`} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${i < at || c.status === "active" ? "border-brand bg-brand text-white" : i === at ? "border-brand bg-white ring-4 ring-brand/15" : "border-line bg-white"}`}>{(i < at || c.status === "active") && <Icon n="check" s={12} w={3} />}</span><div className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "opacity-0" : i < at ? "bg-brand" : "bg-line"}`} /></div>
            <span className={`text-[11px] ${i === at ? "font-semibold" : "text-muted"}`}>{l}</span>
          </li>))}</ol>
        {waiting && <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-[13.5px]"><Icon n="clock" s={15} /><span className="font-medium">{c.status === "signature" && sent ? `Waiting for ${waiting} to sign from the e-signature link.` : `Waiting on ${waiting}.`}</span></div>}
        {c.status === "active" && <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13.5px] text-emerald-900"><Icon n="trophy" s={15} /><span className="font-medium">Signed by {c.signedBy} {ago(now - (c.signedAt ?? now))}. The deal is won and the handover has started.</span></div>}
      </Card>

      <div className="mb-5"><DraftEditor docRef={{ kind: "contract", id: c.id }} canEdit={editing || checking || approving} canComment={c.status !== "active" && (isOwner || by === SUPPORT || me!.role === "ss" || me!.role === "mgr")} label="The contract" note={editing ? "Change any wording here. Changed legal wording goes to Sales support for a check." : checking || approving ? "Check the wording. Edit it or leave a comment for the rep." : undefined} /></div>

      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <Label>Scope</Label>
            <ul className="space-y-1.5 text-[13.5px]">{c.scope.map((x) => <li key={x} className="flex gap-2"><span className="text-brand">•</span>{x}</li>)}</ul>
            {c.sla && <div className="mt-3 rounded-xl bg-surface p-3 text-[13px]"><b>Service level:</b> {c.sla}</div>}
          </Card>
          <Card className="p-5">
            <Label>Dates and payment</Label>
            <div className="rounded-xl border border-line px-4 text-[13.5px]">
              <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2.5"><span className="text-muted">Start date</span>{editing ? <Input type="date" aria-label="Start date" value={iso(c.start)} min={iso(now)} onChange={(e) => { const t = new Date(e.target.value).getTime(); if (t) mutate((st) => CT.setStart(st, c.id, by, t)); }} className="h-9 w-auto" /> : <span className="font-medium">{fmt(c.start)}</span>}</div>
              {c.term > 1 && <div className="flex justify-between gap-4 border-b border-line/70 py-2.5"><span className="text-muted">Ends</span><span className="font-medium">{fmt(c.start + c.term * 365 * 86400000)}</span></div>}
              {c.payment.map((p) => <div key={p.label} className="flex justify-between gap-4 border-b border-line/70 py-2.5 last:border-0"><span className="text-muted">{p.label}</span><span className="num font-medium">{p.pct}% · {inr(Math.round((c.value * p.pct) / 100 / (c.term > 1 ? c.term * 4 : 1)))}{c.term > 1 ? " a quarter" : ""}</span></div>)}
            </div>
          </Card>
          {c.clauses.some((x) => x.optional) && <Card className="p-5">
            <Label>Optional terms</Label>
            <ul className="space-y-2">{c.clauses.filter((x) => x.optional).map((x) => (
              <li key={x.key} className={`flex items-start gap-3 rounded-xl border p-3 text-[13.5px] ${x.on ? "border-line" : "border-dashed border-line text-muted"}`}>
                {editing
                  ? <Checkbox checked={x.on} onCheckedChange={() => mutate((st) => CT.toggle(st, c.id, by, x.key))} aria-label={x.title} className="mt-1" />
                  : <span className={`mt-0.5 ${x.on ? "text-emerald-600" : ""}`}>{x.on ? "✓" : "○"}</span>}
                <span className="min-w-0 flex-1"><b className={x.on ? "text-ink" : ""}>{x.title}</b><span className="block text-[12.5px] text-muted">{x.on ? "In the contract" : "Not included"}</span></span>
              </li>))}</ul>
          </Card>}
          <Card className="p-5">
            <Label>History</Label>
            <ol className="space-y-3 text-[13px]">{[...c.log].reverse().map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by} · {ago(now - l.t)}</span></span></li>)}</ol>
          </Card>
        </div>

        <div className="space-y-5 @4xl:sticky @4xl:top-4">
          {(editing || checking || approving || signing || c.status === "active") && (
            <Card className="border-brand/25 p-5">
              <div className="t-label mb-2">Your next step</div>
              {editing && <><p className="mb-3 text-[13px] text-muted">Check the start date, the payment plan and the optional terms. Then {NAMES[SUPPORT]} checks it.</p><Btn full onClick={() => run((st) => CT.submit(st, c.id, by))}>Send for the commercial check</Btn></>}
              {(checking || approving) && <>
                <p className="mb-3 text-[13px] text-muted">{checking ? `Check price, payment and terms against the offer. Then ${NAMES[MANAGER]} approves.` : `Checked by ${NAMES[SUPPORT]}. Approve it and ${NAMES[o?.owner ?? ""]} sends it for e-signature.`}</p>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={checking ? "Note (needed to send it back)" : "What should change? (needed to ask for changes)"} aria-label="Note" className="mb-2 min-h-16" />
                <div className="flex flex-wrap gap-2"><Btn onClick={() => run((st) => checking ? CT.check(st, c.id, by, true, note) : CT.approve(st, c.id, by, true, note))}>{checking ? "Check passed" : "Approve"}</Btn><Btn v="ghost" disabled={!note.trim()} onClick={() => run((st) => checking ? CT.check(st, c.id, by, false, note) : CT.approve(st, c.id, by, false, note))}>{checking ? "Send back" : "Ask for changes"}</Btn></div>
              </>}
              {signing && (!sent
                ? <><p className="mb-3 text-[13px] text-muted">{acc?.contact.name ?? "The customer"} gets an email with a link to sign.</p><Btn full onClick={() => run((st) => CT.sendForSignature(st, c.id, by))}><Icon n="send" s={14} /> Send for e-signature</Btn></>
                : <><p className="mb-3 text-[13px] text-muted">Sent to {acc?.contact.email ?? "the customer"}. In this demo you can sign for the customer.</p><Btn full v="ghost" onClick={() => run((st) => CT.customerSigns(st, c.id))}>Customer signs (demo)</Btn></>)}
              {c.status === "active" && <Btn full v="ghost" onClick={() => downloadContract(s, c, acc?.name ?? o?.placeName ?? "")}><Icon n="doc" s={14} /> Download the signed contract</Btn>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function Contracts({ openOffer }: { openOffer: (id: string) => void }) {
  const { s, now } = useApp();
  const latest = [...s.sherpa.contracts].sort((x, y) => y.log[y.log.length - 1].t - x.log[x.log.length - 1].t);
  const open = latest.filter((c) => c.status !== "active");
  const signed = latest.filter((c) => c.status === "active");
  const row = (c: Contract) => (
    <button key={c.id} onClick={() => openOffer(c.id)} className="sheet group flex w-full items-center gap-3 p-4 text-left hover:bg-surface">
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{c.id}</span><ContractPill c={c} /></span><span className="mt-1 block truncate text-[15px] font-semibold">{c.title}</span><span className="block truncate text-[12.5px] text-muted">{inr(c.value)} · starts {fmt(c.start)} · {c.log[c.log.length - 1]?.text} {ago(now - (c.log[c.log.length - 1]?.t ?? c.createdAt))}</span></span>
      <Icon n="chev" s={16} />
    </button>
  );
  return (
    <div className="p-4 @2xl:p-8">
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Contracts</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">Every accepted offer becomes a contract: drafted by SHERPA, checked by Sales support, approved by the Sales Manager and signed by the customer.</p>
      <div className="mt-5 space-y-2.5">
        {open.length === 0 && <div className="sheet p-8 text-center text-sm text-muted">No contracts in progress. A contract starts when a customer accepts an offer.</div>}
        {open.map(row)}
      </div>
      {signed.length > 0 && <div className="mt-4"><Fold title="Signed" count={String(signed.length)}><div className="space-y-2.5">{signed.map(row)}</div></Fold></div>}
    </div>
  );
}
