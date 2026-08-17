# Roadmap

**As of 2026-08-17.** Only work that is actually open. Everything here is
either in progress or has a reason to happen; nothing is aspirational.

The previous roadmap was written in January and listed features that had
either shipped or been abandoned. If an item on this list stops being real,
delete it rather than leaving it to rot.

---

## 1. Madison Asbestos cutover

The live piece of work. Advanced Health & Safety are moving off MarketSharp.
Their production organization exists and is empty, waiting for data.

**Blocked on the client, not on engineering.** Five questions went to Gina on
2026-08-17 and the migration cannot be scoped until they come back:

1. What is in `Loans`? 4,000 rows against 4,508 jobs.
2. Do their appointments become site surveys or dated opportunities?
3. Carry four and a half years of activity history, or archive it?
4. Where do proposals actually live, given their CRM holds exactly one?
5. Which of their thirteen triggered chains still match practice?

**Then:** build the extraction, map the fields, dry run into a scratch org,
diff the counts, load their own configuration (35 live activity references,
six templates, four chains).

Detail in [`marketsharp-hazardos-diff.md`](./marketsharp-hazardos-diff.md) and
[`marketsharp-audit.md`](./marketsharp-audit.md).

## 2. Prove the automation engine in a browser

The engine is complete and configurable but **has never been exercised end to
end by a person**. Type-check and the test suite prove it compiles and that the
pure logic behaves. Neither proves a chain fires when someone completes a
follow-up.

This matters more than the other items because chains send email and SMS to
customers. Every other defect in the system is visible only to staff.

Run it with `/chrome` and the `qa-autopilot` skill. Roughly 360 UI cases are
already in the tracker sheet.

## 3. Environment items that need a person

**Leaked password protection is still off.** It was tested twice after being
enabled and a password breached 295,389 times was accepted both times. This was
defensible while there were no real users; it stops being defensible the moment
AHS's customer data lands. See [`security/supabase-auth-config.md`](./security/supabase-auth-config.md).

**`OPENAI_API_KEY` is not set in production**, so voice transcription fails.
Needs adding in Vercel and a redeploy, since env vars apply at build time.
`ANTHROPIC_API_KEY` is set and working.

**AI is consent-gated per organization**, separately from the keys. Both the key
and the org's consent must be present or the features stay dark.

## 4. Open from the codebase audit

Four of six priorities from [`CODEBASE-AUDIT-2026-08-16.md`](./CODEBASE-AUDIT-2026-08-16.md)
are closed. Two remain, both maintenance with no deadline:

**Split two oversized page components.** `work-orders/[id]/page.tsx` is 1,315
lines and `estimates/[id]/page.tsx` is 1,070, against a stated 800 limit. Both
now have characterization tests, which makes extraction safer.

**Consolidate onto one PDF library.** Both `jspdf` and `@react-pdf/renderer`
generate PDFs, and **proposals exist in both**, so two implementations of the
same customer document can drift. Migrate toward `@react-pdf/renderer`.

Neither was rushed on purpose. Everything else in that audit had a cheap way to
prove equivalence; a subtly wrong proposal PDF passes every test and still
reaches a customer. That check is manual and it is the only real one.

## 5. Smaller open items

**One activity feed still builds its own tab strip.** `components/activity/entity-activity-feed.tsx`
has the ARIA roles but not the shared `TabStrip`, so it lacks arrow-key
navigation the other four gained. Ten minutes.

**RingCentral inbound and delivery status are not built.** Sending and logging
work. Until inbound exists, **STOP replies are not captured on RingCentral**,
which is a compliance matter at volume.

**240 `multiple_permissive_policies`** across 22 tables, down from 390.
`profiles` and the pricing tables are done; the rest need per-table review.

**Job materials endpoints** allow `TENANT_FIELD` and strip cost by role. Worth
confirming with the client that technicians recording materials without seeing
cost matches how they work.

**`eslint` 9 to 10** is the dependency major worth planning for.

## 6. Product gaps worth building

These came out of the MarketSharp audit and are real product opportunities
rather than parity work:

**AHERA three-year school reinspection.** AHS track it as a manual reminder. It
is a regulatory obligation generic to the industry and we already model
compliance deadlines on the calendar.

**Regulatory notification as a workflow step**, not only a calendar deadline.
Their "File notification" step fired 662 times in eighteen months.

**Lead paint compliance tracking.** They do lead removal and track none of it in
their CRM. Their system has the tables and they are all empty.

**Catalog concepts we lack**: air testing, sample analysis, DHS notification,
convenience and late fees, time and materials.

**Crew members who are not login users.** They have 11 work crew against 5 CRM
users.

---

## What is deliberately not here

Video tutorials, interactive API docs, automated doc generation, and mobile app
development guides all appeared on the old roadmap for months without anyone
intending to build them. If one becomes real, add it back with a reason.
