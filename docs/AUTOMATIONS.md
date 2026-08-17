# Automations

How work creates itself: something happens, a chain of follow-up work appears
with the right dates on it, and the messages in that chain send themselves.

Built 2026-08-14 to 08-15. Verified by unit tests and by type-check;
**not yet exercised end to end in a browser**, which is the first thing to do
before a customer relies on it.

---

## Why it exists

Advanced Health & Safety are moving off MarketSharp, where roughly 116,000
activities sit against 7,650 contacts. Fifteen work items per contact. Their
office manager is assigned 89% of them. That system is not a contact database
with some tasks bolted on; it is a task system that happens to hold contacts,
and anything replacing it has to be at least as good at generating and chasing
dated work.

Full background in [`marketsharp-audit.md`](./marketsharp-audit.md).

## The design rule

HazardOS is sold to environmental remediation companies generally. AHS is the
first tenant, **not the specification**. Every part of this splits three ways:

| Tier | Lives in | Examples |
|---|---|---|
| **Engine** | Shared code | Rule matching, due-date arithmetic, sending, weekend skipping |
| **Defaults** | Seeded per organization by a trigger on `organizations` | 12 activity types, 9 outcomes |
| **Tenant config** | That organization's own editable rows | Their chains, their triggers, their copy |

The test for any change: *a second abatement company signs up next month. Do
they get something sensible without a deploy, and can they change all of it
themselves?*

No default chains are seeded. Vocabulary generalizes across remediation
companies; sales processes do not, so a new tenant gets an empty list rather
than someone else's process.

---

## The parts

### Vocabulary

`activity_types` is what a step *is*, in the tenant's own words ("Confirm
appointment", "Chase lab results"), each with a `kind` the engine understands:
`call`, `email`, `text`, `todo`.

`activity_outcomes` is how a step *turned out*. One flag matters:
**`halts_chain`**. Completing a step normally advances the chain, and there has
to be a way to stop it. This models MarketSharp's outcome literally named
"Done (doesn't add activity process)".

Both are per-organization, seeded with generic defaults and editable at
**Settings → Workflow → Activity Types & Outcomes**.

### Work items

Work lives in `follow_ups`, which predates this and was extended rather than
replaced. Beyond the original entity, due date, assignee and completion it now
carries `kind`, `activity_type_id`, `outcome_id`, `reminder_minutes`, `source`
(`manual` / `process` / `import`), `external_ref`, `process_id`,
`process_step_id`, and the cancellation columns.

`external_ref` has a unique partial index per organization, so an import can run
twice without duplicating. That matters for a cutover: snapshot first, delta
later.

**Open** means `completed_at IS NULL AND canceled_at IS NULL`. Three partial
indexes back that definition; if you change it, change them too.

### Chains

`activity_processes` is a named, ordered list of steps. It carries
`use_saturdays` and `use_sundays`, which decide whether a computed due date may
land on a weekend. These matter more than they look: AHS's Sunday activity count
exceeds their Saturday count, and that is not people working, it is chains
dropping due dates on days the office is shut.

`activity_process_steps` holds the ordered steps. Each has a kind, a type from
the vocabulary, an assignee rule, a due-date rule, an optional reminder, and a
template when it sends something.

**Assignee modes**, all three of which AHS use in live chains:

| Mode | Lands on |
|---|---|
| `user` | A named person |
| `unassigned` | Nobody, for a queue anyone can pick up |
| `current_user` | Whoever completed the triggering step |

`current_user` falls back to unassigned when there is no acting user, which
happens when a cron or a webhook fires the chain. Leaving the work for someone
to claim beats dropping it.

**Due-date modes:**

| Mode | Meaning |
|---|---|
| `immediate` | The moment the chain fires |
| `days_at_time` | N days later, at a fixed clock time |
| `days_hours_minutes` | N days plus hours plus minutes later |

Two behaviors worth knowing, both tested in
`test/services/activity-process-scheduler.test.ts`:

- A clock time **survives a weekend shift**. A step due "3 days at 5am" that
  slides from Sunday to Monday is still due at 5am, not at whatever time the
  shift produced.
- An `immediate` step is **never shifted**. A thank-you text fired when a
  Saturday job completes should go out on the Saturday.

### Triggers

`activity_process_rules` decides what makes a chain run. MarketSharp has three
separate rule screens that all do the same thing; this is one table.

A rule names an event type and any qualifiers that narrow it. **A null qualifier
means "any"**, exactly like their `-- Any --` option. Their rule "Email Failure
on any reference fires Bad email bounce" is one row with the outcome set and the
type left null.

| Event | Qualifiers |
|---|---|
| `activity_completed` | activity type, outcome |
| `opportunity_stage_changed` | pipeline stage |
| `job_status_changed` | job status |
| `lab_result_received` | positive / negative |
| `message_failed` | email / sms |

Every rule can additionally filter on `contact_type` (residential or
commercial). **This is the one place the design deliberately improves on
MarketSharp rather than copying it.** They separate residential from contractor
work by overloading the outcome value ("Completed" versus "Contractor
completed"), which is why several of their chains exist in near-identical pairs.
Contact type is a real field here, so one chain serves both.

Three matching semantics, each easy to get backwards and each tested in
`test/services/activity-process-rules.test.ts`:

1. **All matching rules fire**, not only the most specific. AHS keep a catch-all
   bounce rule alongside specific rules and mean both to apply.
2. **A rule naming a qualifier the event does not carry does not match.** "Fires
   when the outcome is Not Interested" must not fire on an event with no outcome.
3. **Processes are deduplicated.** A residential rule and a commercial rule
   pointing at the same chain is legitimate and must not create the work twice.

---

## How an event becomes work

```
something happens
   │
   ├─ activity completed ──────────► fires inline, in the request
   │
   └─ job status changed            ┐
      opportunity stage changed     ├─► database trigger writes
      lab result received           │   process_event_queue
      message failed                ┘
                                        │
                                        ▼
                          /api/cron/process-events, every 10 minutes
                                        │
                                        ▼
                        rules matched ──► chain loaded ──► due dates computed
                                        │
                                        ▼
                     create_activity_process_work (one transaction)
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                      follow_ups rows        scheduled_reminders rows
                    (appear in My Work)    (sent by the hourly cron)
```

**Why a queue rather than service-layer hooks.** Job status and opportunity
stage change from several code paths, at least one a direct client write. A hook
in one service fires most of the time, which is the worst possible reliability
for automation: it works when you test it and misses in production without a
trace. A database trigger sees every write.

**Why the whole chain lands in one transaction.** Eleven inserts that partially
succeed leave some follow-ups existing and the rest never arriving, with nothing
in the data saying which.

**Why there is no run state machine.** A chain writes all of its steps at once
with staggered due dates. The rows are the running chain. This is also how
MarketSharp behaves, and it is why their chain definitions were recoverable from
their activity records at all.

---

## Sending

An email or text step queues a real message alongside its work item, in the same
transaction, rendered from the tenant's own template.

Templates are edited at **Settings → Communications → Message Templates** and
are loaded **at send time, not snapshotted when queued**, so fixing a typo
reaches messages already in the queue. That is what someone expects when
correcting a chain that runs for a year.

Substitution uses `{{variable}}` and guarantees two things, both because the
output lands in a customer's inbox:

- **Values are substituted once and never re-scanned.** A value containing
  `{{something}}` is inert text, not an instruction.
- **An unknown placeholder renders as nothing** and never falls back to reading
  a record. `reminder-sender.ts` renders only from variables the scheduler
  declared customer-safe, which is what keeps access codes and staff notes out
  of outbound mail by construction. A template that could fetch its own data
  would undo that.

Available variables are deliberately few: `customer_name`,
`customer_full_name`, `company_name`, `city`. Widening that set is how the
guarantee gets lost, so widen it on purpose or not at all.

**A step that cannot send becomes a manual task rather than disappearing.** No
template chosen, no address on file, or a template set for the wrong channel:
the person still sees "send the pre-appointment email" in their queue. Dropping
it would lose work silently.

---

## Stopping

**When a lead converts to a customer**, queued automated work on that contact is
canceled, along with any messages it had queued. Without this, a twelve-month
nurture chain keeps chasing someone for ten months after they bought.

- Implemented as a **database trigger** on `customers`, not application code,
  because status changes from several paths.
- Per-organization, via `organizations.cancel_work_on_conversion`. It is a
  business policy and AHS's answer is one opinion.
- **Only automated work is canceled.** A hand-written "call them about the
  crawlspace" is somebody's intent and is often more relevant after the sale.
- Canceled, not deleted, with a reason. "Why did the twelve-month follow-up
  never happen" is a question someone will ask, and a deleted row cannot answer
  it.

**An outcome flagged `halts_chain`** stops further work being scheduled. Note
the difference: it prevents scheduling, it does not cancel work already queued.

---

## Where things are

| Concern | File |
|---|---|
| Due-date arithmetic | `lib/services/activity-process-scheduler.ts` |
| Rule matching | `lib/services/activity-process-rules.ts` |
| Firing a chain | `lib/services/activity-process-runner.ts` |
| Draining queued events | `lib/services/process-event-drain.ts` |
| Template substitution | `lib/services/template-render.ts` |
| Sending | `lib/services/reminder-sender.ts` |
| Work queue screen | `app/(dashboard)/my-work/` |
| Chain and trigger editors | `app/(dashboard)/settings/automations/` |
| Template editor | `app/(dashboard)/settings/message-templates/` |

Migrations `20260814000002` through `20260814000010`.

---

## Known gaps

- **Never exercised in a browser.** Unit tests cover the pure logic; nobody has
  built a chain in the UI and watched work appear. Do this first.
- **No default chains ship.** Intentional, but it means a new tenant sees an
  empty Automations screen with nothing to copy.
- **AHS's own configuration is not loaded.** Their 35 live activity references,
  six live templates and four highest-volume chains are documented in the audit
  but not imported.
- **Reminders are not shifted off weekends**, only due dates are. A reminder
  exists to arrive before a date already placed on a working day.
