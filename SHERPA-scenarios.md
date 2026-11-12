# SHERPA PoC: scenarios and cases (draft for review)

This is the list of what the demo must cover. Nothing here is built yet beyond Snap & Lead.
Items marked **(assumed)** are my guesses where the deck gives no detail. Please correct them.

**Legend:** ✅ built today · 🔁 built, must change · 🆕 new · ❓ needs your decision

---

## 1. Snap & Lead: the cases we already have (145 cases, 13 groups)

All 145 cases are written down in `lib/data.ts`. **83 of them run as photo scenarios.** The rest are rules and behaviours (routing, privacy, sync, points) that are only partly built.

| Group | What it covers | Cases | Run as photo scenarios | Not runnable yet |
|---|---|---|---|---|
| A Safety | Unsafe lift, hurt or not, not ours, outside area, no signal | 6 | A1–A6 | none |
| B Our lift | Contract active, ended, ending, none, warranty, old, not in records, wrong details, key customer | 21 | B1–B19 | B20, B21 |
| C Another company's lift | Local firm, maker, staff, nobody, old, expired certificate, premium, key customer, lost bid | 17 | C1–C13, C15 | C14, C16, C17 |
| D Site and building | Building site, competitor or we install, renovation, outside area, no rep | 11 | D1–D3, D5, D8, D9 | D4, D6, D7, D10, D11, D12 |
| E Photo quality | Read fully, partly, not at all, not a lift, duplicate, old photo, several matches | 14 | E1, E2, E4, E5, E9, E10, E12 | E3, E6, E7, E8, E11, E13, E14 |
| F Location | GPS, refused, no building, later, mismatch | 9 | F1, F3, F5, F6, F7 | F2, F4, F8, F9 |
| G Duplicates and history | Open lead, same employee, colleague, lost, won, open ticket, big deal | 10 | G1–G3, G5–G8 | G4, G9, G10 |
| H Routing and follow-up | Owner found, no rep, on leave, declines, no action 24/48/72h, two teams, key customer, closed | 12 | rule-driven | H3, H7–H10, H12 (others partly built) |
| I Information and privacy | Contact captured, guard, do-not-contact, existing contact, overheard prices | 5 | rule-driven | all (not built) |
| J Technical | No signal, retry, system down, sync conflict, wrong clock | 8 | J1 | J2–J8 |
| K Points and recognition | Normal, duplicate, junk, two reporters, late win, daily limit, safety, leaver | 8 | K1 (K6 as a rule) | K2–K5, K7, K8 |
| L Special situations | Technician on a job, complaint, quote on the spot, batch, language, no camera, competitor crew | 7 | rule-driven | all (not built) |
| M Escalators and moving walks | Same patterns as A–D for escalators | 16 | M1–M16 | none |

### What must change in Snap & Lead
1. 🔁 **The AI decides the scenario, the user never picks one.** Done for new site and no-brand lift. The sample photos stay only as demo shortcuts.
2. 🔁 **Every reply ends with quick actions and a short "why".** Quick actions exist already. The "why" (signal, data used, rule) is new.
3. 🔁 **A created lead becomes a NewCRM-style lead and feeds the NBA engine.** For example a competitor-serviced unit creates the NBA "Competitor-serviced units" for the EI/REP seller.
4. 🔁 **The owner works the lead in the same chat and app**, not in separate desk forms. The desk pages stay as the "app" view of the same data.
5. 🔁 **Roles are renamed and extended** to the deck's personas (see section 2).
6. 🆕 **Build the missing cases:** the 62 cases that don't run yet (lists in the table above), starting with privacy (I1–I5), sync (J2–J8), points (K2–K8) and special situations (L1–L7).
7. 🔁 **Allow "reporter" to be any seller**, not only a Snap & Lead employee.

---

## 2. Roles

| Deck persona | Existing role today | Change |
|---|---|---|
| NI sales rep | Noah Brandt (ni) | 🔁 Gets the Today feed |
| EI / REP sales rep | Ethan Weber, Elias Bauer (ei) | 🔁 Main persona for the first demo |
| SC sales rep | Sofia Marin (sc) | 🔁 |
| MOD sales rep | Mia Keller (mod) | 🔁 |
| Sales manager | Marc Huber (mgr) | 🔁 Gets approval briefs and pipeline risk |
| Sales support | none | 🆕 |
| Account manager | Lena Fischer (am) | 🔁 One account view across lines |
| Marketing | none | 🆕 |
| (supporting, from the Snap & Lead brief) | Reporter (Alex, Tom), Records steward, Emergency desk, Service, Leadership, Admin | ✅ Keep |

---

## 3. The 27 Next Best Actions as scenarios

Each NBA is a scenario with: trigger, mock agent, what the chat offers, who approves, and how it ends.
Numbers from the deck are used where it gives them; the rest are **(assumed)**.

### 3a. Installed base and modernization (12)

| # | Next best action | Persona | Trigger | Mock agent | Chat offers (quick actions) | Approver | End state |
|---|---|---|---|---|---|---|---|
| 1 | Recent callback on assets | REP, SC, MOD | A callback on a unit in the last 14 days (assumed) | Sales Assistant, CRM Agent | Open brief · Log call · Not now | none | Brief saved, call logged |
| 2 | Contract changed after OBR | REP | Contract amended after an open OBR | CRM Agent | Review · Send corrected OBR to back office | back office confirms | OBR corrected |
| 3 | Contract cancelled or ending | REP, SC, MOD | Ends within 60 days or cancelled | CRM Agent, Churn | Draft offer · Compare 2 options · Plan visit | manager if discount above guideline | Offer sent, then renewed or lost |
| 4 | High OBR with open MOD offer | MOD | OBR volume above threshold and an open MOD offer | Price Pilot, MOD Propensity | Open joint case · Alert EI rep | none | Shared EI–MOD plan |
| 5 | MOD on the same asset (w.i.p.) | REP | An MOD opportunity exists on a unit the REP owns | CRM Agent | Alert both owners · Bundle offer | none | Bundled offer |
| 6 | SC contract changes in offer (w.i.p.) | SC | Contract text changed during an open offer | Contract Risk Reviewer | Explain change · Update offer | none | Offer updated |
| 7 | Renewal at risk | REP, SC | Low health score and ends within 90 days (assumed) | Customer Health, Churn | Early flag · Draft renewal plan | none | Plan agreed |
| 8 | Rising callbacks | REP | Callbacks up 40% (from the deck) | Customer Health, Sales Assistant | Retention visit brief · Book visit | none | Visit logged |
| 9 | Competitor-serviced units | REP | Snap & Lead found a competitor-serviced unit at an account we serve | Snap & Lead, CRM Agent | Create opportunity · Brief me | none | Opportunity created |
| 10 | Repair need in tech notes | REP | A technician note mentions a repair or part | Repair Lead Generation | Draft repair quote · Edit | manager above limit (assumed) | Quote sent |
| 11 | Ageing units, frequent faults | MOD | Age 25+ years and 4+ faults in 90 days (assumed) | MOD Propensity, Price Pilot | Build business case · Price it | manager if discount above guideline | Case sent |
| 12 | Obsolete parts or code change | MOD | Parts obsolete or a code change applies | MOD Propensity | Alert customer · Propose upgrade | none | Customer alerted |

### 3b. New business, management and accounts (15)

| # | Next best action | Persona | Trigger | Mock agent | Chat offers (quick actions) | Approver | End state |
|---|---|---|---|---|---|---|---|
| 13 | EORD near, not final bidding | NI, MOD, SC | End of order date near and stage not "final bidding" | Tender Insight, CRM Agent | Set final bidding · Open bid checklist | none | Stage updated |
| 14 | Loss history with account | NI | We lost a bid at this account before | Sales Assistant | Why we lost · What to change | none | Notes added |
| 15 | Matched tender or permit | NI | New tender or permit in the territory | Project Lead Finder, Tender Insight | Summarize · Qualify as lead | none | Lead created or dismissed |
| 16 | Quote idle 14+ days | NI | Quote sent, no activity for 14 days | Proposal Generator, CRM Agent | Draft follow-up email · Revised offer · Snooze | manager if price changes | Email sent, follow-up set |
| 17 | Competitor spec in tender | NI | The tender names a competitor's spec | Tender Insight | Prepare counter-argument · Add to offer | none | Argument saved |
| 18 | Stalled deals in pipeline | Manager | 3 deals stalled (from the deck) | CRM Agent | Show deals · Nudge owners · Reassign | none | Deals moved or nudged |
| 19 | Discount above guideline | Manager | A quote's discount is above the guideline | Price Pilot | Open approval brief · Approve · Ask for changes · Reject | the manager | Quote approved or sent back |
| 20 | Coaching need on win rate | Manager | Win rate below peers. **Off by default** until works-council review | CRM Agent | Show coaching prompt | works council first | n/a in demo |
| 21 | Quote missing data | Sales Support | A quote is incomplete | Configuration Assistant | Complete it · Ask the seller | none | Quote complete |
| 22 | Approval blocking a deal | Sales Support | An approval waits more than 48h (assumed) | CRM Agent | Escalate with context · Remind approver | the approver | Approved or escalated |
| 23 | New unit handed over | REP, AM | A new unit is handed over with no maintenance contract | Conversion Alerts | Offer maintenance contract · Draft offer | manager if discount above guideline | Contract offered |
| 24 | Key account silent too long | Account manager | No activity for 60 days (from the deck) | CRM Agent, Customer Health | Account review · Brief me · Draft outreach | none | Review logged |
| 25 | Cross-sell NI, Service, MOD | Account manager | Active in one line, not in the others | Handover Pack, Conversion Alerts | Create handover pack · Draft intro | none | Pack sent to next line |
| 26 | Ageing-portfolio cluster | Marketing | A segment with many ageing units | Customer Segmentation, Personalized Outreach | Build audience · Draft campaign | marketing lead (assumed) | Campaign ready |
| 27 | Leads not followed up 48h | Marketing | Leads without action for 48 hours | CRM Agent | Nudge owner · Reassign | none | Lead worked or moved |

---

## 4. "Ask SHERPA" chat cases (the pull side)

Each starts from typed text or a suggested prompt, asks only what it needs, shows a draft with its sources, and ends with quick actions.

| # | The seller says | Paths the chat takes (conditions) |
|---|---|---|
| 1 | "Brief me before my visit" | Account known or asked · active contract or ended or none · open leads and callbacks · competitor units on site |
| 2 | "What changed in this contract?" | Contract changed during offer or not · explains the difference · offers to update the offer |
| 3 | "Draft the renewal" | Contract ending soon or at risk · standard terms or custom · price by location or market · discount within or above guideline |
| 4 | "Compare these two options" | 2 or 3 offer variants · price vs guideline · margin note · recommended one with reasons |
| 5 | "Price this modernization" | Standard package or custom · location or market price list ❓ · discount tier decides the approver |
| 6 | "Draft the follow-up email" | Which quote or lead · tone and language · attachments · schedule a reminder |
| 7 | "Notes to repair quote" | Notes found or pasted · part list · price · customer contract covers it or not |
| 8 | "Summarize this tender" | Tender found or pasted · deadline · competitor spec · go or no-go suggestion |
| 9 | "Which accounts are at risk this quarter?" | Own accounts or team · health score · contract end · callbacks trend |
| 10 | "Summarize pipeline risk for my team" (manager) | Stalled deals · discounts waiting · weakest areas · works-council limits on individuals |
| 11 | "One view of this account, all lines" (account manager) | NI, EI, MOD and branches · overlaps flagged · health |
| 12 | "Complete this configuration" (sales support) | Missing fields found · asks the seller · standard vs custom |
| 13 | "Build an audience for a MOD campaign" (marketing) | Segment rules · size · exclusions · draft message |
| 14 | "Where do my approvals stand?" | Pending · blocked over 48h · who is next · nudge |
| 15 | A photo or "I saw a lift…" | The full Snap & Lead flow from section 1 |

---

## 5. Conditions that change the path

| Condition | Values | What it changes |
|---|---|---|
| Standard or custom | standard package · custom | Questions asked, price source, approver |
| Contract | active · ending · ended · none · cancelled · warranty | Which NBA fires, offer type |
| Location or market ❓ | sales area · country · group company | Price list and guideline. **The deck does not define this** |
| Discount ❓ | within guideline · above · far above | Approver: none · manager · regional lead (assumed) |
| Competitor present | serviced by us · another firm · own maker · staff · nobody | Win-back or conversion path |
| Key account | yes · no | Account manager joins, local rep still owns the lead |
| Age and health | under 20 · 20–25 · over 25 years · fault count | Modernization path |
| Tender stage | early · EORD near · final bidding | Tender NBAs |
| Time idle | quote 14 days · key account 60 days · lead 48 hours | Follow-up and nudges |

---

## 6. Lifecycles, so no flow ends halfway

- **Lead:** Submitted → Assigned → Contacted → Visit → Quote → Won or closed (tracks already exist per type) ✅
- **NBA:** Detected → Shown → Accepted, Not now or Dismissed → Draft made → Approved → Done → Feedback saved 🆕
- **Offer or draft:** Draft → Price and guideline check → Approval if needed → Sent → Follow-up reminder → Won or lost 🆕
- **Approval:** Requested → Waiting → Approved, Changes asked or Rejected (with a real reason) → Seller told 🆕
- **Exceptions:** nobody owns it · approval waiting over 48h · quote idle over 14 days · owner on leave · routing paused 🔁 (partly built)

---

## 7. Decisions (agreed)

1. **Location = a sales area.** For any area SHERPA shows: do we sell this product there, how many offers we made in the last 12 months, the average, lowest and highest price, and how many were won. The price check compares a new offer with these.
2. **Discount limits (my proposal, accepted):** up to 10% the seller sends alone · 10–20% the sales manager approves · over 20% the regional lead (Karin Lehmann) also approves.
3. **Demo story starts with Snap & Lead lead creation.** A photo creates a lead, the lead becomes a Next Best Action, the seller drafts an offer, the price check flags the discount, the manager approves, the seller sends an email, a 14-day follow-up fires, and the outcome is logged. This one story covers NBAs 3, 9, 16, 19 and 22.
4. **Which NBAs work fully in the first build (depth over breadth).** Chosen as product manager and sales admin: 1, 3, 7, 9, 16, 18, 19, 22, 23, 24, 27 (11 of 27). The other 16 are listed in the admin catalogue as "coming", with their trigger and agent, so nothing is hidden. Number 20 (coaching) stays off until works-council review.
