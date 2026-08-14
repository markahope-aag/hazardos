# MarketSharp audit: Advanced Health & Safety

**Date:** 2026-08-14
**Source:** MarketSharp OData API (company 4328), read-only, plus admin screens
supplied by Gina Richardson.
**Why:** AHS are evaluating HazardOS. We need to know what their current system
holds, which parts of it they actually use, and what has to be replicated
before they can move.

All figures below come from the live API on 2026-08-14 unless noted. August 2026
is a partial month (audit ran on the 14th).

---

## 1. API access

| | |
|---|---|
| Endpoint | `https://api4.marketsharpm.com/WcfDataService.svc/` |
| Protocol | OData v2, **read-only** (confirmed in their own SDK README) |
| Auth | `Authorization` header, **no scheme prefix** |
| Header value | `{companyId}:{userKey}:{epochSecs}:{base64(hmac)}` |
| HMAC | SHA-256, key = **base64-decoded** secret, message = `{companyId}{userKey}{epochSecs}` |
| Scope | One company (Advanced Health & Safety). Not partner-wide. |

Credentials and this recipe live in 1Password, `Tools` vault, item
*MarketSharp API Key - AHS*. The scheme was recovered from their Java sample
client, which is downloadable from the Api Maintenance screen. Basic auth and
query-string credentials both fail with an identical 401, because the host
rejects before reading anything.

The signature is timestamped, so a client must sign per request rather than
caching a header.

## 2. What is in there

| Entity | Rows | Read |
|---|---|---|
| Activities | 116,360 | the spine of the system |
| Notes | 10,640 | |
| Contacts | 7,650 | |
| Appointments | 7,645 | roughly one per contact |
| Addresses | 7,650 | 1:1 with contacts |
| Inquiries | 5,412 | |
| JobProducts | 5,387 | |
| Jobs | 4,508 | |
| Contracts | 4,508 | exactly 1:1 with jobs |
| PaymentHistories | 4,095 | |
| Loans | 4,000 | unexplained, see gaps |
| InquirySourceSecondaries | 551 | mostly named referral partners |
| ProductInterests | 638 | |
| ActivityReferences | 67 | the step vocabulary |
| ProductDetails / ProductTypes | 74 / 44 | their service catalog |
| Employees | 5 | |
| WorkCrews | 11 | |

**Fifteen activities per contact.** This is not a contact database with some
tasks attached. It is a task system that happens to hold contacts, and any
replacement has to be at least as good at generating and chasing work items.

### Empty tables, and what they tell us

| Entity | Rows | What it means |
|---|---|---|
| `Proposals` | **1** | Proposals are not built in MarketSharp. Activity steps like "make blank proposal", "Put bid into proposal" and "Proposal numbers in?" are people driving a process that lives in Word or a PDF. |
| `LeadPaint*` (5 tables) | **0** | They do lead removal, but none of MarketSharp's RRP and lead-paint compliance tracking is used. |
| `JobProductCommissions`, `...Payments`, `JobProductCosts` | **0** | No commission tracking and no job costing. |
| `CustomFields` | **0** | No custom fields anywhere. Nothing bespoke to migrate. |
| `Surveys`, `ServiceOrders`, `FutureInterests`, `C800ResponseLead` | **0** | Unused modules. |
| `JobProductDetails` | 3 | Effectively unused. |
| `ProcessSteps` | 0 | Process definitions are not exposed through the API, only through the UI. |

The `Proposals` count is the most consequential number in this document. Their
entire estimating and proposal workflow happens outside the CRM, tracked only
by to-do steps that ask whether a human has done it yet.

## 3. History and growth

Contacts, jobs and activities all begin **2022-01-03**, so they have been on
MarketSharp for about four and a half years. Inquiry dates reach back to
**2006**, which is imported history from whatever preceded it.

Monthly averages:

| | 2024 | 2026 (Jan to Jul) | Change |
|---|---|---|---|
| Inquiries | 79 | 144 | +82% |
| Appointments | 121 | 201 | +66% |
| Jobs | 70 | 122 | +74% |
| Activities | 1,705 | 3,025 | +77% |

The business has grown roughly three quarters in two years and its CRM load
grew with it. Whatever we build has to absorb that trajectory, not today's
numbers.

November and December dip every year, and spring through autumn runs hot. Worth
knowing for cutover timing: **a migration in November or December lands in
their quietest window.**

## 4. Who actually uses it

Activities assigned since 2025-08-01:

| Person | Activities | Share |
|---|---|---|
| Gina Richardson | 31,556 | 89% |
| Bob Stigsell | 1,794 | 5% |
| Brady Mautz | 944 | 3% |
| (unassigned) | 1,221 | 3% |
| Teo Montilla | 0 | |
| SuperUser | 0 | |

**This is the single most important operational fact in the audit.** The CRM is
effectively Gina's personal work queue. Nine out of ten work items are hers.

Two consequences. Adoption of HazardOS depends almost entirely on one person
finding it better than what she has, which is why her feedback is worth more
than anyone else's. And the knowledge of how this business runs sits with her,
so anything not captured before she is unavailable is lost.

## 5. When they work

Weekday distribution of activity creation, last six months (20,000 records):

```
Mon 3,830   Tue 4,276   Wed 4,034   Thu 3,880   Fri 3,427   Sat 228   Sun 325
```

Hour of day ramps from 7, peaks at 14 to 15, and tapers after 18. Note this
assumes the API returns local timestamps rather than UTC; the shape of the
curve supports that, since the UTC reading would put their working day starting
at 2am.

Sunday outnumbers Saturday, which is not people working. Activity processes
compute due dates, and each process carries **Use Saturdays** and **Use Sundays**
flags governing whether a computed date may fall on a weekend. Our scheduler
needs the same concept or their follow-up cadence will drift.

## 6. The automation model

Three rule tables, all of which fire a named **activity process**:

**Activity rules** key on result plus reference:

| If result | And reference | Then run |
|---|---|---|
| Completed | Email proposal | Lead-AHS After Proposal Sent Before Removal |
| Completed | Initial contact | Web Lead Follow Up |
| Completed | Make invoice | Post Sale Thank You |
| Contractor completed | Email proposal | Commercial: After proposal sent, before removal |
| Contractor completed | Make invoice | Contractor post sale THANK YOU |
| Email Failure | any | Bad email bounce |
| Left Message | any | Left Message |

**Appointment rules** key on outcome plus result reason: Presentation/Maybe with
Sample Positive or Sample Negative fire different processes; Presentation/Sold
fires "Demo Sold / invoice", and with reason "Estimate & Sample" also fires a
calendar update.

**Inquiry rules** key on status: New Internet Lead and Call to Set both fire
"No Sale Marketing Process"; Drop off sample fires "Drop Off Sample". Eleven of
fifteen statuses are unmapped.

There is also a global setting, **Automatically Delete All Incomplete Activities
when transferring a Lead to a Customer**. Without an equivalent, a customer who
has just bought keeps receiving nurture email. This is easy to miss and
expensive to discover in production.

### Step schema

Each process step has a type (**Text Out**, **Email Out**, **Call Out**,
**To-Do**), a reference from the 67-item vocabulary, an assignee (a named
person, `-- Unassigned --`, or `-- Current User --`), a reminder setting, a
template on the two sending types, and one of three due-date modes:

- immediately when added
- N days at a fixed clock time
- N days plus hours plus minutes

Processes carry Is Active, For Production, Use Saturdays and Use Sundays.

### Recovered process definitions

Process definitions are not in the API, but they are recoverable from behavior:
a process creates all its steps at once, so a cluster of activities sharing a
contact and a creation second is one firing, and the due-date offsets are the
definition. Reconstructed from six months of activity, the most-fired chains:

**Lead-AHS After Proposal Sent Before Removal** (156 firings)

```
day 0    Email proposal
day 2    Thank You Email
day 4    Has proposal / no appt.
day 7    Has proposal / no appt.
day 28   1 Month Follow Up Email
day 90   3 Month Checkup Letter
day 150  Has proposal / no appt.
day 240  8 Month Follow Up Email
day 300  10 Month Follow Up Email
day 360  12 Month Follow Up Email
day 365  1 year after proposal call
```

**Post Sale Thank You** (275 firings)

```
day 0    Thank You Email
day 0    Thank You text
day 7    Appt Follow Up Survey
day 15   Invoice paid? (add finance charge)
```

**Appointment to proposal** (124 firings), which is the chain from Gina's
original email:

```
day 0    Confirm Appointment
day 0    Pre-Appointment Email
day 1    Confirm Appointment
day 1    Proposal numbers in?
day 1    Email proposal
```

**Sampling to invoice** (148 firings, with 3, 4 and 5 day variants)

```
day 0    Make COC
day 2    Sample results back?
day 3    Make invoice
```

## 7. How much is actually live

Of 67 configured activity references, **35 have fired in eighteen months and 32
have not.** Dead entries include a NARI 2023 home show and seven of the twelve
monthly follow-up emails.

Of 27 defined processes, **13 are wired to a trigger**. The rest are applied by
hand or are orphaned. One we inspected in full, "After estimate, before
proposal", has four steps with zero activity in eighteen months, so it cannot
have fired in that window.

**Message templates in real use: twelve.** Nine email, two SMS, one letter. Four
of the nine emails are the monthly ladder, which is one template with a number
changed. So the copy to port is roughly six pieces, not sixty-seven.

One of the two SMS templates, "Sold text to Bob", is an internal alert rather
than a customer message and belongs in notifications rather than templates.

## 8. What this means for HazardOS

**We are replacing more than a CRM.** Proposals live outside their system
entirely. Our estimate and proposal builder does not compete with a MarketSharp
feature, it removes a manual step their staff currently track with to-do items.

**Our automation engine must treat a to-do as a first-class step.** Their
highest-volume steps are internal work items with an assignee, not messages.
Confirm Appointment alone is 5,908 activities in eighteen months. An engine that
only sends email and SMS would miss most of what they do.

**Delivery outcomes have to feed back as events.** Email Failure and Left
Message are triggers in their model.

**Segment branching should be a condition, not a duplicate chain.** They
separate residential from contractor work by overloading the result value, which
is why several processes exist in near-identical pairs. We have contact type and
company type as real fields.

**Two of their steps are regulatory, not sales.** "File notification" (662
firings) and "3 year school reminder" are compliance obligations that MarketSharp
only nudges. We already model compliance deadlines on the calendar, so these
could be automatic rather than remembered.

**Their appointment rules branch on lab results.** Sample Positive and Sample
Negative drive different processes. In MarketSharp a person picks that from a
dropdown; we hold lab reports as data.

**Gaps we can fill that they currently track nowhere:** job costing, commissions,
and lead paint compliance are all empty tables despite the company doing lead
work.

## 9. Migration notes

Read-only API, so migration is strictly an extract. Nothing can be written back,
and nothing we do can disturb their live system.

`docs/MarketSharp Migration Guide.md` assumes hand-exported CSVs. That is now
obsolete for extraction: everything except proposals and template bodies is
reachable through the API and can be pulled reproducibly.

Volume is small by migration standards. Roughly 7,650 contacts, 4,508 jobs,
5,412 inquiries and 116,360 activities. The activity history is the bulky part,
and a decision is needed on whether to carry it across or archive it.

Their contact records carry personal data, so a snapshot needs encryption at
rest, a deletion date, and AHS knowing we hold it. Configuration was pulled
today; **customer data has deliberately not been extracted yet.**

## 10. Gaps and caveats

- **Template bodies are not in the API.** Nor are process definitions. Both are
  UI-only. The recovered chains above are inferred from behavior, so they are
  what actually ran rather than what is configured. Those differ where a process
  was edited mid-window.
- **`Loans` holds 4,000 rows** against 4,508 jobs and nobody has explained why.
  Worth asking before assuming it is financing.
- **`InquirySourceSecondaries` has 551 rows, of which 200 were pulled.**
- **Hour-of-day analysis assumes local timestamps.** Unverified.
- **Working-pattern sample is 20,000 activities**, not the full six months.
- The reconstruction found 810 distinct cluster shapes. The long tail is
  manually created activity and edited due dates, not real processes. Only the
  top shapes should be treated as definitions.

## 11. Open questions for AHS

1. What is in `Loans`?
2. Are proposals built in Word, a template, or something else, and where do they live?
3. Which of the 13 triggered processes still match how they work?
4. Lead paint compliance is tracked nowhere in the CRM. Where does it live?
5. Do they want four and a half years of activity history carried across, or archived?
