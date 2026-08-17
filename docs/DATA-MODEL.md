# Data model

Orientation for 105 tables. Not a schema dump: the migrations and
`types/database.ts` are that, and they cannot drift. This is the map you need
before reading them, plus the names that mean something other than what they say.

Verified 2026-08-17 against `supabase/migrations/00000000000000_baseline.sql`
plus the migrations since.

---

## Read this part first

Six things cause more confusion than the other ninety-nine tables combined.

**`customers` means contacts.** People, not companies. The table is named
`customers` for historical reasons and the UI says "Contacts" everywhere. A
business account is a `companies` row.

**`customers.name` is not computed.** The database will not build it from
`first_name` and `last_name`. Compose it yourself on every write or you get a
contact with a blank display name.

**Payment status on a job is derived, not stored.** There is no `payment_status`
column. It is inferred from `status`, `deposit_received_date`,
`final_invoice_date` and `final_payment_date`. Do not add a column for it.

**`follow_ups` is the work-item table**, despite the name. It holds every dated
call, email, text and to-do including everything automations create. See
[`AUTOMATIONS.md`](./AUTOMATIONS.md). "Open" means
`completed_at IS NULL AND canceled_at IS NULL`, and three partial indexes depend
on that definition.

**PostgREST needs a foreign-key hint** whenever a table has more than one FK to
the same target. `customer:customers!customer_id(...)`, not
`customer:customers(...)`. Without it you get PGRST201 or a 404. `jobs` and
`job_completions` are the pair this bites most often:
`!job_completions_job_id_fkey`.

**Every business table has `organization_id`** and row-level security keyed on
it. Policies also check role, because org scoping alone let a viewer write
through PostgREST directly. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## The spine

The path a job takes through the system, and the tables at each step.

```
companies ──┐
            ├─► customers ──► opportunities ──► site_surveys ──► estimates ──► proposals
properties ─┘        │              │                                              │
                     │              └── pipeline_stages                            ▼
                     │                                                           jobs
                     │                                                             │
                     └──────────── follow_ups (work on any of these) ──────────────┤
                                                                                   ▼
                                                              work_orders    job_completions
                                                                                   │
                                                                                   ▼
                                                                    invoices ──► payments
```

## By area

### CRM
`customers` (contacts), `companies`, `customer_contacts` (extra people on a
contact), `properties`, `property_contacts`, `opportunities`,
`opportunity_history`, `pipeline_stages` (per-org, trigger-seeded),
`customer_segments`, `segment_members`, `attribution_touchpoints`.

Attribution is multi-touch: first, last and converting source/medium/campaign
live on contacts, companies, opportunities and jobs, propagated by triggers.

### Field work
`site_surveys`, `survey_photos`, `site_survey_photos`, `photos`,
`photo_analyses`, `voice_transcriptions`, `labs`, `lab_reports`,
`lab_report_samples`.

Surveys are versioned: `parent_survey_id`, `survey_root_id` and `version`. A
revision creates a new row rather than mutating the old one.

Lab results drive automation. Positive is decided from the samples, on either a
measured `asbestos_pct` above zero or a result naming a detection.

### Estimating and proposals
`estimates`, `estimate_line_items`, `estimate_suggestions`,
`estimate_attached_documents`, `proposals`, `approval_requests`,
`approval_thresholds`.

Pricing inputs: `pricing_settings`, `labor_rates`, `equipment_rates`,
`equipment_catalog`, `material_costs`, `materials_catalog`, `disposal_fees`,
`travel_rates`.

### Jobs
`jobs`, `job_crew`, `job_documents`, `job_notes`, `job_materials`,
`job_material_usage`, `job_equipment`, `job_disposal`, `job_time_entries`,
`job_change_orders`, `job_completions`, `job_completion_checklists`,
`job_completion_photos`, `work_orders`, `work_order_documents`,
`work_order_vehicles`.

Job completion has more than one code path, which is why completion automation
belongs in a database trigger rather than a service.

### Money
`invoices`, `invoice_line_items`, `invoice_attached_documents`, `payments`,
`payment_methods`, `commission_plans`, `commission_earnings`,
`commission_periods`, `billing_invoices`, `organization_subscriptions`,
`subscription_plans`, `stripe_webhook_events`, `tenant_usage`.

`billing_invoices` is us billing the tenant. `invoices` is the tenant billing
their customer. Different things.

### Automations and messaging
`follow_ups`, `activity_types`, `activity_outcomes`, `activity_processes`,
`activity_process_steps`, `activity_process_rules`, `process_event_queue`,
`scheduled_reminders`, `email_templates`, `sms_templates`, `sms_messages`,
`email_sends`, `notifications`, `notification_preferences`,
`push_subscriptions`.

`activity_log` is an audit trail, not a work queue. Do not confuse it with
`follow_ups`.

### Compliance
`credentials`, `credential_types` (per-org, trigger-seeded), `credential_alerts`,
`industry_events`, `calendar_sync_events`.

### Tenancy and platform
`organizations`, `profiles`, `locations`, `location_users`,
`tenant_invitations`, `organization_documents`, `organization_document_shares`,
`organization_integrations`, `organization_ai_settings`,
`organization_sms_settings`, `platform_settings`, `custom_domains`.

`profiles` extends `auth.users`. A signup trigger creates the row **with no
organization**; something else has to attach it. See
[`TENANT-ONBOARDING.md`](./TENANT-ONBOARDING.md).

### Integration and operations
`api_keys`, `api_request_log`, `webhooks`, `webhook_deliveries`,
`lead_webhook_endpoints`, `lead_webhook_log`, `integration_sync_log`,
`marketing_sync_log`, `cron_runs`, `audit_log`, `ai_usage_log`,
`report_exports`, `saved_reports`, `feedback_surveys`, `review_requests`.

---

## Conventions

- `snake_case` tables and columns, UUID primary keys from `gen_random_uuid()`.
- `created_at` / `updated_at` on most tables, with `update_updated_at_column()`
  triggers maintaining the second.
- RLS enabled on every business table. Reads are org-scoped; writes are org and
  role scoped.
- Per-organization defaults are seeded by AFTER INSERT triggers on
  `organizations`, never by a shared migration. Anything org-scoped belongs in a
  trigger.

## Two traps that have cost real time

**`INSERT ... RETURNING` is checked by the SELECT policy**, not the INSERT one.
A row you may create but not read fails on the way back out.

**A function with `SET search_path = public` cannot see extension functions.**
Call them qualified (`extensions.gen_random_bytes`) or use something in `public`.

## Where the truth is

`types/database.ts` is maintained by hand alongside the migrations, not
generated. Adding a column means updating Row, Insert and Update in that file or
the typed client rejects it.

The migration set is a **squashed baseline**. Read the migration section of
[`CLAUDE.md`](../CLAUDE.md) before touching it.
