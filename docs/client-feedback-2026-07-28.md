# Client feedback — AHS call, 28 July 2026

Source: AHS marketing/demo call (Gina Richardson, Bob Stigsell, Brady Mautz).
Recording: https://fathom.video/share/uixD32hpvFxLHx2dtSiB1yUgFxYAcysm

Target from the call: live in roughly a week; Gina and Bob start exercising the
demo tenant in August.

**Status key:** ✅ done · 🔨 in progress · ⬜ not started · 🚫 blocked

---

## P0 — Done

| # | Item | Notes |
|---|------|-------|
| ✅ | **Generate Work Order from a job** | The button was missing; `POST /api/work-orders` already accepted a `job_id`. Mark hit this live at ~36:00. |
| ✅ | **Hide the Financial tab from technicians** | New `ROLES.FINANCIAL_VIEW` preset (everyone except technician). The Overview card was also printing Revenue, so hiding the tab alone would not have worked. |

> **Caveat on the financial hiding:** this is UI-level only. A technician can
> still read `contract_amount` / `actual_revenue` through the API, because they
> legitimately need to read the job row for everything else. Real enforcement
> needs column-level restriction or a technician-facing view that omits them.
> Flagged to the client; not yet decided.

## P1 — Broke live in front of the client

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Send email from the app errors** | ⬜ | `app/api/contacts/[id]/email/route.ts` exists but failed in the demo. Also needs an attachment control, and both the email and its attachments must land in the contact's history. |
| 2 | **Preview the estimate as the customer sees it** | ⬜ | No customer-facing estimate view exists. Gina: "when they call me they say 'line item blah blah' — I need to see what they see." |

## P2 — Small, visible, cheap

The sweep that makes August testing go well.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3 | **Contact Type field** | ⬜ | Property Owner, Homeowner, Realtor, Project Manager, Designated Person (schools), Landlord, Contractor, Other. Gina currently types "(realtor)" after the name. |
| 4 | **Address on the pipeline card** | ⬜ | |
| 5 | **Property list: contacts and jobs clickable** | ⬜ | Counts already render; they just aren't links. |
| 6 | **Add a contact from the property** | ⬜ | |
| 7 | **Archive a contact rather than delete** | ⬜ | "Move away" should archive. Record must stay retrievable. |
| 8 | **Archive a survey** | ⬜ | A visit producing no estimate should stop showing as outstanding but stay on the property. ~26:00. |
| 9 | **"No visit" flag on an opportunity** | ⬜ | For hover reports. Currently faked with 3pm dummy jobs. |
| 10 | **Phone number at the top of the estimate** | ⬜ | |
| 11 | **Lab report file naming** | ⬜ | Ace of Space format: `<result> (<address>) <date>`. |
| 12 | **Lab reports attach permanently to the property** | ⬜ | "Joe Schmoe moved away — I still want to know that kitchen had no asbestos." Currently only linked to a customer. |

## P3 — Core workflow

| # | Item | Status | Notes |
|---|------|--------|-------|
| 13 | **Estimate versions: list all, mark active** | ⬜ | "It turns out two of three is the actual live version." |
| 14 | **Change order button** | ⬜ | Updates the estimate, offers (does not force) sending to the primary contact. Office-initiated — Bob: "I don't see Romeo going on a computer." |
| 15 | **Materials Used tab on the job** | ⬜ | Materials *and* time. Feeds better estimating over time. |
| 16 | **Survey image handling** | ⬜ | Read EXIF, rename to opportunity/address + date, watermark with **date and address** (no name). Watermarking exists in the R2 pipeline; renaming and metadata capture do not. |

## P4 — Field workflow (highest risk)

Lower urgency than P2/P3 but the biggest delivery risk. Gina raised Bob's field
usage twice; he agreed he often has seconds between appointments. Expect two or
three passes *with Bob*, so start earlier than the priority implies.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 17 | **Quick Create Appointment** | ⬜ | Name, address, type, email. Replaces the Gmail-then-Gina-recreates-it dance. |
| 18 | **Time tracking** | ⬜ | Clock in/out generally and per job, supervisor approval before weekly submission. Would replace paper timesheets and feed payroll. |

## P5 — Integrations (all blocked)

| # | Item | Status | Blocked on |
|---|------|--------|-----------|
| 19 | **QuickBooks** | 🚫 | Credentials. `quickbooks_customer_id` already exists on companies. |
| 20 | **RingCentral** | 🚫 | Credentials. Replaces the planned Twilio SMS path. Auto-pull call notes (Gina copy-pastes them into MarketSharp today), send SMS, click-to-call. |
| 21 | **Gmail** | 🚫 | Direction decision. The call narrowed this: Bob creates appointments in HazardOS, not Gmail. |
| 22 | **Form-fill auto-messaging** | 🚫 | Gina to define the flow — text + email on new lead. She said it "will take some time." |
| 23 | **AI pricing extraction** | 🚫 | Drive access to the estimate archive + OTS supplier invoices. Parse 2026 estimates to derive real markups instead of guessing. |

## Carried over from before this call

| Item | Status | Notes |
|---|--------|-------|
| **Per-hazard waste labels** | 🚫 | Needs example labels for lead, mould, and friable vs non-friable asbestos. Jobs already carry these as distinct hazard types. |
| **Per-role QA runs** | ⬜ | Would have caught several bugs found by hand this week. |

---

## Needed from the client

Ordered by what unblocks the most work:

1. **Google Drive access** to past estimates, and **OTS supplier invoices** → unblocks 23
2. **RingCentral credentials** → unblocks 20 (and lets us drop the Twilio path)
3. **QuickBooks credentials** → unblocks 19
4. **The new-lead messaging flow** — what the text and email should say → unblocks 22
5. **Example waste labels** for the other hazard types
6. Confirmation on the regulatory-trigger list — is inspection required / sale pending / tenant complaint / voluntary enough?
7. A decision on the financial-visibility caveat above: is UI hiding sufficient, or should technicians be blocked at the data layer?

## Open questions for us

- Technicians seeing only their own calendar is assumed but unverified against the role tiers.
- Whether "archive" for contacts, surveys and opportunities should be one shared mechanism or three separate ones. Leaning shared — same user intent each time.
