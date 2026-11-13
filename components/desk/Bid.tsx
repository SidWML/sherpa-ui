"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/form";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AREA_NAME, BID_PAPERS, NAMES, OP, accountOf, daysTo, inr, isNI, offerOf, oppOf, regionRef, tenderOf, winChance } from "@/lib/sherpa";
import type { ProductKey, State, Tender } from "@/lib/types";
import { draftView, liftDetails } from "@/lib/drafts";
import { DraftEditor, printDraft } from "./DraftEditor";
import { Icon, ago } from "../ui";
import { Back } from "./Action";

/* ------------------------------------------------------------------ the facts a bid is built from */
const productOf = (t: Tender): ProductKey => (t.line === "ni" ? "newinstall" : t.line === "sc" ? "maintenance" : "modernisation");
const lakh = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : `₹${(n / 1e5).toFixed(1)} L`);

/** Earlier quotes of the same kind in the same area: what we charged and whether we won. */
export function PastQuotes({ area, product, price, discountPct }: { area: string; product: ProductKey; price?: number; discountPct?: number }) {
  const { s, now } = useApp();
  const ref = regionRef(s, area, product);
  const rows = s.sherpa.past.filter((p) => p.area === area && p.product === product).sort((a, b) => b.at - a.at).slice(0, 6);
  const diff = price && ref.avg ? Math.round(((price - ref.avg) / ref.avg) * 100) : null;
  if (!rows.length) return <p className="t-small">No earlier quotes of this kind in {AREA_NAME[area] ?? area}.</p>;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <div className="rounded-md bg-surface px-3 py-2"><div className="t-small">Average price</div><b className="num">{lakh(ref.avg)}</b></div>
        <div className="rounded-md bg-surface px-3 py-2"><div className="t-small">Average discount</div><b className="num">{ref.avgDiscount.toFixed(0)}%</b></div>
        <div className="rounded-md bg-surface px-3 py-2"><div className="t-small">We won</div><b className="num">{ref.wins} of {ref.count}</b></div>
      </div>
      {diff !== null && <p className="mt-3 text-[13.5px]">Your price is <b className={Math.abs(diff) > 12 ? "text-amber-700" : "text-emerald-700"}>{Math.abs(diff)}% {diff <= 0 ? "below" : "above"}</b> the average{discountPct !== undefined ? <>. At {discountPct}% off, <b>{winChance(s, area, product, discountPct)}%</b> of similar quotes were won.</> : "."}</p>}
      <div className="mt-3 overflow-hidden rounded-md border border-line">
        <div className="grid grid-cols-[1fr_5rem_5.5rem_3.5rem_4rem] gap-2 border-b border-line bg-surface px-3 py-2 t-label"><span>Customer</span><span>When</span><span className="text-right">Price</span><span className="text-right">Off</span><span className="text-right">Result</span></div>
        {rows.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_5rem_5.5rem_3.5rem_4rem] items-center gap-2 border-b border-line px-3 py-2 text-[13px] last:border-0">
            <span className="truncate">{p.customer}</span><span className="text-muted">{Math.max(1, Math.round((now - p.at) / 86400000 / 30))} mo ago</span><span className="num text-right font-medium">{lakh(p.price)}</span><span className="num text-right">{p.discountPct}%</span>
            <span className="text-right"><span className="rounded px-1.5 py-0.5 text-[11.5px] font-semibold" style={p.outcome === "won" ? { background: "#e2f4ea", color: "#1d7a45" } : { background: "#eeeef1", color: "#4a4a55" }}>{p.outcome === "won" ? "Won" : "Lost"}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** What goes inside each paper, so the manager can read it before it goes out. */
function paperBody(s: State, t: Tender, key: string, price: number, discountPct: number) {
  const d = liftDetails(t);
  if (key === "emd") return <p className="text-[13px]">Bank guarantee or demand draft for <b>{inr(price * 0.02)}</b> (2% of the bid price). The finance team arranges it. Tick it when it is ready.</p>;
  if (key === "company") return <p className="text-[13px]">Company registration, GST certificate and PAN card from the company file. Up to date.</p>;
  if (key === "turnover") return <p className="text-[13px]">Yearly sales for the last 3 years, signed by the chartered accountant. Taken from the company file.</p>;
  if (key === "datasheets") return <p className="text-[13px]">Datasheet and drawings for the <b>{d.model}</b>: shaft size, pit and headroom, doors, power needs.</p>;
  if (key === "declarations") return <p className="text-[13px]">Standard statements (no ban, no pending case, tender terms accepted) and a letter that lets the Sales Manager sign for Schindler. Tick it after you have signed.</p>;
  if (key === "past") {
    const won = s.sherpa.past.filter((p) => p.outcome === "won" && p.product === productOf(t)).slice(0, 4);
    return <ul className="space-y-1 text-[13px]">{won.length ? won.map((p) => <li key={p.id} className="flex justify-between gap-3"><span>{p.customer}</span><span className="text-muted">{AREA_NAME[p.area]} · {lakh(p.price)}</span></li>) : <li className="text-muted">No earlier projects of this kind.</li>}</ul>;
  }
  if (key === "compliance") {
    const rows: [string, string, string, boolean][] = [
      ["Number of lifts", String(t.lifts), String(t.lifts), true], ["Speed", `${d.speed} m/s`, `${d.speed} m/s`, true], ["Load", d.load, d.load, true], ["Drive", d.drive, d.drive, true],
      ["Door operator", t.competitorSpec ? "A competitor's operator is named" : d.door, t.competitorSpec ? "Our equal operator, with a short note" : d.door, !t.competitorSpec], ["Delivery", d.delivery, d.delivery, true],
    ];
    return <div className="overflow-hidden rounded-md border border-line text-[13px]"><div className="grid grid-cols-[1fr_1fr_1fr_4rem] gap-2 bg-surface px-3 py-2 t-label"><span>Item</span><span>Tender asks</span><span>We offer</span><span>Meets</span></div>{rows.map((r) => <div key={r[0]} className="grid grid-cols-[1fr_1fr_1fr_4rem] items-center gap-2 border-t border-line px-3 py-2"><span className="font-medium">{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span className={r[3] ? "text-emerald-700" : "font-semibold text-amber-700"}>{r[3] ? "Yes" : "Check"}</span></div>)}</div>;
  }
  if (key === "price") return <div className="rounded-md border border-line text-[13px]">{[["Lifts", String(t.lifts)], ["Price per lift (list)", inr(t.value / t.lifts)], ["Discount", `${discountPct}%`], ["Bid price", inr(price)]].map(([k, v], i) => <div key={k} className={`flex justify-between px-3 py-2 ${i ? "border-t border-line" : ""} ${i === 3 ? "font-semibold" : ""}`}><span className="text-muted">{k}</span><span className="num">{v}</span></div>)}</div>;
  return null;
}

/** Opens the bid as a printable page; the browser's print dialog saves it as a PDF. */
function downloadBid(s: State, t: Tender, customer: string, discountPct: number) {
  const v = draftView(s, { kind: "bid", id: t.id }, { discountPct }); if (!v) return;
  printDraft(v, [["Customer", customer], ["Tender", t.name], ["Lifts", String(t.lifts)]], `<h2>Papers attached</h2><ol>${BID_PAPERS.map((p) => `<li>${p.title.replace(/[&<>]/g, "")}</li>`).join("")}</ol>`);
}

/* ------------------------------------------------------------------ the page */
export function BidPage({ id, onBack, openOpp, embedded }: { id: string; onBack: () => void; openOpp?: (id: string) => void; embedded?: boolean }) {
  const { s, me, mutate, now } = useApp();
  const t = tenderOf(s, id)!; const o = oppOf(s, t.oppId); const acc = accountOf(s, t.accountId); const offer = offerOf(s, o?.offerId);
  const isMgr = me!.role === "mgr"; const done = !!t.bid; const isOwner = o?.owner === me!.id;
  const ni = !!o && isNI(o); const filling = ni && me!.role === "ss" && !done;
  const drafting = isOwner && !done && !t.draft && !ni; const approving = isMgr && !done;
  const canEdit = drafting || approving; const canFill = canEdit || filling;
  const [disc, setDisc] = useState(t.bid?.discountPct ?? t.draft?.discountPct ?? 8);
  const [ans, setAns] = useState<Record<string, string>>(() => Object.fromEntries((t.doc?.gaps ?? []).map((g) => [g.key, g.a ?? ""])));
  const [note, setNote] = useState("");
  const upload = (f: File | undefined) => { if (f) mutate((st) => OP.tenderDoc(st, t.id, me!.id, { name: f.name, size: f.size })); };
  const answered = !!t.doc && t.doc.gaps.every((g) => g.a); const [open, setOpen] = useState<string | null>(null); const [printed, setPrinted] = useState(false);
  const d0 = liftDetails(t); const gap = (k: string) => t.doc?.gaps.find((g) => g.key === k)?.a;
  const d = { ...d0, load: gap("load") ?? d0.load, door: gap("door") ?? d0.door }; const price = Math.round(t.value * (1 - disc / 100)); const perLift = price / t.lifts; const product = productOf(t);
  const days = Math.max(0, daysTo(s, t.eord));
  const missing = offer?.missing ?? [];
  const papersDone = t.checklist.filter((c) => c.done).length;
  const ready = missing.length === 0 && papersDone === BID_PAPERS.length;
  const owner = o ? NAMES[o.owner] : "the rep";
  const check = (ok: boolean) => <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-600 text-white" : "border border-line bg-white text-transparent"}`}><Icon n="check" s={11} w={3} /></span>;

  return (
    <div className={`${embedded ? "p-4 @2xl:p-6" : "p-4 @2xl:p-8"}`}>
      {!embedded && <Back onClick={onBack} label="Back" />}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]"><span className="font-mono font-bold text-muted">{t.id}</span><span className="rounded px-2 py-0.5 font-semibold" style={{ background: done ? "#e2f4ea" : "#fdeed8", color: done ? "#1d7a45" : "#b45309" }}>{done ? "Bid created" : "Bid not created yet"}</span><span className="rounded px-2 py-0.5 font-semibold" style={{ background: "#eeeef1", color: "#4a4a55" }}>Bid due {new Date(t.eord).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {days} days left</span></div>
        {!embedded && <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">Bid for {t.name}</h1>}
        <p className="t-small mt-1">{acc?.name} · {AREA_NAME[t.area] ?? t.area} · {ni ? `lift details by Sales support, bid by the Sales Manager, sent by ${owner}` : `drafted by ${owner}, approved by the Sales Manager`}</p>
      </header>

      {!isMgr && !done && t.draft && <div className="sheet mb-5 flex items-center gap-3 p-4 text-[14px]"><Icon n="clock" s={18} /><span>Your draft is with the <b>Sales Manager</b> for approval. You get a to-do to send it when it is approved.</span></div>}
      {isMgr && !done && t.draft && <div className="sheet mb-5 flex items-center gap-3 p-4 text-[14px]" style={{ background: "#fff8eb" }}><Icon n="warn" s={18} /><span><b>{NAMES[t.draft.by]}</b> sent this draft for your approval {ago(now - t.draft.at)} at {t.draft.discountPct}% off. Change anything below, then approve.</span></div>}
      {!isMgr && !isOwner && !done && !ni && <div className="sheet mb-5 flex items-center gap-3 p-4 text-[14px]"><Icon n="clock" s={18} /><span>{owner} drafts this bid and the Sales Manager approves it.</span></div>}
      {ni && !done && !isMgr && <div className="sheet mb-5 flex items-center gap-3 p-4 text-[14px]"><Icon n={filling ? "sparkle" : "clock"} s={18} /><span>{filling ? <>Read the tender document and answer what it leaves open. Then the <b>Sales Manager</b> prepares the bid.</> : <>Sales support fills in the lift details, then the <b>Sales Manager</b> prepares the bid. You confirm it matches what the customer asked, then send it.</>}</span></div>}

      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          {/* 1. the tender */}
          <section className="sheet p-5">
            <div className="t-label mb-2">1 · The tender</div>
            <p className="text-[14px] leading-relaxed">{t.summary}</p>
            {t.competitorSpec && <div className="mt-3 rounded-md p-3 text-[13px]" style={{ background: "#fff4e5" }}><b>The tender names a competitor&apos;s part.</b> {t.competitorSpec}</div>}
            {(t.lossNote || acc?.lostBids) && <div className="mt-3 rounded-md bg-surface p-3 text-[13px]"><b>Why we lost this customer before:</b> {t.lossNote ?? acc?.lostBids}</div>}
          </section>

          {/* tender document */}
          <section className="sheet p-5">
            <div className="mb-2 flex items-center justify-between gap-3"><div className="t-label">The tender document</div>{t.doc && <span className="text-[12.5px] font-semibold text-emerald-700">Read by SHERPA</span>}</div>
            {!t.doc ? (
              canFill ? (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-line p-6 text-center hover:bg-surface">
                  <Icon n="upload" s={22} />
                  <span className="text-[14px] font-semibold">Upload the tender document</span>
                  <span className="t-small">PDF or Word. SHERPA reads it, lists what it asks for and asks you only what it leaves open.</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
                </label>
              ) : <p className="t-small">{owner} has not uploaded the tender document yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-md bg-surface p-3 text-[13px]"><Icon n="doc" s={18} /><span className="min-w-0 flex-1 truncate"><b>{t.doc.name}</b> · {Math.max(1, Math.round(t.doc.size / 1024))} KB · read {ago(now - t.doc.at)}</span>{canFill && <label className="cursor-pointer text-[12.5px] font-semibold text-brand">Replace<input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>}</div>
                <div><div className="mb-1.5 text-[13px] font-semibold">What the document asks for</div>
                  <div className="overflow-hidden rounded-md border border-line text-[13px]">{t.doc.found.map((f, i) => <div key={f.label} className={`grid grid-cols-[1fr_1.4fr_3rem] gap-2 px-3 py-2 ${i ? "border-t border-line" : ""}`}><span className="text-muted">{f.label}</span><span className="font-medium">{f.value}</span><span className="text-right t-small">p. {f.page}</span></div>)}</div></div>
                <div><div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold"><Icon n="sparkle" s={13} c="var(--color-brand)" /> The document does not say. Your answers go into the bid</div>
                  <div className="space-y-3">{t.doc.gaps.map((g) => (
                    <div key={g.key}><div className="text-[13px]">{g.q}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">{g.opts.map((x) => { const on = (ans[g.key] || g.a) === x; return <button key={x} disabled={!canFill} onClick={() => setAns({ ...ans, [g.key]: x })} aria-pressed={on} className={`min-h-9 rounded-md border px-2.5 text-[12.5px] font-medium disabled:cursor-default ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-surface"}`}>{x}</button>; })}</div></div>))}</div>
                  {canFill && <Button variant="default" disabled={t.doc.gaps.some((g) => !ans[g.key])} onClick={() => mutate((st) => OP.answerGaps(st, t.id, me!.id, ans))} className="h-auto mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md px-4 text-[13.5px] font-semibold"><Icon n="sparkle" s={14} /> {answered ? "Update the draft bid" : "Draft the bid"}</Button>}</div>
              </div>
            )}
          </section>

          {/* 2. lift details */}
          <section className="sheet p-5">
            <div className="mb-2 flex items-center justify-between gap-3"><div className="t-label">2 · Lift details</div>{missing.length === 0 ? <span className="text-[12.5px] font-semibold text-emerald-700">Complete</span> : <span className="text-[12.5px] font-semibold text-amber-700">Open: {missing.join(", ")}. Answer the document questions above.</span>}</div>
            <div className="grid grid-cols-2 gap-x-6 text-[13.5px] @2xl:grid-cols-3">{[["Lifts", String(t.lifts)], ["Model", d.model], ["Load", d.load], ["Speed", `${d.speed} m/s`], ["Stops", String(d.stops)], ["Doors", d.door]].map(([k, v]) => <div key={k} className="border-b border-line/70 py-2"><div className="t-small">{k}</div><div className="font-medium">{v}</div></div>)}</div>
          </section>

          {/* 3. price */}
          <section className="sheet p-5">
            <div className="t-label mb-3">3 · Price, and what we quoted before</div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><div className="num text-3xl font-semibold tracking-tight">{inr(price)}</div><div className="t-small">{inr(perLift)} per lift · list price {inr(t.value)}</div></div>
              <label className="text-[13px] text-muted">Discount: <b className="text-ink">{disc}%</b><input type="range" min={0} max={30} step={1} disabled={!canEdit} value={disc} onChange={(e) => setDisc(Number(e.target.value))} className="mt-2 block w-48 accent-[#d42a2a]" /></label>
            </div>
            <div className="mt-4"><PastQuotes area={t.area} product={product} price={perLift} discountPct={disc} /></div>
          </section>

          {/* 4. papers */}
          <section className="sheet p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="t-label">4 · Bid papers · {papersDone} of {BID_PAPERS.length} ready</div>{canEdit && <Button variant="outline" onClick={() => mutate((st) => OP.fillPapers(st, t.id, me!.id))} className="h-auto inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-[12.5px] font-semibold text-brand hover:-soft"><Icon n="sparkle" s={13} /> Fill all I can</Button>}</div>
            <div className="divide-y divide-line">
              {BID_PAPERS.map((p, i) => { const ok = t.checklist[i]?.done; const on = open === p.key; return (
                <div key={p.key} className="py-3">
                  <div className="flex items-start gap-3">
                    <button disabled={!canEdit} onClick={() => mutate((st) => OP.setPaper(st, t.id, i, !ok))} aria-label={ok ? "Mark not ready" : "Mark ready"} className="mt-0.5 disabled:cursor-default">{check(!!ok)}</button>
                    <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{p.title}</div><div className="t-small">{p.help}</div></div>
                    <span className="mt-0.5 shrink-0 text-[11.5px] font-semibold" style={{ color: p.auto ? "#1b5aa6" : "#b45309" }}>{p.auto ? "SHERPA fills" : "You confirm"}</span>
                    <button onClick={() => setOpen(on ? null : p.key)} className="mt-0.5 shrink-0 text-[12.5px] font-semibold text-brand">{on ? "Hide" : "View"}</button>
                  </div>
                  {on && <div className="pop ml-8 mt-3">{paperBody(s, t, p.key, price, disc)}</div>}
                </div>); })}
            </div>
          </section>

          <section>
            <div className="mb-3 px-1 t-label">5 · The bid letter</div>
            {t.doc ? <DraftEditor docRef={{ kind: "bid", id: t.id }} live={{ discountPct: disc }} canEdit={canEdit} canComment={canEdit || (isOwner && !done)} label="The bid letter" note={canEdit ? "SHERPA wrote this from the tender. Edit it here; the price follows the slider." : undefined} /> : <p className="sheet p-5 text-[13.5px] text-muted">SHERPA writes the letter once the tender document is uploaded.</p>}
          </section>

          {done && o && (
            <section className="sheet p-5">
              <div className="mb-2 flex items-center justify-between gap-3"><div className="t-label">The bid pack</div><Button variant="outline" onClick={() => { setPrinted(true); downloadBid(s, t, acc?.name ?? o.placeName, t.bid!.discountPct); }} className="h-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold"><Icon n="doc" s={13} /> Download the bid (PDF)</Button></div>
              <p className="text-[13.5px]">Bid for <b>{t.name}</b> · {inr(offer?.price ?? price)} after {t.bid!.discountPct}% off · {BID_PAPERS.length} papers attached{printed ? " · downloaded" : ""}.</p>
              <p className="t-small mt-1">Upload the PDF to the tender portal, or send it to the customer from the offer.</p>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[13px] text-muted">{BID_PAPERS.map((p) => <li key={p.key}>{p.title}</li>)}</ol>
            </section>
          )}
        </div>

        {/* right: ready to create */}
        <aside className="sheet p-5 @4xl:sticky @4xl:top-4">
          <div className="t-label mb-3">{done ? (ni ? "Prepared" : "Approved") : approving && t.draft ? "Approve the bid?" : approving && ni ? "Ready to prepare?" : "Ready to submit?"}</div>
          {done ? (
            <div className="space-y-3 text-[14px]">
              <div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-white" style={{ background: "#2f855a" }}><Icon n="check" s={13} w={3} /></span><div><div className="font-semibold">Bid {ni ? "prepared" : "approved"} by {NAMES[t.bid!.by]}</div><div className="t-small">{ni ? `Next: Sales support reviews the terms and papers, ${owner} confirms it matches the customer's request, then sends it.` : `Next: ${owner} sends it to ${acc?.contact.name} at ${acc?.name}.`}</div></div></div>
              {o && <Button variant="outline" onClick={() => openOpp?.(o.id)} className="h-auto inline-flex min-h-10 w-full items-center justify-center rounded-md border text-[13.5px] font-semibold">Open the opportunity</Button>}
            </div>
          ) : (
            <>
              <ul className="space-y-2.5 text-[13.5px]">
                <li className="flex items-center gap-2.5">{check(missing.length === 0)}<span>Lift details complete</span></li>
                <li className="flex items-center gap-2.5">{check(true)}<span>Price set: {inr(price)}</span></li>
                <li className="flex items-center gap-2.5">{check(papersDone === BID_PAPERS.length)}<span>Papers ready: {papersDone} of {BID_PAPERS.length}</span></li>
              </ul>
              {approving ? (
                <>
                  <Button variant="default" disabled={!ready} onClick={() => mutate((st) => OP.bidDone(st, t.id, me!.id, disc))} className="h-auto mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold"><Icon n="check" s={15} /> {t.draft ? "Approve the bid" : ni ? "Prepare the bid" : "Create the bid"}</Button>
                  {!ready && <p className="t-small mt-2">{missing.length ? "The lift details are not complete yet." : "Tick every paper first. Press Fill all I can to do it in one go."}</p>}
                  {t.draft && <div className="mt-3 space-y-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" aria-label="What should change" /><Button variant="outline" disabled={!note.trim()} onClick={() => mutate((st) => OP.bidChanges(st, t.id, me!.id, note.trim()))} className="h-auto inline-flex min-h-10 w-full items-center justify-center rounded-md border text-[13.5px] font-semibold">Send back with changes</Button></div>}
                </>
              ) : drafting ? (
                <>
                  <Button variant="default" disabled={!ready} onClick={() => mutate((st) => OP.submitBid(st, t.id, me!.id, disc))} className="h-auto mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold"><Icon n="send" s={15} /> Send to the Sales Manager</Button>
                  {!ready && <p className="t-small mt-2">{!t.doc ? "Upload the tender document first." : missing.length ? "Answer the document questions and press Draft the bid." : "Tick every paper first. Press Fill all I can to do it in one go."}</p>}
                </>
              ) : <p className="t-small mt-3">{ni ? (missing.length ? "Waiting for Sales support to fill in the lift details." : "Waiting for the Sales Manager to prepare the bid.") : t.draft ? "Waiting for the Sales Manager to approve." : `${owner} drafts the bid.`}</p>}
            </>
          )}
          <div className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">{now > 0 && `Bid due in ${days} days.`} {ni ? `After Sales support's review and ${owner}'s check, ${owner} sends it or downloads it for the tender portal.` : `After approval, ${owner} sends it to the customer or downloads it for the tender portal.`}</div>
        </aside>
      </div>
    </div>
  );
}
