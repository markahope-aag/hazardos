# MarketSharp to HazardOS: diff map and cutover todo

**Date:** 2026-08-14
**Target cutover:** week of 2026-08-17
**Inputs:** `docs/marketsharp-audit.md` (live API audit of AHS company 4328) and
the current HazardOS schema and code.

---

## 0. The design rule this whole document obeys

HazardOS is a multi-tenant product sold to environmental remediation companies.
AHS is the first tenant, not the specification. So:

**Anything specific to AHS is a row in their organization's data, never a line
of code and never a value in a shared migration.**

Three tiers, and every item below is assigned to one:

| Tier | Lives in | Example |
|---|---|---|
| **Engine** | Code, shared by all tenants | Rule evaluation, step scheduling, sending, weekend skipping |
| **Defaults** | Seeded per organization by an AFTER INSERT trigger on `organizations` | A starter activity vocabulary and one or two starter chains a new company can edit |
| **Tenant config** | That organization's rows, editable in the UI | AHS's 67 references, their 13 chains, their 6 message templates |

The test to apply to every ticket below: *if a second abatement company signs up
next month, do they get something sensible without a deploy, and can they change
all of it themselves?* If the answer needs a code change, the ticket is wrong.

Two existing patterns already do this correctly and are the models to copy:
pipeline stages (per-org, trigger-seeded) and `sms_templates` (per-org, editable
data, with `is_system` marking the shipped defaults).

The pattern to avoid is the current email templates, which are a hardcoded
`switch` in `lib/services/reminder-sender.ts`. That is exactly the shape that
cannot be sold twice.

---

## 1. Diff map

Status is: **Have** (works today), **Partial** (exists but insufficient),
**Missing** (nothing).

### Records and data

| MarketSharp | Rows | HazardOS today | Status | Gap |
|---|---|---|---|---|
| Contacts | 7,650 | `customers` + CRM | **Have** | Field mapping only |
| Addresses | 7,650 | `customers` address fields, `properties` | **Have** | 1:1, straightforward |
| ContactPhones | 7,650 | `customers.phone`, `customer_contacts` | **Partial** | Their second-phone case needs `customer_contacts` populated, which is also Gina's item 5 |
| AdditionalContacts | 68 | `customer_contacts` | **Have** | |
| Inquiries | 5,412 | `opportunities` | **Have** | 18 inquiry statuses map onto pipeline stages, which are already per-org and trigger-seeded |
| Appointments | 7,645 | `site_surveys` + job scheduling | **Partial** | Their appointments are sales and inspection visits. Decide whether these become surveys, opportunities with a date, or a new appointment concept |
| Jobs | 4,508 | `jobs` | **Have** | |
| Contracts | 4,508 | `jobs` | **Have** | Exactly 1:1 with jobs, so almost certainly the same record |
| Proposals | **1** | `estimates` + `proposals` | **Have** | We are ahead here. Their proposals live outside the CRM entirely |
| Notes | 10,640 | `job_notes` and per-entity notes | **Partial** | Needs a general notes target for contact-level notes |
| PaymentHistories | 4,095 | `payments` | **Have** | |
| Loans | 4,000 | nothing | **Unknown** | Open question to AHS. Do not plan around it until answered |
| Employees | 5 | `profiles` | **Have** | |
| WorkCrews | 11 | `job_crew` | **Partial** | Their 11 crew are not the 5 CRM users. We need crew members who are not login users |
| InquirySource primary and secondary | 16 + 551 | `lead_source`, `lead_source_detail` | **Have** | Both are free text, so no enum migration. Tenant config by nature |
| ProductTypes / ProductDetails | 44 / 74 | `materials_catalog`, `equipment_catalog`, `pricing_settings` | **Partial** | Their catalog needs importing as their rows. Several entries (PCM Air Test, Sample Analysis, DHS notification, Convenience Fee, T&M) have no equivalent concept yet |
| LeadPaint (5 tables) | 0 | nothing | **Neither** | They track lead paint compliance nowhere. Opportunity, not a migration item |
| CustomFields | 0 | n/a | **Neither** | Nothing bespoke to carry across |
| Commissions, job costing | 0 | `commission_*`, `job_material_usage`, `job_time_entries` | **Have** | We are ahead. They track none of it |

### Workflow and automation

| MarketSharp | HazardOS today | Status | Gap |
|---|---|---|---|
| Activities (116,360) | `follow_ups` table, service, CRUD API, contact-detail UI | **Partial** | More exists than first assessed: full REST API, shown on contact detail, and a "next action due" column on estimates. What is missing is the **cross-entity queue**: everything assigned to one person, across contacts, jobs and surveys, in a single dated list. Also lacked type, outcome, reminder offset and process link until migration `20260814000002` |
| ActivityReferences (67) | nothing | **Missing** | Needs a per-org vocabulary table |
| ActivityResults (25) | nothing | **Missing** | Needs a per-org outcome table, including the "does not advance the chain" flag |
| Activity processes (27 defined, 13 triggered) | nothing | **Missing** | Needs process and step tables, per-org |
| Activity / Appointment / Inquiry rule tables | nothing | **Missing** | Needs one rules table keyed on event, outcome and optional qualifier |
| Step types (Email Out, Text Out, Call Out, To-Do) | partial | **Partial** | Reminders send email and SMS. Call and To-Do steps have no representation |
| Due date modes (immediate, N days at time, N days plus hours) | `scheduled_reminders.scheduled_for` | **Partial** | The column can hold a computed time. The computation does not exist |
| Use Saturdays / Use Sundays | nothing | **Missing** | Small. Same shape as the org business hours setting added today |
| Delete incomplete activities on lead conversion | nothing | **Missing** | Without it, customers who just bought keep getting nurture email |
| Email Failure and Left Message as triggers | nothing | **Missing** | Send outcomes must re-enter as events |
| Email templates | code in at least three places: a 6-slug `switch` in `reminder-sender.ts`, `lib/emails/password-reset.ts`, and template references in `invoice-delivery-service.ts` | **Missing** | Not org-scoped, not editable, wrong tier, and not even centralized. Blocks multi-tenancy, not just AHS |
| SMS templates | `sms_templates`, per-org, editable, `is_system` flag | **Have** | This is the correct pattern. Copy it for email |
| Scheduling substrate | `scheduled_reminders` plus hourly Vercel cron | **Have** | Channel, scheduled_for, template_slug, template_variables and status already exist. The engine can sit on this |
| Sample Positive / Negative driving workflow | `lab_reports`, `lab_report_samples` | **Have, and better** | They pick a dropdown value. We hold the actual result |
| File notification (662 firings) | EPA NESHAP deadline on calendar | **Partial** | We compute the 10-working-day deadline. It is not yet a workflow step |
| 3 year school reminder | nothing | **Missing** | AHERA three-year reinspection. Generic to the industry, so it belongs in the product |

---

## 2. Todo list

Ordered by whether it blocks cutover. Every item names its tier.

**Status as of 2026-08-14, end of day.** The automation engine is functionally
complete and configurable in the app: write the copy, build a chain, attach
templates, say what triggers it, turn it on. Work then appears in My Work on the
right dates, messages send themselves, and everything cancels when a lead
converts.

Done: P0-1 (decided: app first, data after), P0-4, P0-5, P0-6, P1-1, P1-2, P1-3,
P1-4, P1-5 in part.

**Done 2026-08-15:**

1. **`message_failed` now fires.** Raised from all three places a message can
   actually fail: the send-time throw in `reminder-sender`, an email bounce via
   the Resend webhook, and a failed or undelivered SMS via the Twilio status
   webhook. All three go through `queueMessageFailedEvent`, which writes to the
   same `process_event_queue` the other four events already use, so the
   existing drain cron handles it with no new infrastructure.
2. **Vocabulary editor** at Settings > Workflow > Activity Types & Outcomes.
   Add, rename, deactivate, delete. Delete is blocked with the names of the
   automations still using the row rather than cascading them away silently.
3. **The six system emails** are seeded per organization as editable rows and
   resolved by slug, so `job_confirmation` and friends can be reworded without
   a deploy. Settings > Message Templates grew an SMS tab for the five SMS
   ones. An org that predates the seed still falls back to the hardcoded copy,
   so nothing breaks mid-migration.

Not done, in the order worth doing them:

1. **P0-2 and P0-3**, the extraction and field mapping, which is the whole of
   the data migration. Blocked on five open questions in section 4, not on
   engineering time: what `Loans` is, whether appointments map to surveys or
   opportunities, whether to carry 4.5 years of activity history, where
   proposals actually live, and which of the 13 chains still reflect practice.
   Also needs the PII handling in section 11 settled first.
2. **AHS's own configuration**: their 35 live activity references, six live
   templates, and four highest-volume chains, loaded as their rows.

**Nothing here has been exercised against the live site.** Type-check, lint and
the full suite are green, but nobody has built a chain in the UI and watched work
appear. That is the gap to close before AHS see it.

### P0. Blocks cutover

**P0-1. Decide the cutover model.** *(decision, not code)*
The honest position is in section 3. This decision drives everything else and is
needed before any of the work below starts.

**P0-2. Extract AHS data from MarketSharp.** *(engine: a reusable importer)*
Contacts, addresses, additional contacts, inquiries, appointments, jobs,
contracts, notes, payment histories, product catalog. The API is read-only OData
and we already have working authenticated access, so this is scripted and
repeatable rather than a hand export. Build it as `scripts/marketsharp/` with a
tenant argument, because the next client may also be leaving MarketSharp.
Snapshot first, then a delta pull at cutover for anything changed since.

**P0-3. Field mapping and a dry run.** *(per-tenant config)*
Map their fields onto ours, run the import into a scratch org, and diff counts
against the source. `docs/MarketSharp Migration Guide.md` has a field mapping
already but assumes CSVs, so it needs rewriting against the API.

**P0-4. A work queue Gina can actually work.** *(engine)*
Ninety percent of her day is a list of activities with due dates. Follow-ups
already have a table, a service, a REST API and per-entity UI on contact detail.
What does not exist is one view showing everything assigned to a person across
every entity type, sorted by due date, which is the screen she lives in all day.
Needs: filter by assignee and date window, show what each item is attached to
(the API returns `entity_type` and `entity_id` but no display name, so this
needs resolving), complete with an outcome, and reassign.

**P0-5. Extend `follow_ups` into a real activity.** *(engine plus per-org config)*
**Done**, migration `20260814000002_activity_model.sql`. Adds `kind`, per-org
`activity_types` and `activity_outcomes` vocabularies with generic seeded
defaults and a backfill for existing orgs, `reminder_minutes`, `source`
(manual / process / import), and `external_ref` with a unique partial index so
an import can run twice without duplicating. Also adds an RLS policy letting a
technician complete work assigned to them, which the existing write policies
stopped at estimator.

Still to do here: import AHS's 35 live references as their rows, and do not
import the 32 dead ones.

**P0-6. Org-scoped email templates.** *(engine plus defaults)*
Replace the hardcoded copy with a table shaped like `sms_templates`: per-org,
editable, `is_system` for shipped defaults, variable substitution. This is a
multi-tenancy blocker in its own right, independent of AHS. Then load their six
live templates as AHS rows.

Note the copy is currently spread across at least three places, so this is a
consolidation as well as a move to data: the 6-slug `switch` in
`lib/services/reminder-sender.ts`, `lib/emails/password-reset.ts`, and template
references in `lib/services/invoice-delivery-service.ts`. Transactional
system mail such as password reset should stay in code; only tenant-facing
messages need to become editable rows. Worth drawing that line deliberately
rather than moving everything.

### P1. First weeks after cutover

**Done 2026-08-14:** P1-1 (migration `20260814000003`, plus the editor at
Settings > Workflow > Automations), P1-2 (migration `20260814000004`, plus the
trigger editor on the same page), P1-3 (`activity-process-runner`, the
`create_activity_process_work` RPC, and tenant-authored templates), P1-4
(migrations `20260814000006` and `20260814000007`, canceling both the work and
its queued messages). P1-5 is half done: four of the five events are raised by
database triggers into `process_event_queue` and drained by a ten-minute cron,
but delivery failures are not yet among them.

**P1-1. Process definitions and steps.** *(engine plus per-org config)*
Two tables: process (name, active, for production, use Saturdays, use Sundays)
and step (order, type, reference, assignee mode, due-date rule, reminder,
template). Assignee mode must support a named user, unassigned, and current
user, because all three appear in their live chains. Import the four
highest-volume AHS chains from `docs/marketsharp-audit.md` section 6 as their
data. Ship one or two generic starters as defaults for new tenants.

**P1-2. The rules engine.** *(engine)*
One table: on event type, with outcome, with optional qualifier, run process.
Their three rule screens collapse into one generic table. Events we need at
launch: activity completed, appointment result set, opportunity status changed.
Add lab result received, which they do by hand and we can do properly.

**P1-3. Step scheduler.** *(engine)*
Compute due dates from the three modes, apply the weekend flags, write rows into
`scheduled_reminders` for sending steps and activities for call and to-do steps.
The hourly cron already drains reminders, so this is computation rather than new
infrastructure.

**P1-4. Cancel pending steps on conversion.** *(engine)*
Their global setting, and the failure mode is embarrassing: nurture email to
someone who already bought.

**P1-5. Send outcomes as events.** *(engine)*
Bounce and delivery failure re-enter the rules engine. Resend gives us webhooks
for this already.

### P2. After it is stable

- Business-day flags surfaced in settings alongside the business hours added today
- AHERA three-year school reinspection as a product-level compliance rule
- File notification as a workflow step rather than only a calendar deadline
- Crew members who are not login users
- Catalog concepts they need that we lack: air testing, sample analysis, DHS notification, convenience and late fees, time and materials
- Lead paint compliance tracking, which neither system does today

---

## 3. The schedule, honestly

The data migration is achievable next week. Volumes are small, the API is
read-only, access works, and the extraction is scripted.

The automation is not. P0-4 through P0-6 alone are the week, and P1-1 through
P1-3 are the actual engine. Their system fires roughly 3,000 activities a month
off those chains, and on cutover day none of that exists in HazardOS.

The recommendation is a **phased cutover**: move the data and make HazardOS the
system of record next week, and run the follow-up work manually for a few weeks
while the engine is built behind it. That is viable only if P0-4 ships, because
Gina needs somewhere to see and work her list. Without the work queue, the
manual fallback has nowhere to happen.

What that costs: Gina absorbs the scheduling MarketSharp currently does for her,
on roughly 150 new inquiries and 120 jobs a month. That is a real and temporary
increase in her workload, and she should agree to it rather than discover it.

What it buys: the engine gets built as a product feature for every tenant rather
than a rush job shaped around one company's screenshots, which is the whole
point of section 0.

If the date cannot move and the automation must be live, then the scope that
gives way is the number of chains, not their quality. Four chains cover the
overwhelming majority of their firings.

---

## 4. Open questions blocking specific items

1. What is in `Loans`? 4,000 rows against 4,508 jobs. Blocks P0-2 scope.
2. Do their MarketSharp appointments become surveys, dated opportunities, or a new concept? Blocks P0-3.
3. Carry across four and a half years of activity history, or archive it? Blocks P0-2 volume.
4. Where do proposals actually live today, given the CRM holds one? Blocks nothing, informs P1.
5. Which of the 13 triggered processes still match how they work? Gina can answer from the reconstructed chains rather than from memory.
