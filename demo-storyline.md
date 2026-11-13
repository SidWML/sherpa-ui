# SHERPA demo: three lifts, three ways to win

A walkthrough for a manager. It follows three real-looking opportunities, one for each line of business, from the first sighting to a signed deal:

| Story | Line | The opportunity | Ends with | Time |
|---|---|---|---|---|
| **1** | Modernisation (MOD) | An old Schindler lift in a mall, snapped by an employee | Signed modernisation contract | 15 min |
| **2** | Existing installation (EI) | A competitor's lift whose owner is unhappy with the service | Signed 3-year maintenance contract, won from a competitor | 10 min |
| **3** | New installation (NI) | A building site with no lifts yet, then a formal tender | 6-lift order handed to the installation team | 12 min |

Each person sees only their own next step, and SHERPA guides every step: it scores, researches, drafts, reviews and checks.

> **Everything in the demo is simulated.** Customers, their replies, emails, e-signatures, tender documents and SHERPA's suggestions are mocked in the browser. No real customer data is used and nothing leaves the app.

---

## The one-line pitch

**Any Schindler employee who sees a lift opportunity can turn it into a lead in under a minute. SHERPA takes it through review, research, a site visit, a quotation or a tender bid, approval and a contract, guiding each person at their step, until the deal is signed.**

## The problem we are solving

| Today | With SHERPA |
|---|---|
| Opportunities seen in the field are lost: no easy way to report them, no feedback to the person who saw it | Snap a photo, answer a few taps, get points and follow the lead to the result |
| Leads arrive unscored; the manager sorts them by gut feel | Every lead arrives scored, with the reasons, our history at that site and a suggested owner |
| Finding the decision-maker on a building site takes days of calls | Sales support gets the permit, company register, customer records and tender portal in one place |
| Tender documents are read by hand, and bids are built in spreadsheets | SHERPA reads the tender, asks only what it leaves open and drafts the bid with earlier prices |
| Quotations, bid letters and contracts are written in Word and reviewed by email | Drafts are written by SHERPA and reviewed, commented on and edited inside the platform |
| Discount, delivery and legal risks are spotted late, or not at all | SHERPA flags risks next to the draft and fixes them in one click |
| Handovers between sales, support, the manager and installation are invisible | One deal record from lead to order; everyone sees who is doing what |

---

## Before the meeting (5 minutes)

1. Start the app: `npm run dev`, then open `http://localhost:3000` (SHERPA) and `http://localhost:3000/snap` (Snap & Lead) in two tabs.
2. Avatar menu → **Demo controls** → **Reset demo data**. Reset once: the three stories use different deals, so they can run back to back.
3. Have two lift photos and any PDF ready on the laptop (the PDF is the customer's letter of intent in Story 3).
4. Optional: make the window narrow for the technician scenes to show the phone layout.

**Switching people:** the avatar menu (or the bar under the phone in Snap & Lead) → **Switch role**. Every list is sorted newest first, so the story's deal is the **top row**.

## The cast

| Person | Role | In stories |
|---|---|---|
| **Arjun Rao** | Any Schindler employee (the reporter), Snap & Lead | 1, 2 |
| **Madhav Reddy** | Sales Manager | 1, 2, 3 |
| **Teja Goud** | Field technician | 1, 2 |
| **Meera Krishnan** | Modernisation sales rep | 1 |
| **Eshwar Varma** | Existing installation sales rep | 2 |
| **Naveen Chowdary** | New installation sales rep | 3 |
| **Shalini Nair** | Sales support | 1, 2, 3 |
| **Srikanth Naidu** | Service lead (installation team) | 3 |
| **Lakshmi Prasad** | Account manager | 1 |

---

# Story 1 · Modernisation: an old lift in a mall becomes a signed contract

### Scene 1. Arjun snaps a lift — *Snap & Lead, Arjun Rao*

**Say:** "Arjun isn't in sales. He's at Banjara Central Mall and notices an old lift. Today that thought dies there."

**Click:**
1. **Take or upload photos** → add two photos → tag one **Elevator** → **Analyse**.
2. **Search for a building** → **Banjara Central Mall, Block B** → brand **Schindler** → **Yes, looks right**.
3. Unit **61102** · **Minor issues** · why: **It looks old or worn** → **All of it** · **Ours (Schindler)** · **2 to 4** · contact *Sandhya Reddy, centre manager*.
4. **Review the lead** → **Create lead**.

**They will see:** SHERPA checks our records. Unit 61102 is 27 years old, so the lead is filed as a **Hot modernisation lead, score 100**.

**Point to make:** "A few taps, no forms, no sales knowledge needed. SHERPA, not Arjun, worked out that this is a modernisation lead."

### Scene 2. The manager pursues it — *Madhav Reddy*

**Click:** **Lead review** (opens by default) → top row *Banjara Central Mall, Block B*.

**They will see:** the score and the reasons behind it, SHERPA's insight and a next best action: "Book a modernisation survey". The owner is already suggested: **Meera Krishnan**.

**Click:** site visit by **Teja Goud** → **Pursue and assign**.

**Point to make:** "Madhav doesn't triage a raw inbox. Every lead arrives scored, explained and routed. His job is one decision."

### Scene 3. The technician visits — *Teja Goud, on the phone*

**Click:** **My visits** → top row → met *Sandhya Reddy, Centre manager* · lifts *3* · floors *G+4* · **Wear and small faults** · **The person I met** · **Now** → **File the site-visit report**.

### Scene 4. SHERPA drafts and reviews the quotation — *Meera Krishnan* ★

**Click:** **My work** → top row → **Start the quotation** → **1,000 kg (13 persons)** · **1.75 m/s** · **Controller and drive** → **Draft the quotation** → **Open OF-…**.

**They will see:** *The quotation the customer gets*, written by SHERPA from the answers and the site visit. Beside it, **SHERPA review** shows 1 risk and 2 improvements:
- ⚠ *Say how long the price holds.*
- ✦ *Open with what we found on site.*
- ✦ *Give dates, not "as agreed".*

**Click:** **Show me** on one tip → **Apply all 3 fixes**. Hover the Opening → **Rewrite** → **More formal**, then **Comment**: *"OK to mention the site visit?"* → set the discount to **12%** → **Send for approval**.

**They will see:** the opening now thanks the customer for meeting Teja and names the wear he found. Delivery now has dates ("one lift at a time, so the building stays in use"), and a 30-day validity is added.

**Point to make:** "No Word file and no email attachments. SHERPA drafts and reviews the document, and the rep stays in control."

### Scene 5. The manager approves — *Madhav Reddy*

**Click:** **My work** → top row → **Review and decide**. Read the draft and Meera's comment → **Resolve** → **Approve at …%**.

**Point to make:** "He approves the document the customer will actually read, next to the price check for the area and our earlier quotes."

### Scene 6. Send and win — *Meera Krishnan*

**Click:** top row → **Open OF-…** → **Write the email** (**Review it** jumps to the attached quotation) → **Send to customer**. Answer the customer three times; after the third reply the customer agrees → **Mark as won**.

### Scene 7. The contract — *Meera, Shalini, Madhav*

1. **Meera:** top row → **Open the contract draft**. SHERPA flags ⚠ **No completion date** → **Apply fix** → **Send for the commercial check**.
2. **Shalini:** **Contracts** → top row → read the draft and SHERPA's review → **Check passed**.
3. **Madhav:** **Contracts** → top row → **Approve**.
4. **Meera:** top row → **Send for e-signature** → **Send for e-signature** → **Customer signs (demo)**. The contract is **Active** and the deal is **Won**.

### Scene 8. Closing the loop — *Lakshmi Prasad, then Arjun*

1. **Lakshmi:** **Accounts** → *Banjara Retail Pvt Ltd*. The modernisation line is active and the signed contract is listed.
2. **Arjun**, `/snap`: **My leads** → top row: **Won, +275 points**.

**Point to make:** "The person who took the photo sees it become a signed deal. That's what makes people report the next one."

---

# Story 2 · Existing installation: winning a competitor's lift

**The idea:** a lift serviced by a local firm, in a building that is already our customer. The owner is unhappy with the service. SHERPA spots the opening, suggests the offer that usually wins, and the deal ends as a 3-year maintenance contract taken from a competitor.

### Scene 1. Arjun snaps another company's lift — *Snap & Lead, Arjun Rao*

**Click:**
1. **Take or upload photos** → add two photos → tag one **Elevator** → **Analyse**.
2. **Search for a building** → **Deccan Tech Park, Tower 2** → **Another brand** → type **Otis 55120** → **Yes, looks right**.
3. **Minor issues** · who services it: **A local firm** · lifts: **5 or more** · person in charge: **A facility manager** · contact *Ravi Kumar, facility manager, 98480 12345*.
4. **Did you speak to them?** **Yes, open to a call** · **Happy with their service company?** **Unhappy**.
5. **Review the lead** → **Create lead**.

**They will see:** a lead tracker with the sales and account progress, and what Arjun earns at each step (+20 accepted, +50 quote sent, +200 won).

**Point to make:** "These two extra questions take Arjun five seconds, and they are exactly what a sales rep needs to know about a competitor's customer."

### Scene 2. The manager sees why it matters — *Madhav Reddy*

**Click:** **Lead review** → top row *Deccan Tech Park, Tower 2*, **Hot 100**.

**They will see:**
- The score: +40 another company's lift, +15 person in charge open to a call, +15 unhappy with the current servicer.
- A warning banner: **Why we lost here last time: Competitor offer**.
- SHERPA insight: Deccan Tech Parks is already a customer with 3 units; 6 of 8 similar quotes in the area were won, at an average discount of 8%.
- Next best action: *Competitor-serviced unit: approach the owner with a maintenance offer.*

**Click:** owner **Eshwar Varma** (suggested), visit **Teja Goud** → **Pursue and assign**.

**Point to make:** "SHERPA remembers that we lost here before and why. That history used to sit in one person's head."

### Scene 3. The technician visits — *Teja Goud, on the phone*

**Click:** **My visits** → top row → met *Ravi Kumar, Facility manager* · lifts *6* · floors *G+14* · **Wear and small faults** · **The person I met** · **Within 3 months** → **File the site-visit report**.

### Scene 4. SHERPA suggests the winning offer — *Eshwar Varma* ★

**Click:** **My work** → top row.

**They will see:** the customer is already linked (existing customer) and SHERPA offers two next best actions:
- **Win the service: 3-year maintenance, 10% off.** "Serviced by someone else. A first-year discount is the usual way in."
- **1-year maintenance trial at list price.** "A low-risk first step for a cautious owner."

**Click:** **Draft this offer** on the 3-year option → **Open OF-…**.

**They will see:** the offer SHERPA wrote, with **SHERPA review**: 1 risk and 2 improvements (no validity date, open with what we found on site, **state the breakdown response time**, which is what customers compare between maintenance offers).

**Click:** **Apply all 3 fixes** → move the discount to **15%**, since we lost here to a competitor's offer before → **Send for approval**.

**Point to make:** "The rep didn't have to know the playbook for winning a competitor's customer. SHERPA proposed it, and the review added the 4-hour response promise."

### Scene 5. The manager approves the discount — *Madhav Reddy*

**Click:** **My work** → top row → **Review and decide**. 15% is above the 10% guideline, so he sees the price check for the area before deciding → **Approve at 15%** (or slide it lower).

### Scene 6. Send and win — *Eshwar Varma*

**Click:** top row → **Open OF-…** → **Write the email** → **Send to customer**. The customer asks service questions:
1. "How fast do you respond when a lift breaks down?" → *"Within 4 hours, all days."*
2. "Our current contract ends next month. Can you start straight after?" → *"Yes, we can start next month."*
3. "That works for us. Please send the contract…" → **Mark as won**.

### Scene 7. The service contract — *Eshwar, Shalini, Madhav*

1. **Eshwar:** top row → **Open the contract draft**. SHERPA has already put the 4-hour service level and a 5% yearly price escalation in the contract, so its review says **Looks ready** → **Send for the commercial check**.
2. **Shalini:** **Contracts** → top row → **Check passed**.
3. **Madhav:** **Contracts** → top row → **Approve**.
4. **Eshwar:** top row → **Send for e-signature** → **Send for e-signature** → **Customer signs (demo)**. A **3-year maintenance contract, active**.

### Scene 8. Arjun sees the result — *Snap & Lead*

**My leads** → top row *Deccan Tech Park, Tower 2*: **Won, +275 points**.

**Point to make:** "We took a competitor's customer, starting from a photo taken by someone outside sales."

---

# Story 3 · New installation: a building site becomes a 6-lift order

**The idea:** a building under construction with no lift supplier yet. Nobody knows who to call. SHERPA and Sales support find the decision-maker and the tender, SHERPA reads the tender document, and the team builds, checks and sends the bid. The deal ends as an order handed to the installation team.

*Tarun Reddy, a field technician, spotted the site on his rounds. The lead is already in the demo data.*

### Scene 1. The manager decides to pursue — *Madhav Reddy*

**Click:** **Lead review** → *Kokapet Skyline (building site)*, **Hot 75**.

**They will see:** the score (+60 building site with no lift yet, +10 structure going up, +5 the developer is already a customer). The next best action: *"Building sites are won before the tender. Ask for the timeline and whether a tender is planned."*

**Click:** **Pursue with Naveen**.

### Scene 2. The rep accepts and asks for help — *Naveen Chowdary*

**Click:** **My work** → *New installation: Kokapet Skyline (building site)* (OP-942, spotted by Tarun Reddy) → **Accept**.

**They will see:** "We have no contact. Pick how to find one." There are three options: **Ask Sales support**, **Ask Tarun Reddy** (who saw the site), or **I will find them myself**.

**Click:** under *Ask Sales support*, also tick **Tender document** → **Ask Shalini**.

**Point to make:** "A building site has no phone number. Instead of the rep spending two days on calls, the right person researches it."

### Scene 3. Sales support finds the decision-maker and the tender — *Shalini Nair*

**Click:** **My work** → top row.

**They will see:** findings grouped by source:
- the **building permit**: *S. Lakshmi, Project director*, with a phone number;
- the **company register**;
- our **customer records**;
- the **e-procurement portal**: *Tender notice: lifts for Kokapet Skyline*, with the PDF.

The permit contact and the tender are already ticked.

**Click:** **Share with Naveen**.

### Scene 4. The rep talks to the customer — *Naveen Chowdary*

**Click:** top row. The task is now *"Call or visit S. Lakshmi"*, and her name is filled in.

Fill in **Phone call** · what was said: *"Structure at floor 12. Tender is out on the state portal, bids due in 30 days."* · lifts **6** · floors **G+24** → **Has a formal tender** (the tender PDF from Shalini is already attached) → **Save the conversation**.

### Scene 5. SHERPA reads the tender — *Shalini Nair* ★

**Click:** top row → **Fill in the lift details**.

**They will see:** the bid builder.
- **"Why we lost this customer before":** *Lost the 2025 Madhapur tower bid on price: OtherLift was 14% lower with a longer lead time.*
- **The tender document, read by SHERPA**, each point with its page: 6 passenger lifts, 20 stops, 1.75 m/s, delivery 12 months, last date to submit, and a bid security of 2% as a bank guarantee.
- **Only what the document leaves open** is asked: rated load, door type, cabin finish, free maintenance.

**Click:** **1,350 kg (20 persons)** · **Centre-opening, 2 panels** · **Stainless steel, hairline** · **24 months** → **Draft the bid**.

**Point to make:** "Nobody retypes the tender. SHERPA reads it, shows where each answer came from, and asks only for the gaps."

### Scene 6. The manager prepares the bid and fixes the letter — *Madhav Reddy* ★

**Click:** **My work** → top row → **Open the bid builder**.

**They will see:**
- the price with **what we quoted before** in the area;
- the **8 bid papers**, most of them filled by SHERPA;
- **5 · The bid letter**, written from the tender, with **SHERPA review** showing 2 risks and 2 improvements:
  - ✦ *We lost this customer before on price. Lead with lifetime cost.*
  - ✦ *Commit to a delivery time.* (the tender scores delivery)
  - ⚠ *List what is not included.* (civil work and scaffolding)
  - ⚠ *Say how long the bid holds.*

**Click:** **Fill all I can** → **Mark ready** on the two papers he confirms himself (bid security, signed declarations) → **Apply all 4 fixes** → **Prepare the bid**.

**They will see:** the cover letter now argues lifetime cost. Delivery reads "within 12 months, as the tender asks". Exclusions and a 90-day validity are added.

**Point to make:** "The lesson from the last lost bid is used in the next one automatically."

### Scene 7. Two checks before it goes out — *Shalini, then Naveen*

1. **Shalini:** top row → tick the four contract terms (payment, delivery and penalty, warranty, liability) → **Terms and papers are fine**.
2. **Naveen:** top row → *"Confirm the bid matches what S. Lakshmi asked"*. He sees the customer's request next to the bid (6 lifts, G+24, 12 months, price) → **It matches**.

### Scene 8. Send, win and hand over — *Naveen, Madhav, Shalini, Srikanth*

1. **Naveen:** top row → **Open OF-…** (the approved bid letter is shown) → **Write the email** (the bid PDF is attached) → **Send to customer**.
2. **Naveen:** top row → **Customer agreed** → attach the customer's yes (any PDF, e.g. a signed letter of intent) → **Send to the Sales Manager**.
3. **Madhav:** top row → **Approve the win**. He sees the agreed price, the discount, the start date and the proof.
4. **Shalini:** top row → **Create the order**. The order number, delivery and payment terms are filled in, and the deal counts as won.
5. **Srikanth Naidu:** **My jobs** → top row. The **handover pack** has the customer, site contact, lifts, order, price, payment terms and every paper → **Accept the job**.

**Point to make:** "From a building site nobody had a number for, to a ₹2.4 crore order with the installation team. Every handover is visible and nothing is retyped."

---

## Encore (optional, 3 min): where the next deal comes from

- **Account management — Lakshmi Prasad:** **Accounts** → *Banjara Retail* → Next best actions → **Raise for review** on "Win the service on 1 unit serviced by others". It lands in Madhav's Lead review, marked *from Account plan*.
- **Marketing — Manoj Verma:** **Marketing** → **New campaign** → goal **Modernisation** → **Draft the message with SHERPA** → **Save the campaign** → **Send to … contacts** → **Simulate a day of replies (demo)** → **Leads** → top row → **Send to the Sales Manager**.

**Point to make:** "Field reports, account plans and campaigns all feed one queue, one scoring model and one process."

---

## How the three stories differ

| | Modernisation | Existing installation | New installation |
|---|---|---|---|
| Where the lead comes from | Our old lift, snapped | A competitor's lift, snapped | A building site, spotted by a technician |
| What SHERPA knows up front | The unit's age from our records | We lost here before; the owner is unhappy | The developer is a customer; a lost bid and why |
| How the customer is found | Met on the site visit | Met on the site visit | Sales support researches the permit, register and tender portal |
| What gets drafted | Quotation from a short questionnaire | Maintenance offer from a next best action | Bid from the tender document SHERPA read |
| What SHERPA's review catches | Validity, delivery dates, personal opening | Validity, breakdown response time | Lifetime-cost argument, delivery, exclusions, validity |
| How it ends | Signed modernisation contract | Signed 3-year maintenance contract | Order handed to the service lead |

## What to stress

1. **One record from first sighting to signed deal.** No re-keying between the reporter, sales, support, the manager and installation.
2. **Each person sees only their next step.** Every screen opens on "your move", so there is no training manual.
3. **SHERPA guides, people decide.** It scores, researches, reads tenders, drafts and reviews. Every fix is a click a person chooses, and every change is logged.
4. **Our history is used.** Lost bids, earlier prices and win rates show up at the moment they matter.
5. **Built-in control.** Discount guidelines, manager approval, the sales support check, the rep's "it matches" check and legal wording checks are part of the flow.

## Questions they may ask

| Question | Answer |
|---|---|
| Is the AI real? | In the demo, SHERPA's scoring, research, tender reading and reviews are simulated from rules and seeded data. Only the photo reader can call a real model, and only when a key is set. The next step is to put a model behind the same screens. |
| Where does the data come from? | Seeded demo data for Telangana. In production: the CRM, the installed-base records, the building permit and company registers, and the tender portals. |
| Who decides the approval rules? | The admin. By default, only discounts above the 10% guideline need the manager. It can be switched to "every quotation is approved". |
| What if the rep disagrees with SHERPA? | **Dismiss** the tip. It is logged, and any section can be edited by hand or reset to SHERPA's draft. |
| What if a building site has no tender? | In Scene 4 of Story 3 the rep picks **Wants a quote** instead. The deal then follows the quotation path from Story 1. |
| Does it work on a phone? | Yes. Snap & Lead and the technician's visit form are built for the phone, and SHERPA adapts to the screen. |

## If something goes wrong during the demo

- **Lost your place:** switch to the person in the next scene; their top row is the story's deal. In Story 3, Naveen has two *Kokapet Skyline (building site)* rows; use **OP-942**, spotted by Tarun Reddy.
- **Need a clean start:** avatar menu → **Demo controls** → **Reset demo data**, then begin the story again.
- **Short on time:** don't skip scenes, because each one unlocks the next. Run the early scenes before the meeting and start live at the starred scenes (★). Also, every step of the new-installation path has a seeded deal waiting (see chapter 4 of `snap-to-deal-flow.md`), so you can show any NI step on its own.
