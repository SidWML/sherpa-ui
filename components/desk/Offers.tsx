"use client";
import { Choice, Input, Textarea } from "@/components/form";
import { useState } from "react";
import { A, useApp, userOf } from "@/lib/store";
import { AREA_NAME, GUIDE, NAMES, PRODUCT, SH, oppOf, tenderOf, aboveLimit, accountOf, approversFor, assetOf, chaseEmail, chf, emailFor, isNI, perYear, regionRef, winChance } from "@/lib/sherpa";
import type { Offer } from "@/lib/types";
import { Btn, Card, Empty, Field, Icon, Pill, ago } from "../ui";
import { Back, Label } from "./Action";
import { Page } from "./Common";
import { PastQuotes } from "./Bid";
import { DraftEditor } from "./DraftEditor";
import { AgreedForm } from "./NewInstall";
import { WinWhy } from "../Why";

const ST: Record<Offer["status"], [string, "gray" | "red" | "green" | "amber" | "blue"]> = {
  draft: ["Draft", "gray"], awaiting: ["Awaiting approval", "amber"], changes: ["Changes asked", "red"], approved: ["Approved", "green"],
  rejected: ["Rejected", "red"], sent: ["Sent", "blue"], won: ["Won", "green"], lost: ["Lost", "gray"],
};
export const OfferPill = ({ o }: { o: Offer }) => <Pill tone={ST[o.status][1]}>{ST[o.status][0]}</Pill>;

/** Where the discount sits against the guideline, as one bar. */
export function DiscountGauge({ pct }: { pct: number }) {
  const w = Math.min(100, (pct / 30) * 100);
  const tone = pct <= GUIDE.seller ? "bg-emerald-500" : pct <= GUIDE.manager ? "bg-amber-400" : "bg-brand";
  const who = pct <= GUIDE.seller ? "You can send it alone" : pct <= GUIDE.manager ? "The sales manager approves" : "Above what a manager can approve";
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-semibold">{pct}% off</span><span className="text-muted">{who}</span></div>
      <div className="relative h-2 rounded-full bg-surface"><div className={`h-2 rounded-full ${tone}`} style={{ width: `${w}%` }} /><span className="absolute top-[-3px] h-3.5 w-px bg-ink/30" style={{ left: `${(GUIDE.seller / 30) * 100}%` }} /><span className="absolute top-[-3px] h-3.5 w-px bg-ink/30" style={{ left: `${(GUIDE.manager / 30) * 100}%` }} /></div>
      <div className="mt-1 flex text-[10.5px] text-muted"><span style={{ width: `${(GUIDE.seller / 30) * 100}%` }}>up to {GUIDE.seller}%</span><span style={{ width: `${((GUIDE.manager - GUIDE.seller) / 30) * 100}%` }}>to {GUIDE.manager}%</span><span>above</span></div>
    </div>
  );
}

/** Do we sell here, what did we offer before, and where does this offer sit. */
export function RegionCard({ o, compact }: { o: Pick<Offer, "area" | "product" | "price" | "term" | "discountPct">; compact?: boolean }) {
  const { s } = useApp();
  const ref = regionRef(s, o.area, o.product);
  const unit = perYear(o as Offer);
  const diff = ref.avg ? Math.round(((unit - ref.avg) / ref.avg) * 100) : 0;
  const per = PRODUCT[o.product].yearly ? " per year" : "";
  if (!ref.sells) return <div className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900"><b>We do not sell this in {AREA_NAME[o.area]}.</b> No price reference. Check with the regional lead before offering.</div>;
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold"><span className="text-emerald-600"><Icon n="check" s={15} /></span> We sell this in {AREA_NAME[o.area]}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] @2xl:grid-cols-4">
        <div><div className="text-[11px] text-muted">Offers, 12 months</div><b className="num">{ref.count}</b> <span className="text-muted">({ref.wins} won)</span></div>
        <div><div className="text-[11px] text-muted">Average{per}</div><b className="num">{chf(ref.avg)}</b></div>
        <div><div className="text-[11px] text-muted">Range{per}</div><b className="num">{chf(ref.min)} – {chf(ref.max)}</b></div>
        <div><div className="text-[11px] text-muted">Average discount</div><b className="num">{ref.avgDiscount.toFixed(0)}%</b></div>
      </div>
      {!compact && <p className="mt-3 text-[13px]">This offer is <b className={Math.abs(diff) > 12 ? "text-amber-700" : "text-emerald-700"}>{Math.abs(diff)}% {diff <= 0 ? "below" : "above"}</b> the average for the area. At about {o.discountPct}% off, <WinWhy area={o.area} product={o.product} pct={o.discountPct}><b>{winChance(s, o.area, o.product, o.discountPct)}%</b></WinWhy> of similar offers were won.</p>}
    </div>
  );
}

function Dlg({ title, options, text, cta, onClose, onOk }: { title: string; options?: string[]; text?: string; cta: string; onClose: () => void; onOk: (v: string) => void }) {
  const [v, setV] = useState(options?.[0] ?? "");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-3">{options ? <Choice value={v} onChange={setV} options={options} /> : <Textarea autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={text} className="min-h-24" />}</div>
        <div className="mt-4 flex justify-end gap-2"><Btn v="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={!v} onClick={() => { onOk(v); onClose(); }}>{cta}</Btn></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ list */
export function Offers({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const { s, me, now } = useApp();
  const [f, setF] = useState<"me" | "all" | "closed">("me");
  const mgr = me!.role === "mgr" || me!.role === "lead";
  const mine = s.sherpa.offers.filter((o) => mgr || o.createdBy === me!.id);
  const needsMe = (o: Offer) => (o.status === "awaiting" && o.approvals.some((x) => x.status === "pending" && x.by === me!.id)) || (o.createdBy === me!.id && ["draft", "changes", "approved"].includes(o.status)) || (o.createdBy === me!.id && o.status === "sent" && now - o.lastActivity > 14 * 86400000);
  const rows = mine.filter((o) => (f === "me" ? needsMe(o) : f === "closed" ? ["won", "lost", "rejected"].includes(o.status) : !["won", "lost", "rejected"].includes(o.status)));
  if (openId && s.sherpa.offers.find((o) => o.id === openId)) return <OfferPage id={openId} onBack={() => setOpenId(null)} />;
  return (
    <Page title="Offers" sub={mgr ? "Every offer in your area. Discounts above the guideline wait here for you." : "Your offers, from draft to won. The next step is always shown."}>
      <div className="mb-4 flex gap-1.5">{([["me", "Needs me", mine.filter(needsMe).length], ["all", "All open", mine.filter((o) => !["won", "lost", "rejected"].includes(o.status)).length], ["closed", "Closed", mine.filter((o) => ["won", "lost", "rejected"].includes(o.status)).length]] as const).map(([k, l, n]) => (
        <button key={k} onClick={() => setF(k)} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${f === k ? "bg-ink text-white" : "bg-white text-ink/80 ring-1 ring-line hover:bg-surface"}`}>{l} <span className={`num ml-1 text-xs font-medium ${f === k ? "text-white/60" : "text-muted"}`}>{n}</span></button>))}</div>
      <div className="space-y-2.5">
        {rows.length === 0 && <Empty text="Nothing here. Start from Today or ask SHERPA to draft an offer." />}
        {rows.map((o) => {
          const acc = accountOf(s, o.accountId);
          return (
            <button key={o.id} onClick={() => setOpenId(o.id)} className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition hover:shadow-md">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><OfferPill o={o} />{o.discountPct > GUIDE.seller && <Pill tone="amber">{o.discountPct}% off</Pill>}</div>
                <div className="mt-1.5 truncate text-[15px] font-semibold">{acc?.name} · {o.title}</div>
                <div className="truncate text-[12.5px] text-muted">{assetOf(s, o.assetId)?.label ?? AREA_NAME[o.area]} · by {o.createdBy === me!.id ? "you" : userOf(o.createdBy)?.name ?? o.createdBy}</div>
              </div>
              <div className="shrink-0 text-right"><div className="num text-base font-semibold">{chf(o.price)}</div><div className="text-[11px] text-muted">{PRODUCT[o.product].yearly ? `${o.term} year${o.term > 1 ? "s" : ""}` : "one-off"}</div></div>
              <span className="text-muted transition group-hover:translate-x-0.5"><Icon n="chev" s={16} /></span>
            </button>
          );
        })}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ one offer */
export function OfferPage({ id, onBack, embedded }: { id: string; onBack: () => void; embedded?: boolean }) {
  const { s, me, mutate, now } = useApp();
  const o = s.sherpa.offers.find((x) => x.id === id)!;
  const [dlg, setDlg] = useState<null | "changes" | "reject" | "lost">(null);
  const [mail, setMail] = useState<{ subject: string; body: string } | null>(null);
  const acc = accountOf(s, o.accountId); const asset = assetOf(s, o.assetId);
  const by = me!.id; const mine = o.createdBy === by;
  const myStep = o.approvals.find((x) => x.status === "pending" && x.by === by);
  const editable = mine && ["draft", "changes"].includes(o.status);
  const need = approversFor(o.discountPct, s.cfg);
  const [mgrDisc, setMgrDisc] = useState(o.discountPct);
  const [msg, setMsg] = useState("");
  const opp = oppOf(s, o.oppId); const ni = !!opp && isNI(opp) && opp.stage !== "order"; const [agree, setAgree] = useState(false);
  const blocked = aboveLimit(o.discountPct);
  const draftMail = () => setMail(emailFor(s, o, me!.name));
  const done = ["won", "lost", "rejected"].includes(o.status);
  /* a bid covers many lifts, earlier prices are per lift: compare like with like */
  const lifts = o.product === "newinstall" ? (tenderOf(s, oppOf(s, o.oppId)?.tenderId)?.lifts ?? 1) : 1;
  const unit = { ...o, price: o.price / lifts };
  const bidT = o.product === "newinstall" ? tenderOf(s, oppOf(s, o.oppId)?.tenderId) : undefined;

  // the one recommended step for this person right now
  let step: { title: string; why: string; body?: React.ReactNode } | null = null;
  if (myStep) step = { title: o.discountPct > GUIDE.seller ? "Decide on this discount" : "Approve this quotation", why: o.discountPct > GUIDE.seller ? `${acc?.name} asks for ${o.discountPct}% off, above the ${GUIDE.seller}% guideline. Everything you need is below.` : `Every quotation needs your approval before it goes to ${acc?.name}. Check the price and the answers it was built from. You can change the discount before you approve.` };
  else if (mine && ["draft", "changes"].includes(o.status) && blocked) step = { title: `Lower the discount: ${o.discountPct}% is more than a manager can approve`, why: `A manager approves up to ${GUIDE.manager}%. Above that you need the regional lead's written approval outside this app, or a lower discount. Use the slider below.` };
  else if (mine && o.status === "draft") step = { title: need.length ? `Send for approval to ${need.map((u) => NAMES[u]).join(" then ")}` : "Ready to send: no approval needed", why: need.length ? (o.discountPct > GUIDE.seller ? `${o.discountPct}% is above your ${GUIDE.seller}% limit. A manager has to approve before anything goes to the customer.` : "Every quotation is approved by the Sales Manager before it goes to the customer.") : `${o.discountPct}% is within your ${GUIDE.seller}% limit. Check the price and write the email.` };
  else if (mine && o.status === "changes") step = { title: "Revise the offer and send it again", why: o.approvals.find((x) => x.status === "changes")?.reason ?? "The approver asked for changes." };
  else if (mine && o.status === "approved") step = { title: "Review the email and send it", why: "Approved. Edit the email if you like, then send it to the customer." };
  else if (mine && o.status === "awaiting") step = { title: `Waiting for ${o.approvals.filter((x) => x.status === "pending").map((x) => NAMES[x.by]).join(", ")}`, why: "You will get a message here as soon as there is a decision." };
  else if (mine && o.status === "sent") step = { title: now - o.lastActivity >= 14 * 86400000 ? "Follow up: nothing has moved in 14 days" : "Log the outcome when the customer answers", why: `Sent ${new Date(o.sentAt ?? 0).toLocaleDateString("en-CH")}. A follow-up email is drafted for you.` };

  return (
    <div className={`${embedded ? "p-4 @2xl:p-6" : "p-4 @2xl:p-8"}`}>
      {!embedded && <Back onClick={onBack} label={o.oppId ? "Back to the opportunity" : "Back"} />}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs font-bold text-muted">{o.id}</span><OfferPill o={o} /></div>
        {!embedded && <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">{acc?.name}: {o.title}</h1>}
        <p className="mt-1 text-sm text-muted">{asset?.label ?? AREA_NAME[o.area]} · prepared by {userOf(o.createdBy)?.name ?? o.createdBy} · {AREA_NAME[o.area]}</p>
      </header>

      {done && <Card className="mb-5 flex items-center gap-3 p-5"><span className={`grid h-10 w-10 place-items-center rounded-full ${o.status === "won" ? "bg-emerald-100 text-emerald-700" : "bg-surface text-muted"}`}><Icon n={o.status === "won" ? "trophy" : "check"} s={20} /></span><div><div className="text-[15px] font-semibold">{ST[o.status][0]}</div><div className="text-[13px] text-muted">{o.log[o.log.length - 1]?.text}</div></div></Card>}

      {step && (
        <Card className="mb-5 border-brand/25">
          <div className="p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand"><Icon n="sparkle" s={13} /> Next best action</div>
            <h2 className="mt-2 text-xl font-semibold leading-snug">{step.title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{step.why}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {myStep && <label className="flex w-full max-w-sm flex-col text-xs text-muted">Discount to approve: <b className="text-ink">{mgrDisc}%</b>{mgrDisc !== o.discountPct ? ` (asked ${o.discountPct}%)` : ""}<input type="range" min={0} max={GUIDE.manager} step={1} value={mgrDisc} onChange={(e) => setMgrDisc(Number(e.target.value))} className="mt-2 w-full accent-[#e3001b]" /></label>}
              {myStep && <><Btn onClick={() => mutate((st) => SH.decide(st, o.id, by, "approved", "", mgrDisc))}><Icon n="check" s={15} /> Approve at {mgrDisc}%</Btn><Btn v="ghost" onClick={() => setDlg("changes")}>Ask for changes</Btn><Btn v="ghost" onClick={() => setDlg("reject")}>Reject</Btn></>}
              {mine && o.status === "draft" && !blocked && <Btn onClick={() => mutate((st) => SH.submit(st, o.id, by))}>{need.length ? "Send for approval" : "Mark ready to send"}</Btn>}
              {mine && o.status === "changes" && !blocked && <Btn onClick={() => mutate((st) => SH.submit(st, o.id, by))}>Send for approval again</Btn>}
              {mine && o.status === "approved" && !mail && <Btn onClick={draftMail}><Icon n="send" s={15} /> Write the email</Btn>}
              {mine && o.status === "awaiting" && <Btn v="ghost" onClick={() => mutate((st) => SH.remind(st, o.id, by))}>Remind</Btn>}
              {mine && o.status === "sent" && <><Btn onClick={() => setMail(chaseEmail(s, o, me!.name))}>Draft a follow-up</Btn>{ni ? <Btn v="ghost" onClick={() => setAgree(!agree)}>Customer agreed</Btn> : <Btn v="ghost" onClick={() => mutate((st) => { SH.outcome(st, o.id, by, "won"); if (o.source) A.outcome(st, o.source.itemId, by, "won"); })}>Won</Btn>}<Btn v="ghost" onClick={() => setDlg("lost")}>Lost</Btn></>}
            </div>
          </div>
        </Card>
      )}

      {agree && ni && opp && o.status === "sent" && (
        <Card className="pop mb-5 p-5">
          <Label>The customer agreed</Label>
          <p className="mb-3 text-[13px] text-muted">Record what they agreed to. The Sales Manager approves the win, then Sales support creates the order. The deal counts as won when the order exists.</p>
          <AgreedForm o={opp} onDone={() => setAgree(false)} />
        </Card>
      )}
      {mail && (
        <Card className="pop mb-5 p-5">
          <Label>Email to {(oppOf(s, o.oppId)?.contact ?? acc?.contact)?.name} ({(oppOf(s, o.oppId)?.contact ?? acc?.contact)?.role})</Label>
          <Input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} aria-label="Subject" className="mb-2 font-medium" />
          <Textarea value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} aria-label="Body" className="min-h-56 leading-relaxed" />
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => { const m = mail; if (o.status === "sent") mutate((st) => SH.chase(st, o.id, by)); else mutate((st) => SH.send(st, o.id, by, m)); setMail(null); }}><Icon n="send" s={15} /> {o.status === "sent" ? "Send follow-up" : "Send to customer"}</Btn>
            <Btn v="ghost" onClick={() => setMail(null)}>Cancel</Btn>
          </div>
          {o.status !== "sent" && <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[13px]"><Icon n="doc" s={15} /><span className="flex-1">Attached: <b>{bidT ? `${bidT.id}-bid` : `${o.id}-${o.product === "newinstall" || o.product === "modernisation" ? "quotation" : "offer"}`}.pdf</b></span><button onClick={() => document.getElementById(`draft-${bidT?.id ?? o.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="text-[12.5px] font-semibold text-brand">Review it</button></div>}
          <p className="mt-2 text-[11.5px] text-muted">Written by SHERPA from the offer and account data. Nothing is sent until you press send.</p>
        </Card>
      )}

      {bidT ? <div className="mb-5"><DraftEditor docRef={{ kind: "bid", id: bidT.id }} live={bidT.bid ? { discountPct: bidT.bid.discountPct } : undefined} canEdit={false} canComment={!done && (mine || me!.role === "mgr")} label="The bid letter the customer gets" note="Approved by the Sales Manager in the bid builder. Comments go to the people who prepared it." /></div> : <div className="mb-5"><DraftEditor docRef={{ kind: "quote", id: o.id }} canEdit={editable || !!myStep} canComment={!done && (mine || !!myStep || me!.role === "mgr")} label={`The ${o.product === "newinstall" || o.product === "modernisation" ? "quotation" : "offer"} the customer gets`} note={myStep ? "Edit the wording before you approve, or leave a comment for the rep." : editable ? "SHERPA wrote this from the answers and the site visit. Click a section to change it." : undefined} /></div>}

      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <Label>The offer</Label>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><div className="num text-3xl font-semibold tracking-tight">{chf(o.price)}</div><div className="text-[13px] text-muted">{PRODUCT[o.product].yearly ? `${chf(o.price / o.term)} per year × ${o.term} year${o.term > 1 ? "s" : ""}` : "one-off"}{o.discountPct ? ` · list price ${chf(o.listPrice)}` : ""}</div></div>
            </div>
            <DiscountGauge pct={o.discountPct} />
            {editable && (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-surface p-3 @2xl:grid-cols-2">
                {PRODUCT[o.product].yearly && <label className="text-xs text-muted">Term<Choice value={String(o.term)} onChange={(v) => mutate((st) => SH.setTerms(st, o.id, by, { term: Number(v) }))} aria-label="Term" className="mt-1 text-ink" options={[1, 3, 5].map((t) => ({ value: String(t), label: `${t} year${t > 1 ? "s" : ""}` }))} /></label>}
                <label className="text-xs text-muted">Discount: {o.discountPct}%<input type="range" min={0} max={30} step={1} value={o.discountPct} onChange={(e) => mutate((st) => SH.setTerms(st, o.id, by, { discountPct: Number(e.target.value) }))} className="mt-3 w-full accent-[#e3001b]" /></label>
              </div>
            )}
          </Card>
          {o.brief && <Card className="p-5"><Label>Built from these answers</Label><div className="rounded-xl border border-line px-3"><Field k="Floors" v={o.brief.floors} /><Field k="Load" v={o.brief.load} /><Field k="Speed" v={o.brief.speed} /><Field k={o.product === "modernisation" ? "Scope" : "Finish"} v={o.brief.finish} /><Field k="Needed" v={o.brief.timeline} />{o.brief.extras && <Field k="Also" v={o.brief.extras} />}</div></Card>}
          {o.chat && <CustomerChat o={o} msg={msg} setMsg={setMsg} send={() => { const m = msg; setMsg(""); mutate((st) => SH.chat(st, o.id, by, m)); }} won={ni ? () => setAgree(true) : () => mutate((st) => { SH.outcome(st, o.id, by, "won"); if (o.source) A.outcome(st, o.source.itemId, by, "won"); })} wonLabel={ni ? "Record the agreement" : "Mark as won"} canWrite={mine && o.status === "sent"} />}
          <Card className="p-5"><Label>Price check for {AREA_NAME[o.area]}</Label><RegionCard o={unit} /></Card>
          <Card className="p-5"><Label>Earlier quotes of this kind</Label><PastQuotes area={o.area} product={o.product} price={perYear(unit)} discountPct={o.discountPct} /></Card>
        </div>
        <div className="space-y-5 @4xl:sticky @4xl:top-4">
          {(o.status === "awaiting" || myStep) && (
            <Card className="p-5"><Label>Approval</Label>{o.approvals.length === 0 ? <div className="text-sm text-muted">None needed.</div> : o.approvals.map((x) => <div key={x.by} className="flex items-center justify-between py-1.5 text-sm"><span>{NAMES[x.by]}</span><Pill tone={x.status === "approved" ? "green" : x.status === "pending" ? "amber" : "red"}>{x.status === "pending" ? "Waiting" : x.status === "approved" ? "Approved" : x.status === "changes" ? "Changes asked" : "Rejected"}</Pill></div>)}</Card>
          )}
          <Card className="p-5"><Label>Customer</Label><div className="rounded-xl border border-line px-3"><Field k="Account" v={acc?.name} /><Field k="Contact" v={`${acc?.contact.name}, ${acc?.contact.role}`} /><Field k="Area" v={AREA_NAME[o.area]} />{asset && <Field k="Unit" v={asset.label.split(" · ")[0]} />}</div></Card>
          <Card className="p-5"><Label>Activity</Label><ol className="space-y-3 text-[13px]">{[...o.log].reverse().map((l, k) => <li key={k} className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{l.text}<span className="block text-xs text-muted">{l.by}</span></span></li>)}</ol></Card>
        </div>
      </div>

      {dlg === "changes" && <Dlg title="What should change?" text="For example: 12% is the most I can approve here" cta="Ask for changes" onClose={() => setDlg(null)} onOk={(v) => mutate((st) => SH.decide(st, o.id, by, "changes", v))} />}
      {dlg === "reject" && <Dlg title="Why are you rejecting it?" text="A short reason the seller will see" cta="Reject" onClose={() => setDlg(null)} onOk={(v) => mutate((st) => SH.decide(st, o.id, by, "rejected", v))} />}
      {dlg === "lost" && <Dlg title="Why was it lost?" options={["Price", "Competitor offer", "Customer postponed", "No reply"]} cta="Log as lost" onClose={() => setDlg(null)} onOk={(v) => mutate((st) => { SH.outcome(st, o.id, by, "lost", v); if (o.source) A.outcome(st, o.source.itemId, by, "lost"); })} />}
    </div>
  );
}

function CustomerChat({ o, msg, setMsg, send, won, wonLabel, canWrite }: { o: Offer; msg: string; setMsg: (v: string) => void; send: () => void; won: () => void; wonLabel: string; canWrite: boolean }) {
  const { now } = useApp();
  const msgs = o.chat ?? [];
  const agreed = msgs.some((m) => m.from === "customer" && /go ahead|order form|sign/i.test(m.text));
  return (
    <Card className="p-5">
      <Label>Conversation with the customer</Label>
      <ol className="space-y-2.5">{msgs.map((m, k) => (
        <li key={k} className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] ${m.from === "us" ? "bg-ink text-white" : "bg-surface"}`}>
            {m.text}
            {m.file && <div className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${m.from === "us" ? "text-white/80" : "text-muted"}`}><Icon n="doc" s={13} />{m.file}</div>}
            <div className={`mt-1 text-[11px] ${m.from === "us" ? "text-white/60" : "text-muted"}`}>{m.by} · {ago(now - m.t)}</div>
          </div>
        </li>))}</ol>
      {agreed && o.status === "sent" && canWrite && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-900"><Icon n="check" s={15} /><span className="flex-1">The customer agreed.</span><Btn sm onClick={won}>{wonLabel}</Btn></div>}
      {canWrite && <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) send(); }} className="mt-3 flex gap-2"><Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write to the customer…" aria-label="Message to the customer" className="min-w-0 flex-1" /><Btn type="submit" disabled={!msg.trim()}><Icon n="send" s={14} /> Send</Btn></form>}
      <p className="mt-2 text-[11.5px] text-muted">Demo: the customer&apos;s replies are simulated.</p>
    </Card>
  );
}
