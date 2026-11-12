# Snap & Lead: Product Requirements Document

Nov 11, 2026 · @Ram · Draft v0.1 for review

## Summary

Snap & Lead lets any employee photograph a lift, elevator or escalator and report it in about 15 seconds. The system checks our records, works out what the lift is, and sends the right team a ready-made lead in Salesforce.

The employee adds up to six photos and a location, answers the few questions that case needs in a friendly chat, and taps Create. A salesperson, service team or records team then gets a summary and suggested actions that match their role. The employee sees progress on every report and earns points.

| Item | Summary |
| --- | --- |
| What | A responsive web app for phone, tablet and desktop, installable on a phone |
| Who | Any employee reports. Sales, service, records and managers act on reports |
| Where it fits | The capture front end for the Snap & Lead agent in SHERPA. Salesforce NewCRM stays the system of record |
| Value | Renewal and win-back leads, modernisation leads, new-installation leads, a more complete record of installed lifts, and visibility of lifts serviced by competitors |
| First release | A pilot in one city, after owners and data are ready |

This draft separates what comes from the SHERPA plan from what is new here. New items are marked **Proposed**.

**Decisions requested**

- Approve a pilot in one city.
- Decide the points and rewards approach, and whether points can feed the existing company AI portal account.
- Name an owner for each lead type, a records steward, and a service contact for emergencies.
- Confirm capacity for the web app. The SHERPA plan's team of 7 has no web or mobile engineer and no data steward.

## Problem and opportunity

Employees see lifts every day that sales and service never hear about. Some are ours but missing from our records, some are ours and unserviced, and many belong to competitors. This product turns those sightings into leads and better records.

| Problem | Effect | Evidence |
| --- | --- | --- |
| Older lifts are missing from our installed-base records | We cannot target renewals or service for lifts we do not know exist | Stated by the business. Size unknown |
| Employees have no simple way to report a lift they see | Sightings are lost | Assumed. Needs checking with field staff |
| Lifts serviced by competitors are not tracked | No view of win-back and conversion chances | The SHERPA plan proposes a "Competitor-serviced units" action and relies on Snap & Lead for it |
| Leads are not always followed up | Reporters stop reporting when nothing happens | The SHERPA plan proposes a "Leads not followed up 48 hours" action |
| Sales juggle disconnected tools | Slow, scattered follow-up | Documented in the SHERPA persona journeys |

**Value pools**

- **Service contracts.** Renewal of ended contracts, win-back of lifts now serviced by others, conversion of unserviced competitor lifts.
- **Modernisation.** Very old lifts, any brand, with faults.
- **New installations.** Building sites and planned projects spotted before tender.
- **Data.** A more complete installed base, which improves every other SHERPA action.

**What we know and what we still need to find out**

| Known | Assumed | To find out |
| --- | --- | --- |
| Snap & Lead is a live SHERPA agent | Employees see lifts and would report them | How many lifts are missing from the installed base |
| NewCRM stays the system of record | A photo is enough to identify brand and number most of the time | How often licence numbers can be read in real photos |
| Sales owners exist for new installations, existing installations, service contracts, modernisation and key accounts | Sales will act within a day when a lead is Hot | Current lead volume and follow-up rate |

## Goals, non-goals and success measures

The pilot succeeds if employees report lifts quickly, sales acts on the leads, and the installed base gets more complete. All targets below are **Proposed** starting points. No baselines exist yet, so tune them after the first four weeks.

**Goals**

1. Reporting takes about 20 seconds or less for a clean case.
2. Every confirmed report reaches the right owner within minutes, with a summary and suggested actions.
3. Every report shows progress that matches its situation, until the real work ends.
4. The installed base gains lifts we did not know about.
5. Employees have a clear personal benefit and form a reporting habit.

**Non-goals**

- Not a new CRM. Salesforce NewCRM holds leads, accounts and opportunities.
- Not a pricing or contract tool. People keep prices, contracts and customer commitments.
- Not a tracker of employee location. Location is taken only when a report is made.
- Not an emergency dispatch system. It alerts the existing emergency desk.
- AI never decides tier, owner or safety. Fixed rules do, and every result shows its reasons.
- No cash payment per report.

**Success measures**

| Measure | Definition | Pilot target (Proposed) |
| --- | --- | --- |
| Speed | Median time from opening Snap to Create, clean case | 20 seconds or less |
| Adoption | Share of invited employees who report at least once in the first 8 weeks | 25% or more |
| Habit | Active reporters who report at least twice a month | 40% of reporters |
| Quality | Reports verified as valid | 85% or more |
| Junk | Reports rejected as fake or unusable | 5% or less |
| Response | Hot leads accepted by the owner within 24 hours | 80% or more |
| Feedback | Reports with a progress update within 48 hours | 90% or more |
| Data | Lifts added to the installed base | Tracked. Target set after week 4 |
| Outcome | Reports that become a quote or a win | Tracked. Target set after week 8 |

**Guardrails**

| Guardrail | Limit (Proposed) |
| --- | --- |
| Emergency alert acknowledged by the emergency desk | Within 10 minutes |
| Privacy incidents (faces, personal data, wrong access) | Zero |
| Reports made while driving or in unsafe conditions | Zero known |
| Complaints from customers or buildings about photography | Zero unresolved |

## Users and roles

Every employee can report. Eleven other roles receive, fix or oversee reports. Six of them come from the SHERPA plan. The rest are **Proposed** here and need an owner.

| Role | Who | What they need | Main actions | Source |
| --- | --- | --- | --- | --- |
| Reporter | Any employee, including technicians | A fast way to report and a reason to bother | Snap, add location, answer questions, create a lead, follow own reports, earn points | Proposed. The plan covers sellers only |
| Existing-installation (EI) sales rep | Sales owner | Leads on lifts we know, and competitor-serviced units | Accept or decline, contact, visit, quote, log outcome | SHERPA plan |
| Service contract (SC) sales rep | Sales owner | Renewal and win-back leads | Same as above | SHERPA plan |
| Modernisation (MOD) sales rep | Sales owner | Very old lifts of any brand | Same as above, plus survey | SHERPA plan |
| New-installation (NI) sales rep | Sales owner | Building sites and planned projects | Same as above, plus tender match | SHERPA plan |
| Account manager | Key account owner | A view across one customer's sites | Review, coordinate with local reps | SHERPA plan |
| Sales manager | Team lead | Only what is stuck | Reassign, nudge, approve merges, override tier with a reason | SHERPA plan for the role. Exceptions-only framing is Proposed |
| Records steward | Data owner | Mismatched, missing and duplicate lifts | Confirm match, merge, add lift, correct, reject | Proposed |
| Emergency desk | Service dispatch | Unsafe-lift alerts at once | Acknowledge, dispatch, close | Proposed |
| Service team | Service | Faults on lifts we maintain | Create service ticket, fix, close | Proposed |
| Leadership | Sales and service heads | Programme results | View dashboard, subscribe to a digest | Proposed |
| Administrator | Product team | Safe control of rules | Edit rules, weights, territories, follow-up times, questions, users | Proposed |

Sales Support and Marketing are SHERPA roles. They join in a later release. Marketing can use clusters of sightings as campaign audiences.

**Release 1 roles.** Reporter, SC rep, EI rep, sales manager, records steward and emergency desk. The other sales roles receive leads by the same route once the pilot proves it.

**What each role may see**

- Reporters see only "ours", "not ours" or "needs a clearer photo", plus the team a report went to. They never see contract or price details.
- Contact names and phone numbers are visible only to the lead's owner and the sales manager.
- Owners see their own leads. Managers see their area. Leadership sees totals.
- Reporter identity is visible to the owner, manager, records steward and emergency desk.

The full visibility matrix is in the appendix.

## Scope and fit

Snap & Lead is the capture front end for the live Snap & Lead agent in SHERPA. It feeds SHERPA and Salesforce. It does not replace either.

**Equipment covered.** Lifts and elevators (two words for the same equipment), escalators and moving walks. The app shows the word that fits the user's region. Escalators and moving walks follow the same flow, with their own safety wording and rules.

**Proposed:** include escalators and moving walks in the pilot with the same rules as lifts, once a sales owner is named for them. The escalator safety rules must be approved before launch.

| System | Role in this product | Status |
| --- | --- | --- |
| Salesforce NewCRM | System of record for leads, accounts, opportunities and tasks. Sellers work here | Exists |
| Snap & Lead agent | Photo reading and lead logic | Live |
| CRM Agent | Writes confirmed leads to Salesforce | Live. Used for the pilot |
| SHERPA NBA API and engine | Creates next best actions for owners from sightings | To build. SHERPA Release 1 plans a proof of concept on 11 Dec 2026, Einstein replacement on 29 Jan 2027, and quick wins on 19 Feb 2027 |
| Installed-base records, SAP service, IoT | Read for matching and history | Exist. Data quality unknown |
| Company AI portal | Possible entry point and points account | To confirm |

**What ships when**

| Capability | Release |
| --- | --- |
| Photos (up to six) and location: use my location, search a place, type an address | Pilot |
| Photo reading, records matching, duplicate check | Pilot |
| Friendly chat with only the questions still needed | Pilot |
| Lead preview and Create, written to Salesforce | Pilot |
| Progress tracks for the core situations | Pilot |
| Safety path and emergency inbox | Pilot |
| Offline capture and later sync | Pilot |
| My reports, report detail, alerts, profile | Pilot |
| Basic points and levels | Pilot |
| Owner summary and suggested actions in NewCRM | Pilot, through the CRM Agent |
| Manager exception list and records steward queue | Pilot |
| Progress tracks for all situations | Scale |
| Next best actions through the SHERPA NBA API | Scale |
| Leadership dashboard and admin console | Scale. The pilot uses configuration files |
| Impact stories, batch mode (several lifts in one building) | Scale |
| Entry point in the company AI portal and Teams | Scale |
| Field guide, weekly mission, team goal | Extend |
| Marketing audiences, Ask SHERPA chat, discovery map | Extend |
| Equipment type: lift or elevator, escalator, moving walk | Pilot, once an escalator owner is named |

## The complete flow

Every report follows one path from sighting to outcome, and an Unsafe answer leaves that path at once for the emergency desk.

&#91;embedded content: complete flow · 12 steps, 1 safety branch\]

1. **Spot.** An employee sees a lift and opens Snap.
2. **Add photos and place.** Up to six photos from the camera or gallery. Location by use my location, search a place, or type an address.
3. **Read.** The system finds brand, lift number, service sticker, capacity and age, and the employee corrects anything wrong.
4. **Look up.** The system checks our installed-base records, open leads in Salesforce, earlier reports and service history.
5. **Safety check.** If the employee says Unsafe at any point, the flow stops and the emergency desk is alerted. No sales lead is created.
6. **Chat.** One question at a time, and only what this case needs. A detail missing from the photos is asked for here, with a guide to where to find it. The employee can type it or say they cannot find it. A Something unsafe control is always on screen.
7. **Preview.** A plain-words summary: what we found, who gets it, the progress steps, and the points.
8. **Create.** Nothing exists until the employee confirms. The lead is written to Salesforce with a unique report ID. Points start as pending.
9. **Route.** Fixed rules pick the situation, the tier and the owner by building area. One photo can create several leads or tasks.
10. **Follow up.** The owner sees a summary and suggested actions for their role in NewCRM. Hot leads trigger reminders at 24, 48 and 72 hours.
11. **Outcome.** The owner logs the result. The reporter sees the final step, a thank-you, an impact story if it was won, and confirmed points.
12. **Extras.** After sending, the employee can add a contact, a note or more photos for bonus points.

## Functional requirements

Requirements are grouped in ten sets. Priority is Must, Should or Could for the release shown. All requirements are **Proposed** until reviewed.

**Capture**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| CAP-1 | Add one to six photos from the camera or gallery. Preview, remove and reorder them | Must | Pilot |
| CAP-2 | Tell the employee what to photograph: button panel, licence plate, service sticker, capacity plate | Should | Pilot |
| CAP-3 | Compress photos before upload and resume interrupted uploads | Must | Pilot |
| CAP-4 | Save a draft automatically if the app closes mid-report | Must | Pilot |
| CAP-5 | Block an exact duplicate photo. Flag old gallery photos whose date or place do not match | Should | Pilot |
| CAP-6 | Warn that photography may not be allowed in hospitals, government buildings and airports | Should | Pilot |
| CAP-7 | Detect faces and blur or reject the photo | Should | Scale |
| CAP-8 | Batch mode: add several lifts in one building without re-entering the place | Should | Scale |
| CAP-9 | Choose the equipment type: lift or elevator, escalator, moving walk. The photo reader suggests it | Must | Pilot |
| CAP-10 | Let the employee add more photos at any point, including when the assistant asks for a specific one, such as the plate | Should | Pilot |

**Location**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| LOC-1 | Use my location: ask permission, pin the position, show accuracy, suggest the nearest known building within 200 m | Must | Pilot |
| LOC-2 | Search a place among known buildings | Must | Pilot |
| LOC-3 | Type an address for a new place and choose the sales area it belongs to | Must | Pilot |
| LOC-4 | If accuracy is poor, ask the employee to confirm the place | Should | Pilot |
| LOC-5 | If several buildings are nearby, show a list to pick from | Should | Pilot |
| LOC-6 | Allow "reporting later" and mark the report as such | Should | Pilot |
| LOC-7 | Optional block, floor and lift name for multi-block buildings | Could | Scale |
| LOC-8 | Flag a location that conflicts with the photo's own location data | Should | Scale |

Location sits in the same step as the photos. It is never a separate screen and never on the home screen.

**Photo reading and matching**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| RD-1 | Read brand, lift number, service sticker, capacity and estimated age, each with a confidence level | Must | Pilot |
| RD-2 | Show each finding for quick correction by the employee | Must | Pilot |
| RD-3 | If reading fails or the service is down, offer manual entry | Must | Pilot |
| RD-4 | The reader only extracts details. It never sets tier, owner or safety | Must | Pilot |
| RD-5 | If a photo holds several lifts, ask which one | Should | Scale |
| RD-6 | Keep every correction so reading improves over time | Should | Scale |
| MT-1 | Match by lift number. If missing, match by place and brand | Must | Pilot |
| MT-2 | Treat place-only matches as low certainty and send them to the records steward | Must | Pilot |
| MT-3 | Check open leads, open service tickets and earlier reports for duplicates | Must | Pilot |
| MT-4 | Detect lifts recorded as scrapped, replaced or in another building | Should | Scale |
| MT-5 | Check lead history: lost recently, already won, part of a larger deal | Should | Scale |
| RD-7 | When a detail cannot be found, tell the employee which detail is missing and where it is usually found, such as a plate near the doors or the control panel | Must | Pilot |

**Conversation**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| CH-1 | Ask one question at a time as quick replies, and only what is still needed | Must | Pilot |
| CH-2 | Ask how the equipment is running only when there is equipment to judge, never for a building site. Offer fine, minor issues, out of service, unsafe and not sure | Must | Pilot |
| CH-3 | Ask for service sticker, lift count, construction stage or lift number only when the answer changes the outcome | Must | Pilot |
| CH-4 | When the answer is Unsafe, switch to a calm, direct tone with no jokes | Must | Pilot |
| CH-5 | Never show contract, price or customer details to the reporter | Must | Pilot |
| CH-6 | Reveal findings one by one and react to the situation in short, plain words | Should | Pilot |
| CH-7 | After sending, offer optional extras (contact, note, more photos) for bonus points | Should | Pilot |
| CH-8 | Support the employee's language | Should | Scale |
| CH-9 | For a building site, ask the construction stage and whether the developer says the lift is already ordered | Must | Pilot |
| CH-10 | For an escalator or moving walk, ask whether anyone is hurt instead of trapped, and use escalator safety wording | Must | Pilot |
| CH-11 | Use the word lift or elevator to match the employee's region and language | Should | Pilot |
| CH-12 | The question set depends on the case. A building site is asked its stage, the developer and whether the lift is already ordered. Another company's lift is asked the servicing firm. Our lift missing from records is asked its unit number | Must | Pilot |
| CH-13 | When a detail is missing from the photos, name it, say where it is usually found, offer to take another photo, accept manual entry, and allow "I cannot find it". The report is still accepted, with lower certainty | Must | Pilot |
| CH-14 | A "Something unsafe?" control is always on screen, so a safety report never depends on a question being asked | Must | Pilot |
| CH-15 | Allow "not sure" on every question. Never block a report because an answer is missing | Must | Pilot |
| CH-16 | Ask the employee to check only from public or common areas. Never ask anyone to enter a machine room or restricted area, or to move equipment | Must | Pilot |
| CH-17 | If a detail is still missing after sending, send the reporter a "needs info" alert and show the task to the records steward | Should | Pilot |

**Lead creation**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| LD-1 | Show a preview first: place, what we found in plain words, who gets it, progress steps, points | Must | Pilot |
| LD-2 | Create nothing until the employee confirms | Must | Pilot |
| LD-3 | Write to Salesforce through the CRM Agent in the pilot and the NBA API at scale. A unique report ID means a retry never creates a duplicate | Must | Pilot |
| LD-4 | Each lead carries source, report ID, situation, tier, score with reasons, reporter, location and photo links | Must | Pilot |
| LD-5 | Store photos outside Salesforce and link to them | Must | Pilot |
| LD-6 | One report can create several leads or tasks, for example a sales lead and a records task | Must | Pilot |

**Routing and follow-up**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| RT-1 | Route by situation and by the building's registered sales area | Must | Pilot |
| RT-2 | If no owner exists, send the lead to the manager's exception list | Must | Pilot |
| RT-3 | Follow-up clock for Hot leads: reminder at 24 hours, manager told at 48, manager reassigns at 72 | Must | Pilot |
| RT-4 | An owner may decline only with a reason from a fixed list | Must | Pilot |
| RT-5 | A manager may override the tier only with a reason, and the change is logged | Must | Pilot |
| RT-6 | Use a backup owner when the owner is on leave | Should | Scale |
| RT-7 | Every report stores the ID of the case that decided its route, so results can be audited and rules tuned | Must | Pilot |

**Owner experience in NewCRM**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| OW-1 | Each lead shows a summary written for the owner's role: what we know, why it matters, suggested next steps | Must | Pilot |
| OW-2 | Suggested actions: accept, call, log visit, create opportunity, mark not relevant with a reason, snooze, request a data fix | Must | Pilot |
| OW-3 | Show "why this lead" with the score reasons | Must | Pilot |
| OW-4 | Stage changes in Salesforce flow back to the reporter's progress | Must | Pilot |

**Manager, records steward, emergency desk, service**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| MG-1 | Exception list: unrouted, no action in 48 hours, possible duplicates, declined leads | Must | Pilot |
| MG-2 | Reassign one lead or many | Must | Pilot |
| MG-3 | Team board of leads by stage | Should | Scale |
| RS-1 | Queue of unmatched, mismatched, duplicate and new-place reports, oldest first | Must | Pilot |
| RS-2 | Side-by-side review of the new photo against the candidate record | Must | Pilot |
| RS-3 | Actions: same lift, different lift, create record, merge, correct, reject, mark scrapped | Must | Pilot |
| RS-4 | Every fix updates the installed base through an agreed process | Must | Pilot |
| ED-1 | Inbox shows photo, location, reporter contact and the trapped-or-hurt answer | Must | Pilot |
| ED-2 | Acknowledge, dispatch (creates a service order) and close | Must | Pilot |
| ED-3 | For a lift that is not ours, send a standard message to the building owner and log it | Must | Pilot |
| ED-4 | No sales action is created until the emergency is closed | Must | Pilot |
| SV-1 | A fault on a lift under contract creates a service ticket linked to the report | Should | Pilot |

**Reporter experience**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| RP-1 | My reports: list with filters (in progress, done, needs me) and status | Must | Pilot |
| RP-2 | Report detail: photos, location, my answers, what we found in plain words, progress track, points, timeline | Must | Pilot |
| RP-3 | Add information later: contact, note, photos, lift number | Must | Pilot |
| RP-4 | Alerts when a report changes status or needs the reporter | Must | Pilot |
| RP-5 | Profile: points, level, history, reports and outcomes | Should | Pilot |
| RP-6 | Quick lookup: "Is this lift ours?" by lift number | Should | Pilot |
| RP-7 | Impact story when a report becomes a quote or a win | Should | Scale |

**Points, offline, admin and reporting**

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| PT-1 | Award points by the rules in the points section. Show pending and confirmed separately | Must | Pilot |
| PT-2 | Reverse points only for fake or junk reports | Must | Pilot |
| PT-3 | Award points into the company AI portal account if the portal allows it | Should | Scale |
| OF-1 | Capture offline, queue the report, and sync later with its unique ID | Must | Pilot |
| OF-2 | If an unsafe lift is reported offline, tell the employee to call the emergency desk now and send the alert when signal returns | Must | Pilot |
| OF-3 | Show "waiting to send" on queued reports | Must | Pilot |
| OF-4 | If the records system is down, accept the report and decide later | Should | Pilot |
| AD-1 | Administrators edit situations, starting points, tier thresholds, follow-up times, areas and owners | Must | Pilot, as configuration files |
| AD-2 | A switch to pause routing at once | Must | Pilot |
| AD-3 | Audit log of every rule change | Must | Pilot |
| RPT-1 | Funnel: reports, matched, leads, accepted, quoted, won | Must | Scale |
| RPT-2 | Response time, junk rate, installed-base coverage, adoption | Must | Scale |

## Business rules

Fixed rules, not AI, decide what a report is, how strong the lead is, and who gets it. Every result shows its reasons. All numbers here are **Proposed** and should be tuned after three to six months of real data.

**How a situation is found**

Every report is a combination of the answers to eight questions, after a photo-quality check.

1. Is it safe? Safe or unsafe.
2. Where is it? Inside our service area or outside, and which building.
3. Whose brand? Ours, another company's, or unclear.
4. Is it in our records? Found, found but wrong, or missing.
5. Who services it? Us, another company, its own maker, the building's staff, or nobody.
6. How is it running? Fine, minor issues, out of service, or not sure. Not asked for a building site.
7. How old is it and what kind of site? Age, building type, building site, key customer.
8. Is it already known? An open lead exists, it was reported before, or it was lost or won before.

The full specification covers 145 cases: 129 for lifts and elevators and 16 for escalators and moving walks. It follows this section. Cases marked with a dot ship in the pilot.

**Qualified and strong are different**

A lead is qualified when it is worth pursuing. Its score says how urgent and promising it is. The score is a priority, not a win probability. Win rates by tier are tracked from the pilot, and real probabilities replace guesses once the data supports them.

| Term | Question it answers | A building site in our area |
| --- | --- | --- |
| Qualified | Is this worth pursuing? | Yes, always |
| Score and tier | How urgent and promising is it? | Depends on stage, size and contact |
| Win probability | How likely are we to win? | Unknown until we have win and loss data |

A building site is never treated as a certain win. The lift may already be ordered, and other suppliers approach the same sites.

**Lead strength**

Each lead starts from a base score for its situation. Modifiers add or subtract points. The result is capped at 100.

| Starting situation | Base points |
| --- | --- |
| Our lift, another company services it now | 60 |
| Building site with no lift yet | 60 |
| Our lift, contract ended | 55 |
| Our lift, not in records, with a problem | 45 |
| Another site of a key customer | 45 |
| Our lift under contract with a problem | 40 |
| Another company's lift, local firm, building staff or nobody services it | 40 |
| Very old lift (modernisation lead) | 35 |
| Another company's lift serviced by its own maker | 20 |

| Modifier | Points |
| --- | --- |
| The reporter met someone at the site. For a building site, the developer or contractor | +10 |
| Five or more lifts in the building | +10 |
| Two to four lifts in the building | +5 |
| Mall or hospital (not for building sites) | +10 |
| Minor issues seen | +10 |
| Lift out of service | +20 |
| Four or more breakdown calls in 90 days (our lift) | +10 |
| Building site stage: early / structure going up / finishing work | +15 / +10 / -10 |
| Multi-tower or high-rise building site | +10 |
| Another company's lift about 20 years old or more | +10 |
| Modernisation lead: 25 years or older / problems on an old lift | +10 / +15 |
| Key customer | +10 |
| Photo reading was not certain | -10 |

| Tier | Score | Meaning |
| --- | --- | --- |
| Hot | 70 or more | Act within one working day |
| Warm | 45 to 69 | Act within three working days |
| Cold | 20 to 44 | Reviewed weekly |
| Information only | Under 20 | Saved. No lead |

If the developer says the lift is already ordered, a building-site lead drops to Cold and is saved as competitor intelligence. The building-site stage rules are Proposed. The new-installation team must confirm them, because lifts are often ordered before a building is visible from the street.

**Who gets it**

| Situation | Owner | Also told |
| --- | --- | --- |
| Ours: contract ended, ending soon or never had one | Service contract sales |  |
| Ours: another company services it | Service contract sales |  |
| Ours under contract with a problem | Service team | Existing-installation sales |
| Ours, not in records | Records team | Sales or service if there is a problem or another firm's sticker |
| Another company's lift | Existing-installation sales |  |
| Very old lift, any brand | Modernisation sales | The lift's other owner team |
| Building site or planned lift | New-installation sales |  |
| Key customer's other site | Local sales rep owns | Account manager |
| Government or public building | Tender team | Role to be defined |
| Unsafe | Emergency desk | No sales lead |
| No owner found for the area | Sales manager exception list |  |

**Follow-up clock**

| Tier | Owner reminded | Manager told | Manager reassigns |
| --- | --- | --- | --- |
| Hot | After 24 hours | After 48 hours | After 72 hours |
| Warm | After 72 hours | After 5 days | After 10 days |
| Cold | Weekly digest | None | None |

The 48-hour point comes from the SHERPA plan. The other times are Proposed.

**Progress the employee sees**

Progress follows the real journey of the situation and ends when the real work ends. A lift that only needs adding to our records never shows sales steps. When one photo creates two leads, the report shows two tracks.

| Situation | Steps the employee sees | Ends with |
| --- | --- | --- |
| Ours, not in records, running fine | Submitted, records team checks, added to our records | Added to records |
| Ours under contract, running fine | Submitted, noted | Noted |
| Ours under contract, with a problem | Submitted, service team told, engineer assigned, fixed | Fixed |
| Ours, contract ended | Submitted, assigned, customer contacted, offer sent | Renewed or not |
| Ours, another company services it | Submitted, assigned, contacted, offer sent | Won back or not |
| Another company's lift | Submitted, assigned, contacted, visit, quote | Won or closed |
| Very old lift | Submitted, assigned to modernisation, site survey, proposal | Won or closed |
| Building site | Submitted, assigned, developer contacted, tender or quote | Won or closed |
| Key customer's other site | Submitted, account manager told | Added to account plan |
| Unsafe | Alerted, acknowledged, engineer on the way | Closed |
| Already reported | Submitted, added to the existing lead | Follows that lead |
| Unclear photo | Submitted, clearer photo needed | Resumes when sent |
| Outside our area | Submitted | Saved as information |

## Role views and assignment

Each role gets a summary written for its job. Cases are assigned by team and by the building's registered sales area, and every case has a backup. This section is **Proposed** and must be confirmed by the sales, service and records heads.

| Role | What they see when a case reaches them | What they can do |
| --- | --- | --- |
| Service contract (SC) sales | Contract end date, last visit, breakdown history, who services the lift now if known, what the reporter saw and said, photos, the score reasons, a suggested opening | Standard sales actions, plus draft a renewal or win-back offer |
| Existing-installation (EI) sales | Brand, age, condition, servicing firm, our other lifts in the building, service history if ours, photos, the contact the reporter met, the score reasons, a suggested opening | Standard sales actions |
| Modernisation (MOD) sales | Age, faults and breakdown history, brand, parts risk, photos, building, any EI or SC lead on the same unit | Standard sales actions, plus request a survey |
| New-installation (NI) sales | Site photos, construction stage, developer or contractor if visible, whether the lift is already ordered, tender or permit match if any | Standard sales actions, plus match to a tender |
| Account manager (AM) | All sites of the customer, which teams are active on each, the new sighting | Review, coordinate with the local rep, add to the account plan |
| Sales manager | Exceptions: no owner, no action, duplicates, declined leads, disputed contracts, stuck records tasks | Reassign one or many, nudge, override tier with a reason, approve merges, spot-check points |
| Records steward (RS) | The photo beside the nearest record, extracted fields with confidence, place, reporter, possible duplicates, scrapped or replaced flags | Standard records actions |
| Emergency desk (ED) | Photo, location, reporter contact, the trapped-or-hurt answer, the unit if known, whether it is ours, time since the alert | Standard emergency actions |
| Service team (SVC) | The fault, the unit, contract and history, photos, urgency, a link to the report | Create ticket, assign engineer, close with outcome, hand back to sales if there is a renewal chance |
| Reporter | Status, what we found in plain words, the progress track, points, the timeline | Add contact, note, photos or the unit number later |
| Leadership | Totals only | View dashboard, subscribe to a digest |
| Administrator | Rules, weights, areas, follow-up times, audit log | Edit rules, pause routing |

**How assignment works**

- The owner is chosen by team and by the building's registered sales area. If several people share a team in that area, the lead goes to the person with the fewest open leads (Proposed).
- Backups: a sales owner's backup is the area's sales manager. A records steward's backup is a second steward. The emergency desk's backup is the service duty manager.
- An owner may decline only with a reason: wrong area, not our product, duplicate, already in progress, or other. A declined lead returns to the manager's list. The reporter's progress does not change.
- "Not relevant" also needs a reason: customer not interested, already served by us, not a real opportunity, or other.
- A manager can reassign, override the tier with a reason, and approve merges. Every change is logged.
- One report can create several leads or tasks. Each owner sees their own lead and a note that another team also has one.
- At a key customer's other site, the local rep owns the lead. The account manager is told and cannot take it over without the sales manager.
- If no owner exists for the team in the area, the lead goes to the sales manager's exception list.
- Hot leads follow the clock in the business rules: reminder at 24 hours, manager told at 48, manager reassigns at 72.

## Case-by-case specification

This section lists all 145 cases, in 13 groups. Each row says what the system decides, who is assigned, what that person sees and does, and what the employee sees. A dot marks the 36 cases that ship in the pilot. Everything here is **Proposed** until the sales, service and records teams review it.

**Legend**

| Short form | Meaning |
| --- | --- |
| SC, EI, MOD, NI | Service contract, existing-installation, modernisation and new-installation sales |
| AM | Account manager |
| MGR | The sales manager of the area |
| RS | Records steward |
| ED | Emergency desk |
| SVC | Service team |
| Standard sales actions | Accept or decline with a reason, call or email (logged), log visit, quote, create opportunity, mark not relevant with a reason, snooze, request a data fix |
| Standard records actions | Confirm match, create record, link, merge, correct, reject, mark scrapped |
| Standard emergency actions | Acknowledge, dispatch (creates a service order), notify building, close |
| MGR actions, always available | Reassign, nudge, override tier with a reason, approve a merge |
| Standard points | +10 report sent, +20 lead accepted, +50 quote, +200 won, all confirmed as each step happens |

**What the AI reads from the photos, in every case**

Equipment type, brand, unit number, the company name on any service sticker, capacity and estimated age. Each shows a confidence level, and anything under 70% is marked "please check" (Proposed). The AI only reads. Rules decide tier, owner and safety.

**What the system checks, in every case (rules, not AI)**

- Installed base: by unit number, then by place and brand if the number is missing.
- Salesforce: open leads, the account, key-customer status and lead history (lost or won before).
- Earlier reports from this employee and from others.
- SAP service: contract status, last visit and breakdown calls in the last 90 days.
- Building: registered sales area, type, other units we know there.

**What the employee is asked**

The questions depend on the case, and nothing is asked that the photos or records already answer. Every question can be answered "not sure" and none blocks a report. The set can include how it is running (only when there is equipment to judge) and: service sticker, unit count, construction stage, unit number, and whether anyone is hurt. Contact, note and extra photos are optional after sending. Contract, price and customer details are never shown to the reporter.

**Questions by case type**

| Case type | The employee may be asked | Not asked |
| --- | --- | --- |
| Our unit found in records, contract active | How it is running | Sticker, unit count |
| Our unit found, contract not active | How it is running. The service sticker | Unit count |
| Our unit not in records, or the number is unreadable | The unit number, with a guide to where it is. How it is running. The service sticker. The unit count |  |
| Another company's equipment | The servicing sticker. How many units are in the building. How it is running, with "not sure" allowed. A contact, optional |  |
| Building site, no lift yet | The construction stage. Whether the developer says the lift is already ordered. The developer or contractor name if visible. A contact, optional | How it is running |
| Planned lift or renovation notice | Who is doing it and until when, if visible | How it is running |
| Escalator or moving walk | How it is running: fine, minor issues, stopped or unsafe. Whether anyone is hurt, if unsafe | Trapped wording |
| Unsafe, at any point | Whether anyone is trapped or hurt | Everything else |
| Photo unclear | Which photo to retake and what it should show |  |

**When a detail is missing from the photos**

A photo may not show the unit number, the brand or the service sticker. The product never assumes it does. It follows this ladder.

1. The AI reads what it can and names what is missing, for example "I could not find the unit number".
2. The assistant says where that detail is usually found, such as a plate near the doors or the control panel, and offers to take another photo.
3. The employee can type the detail by hand.
4. The employee can answer "I cannot find it". The report is still accepted. The system matches by place and brand with lower certainty, and the records steward confirms it.
5. If a detail is still missing after sending, the reporter gets a "needs info" alert and can add it later.

The employee is only ever asked to check from public or common areas. The app never asks anyone to enter a machine room or restricted area, or to move equipment.

**A safety control that is always visible**

A "Something unsafe?" control is on every screen of the flow. A safety report never depends on a question being asked.

**Always logged**

The case ID, every input and its confidence, the score with its reasons, the owner, and every change with who made it and when.

**Progress tracks**

| Track | Steps the employee sees |
| --- | --- |
| Records | Submitted, records team checks, added or corrected |
| Noted | Submitted, noted |
| Fault | Submitted, service team told, engineer assigned, fixed |
| Renewal | Submitted, assigned, contacted, offer sent, renewed or not |
| Win-back | Submitted, assigned, contacted, offer sent, won back or not |
| Sales | Submitted, assigned, contacted, visit, quote, won or closed |
| Modernisation | Submitted, assigned, site survey, proposal, won or closed |
| Project | Submitted, assigned, developer contacted, tender or quote, won or closed |
| Account | Submitted, account manager told, added to the account plan |
| Emergency | Alerted, acknowledged, engineer on the way, closed |
| Info | Submitted, saved as information |
| Merge | Submitted, added to an existing lead, then follows that lead |
| Retake | Submitted, clearer photo needed, resumes when sent |
| Queued | Saved on the phone, sent when signal returns |

**How to read the group tables**

In each table, "System decides" says whether the case is qualified, what it creates and its starting score. "Assigned to" gives the owner, who else is told, and the backup if it differs from the default. "Owner sees and does" lists what is specific to the case. Where it says Standard, the standard actions above apply. The last column gives the track and the points.

### A. Safety (6 cases)

The AI needs only the location and, if visible, the brand. The employee reaches this group by tapping Something unsafe, which is always on screen, or by answering Unsafe to how it is running. The only follow-up question is whether anyone is trapped or hurt. The tone is calm and direct. No sales lead is created until the emergency is closed. Points for a valid safety report are +30 and a badge. They are never ranked.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| A1 ● | Unsafe, someone trapped or hurt | Emergency. No lead | ED. SVC too if ours. Backup: service duty manager | Photo, location, reporter contact, the answer, unit if known. Standard emergency actions | Emergency. +30 badge when ED confirms |
| A2 ● | Unsafe, nobody hurt (doors open between floors, exposed wiring, burning smell) | Emergency, lower urgency | ED. SVC too if ours | Same as A1 | Emergency. Same |
| A3 ● | Unsafe, not our lift | Emergency path. No sales until closed | ED | ED sees it is not ours. Sends the standard safety message to the building owner and logs it | Emergency, ending with "Building informed". Same |
| A4 | Unsafe, outside our area | Alert with a note on local rules | ED | ED informs the building and records local rules | Emergency, ending with "Building informed". Same |
| A5 ● | Unsafe, no signal | Saved on the phone. Employee is told to call the emergency desk now. Alert goes out when signal returns | ED on arrival | As A1, marked "sent late" | Emergency. "No signal, call the desk" shown. Same |
| A6 | Photo shows danger but the employee said fine | AI flags it. Assistant asks to confirm or switch to Unsafe | ED if switched, otherwise the normal case | As the resulting case | As the resulting case |

### B. Our lift or elevator (21 cases)

The AI reads that the brand is ours, the unit number, the sticker (ours or another firm's) and the age. The system checks whether the unit is in the installed base, its contract status, breakdown calls in the last 90 days, warranty status and open service tickets. The employee is asked how it runs, the sticker if unreadable and the contract is not active, and the unit count only if the unit is not in records.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| B1 ● | In records, contract active, running fine | Noted. No lead | None | Nothing to do | Noted. +10 |
| B2 ● | In records, contract active, minor problem | Service ticket and a sales alert. Tier from the score | SVC. EI told. Backup: MGR | SVC creates the ticket, assigns an engineer, closes it. EI sees the fault summary and calls the customer | Fault. +10, +20 when SVC accepts |
| B3 ● | In records, contract active, out of service | Service ticket, urgent. Hot | SVC. EI told | As B2. SVC dispatches the same day. EI informs the customer contact | Fault. Same as B2 |
| B4 | In records, active, repeated breakdowns (4 or more calls in 90 days) | Customer-at-risk. Score +10. Alert to EI and MGR | SVC. EI. MGR told | EI sees the breakdown history and plans a retention visit. MGR sees the alert | Fault. Same as B2 |
| B5 ● | Contract ended | Qualified. Renewal lead. Starts at 55 | SC for the area. Backup: MGR | Contract end date, last visit, breakdown history, who services it now if known, reporter's note, suggested opening. Standard sales actions | Renewal. Standard |
| B6 | Contract ending within 60 days | Early renewal lead | SC | As B5, plus the renewal date. Draft renewal offered | Renewal. Standard |
| B7 | In records, never had a contract | New service-contract lead | SC. EI if the area has no SC | Lift details and age. Standard sales actions | Sales. Standard |
| B8 ● | Another company services it now | Qualified. Win-back lead. Starts at 60 | SC. Backup: MGR | Servicing firm, when and why we lost it if recorded, contract end date. Standard sales actions | Win-back. Standard |
| B9 | Contract cancelled, on hold or in dispute | Lead with a caution note | SC. MGR told | SC sees the dispute note. MGR decides whether to approach | Sales. Standard |
| B10 | New or under warranty, running fine | Noted. A reminder 90 days before warranty ends (Proposed) | EI gets the reminder later | EI sees the reminder to offer maintenance | Noted. +10 |
| B11 | Under warranty, with a problem | Warranty service ticket | SVC. EI told | SVC handles it as a warranty ticket | Fault. Same as B2 |
| B12 ● | 20 years or older and faulty | Two leads: service or renewal, plus modernisation | As B2 to B5, plus MOD | MOD sees age, faults, parts risk, photos. Standard sales actions | Two tracks. Standard each |
| B13 ● | Not in records, running fine | Records task only. No sales lead | RS for the area. Backup: a second RS | Photo beside the nearest records, extracted fields, place, reporter. Standard records actions. MGR sees it only if stuck for 2 days | Records. +10, then +30 when added |
| B14 ● | Not in records, with a problem | Records task, service ticket and a lead | RS. SVC. EI | RS as B13. SVC and EI as B2 | Records and Fault. +10, +30, +20 |
| B15 | Not in records, another firm's sticker | Records task and a win-back lead | RS. SC | RS as B13. SC sees the servicing firm | Records and Win-back. +10, +30, then standard |
| B16 | Not in records, our own sticker | Records task. Check why contract data is missing | RS. SC told | RS adds the unit and links the contract from SAP | Records. +10, +30 |
| B17 ● | In records but details wrong (address, model, number of lifts) | Records fix | RS | RS sees the record and the report side by side and corrects it | Records, ending "Corrected". +10 |
| B18 | Number matches but the building differs, or the unit is marked scrapped or replaced | Records review | RS | RS decides: moved, wrong record, or scrapped | Records. +10 |
| B19 | At a key customer's site | Adds the account manager | Local owner keeps the lead. AM told | AM sees all the customer's sites and what each team is doing | Adds Account |
| B20 | Employee says ours but the photo shows another brand, or the reverse | Assistant asks to confirm. RS decides if still unclear | RS if unresolved | RS sees both claims and the photo | Records. +10 |
| B21 | Several of our units in one building, some in records, some not | One report per unit | As the matching case for each unit | Per unit | One track per unit. +10 each |

### C. Another company's lift or elevator (17 cases)

The AI reads the brand, unit number, the servicing firm's name on any sticker, and the age. The system checks that it is not ours, whether the building is a key customer, which of our units are in the same building, and the lead history for the building. The employee is asked the servicing sticker if it was not read, how many lifts are in the building, and how it runs (not sure is allowed).

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| C1 ● | A local or independent firm services it | Qualified. Lead, good chance. Starts at 40 | EI for the area. Backup: MGR | Brand, age, servicing firm, photos, building, our other lifts there, contact met, suggested opening. Standard sales actions | Sales. Standard |
| C2 ● | Its own maker services it | Low-priority lead. Starts at 20 | EI | As C1, marked low priority | Sales. Standard |
| C3 | The building's own staff service it | Lead with a note on parts and service. No team owns parts sales today | EI until decision 9 names an owner | EI sees the note | Sales. Standard |
| C4 ● | Nobody visibly services it | Lead, good chance. Starts at 40 | EI | EI sees "no servicing sticker seen" | Sales. Standard |
| C5 | Sticker unreadable or not seen | Lead with a note. Assistant asks again after sending | EI | EI sees "servicing firm unknown" | Sales. Standard |
| C6 | Problem or out of service | Priority up (+10 or +20) | EI | EI opens the conversation on reliability | Sales. Standard |
| C7 ● | 20 years or older | A second lead for modernisation. Starts at 35 | MOD, plus EI for the main lead | MOD sees age, faults, brand, parts risk. Standard sales actions | Two tracks: Sales and Modernisation. Standard each |
| C8 | Inspection or safety certificate expired or missing | Lead plus a compliance flag. Not Unsafe by itself | EI. MGR told | EI raises the flag with the building | Sales. Standard |
| C9 | Modernisation or tender notice visible | Intel. Qualified | NI or MOD. Tender team if public | Notice photo, who is doing it, dates | Info, ending "Passed to team" |
| C10 | Installed less than 3 years ago | Cold. Revisit when warranty ends | EI | Install date and the revisit date | Sales. Standard |
| C11 | Hospital, mall or premium building | Score +10 | EI | Building type shown | Sales. Standard |
| C12 ● | Another site of a key customer | Adds the account manager. Starts at 45 | Local EI owns it. AM told | AM sees the customer's sites and teams | Sales and Account. Standard |
| C13 | Government or public building | Tender only. No direct pitch | Tender team (role to be defined, decision 9) | Notice and building details | Info, ending "Passed to tenders" |
| C14 | Mixed brands in one building | One lead per unit | EI | Per unit | One track per unit. Standard each |
| C15 | A competitor we recently lost a bid to | Note on the lead | EI | EI sees the loss history for that account | Sales. Standard |
| C16 | Home-made or heavily modified unit, brand unclear | Assistant asks. RS decides | RS, then EI | RS sees the photos | Records, then Sales |
| C17 | Escalator or moving walk | See group M | See group M | See group M | See group M |

### D. Site and building (12 cases)

For building sites the AI reads site photos, hoarding and notice boards (project name, developer or contractor if visible) and hints of the construction stage. The system checks the registered sales area, any tender or permit data once available, and the account. The employee is asked the construction stage, whether the developer says the lift is already ordered, and optionally a contact.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| D1 ● | Building site, no lift yet | Qualified, always, if in our area. Starts at 60. Stage, size and contact change the score | NI for the area. Backup: MGR | Site photos, stage, developer or contractor if visible, whether the lift is already ordered, tender or permit match, building size. Standard sales actions plus match to a tender | Project. Standard |
| D2 | A competitor is installing the lift | Intel. Drops to Cold, saved as competitor intelligence | NI | NI sees who and the photos, and logs it as a lost project | Info, ending "Intel logged" |
| D3 | Our company is installing | Noted. No lead | Project team told | Nothing to do | Noted. +10 |
| D4 | "Lift coming soon" board | Lead | NI | Board photo and dates | Project. Standard |
| D5 | Lift under renovation behind hoarding | Modernisation intel | MOD | MOD records who is doing it and until when | Info, ending "Intel logged" |
| D6 | Private home lift or small residential | Rule needed (decision 9) | MGR until a rule exists | MGR decides | Sales or Info |
| D7 | Goods, freight or industrial lift | Rule needed (decision 9) | MGR until a rule exists | MGR decides | Sales or Info |
| D8 ● | Outside our service area | Information only | None | Nothing to do | Info. +10 |
| D9 | No sales rep for the area | Lead to the exception list | MGR | MGR assigns an owner | Sales after assignment |
| D10 | Border between two areas | The building's registered area. If unclear, MGR decides | MGR if unclear | MGR picks the owner | Sales. Standard |
| D11 | Multi-tower complex | Assistant asks for tower, block or gate. Each unit is separate | As the matching case per unit | Per unit | One track per unit |
| D12 | Photography not allowed (hospital, government, airport) | App warns. Employee describes instead of photographing | As the resulting case | As the resulting case | Info or as resulting |

### E. Photo quality and identification (14 cases)

These cases decide what happens when the AI's reading is complete, partial or wrong. The employee can always correct a reading, and every correction is stored to improve it. Cases that end in a normal case continue as the matching case from groups B, C or D.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| E1 ● | All details read | Continue to the checks | None | Nothing to do | Normal. +10 |
| E2 ● | Brand read, number not | Assistant asks for the number. If skipped, match by place and brand. Place-only matches are low certainty | RS for place-only matches | RS confirms the match | Normal. +10 |
| E3 | Number read, brand not | Take the brand from the records if matched | None | Nothing to do | Normal. +10 |
| E4 ● | Neither readable | Assistant asks for a clearer photo. Information only if declined | None | Nothing to do | Retake, then Normal. Or Info. +10 only once read |
| E5 | Not a lift or escalator | Assistant asks to retake. No points | None | Nothing to do | Retake. 0 |
| E6 | Faces or personal data visible | Blur or reject, with a privacy note | None | Nothing to do | Normal after blur |
| E7 | Several units in one photo | Assistant asks which. One report per unit | Per unit | Per unit | One track per unit |
| E8 | Shaft or machine room only | Accept. Read the controller brand. Safety reminder not to enter machine rooms | As the matching case | As the matching case | Normal |
| E9 | Same photo sent before | Blocked. No points | None | Nothing to do | Info. 0 |
| E10 | Old gallery photo, date or place does not match | Lower trust. Points held | RS samples these | RS checks a sample and releases or rejects the points | Normal. Points held |
| E11 | Unusual number format (other state or country) | Accept with a confirm | None | Nothing to do | Normal |
| E12 | Number matches several units | Goes to the records task list | RS | RS picks the right record | Records. +10 |
| E13 | Photo reader down or cannot read | Manual entry by the employee | None | Nothing to do | Normal |
| E14 | Photo reader confidently wrong | Employee edits. The correction is logged | RS reviews corrections weekly | RS sees reading versus correction | Normal |

### F. Location (9 cases)

Location sits in the same step as the photos. The employee chooses use my location, search a place, or type an address. The system reads the phone position and accuracy and compares it with known buildings and the photo's own location data. The routing area always comes from the building's registered sales area, or from the area the employee chooses for a new place.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| F1 ● | Use my location, and a known building is within 200 m | Suggests the building | None | Nothing to do | Normal |
| F2 | GPS weak indoors or in a basement | Asks the employee to confirm the place or type it | None | Nothing to do | Normal |
| F3 ● | Location permission refused | Search or type instead | None | Nothing to do | Normal |
| F4 | Several known buildings nearby | Shows a list to pick from | None | Nothing to do | Normal |
| F5 ● | No known building | Employee types name and address and chooses the sales area. The place is flagged new | RS verifies the place and adds the building | RS confirms the building and its registered area | Normal. Lead routes by the chosen area until RS confirms |
| F6 | Reporting later, not at the site | Allowed. Marked "reported later". Lower place certainty | None | Owner sees "reported later" | Normal |
| F7 | Location differs from the photo's own location | Assistant asks. Flagged | RS samples | RS checks a sample | Normal. Points held if unexplained |
| F8 | Suspected faked location | Points held. Spot check | MGR or RS | MGR reviews and releases or rejects | Normal. Points held |
| F9 | Block, floor or lift name given | Added to the unit record as optional detail | None | Owner sees the detail | Normal |

### G. Duplicates and history (10 cases)

The system matches by unit number first, then by brand within 50 m when the number is missing. It checks open leads, closed leads (lost or won), open service tickets and earlier reports. A reporter is always credited, even when the report is a duplicate.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| G1 ● | An open lead exists for the same unit | Added to that lead. No new lead | The existing owner is told | Owner sees the new photos and notes appended. Standard sales actions | Merge. +2 |
| G2 ● | The same employee sent it before | Shows the earlier report. No new lead | None | Nothing to do | Merge. 0 |
| G3 | A colleague reported it minutes ago | Merged. First reporter gets full credit, the second +2 | The existing owner | Owner sees both reporters | Merge. +2 for the second |
| G4 | Same building, different unit | Separate unit in the same building | As the matching case | As the matching case | Normal |
| G5 | A lead for this unit was lost recently | Not recreated. Note to the previous owner. Revisit after the period in decision 12 | The previous owner | Owner sees the new sighting and decides | Merge. +2 |
| G6 | We already won this unit | "We already won this one." Records check | RS | RS confirms the record is correct | Info. +2 |
| G7 | An open service ticket exists | Linked. No new ticket | SVC | SVC sees the new photos | Fault. Same as B2 |
| G8 | Part of a larger deal in negotiation | Added as intel to that deal | The deal owner | Owner sees the sighting on the deal | Merge. +2 |
| G9 | No number, same brand within 50 m of an existing unit | Assistant or RS decides same or different | RS | RS compares and decides | Records. +10 |
| G10 | The existing lead's owner has left or is inactive | MGR reassigns | MGR | MGR picks a new owner | Merge. +2 |

### H. Routing and follow-up (12 cases)

These cases describe what happens after a lead exists. The follow-up clock for Hot leads is a reminder at 24 hours, the manager told at 48 hours, and the manager reassigning at 72 hours. Warm leads use 72 hours, 5 days and 10 days.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| H1 ● | Owner found | Assigned | The owner for the team and area | Alert, summary and suggested actions in NewCRM | Per the case. +20 on accept |
| H2 ● | No rep for that team in the area | Goes to the exception list | MGR | MGR assigns an owner | Per the case |
| H3 | Owner on leave | Backup or manager takes it | The backup, otherwise MGR | Backup sees the full summary | Per the case |
| H4 | Owner declines, with a reason | Returned to the manager list. The reporter is not affected | MGR | MGR sees the reason and reassigns | Per the case. No change shown |
| H5 ● | No action in 24, 48 or 72 hours (Hot) | Reminder to the owner, then MGR told, then MGR reassigns | The owner, then MGR | Owner sees the reminders. MGR sees "No action in 48 hours" | Per the case |
| H6 ● | One photo, two teams | Two leads and two tracks | Both owners | Each owner sees their own lead and a note that another team also has one | Two tracks |
| H7 | Key customer: account manager and local rep | The local rep owns it. AM informed | Local rep. AM | AM sees all the customer's sites. Cannot take over without MGR | Per the case |
| H8 | Another business unit already owns the customer | Owners are told and aligned | Both owners | Each sees the other's lead | Per the case |
| H9 | The reporter is the sales owner | Allowed. No extra reward on their own lead | The owner | Owner sees themselves as reporter | Per the case. No bonus on own lead |
| H10 | Reporter is from another region | Routed by the building's area, not the reporter's | The owner for the building's area | Owner sees where the reporter is from | Per the case |
| H11 ● | Lead closed: won, lost to a competitor, not interested, invalid or on hold | Reporter sees the result and a thank-you. An impact story if won | None | Owner logs the outcome and reason | Final step. +200 if won. Earlier points stay |
| H12 | Lead rejected as invalid | A kind explanation to the reporter. Points reversed only if the report was fake | MGR reviews | MGR confirms or overturns | Closed with a message |

### I. Information and privacy (5 cases)

Contact names and numbers are optional, visible only to the lead's owner and the sales manager, and kept under company policy. Competitor prices and contract terms are never recorded.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| I1 ● | A contact person is captured | Visible to the owner and MGR only. Score +10 | The lead's owner | Name, number and role if given | +5 bonus after sending |
| I2 | The contact is a guard, not a decision-maker | Noted. Score not raised | The lead's owner | Owner sees the note | As the case |
| I3 | The customer says "do not contact" | Flag on the lead. The owner must respect it | The lead's owner. MGR told | Owner sees the flag | As the case |
| I4 | The contact already exists in the CRM | Linked to the existing contact | The lead's owner | Owner sees the linked contact | As the case |
| I5 | Competitor prices or contract terms overheard | Not recorded. The app warns | None | Nothing to do | As the case |

### J. Technical (8 cases)

A report is never lost. It is accepted, queued and processed later, and every retry carries the same report ID.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| J1 ● | No signal | Saved on the phone. Records are checked when signal returns | None until sent | Nothing until sent | Queued, then the case's track |
| J2 | Weak signal | The upload resumes | None | Nothing to do | Queued |
| J3 | The draft is interrupted (call, app closed) | The draft is saved and can be resumed | None | Nothing to do | Draft |
| J4 | Retry after signal is lost | No duplicate, because the report ID is reused | None | Nothing to do | As the case |
| J5 | Salesforce is down | The report is accepted and queued. Status "waiting for CRM" | Product on-call (to be named) | Nothing until it is sent | Queued, "waiting for CRM" |
| J6 | The records system is down | The decision is made later, as when offline | Product on-call | Nothing until decided | Queued |
| J7 | Conflict at sync: someone created the lead meanwhile | Merged | The existing owner | Owner sees the merged report | Merge |
| J8 | The phone clock is wrong | The server time is used | None | Nothing to do | As the case |

### K. Points and recognition (8 cases)

Points are mostly paid on verified results. Values are on a placeholder scale until the company AI portal's scale is known.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| K1 ● | Normal report | Points pending, confirmed when checked | None | Nothing to do | As the case. +10 |
| K2 | Duplicate or repeat | No points, or a small credit | None | Nothing to do | Merge. 0 or +2 |
| K3 | Fake or junk report | Rejected. Warning. Repeats go to the manager | MGR reviews | MGR sees the reporter's trust score and decides | Closed. Points reversed |
| K4 | Two reporters, one lead | First reporter full credit, the second +2 | None | Nothing to do | As the case |
| K5 | A win comes months later | Points are added then | None | Owner logs the win | +200 on the win |
| K6 | Daily limit reached | Reports still accepted. No extra points that day | None | Nothing to do | As the case. 0 extra |
| K7 | Safety report | +30 and a badge. Never ranked | None | Nothing to do | Emergency. +30 |
| K8 | The employee leaves | Per HR policy | HR | Not applicable | Per HR policy |

### L. Special situations (7 cases)

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| L1 | A technician is on a service job at that customer | A quick report linked to the job | SVC job owner. The sales owner as in the matching case | Owner sees the linked job | As the matching case |
| L2 | A customer complains about our equipment | Goes to the service desk with a retention alert. Not a Snap & Lead lead | SVC. EI told | SVC handles the complaint. EI sees the alert | Fault. +10 |
| L3 | A customer asks the employee for a quote on the spot | Handed to the right team | EI or SC for the area | Owner sees "customer asked directly" | Sales. Standard |
| L4 | Several units in one building (batch mode) | One location, many units | As the matching case per unit | Per unit | One track per unit |
| L5 | The employee prefers another language | The app is translated | None | Nothing to do | As the case |
| L6 | No camera access | Upload from the gallery | None | Nothing to do | As the case |
| L7 | A competitor crew is seen working on site | Intel note | EI or NI | Owner sees the note and photo | Info, ending "Intel logged" |

### M. Escalators and moving walks (16 cases)

These cases ship in the pilot only if decision 14 approves. They follow the build order of their lift equivalents. The AI reads the equipment type, brand, serial plate, servicing sticker and estimated age. The system runs the same checks as for lifts. The employee is asked how it runs (fine, minor issues, stopped, unsafe) and whether anyone is hurt. A moving walk follows the matching escalator case.

Owner marked EI\* means the escalator owner is not yet named. Until decision 14 names one, the lead goes to EI. The age that counts as very old for escalators is not yet set. The lift rule of 20 years is used as a placeholder.

| ID | Situation | System decides | Assigned to | Owner sees and does | Track and points |
| --- | --- | --- | --- | --- | --- |
| M1 | Unsafe, someone hurt or caught | Emergency. No lead | ED. SVC if ours. Backup: service duty manager | Photo, location, contact, the answer. Standard emergency actions | Emergency. +30 badge |
| M2 | Unsafe, nobody hurt (missing step, damaged comb plate, smoke or burning smell, handrail out of step) | Emergency, lower urgency | ED. SVC if ours | As M1 | Emergency. +30 badge |
| M3 | Ours, in records, contract active, running fine | Noted. No lead | None | Nothing to do | Noted. +10 |
| M4 | Ours, active, minor problem (noise, jerks, handrail speed) | Service ticket and a sales alert | SVC. EI\* told | SVC creates the ticket. EI\* calls the customer | Fault. +10, +20 |
| M5 | Ours, active, stopped or out of service | Service ticket, urgent. Hot | SVC. EI\* | As M4, dispatched the same day | Fault. Same |
| M6 | Ours, contract ended | Qualified. Renewal lead. Starts at 55 | SC | As B5 | Renewal. Standard |
| M7 | Ours, another company services it now | Win-back lead. Starts at 60 | SC | As B8 | Win-back. Standard |
| M8 | Ours, not in records, running fine | Records task only | RS | As B13 | Records. +10, +30 |
| M9 | Ours, not in records, with a problem | Records task, service ticket and a lead | RS. SVC. EI\* | As B14 | Records and Fault. +10, +30, +20 |
| M10 | Another company's, a local firm services it | Qualified. Lead. Starts at 40 | EI\* | As C1 | Sales. Standard |
| M11 | Another company's, its own maker services it | Low-priority lead. Starts at 20 | EI\* | As C2 | Sales. Standard |
| M12 | Another company's, nobody services it | Lead. Starts at 40 | EI\* | As C4 | Sales. Standard |
| M13 | Very old (age to be set, placeholder 20 years) | Second lead for modernisation | MOD | As C7 | Two tracks. Standard each |
| M14 | Moving walk (travelator) | Same as the matching escalator case | As the matching case | As the matching case | As the matching case |
| M15 | Escalators planned in a building under construction | Qualified. Lead. Starts at 60 | NI | As D1 | Project. Standard |
| M16 | Escalators in a transport hub, airport or government building | Tender only. No direct pitch | Tender team (role to be defined) | Notice and building details | Info, ending "Passed to tenders" |

## Points and recognition

Points make reporting worth the effort. They are paid mostly on verified results, not on volume, so that junk reports earn nothing.

The company AI portal already shows a points total and levels, for example 985 points. This product should add earning rules to that account instead of creating a second currency. Whether the portal allows other apps to award points is **not yet known**. The portal's scale looks far larger than the values below, so every value must be rescaled once we know how points are earned there.

**Earning rules (Proposed, on a placeholder scale)**

| Event | Points | Confirmed when |
| --- | --- | --- |
| Report sent | 10 | Checked. Automatic for clean matches |
| Missing lift added to our records | 30 | The records steward confirms |
| Lead accepted by the owner | 20 | The owner accepts |
| Quote sent | 50 | The owner logs the quote |
| Won | 200 | The owner logs the win, even months later |
| Valid safety report | 30 | The emergency desk confirms. A badge. Never ranked |
| Contact, note, extra photo after sending | 5, 5, 3 | On sending. Capped per report |
| Duplicate of a lift already reported | 2 | At once. The reporter is still credited |
| Weekly mission lift | 15 | The lift is confirmed |

Levels are placeholders: Spotter from 0, Scout from 100, Pathfinder from 300, Champion from 700.

**Protection against gaming**

| Risk | Control |
| --- | --- |
| Junk or irrelevant photos | Points are confirmed only after checking. Random sampling. Rejected reports lower the reporter's trust score |
| Reused photos | Exact duplicates are blocked |
| Fake location | Compare with photo data. Hold points on a mismatch. Spot-check |
| Volume chasing | A daily limit on paid reports (Proposed: five) |
| Sales owners reporting their own leads | Allowed, with no extra reward |
| Pressure around safety | Safety reports earn a badge and are never ranked |

**Recognition beyond points**

- Badges, such as first missing lift found and safety first.
- An impact story when a report becomes a quote or a win. This is the strongest motivator, because it proves the report mattered.
- A team goal, for example 50 lifts for an area this month.
- A monthly summary of reports and outcomes.
- Leaderboards, if approved, rank verified outcomes, not raw counts.

**Rewards**

| Option | For | Against | View |
| --- | --- | --- | --- |
| Recognition: badges, shout-outs, impact stories | Cheap and safe | Fades if used alone | Do |
| Non-cash rewards: vouchers, merchandise, a time-off draw | Motivating, controllable | Needs a budget and an owner | Do, within a set budget |
| Cash per report | Simple | Invites junk. May clash with sales commission and tax rules | Do not |
| A share of won-deal value | Strong link to results | Overlaps sales commission. Needs HR approval | Only if HR agrees |

**Decisions needed**

1. Can this product award points to the existing portal account, and on what scale?
2. Who funds and owns rewards, and what is the budget?
3. Are leaderboards allowed? They need HR and works-council review.
4. What happens to points when an employee leaves?

## How we make people use it

People use a reporting tool when it is quick, rewarding and visibly matters. If any one of four conditions is missing, adoption fails: low effort, personal benefit, a closed feedback loop, and easy discovery.

**Adoption levers**

| Lever | What we do | Measure |
| --- | --- | --- |
| Make it fast | Aim for 20 seconds or less. Prefill from the photo and records. Work offline. Batch mode for several lifts in one building. One tap from the home screen to start | Median time to report. Drop-off per step |
| Give a personal benefit | Points on the employee's existing account, levels, badges, non-cash rewards, recognition | Share of reporters who return |
| Close the loop | Progress on every report, a thank-you when it ends, impact stories when a report becomes a quote or a win | Reports with an update within 48 hours |
| Make sure sales acts | Response targets for owners, the manager exception list, and manager visibility of owner response rates | Hot leads accepted within 24 hours |
| Be easy to find | A Snap & Lead entry in the company AI portal and in Teams. A home-screen icon. QR codes on service vans, depots and notice boards | Share of reporters who found it without a reminder |
| Build a habit | A weekly mission, a weekly streak, a nudge after a service job when lifts nearby have no data, a monthly summary, a team feed of wins | Weekly active reporters |
| Use leaders and champions | A sponsor message from sales and service heads. Managers mention it in weekly meetings. One champion per depot. Shout-outs for real wins | Champion-led reports |
| Onboard in minutes | A guided first report with a practice mode. A 20-minute toolbox talk. A one-page card on what to photograph. A short FAQ | Time from invite to first report |
| Build trust | Clear rules on where not to photograph. A privacy note. No location tracking. No use while driving | Complaints and privacy incidents |

**Healthy habit, not manipulation**

- No infinite scrolling and no guilt-driven notifications.
- Weekly streaks, not daily, so nobody feels pressed to photograph lifts every day.
- At most one nudge a day, and employees can switch nudges off.
- Numbers shown to employees are real. Points are never inflated.
- Safety reports are never part of a game.

**Why people stop, and the counter**

| Reason | Counter |
| --- | --- |
| Nothing happens after reporting | Follow-up clock, visible progress, impact stories |
| It takes too long | 20-second target, batch mode, offline mode |
| Fear of being watched | No location tracking, a clear privacy note, location only at report time |
| No benefit | Points, recognition, rewards |
| The novelty fades | Lead with outcomes, not badges. Seeing a report become a quote lasts longer than any animation |
| Sales ignores the leads | Exception list, response targets, manager follow-up |

**What not to do**

- Do not set reporting targets before the habit exists.
- Do not punish low reporting.
- Do not publish leaderboards before HR and the works council review them.

**Pilot adoption plan (Proposed)**

| When | Action |
| --- | --- |
| Two weeks before launch | Pick the city and a pilot group of about 50 technicians and sales staff. Train champions |
| Week 0 | Kickoff and toolbox talks. Everyone files a practice report |
| Weeks 1 and 2 | Daily check-ins with champions. Fix friction fast. Publish the first impact story as soon as one exists |
| Weeks 3 and 4 | Start the weekly mission. Review quality and junk rate. Tune scoring |
| Weeks 5 to 8 | Add recognition moments. Review adoption data. Go or no-go decision |

**Adoption measures**

Weekly active reporters. Share of reporters who report twice in a month. Time from invite to first report. Drop-off per step. Reports with an update within 48 hours. Hot leads accepted within 24 hours.

## Data and integrations

Salesforce stays the source of truth for leads, accounts and opportunities. This product owns reports, photos, progress and points. It reads lift and contract data from the systems that already hold it.

**Main records**

| Record | Holds | Source of truth |
| --- | --- | --- |
| Report | Report ID, reporter, time, photos, location, answers, status, progress tracks | This product |
| Photo | File link, reading result with confidence, flags | This product, file storage |
| Place | Name, area, coordinates, building type, key-customer flag, registered sales area | Installed base and Salesforce |
| Unit (lift, elevator, escalator or moving walk) | Unit number, equipment type, brand, model, year, place, contract status, last seen, certainty | Installed base. Contracts from SAP service |
| Lead and task | Salesforce ID, report ID, situation, tier, score and reasons, owner, stage, outcome | Salesforce |
| Records task | Type (add, fix, merge), candidate, status | This product |
| Emergency | Report, status, times, service order | This product. Service order in SAP |
| Points event | Employee, event, points, pending or confirmed or reversed | This product, or the company AI portal if it takes over |
| Reporter profile | Points, level, badges, trust score | This product, or the portal |
| Audit log | Who changed what and when | This product |

**Integrations**

| System | Direction | Used for | Release | Status |
| --- | --- | --- | --- | --- |
| Salesforce NewCRM, through the CRM Agent and later the SHERPA NBA API | Write leads and tasks. Read stages and outcomes | Lead creation, owner experience, reporter progress | Pilot, then Scale | CRM Agent is live. NBA API to build |
| Installed-base records | Read for matching. Updates only through the records steward | Is it ours? Is it known? | Pilot | Exists. Update path to agree |
| SAP service | Read contracts, visits, callbacks. Create service tickets | Contract status, history, fault handling | Pilot read. Scale create | Exists |
| Photo-reading model | Send photos. Receive details | Brand, number, sticker, age | Pilot | Through the company AI platform. To confirm |
| Maps and geocoding | Search places, convert address to position | Location step, routing area | Pilot | To choose |
| Single sign-on | Identify the user and role | Access, territory limits | Pilot | Assumed to be the company's existing sign-in. To confirm |
| Notifications | Push, email, Teams | Alerts to reporters and owners | Pilot | To build |
| Company AI portal | Entry point and points | Discovery, points | Scale | To confirm |
| File storage | Store photos | Photos outside Salesforce | Pilot | To choose |
| IoT health | Read | Fault signals on our lifts | Extend | Exists |

**Rules for integrations**

- Every secret stays on the server. No Salesforce or SAP credentials in the browser or the app.
- Every write carries the report ID, so a retry never creates a duplicate.
- If Salesforce is down, the report is accepted and queued, and the reporter sees "waiting for CRM".
- This product only reads SAP service and the installed base. Changes go through defined processes.

**Retention (Proposed, confirm with legal)**

- Photos: kept for the life of the lead plus 24 months.
- Contact names and numbers: per company policy, and removed on request when no lead is open.
- Audit log: kept 24 months.

## Devices and platforms

The product is one responsive web app that can be installed on a phone. Reporters use phones first. Managers, records stewards, leadership and administrators use desktop first. One codebase serves all of them.

| Device | Who uses it | What matters |
| --- | --- | --- |
| Phone, Android and iPhone | Reporters, field sales, technicians | Camera, location, offline queue, one-hand use, push alerts |
| Tablet | Field sales, depot staff | Same as phone with a roomier layout |
| Desktop browser | Managers, records steward, emergency desk, leadership, administrators | Tables, side-by-side review, bulk actions, dashboards |
| Teams tab | Anyone | An entry point, in a later release |
| Company AI portal | Anyone | An entry point and a points link, in a later release |

**Platform requirements (Proposed)**

- **Browsers.** The latest two major versions of Chrome, Edge, Safari and Samsung Internet.
- **Install.** Add to home screen, with its own icon and full-screen start.
- **Camera and location.** Use the browser's camera and location permission. If either is refused, the app offers gallery upload and typed location.
- **Offline.** Photos, answers and drafts are saved on the phone and sent when signal returns. Each report has a unique ID so a retry cannot duplicate it.
- **Performance.** The Snap screen is usable within 3 seconds on a mid-range Android phone over a 4G connection. Photos are compressed before upload.
- **Accessibility.** Aim for WCAG 2.2 level AA. Buttons are at least 44 by 44 pixels. Text is readable without zooming.
- **Languages.** English in the pilot. Add local languages once chosen. Wording stays in plain words.
- **Look.** Light and dark mode. Match the company AI portal style.

**Known limits of an installable web app**

- On iPhones, background sync is limited. A queued report may wait until the app is opened again.
- Push alerts on iPhone need the app installed to the home screen.
- Deep device features, such as reliable background upload, are weaker than a native app.

**Decision gate.** Test offline behaviour with real technicians in the pilot. If queued reports fail to send reliably on iPhones, wrap the app in a native shell. Do not rebuild it.

## Privacy, security, safety and quality

The highest risks are safety, personal data in photos, and wrong access to customer information. Every item below is **Proposed** and needs sign-off from the named function before the pilot.

| Area | Requirement | Sign-off |
| --- | --- | --- |
| Safety | An unsafe lift is never a sales lead. It goes to the emergency desk at once, in a calm tone. If offline, the app tells the employee to call the emergency desk now | Service head |
| Safety | The app never asks anyone to enter a machine room, restricted area or private property. Nudges name public and common areas only | Service head, safety officer |
| Safety | Warn against use while driving. No prompts or points tied to speed | Safety officer |
| Privacy | Faces and personal data in photos are blurred or rejected. A privacy note appears at first use | Legal |
| Privacy | Contact names and numbers are visible only to the lead's owner and the sales manager. Retention follows company policy | Legal, data protection officer |
| Privacy | A data protection impact assessment is done before launch, under the data protection law that applies | Data protection officer |
| Privacy | Location is captured only when a report is made. There is no tracking of employees | Legal, works council |
| Access | Sign in with the company's single sign-on. Role-based access limited by sales area. Reporters never see contract or price details | Security |
| Security | No credentials in the app or browser. All calls to Salesforce and SAP happen on the server | Security |
| Security | Every rule change, tier override, merge and export is logged | Security |
| AI governance | AI reads photos and writes plain-words explanations. It never decides tier, owner or safety. A person confirms every report before it is created | Product, legal |
| Explainability | Every lead shows the reasons behind its score | Product |
| Competition law | Record only what is visibly public. Do not record competitor prices or contract terms overheard on site | Legal |
| Works council and HR | Points, leaderboards and any use of reporting data in performance reviews need review. Reporting data is never used to rate individuals without agreement | HR, works council |
| Photography rules | The app warns about places where photography may not be allowed, such as hospitals, government buildings and airports | Legal |
| Availability | Reports are accepted even when Salesforce, SAP or the photo reader is down, and are processed later. Target 99.5% availability for capture (Proposed) | Engineering |
| Quality | A sample of reports is checked every week for accuracy of reading, routing and scoring | Product, records steward |
| Audit | A full history of each report from capture to outcome | Security |
| Safety | Escalator and moving-walk hazards (missing step, damaged comb plate, smoke or burning smell, handrail out of step) go to the emergency desk as Unsafe. The app tells people to keep clear and follow the building's safety instructions | Service head, safety officer |

## Rollout plan

The pilot is the gate to everything else. Nothing scales until it passes a go or no-go review after eight weeks in one city.

&#91;embedded content: rollout roadmap · 4 phases, 3 gates\]

The length of the first phase depends on the staffing decision. The pilot should run on the live CRM Agent until the SHERPA NBA API is ready.

**How it lines up with the SHERPA plan**

| SHERPA release | Dates | What it gives Snap & Lead |
| --- | --- | --- |
| 1 Foundation | 16 Nov 2026 to 19 Feb 2027 | NBA API proof of concept (11 Dec), Einstein replacement (29 Jan), quick wins (19 Feb). The "Competitor-serviced units" action is probably a quick win. That is an assumption |
| 2 Installed base | 22 Feb to 18 Jun 2027 | Customer Health, Churn and MOD Propensity use sightings to rank ageing and at-risk lifts |
| 3 New business | 21 Jun to 27 Aug 2027 | Project Lead Finder matches building sites to tenders and permits |
| 4 Lifecycle | 30 Aug to 3 Dec 2027 | Teams and mobile entry points, conversion alerts for new units |

**If the pilot misses its targets (Proposed)**

Find the cause and extend the pilot once, for four weeks. If the targets are missed again, stop and decide whether to rework or end the programme.

## Risks, assumptions, dependencies and open decisions

The biggest risks are people and data, not technology: owners who do not follow up, and records too messy to match. Fourteen decisions are still open and block the pilot.

**Risks**

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Owners do not follow up, so reporters stop reporting | High | Critical | Follow-up clock, manager exception list, response targets, impact stories |
| Installed-base records and lift numbers are too messy to match | High | High | Choose a pilot city with the best data. Records steward. Place-and-brand fallback. Measure match rate in week 1 |
| No capacity: the SHERPA team of 7 has no web or mobile engineer and no records steward | High | High | Decide staffing before the build. Keep the pilot small and use the CRM Agent |
| Employees chase points with junk reports | Medium | Medium | Pay on verified results. Daily limit. Random checks |
| Photos capture people or restricted areas | Medium | High | Face blur, guidance, warnings, impact assessment |
| A wrong "ours or not ours" answer because records are wrong | High at first | Medium | Steward confirms place-only matches. Reporters see only neutral wording |
| An unsafe lift is reported and nobody acts | Low | Serious | Emergency desk response target, standard building message, full log |
| Queued reports fail to send on iPhones | Medium | Medium | Test in the pilot. Native shell as fallback |
| The SHERPA NBA API or the Salesforce developer is late | Medium | Medium | Use the CRM Agent for the pilot |
| Points cannot join the company AI portal account | Medium | Medium | Run separate points first and plan a migration |
| Interest fades after the novelty | Medium | High | Lead with outcomes. Weekly missions. Review adoption each month |
| Leaderboards cause pushback | Medium | Medium | HR review. Use team goals first |
| Employees cannot find or photograph the unit number | High | Medium | The missing-details ladder, manual entry, place-and-brand matching and the records steward |

**Assumptions to validate in the pilot**

- Employees will report if it takes about 20 seconds and earns recognition.
- Photo reading finds brand and lift number in most real photos.
- The installed base holds lift numbers for most lifts.
- Salesforce can accept the lead fields through the CRM Agent.
- A sales owner exists for each lead type in the pilot area.

**Dependencies**

- SHERPA NBA API and the Salesforce developer from the NewCRM team, which sit outside this team.
- The live CRM Agent and Snap & Lead agent.
- A photo-reading model through the company AI platform.
- Reviews by legal, HR, the data protection officer and the works council.
- A named records steward and an emergency desk contact.

**Open decisions**

| # | Decision | Needed from | Needed |
| --- | --- | --- | --- |
| 1 | Pilot city and group size | Sales and service heads | Before build |
| 2 | A named owner and a backup for each lead type and area | Sales heads | Before pilot |
| 3 | Who is the records steward, and how many hours a week | Data owner | Before pilot |
| 4 | Emergency desk contact and response target | Service head | Before pilot |
| 5 | Can points join the company AI portal account, and on what scale | Portal team, HR | Before build |
| 6 | Reward type, budget and owner | HR, finance | Before pilot |
| 7 | Are leaderboards allowed | HR, works council | Before pilot |
| 8 | Languages to support | Regional heads | Before build |
| 9 | Rules for public buildings, home lifts, goods lifts and parts sales | Sales heads | Before Scale |
| 10 | Who builds and runs the web app | SHERPA product owner | Before build |
| 11 | Photo retention and contact data policy | Legal | Before pilot |
| 12 | How long to wait before reopening a lost lead | Sales heads | Before pilot |
| 13 | Confirm the building-site stage rules and when lifts are usually ordered | New-installation sales | Before pilot |
| 14 | Are escalators and moving walks in the pilot, which sales team owns their leads, and what age counts as very old for them | Sales and service heads | Before build |

## Appendices

**A. Situations for the first build**

These 36 cases ship in the pilot. The IDs match the full specification of 145 cases in the case-by-case specification section.

| ID | Situation | Result |
| --- | --- | --- |
| A1 | Unsafe, someone trapped or hurt | Emergency desk alerted at once. No lead |
| A2 | Unsafe, nobody hurt | Emergency desk, lower urgency |
| A3 | Unsafe, not our lift | Building owner gets a standard message. Logged |
| A5 | Unsafe, no signal | Saved. Employee told to call the emergency desk |
| B1 | Ours, in records, contract active, fine | Noted |
| B2 | Ours, active, minor problem | Service team and local rep told |
| B3 | Ours, active, out of service | Service team, urgent. Rep told |
| B5 | Ours, contract ended | Renewal lead for service contract sales |
| B8 | Ours, another company services it | Win-back lead for service contract sales |
| B12 | Ours, 20 years or older and faulty | Service lead plus a modernisation lead |
| B13 | Ours, not in records, running fine | Records team adds it. No sales steps |
| B14 | Ours, not in records, with a problem | Records team adds it, plus service and sales |
| B17 | Ours, in records but details wrong | Records fix |
| C1 | Another company's lift, local firm services it | Lead for existing-installation sales. Good chance |
| C2 | Another company's lift, its own maker services it | Low-priority lead |
| C4 | Another company's lift, nobody services it | Lead. Good chance |
| C7 | Another company's lift, 20 years or older | Extra lead for modernisation sales |
| C12 | Another site of a key customer | Account manager told |
| D1 | Building site, no lift yet | Lead for new-installation sales |
| D8 | Outside our service area | Information only |
| E1 | All details read | Proceed |
| E2 | Brand read, number not | Ask for the number, or match by place |
| E4 | Neither readable | Ask for a clearer photo. Information only if declined |
| F1 | Use my location, building recognised | Suggest the building |
| F3 | Location permission denied | Search or type |
| F5 | No known building | Type name and address, choose the area |
| G1 | Open lead for the same lift | Add to it. Owner told. Reporter credited |
| G2 | Same employee sent it before | Show the earlier report. No new points |
| H1 | Owner found | Assigned |
| H2 | No rep for that team in the area | Manager exception list |
| H5 | No action in 24, 48 or 72 hours | Reminder, then manager, then reassign |
| H6 | One photo, two teams | Two progress tracks |
| H11 | Lead closed | Reporter sees the result and a thank-you |
| I1 | Contact person captured | Visible to owner and manager only |
| J1 | No signal | Saved on the phone, sent later |
| K1 | Normal report | Points pending until checked |

**B. Who can see what**

| Information | Reporter | Owner rep | Manager | Records steward | Emergency desk | Leadership | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Own reports and status | Own | Own | Own | Own | Own | Own | Own |
| Leads assigned to them | No | Yes | Yes | No | No | No | No |
| All leads in the area | No | No | Area | No | No | Totals | Yes, audited |
| Photos | Own | Their leads | Area | Yes | Emergency reports | No | Audited |
| Score and reasons | Tier only | Yes | Yes | Yes | No | Totals | Yes |
| Contract status and history | Ours or not ours only | Yes | Yes | Yes | Emergency, our lifts | Totals | Yes |
| Contact person at the building | No | Yes | Yes | No | Emergency only | No | No |
| Competitor and servicing firm | Own reports | Yes | Yes | Yes | No | Totals | Yes |
| Value estimates | No | Own leads | Area | No | No | Totals | Yes |
| Reporter identity | Own | Yes | Yes | Yes | Yes | Totals | Yes |
| Edit or merge lift records | No | Request | Approve | Yes | No | No | Yes |
| Change rules, weights, areas | No | No | Propose | No | No | No | Yes |
| Export | No | No | Area, logged | Logged | No | Totals | Logged |

**C. Glossary**

| Term | Meaning |
| --- | --- |
| Lead | A record in Salesforce that tells a team about a chance to act |
| Owner | The person or team responsible for a lead |
| Installed base | Our records of lifts we have installed or look after |
| Records steward | The person who fixes missing, wrong and duplicate lift records |
| SHERPA | The company's sales AI programme, with 17 specialist agents |
| NewCRM | The company's Salesforce system |
| CRM Agent | The live SHERPA agent that writes to Salesforce |
| Next best action | A prompt that tells a seller what to do next |
| EI, SC, MOD, NI | Existing-installation, service contract, modernisation and new-installation sales |
| Tier | Lead strength: Hot, Warm, Cold or Information only |
| Track | The steps a report moves through, matched to its situation |
| Installable web app | A website that can be added to a phone's home screen and used like an app |
| Lift and elevator | Two words for the same equipment. The app shows the one that fits the user's region |
| Unit | One lift, elevator, escalator or moving walk |
