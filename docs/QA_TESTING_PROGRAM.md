# HazardOS — QA Testing Program

A structured plan for systematically testing HazardOS. Pair this with
[QA_PRODUCT_GUIDE.md](QA_PRODUCT_GUIDE.md) which gives you product
context.

## How to use this document

1. Read the product guide first.
2. Set up your test accounts (see "Test environment" in the product
   guide).
3. **Import [`QA_TEST_TRACKING.csv`](QA_TEST_TRACKING.csv) into a
   Google Sheet** — that's your active tracker, one row per test step,
   ready for status / notes / bug-link columns.
4. Work through the test passes in order. **Smoke** first to confirm
   nothing's catastrophically broken, then deeper passes.
5. Mark each test **Pass / Fail / Blocked / N/A** in the sheet and log
   any failures using the bug report format at the bottom.
6. When you finish a pass, share the sheet so we can prioritize fixes.

## Setting up your tracker

The `QA_TEST_TRACKING.csv` file in this folder has every test step
from this document as a row, with empty columns for tracking.

**To import into Google Sheets:**

1. Open Google Sheets → File → Import → Upload → drop the CSV.
2. Choose "Replace spreadsheet" → Import data.
3. Select the `Status` column → Data → Data validation → Dropdown
   with values: `Not Started, Pass, Fail, Blocked, N/A`.
4. Optionally: add conditional formatting so Fail rows turn red.
5. Share the sheet back with Mark.

Columns: `Pass | Pass Name | Section | Test ID | Test Step | Status |
Notes | Bug Link | Tester | Date`.

## Test passes (run in order)

### Pass 1 — Smoke (60 minutes)

The fastest way to know if a build is shippable. Do these before
anything else.

| ID | Step | Pass / Fail |
|---|---|---|
| S1 | Visit `/` or `/login` — loads, no console errors | |
| S2 | Sign up a fresh account at `/signup` — succeeds | |
| S3 | Land on the dashboard after signup | |
| S4 | Open `/crm` — CRM hub renders | |
| S5 | Open `/crm/contacts` and add a contact — saves | |
| S6 | Open `/site-surveys/mobile` (works in desktop too) — wizard loads | |
| S7 | Open `/estimates` — list renders | |
| S8 | Open `/crm/jobs` — list renders | |
| S9 | Open `/invoices` — list renders | |
| S10 | Open `/settings/team` — team management page renders | |
| S11 | Open `/settings/billing` — Stripe-connected billing screen renders | |
| S12 | Sign out from any page — lands at `/login`, no leaked session | |
| S13 | Sign back in — your data is still there | |
| S14 | Open the dev tools console — no red errors on page load | |

---

### Pass 2 — Authentication & onboarding (60 minutes)

**Happy path**
- [ ] Sign up at `/signup` with a fresh `+alias` email
- [ ] Email confirmation flow (if any) works
- [ ] First sign-in lands on the dashboard, organization is auto-created
- [ ] You're assigned tenant_owner role (check role display in user
  menu or settings)
- [ ] Sign out clears the session — visiting a protected route
  redirects to `/login`
- [ ] Sign back in — session is restored

**Invites and roles**
- [ ] From `/settings/team` invite a second alias email as Admin —
  invite email arrives
- [ ] Accept invite from the email link (use incognito or different
  browser) — lands inside YOUR org as Admin
- [ ] Repeat for Estimator role
- [ ] Repeat for Technician role
- [ ] Repeat for Viewer role
- [ ] Each role can do what their permissions allow and nothing more
  (test by trying to access /settings/billing as a non-owner)
- [ ] Remove a team member — they lose access on next page load

**Multi-tenant isolation**
- [ ] Sign up a brand-new alias (not invited to your org) — creates a
  NEW org
- [ ] From that second org, you should see NO data from the first org
- [ ] Try to access a known resource URL from Org A while signed in to
  Org B — should 403 / 404, NOT show the data
- [ ] Same test for `/crm/contacts/{contactId}`,
  `/jobs/{jobId}`, `/estimates/{estimateId}` from another org

**Edge cases**
- [ ] Sign up with an email that's already registered — clear error
- [ ] Sign in with wrong password — clear error
- [ ] Sign in with disposable email service — accepted or rejected?
- [ ] Session expires mid-session — re-auth flow works cleanly
- [ ] Reject the invite email — invite cleaned up
- [ ] Try to invite the same email twice — handled gracefully

**Accessibility**
- [ ] Tab through the signup / sign-in forms — focus visible, order
  logical
- [ ] Screen reader announces form errors on submit

---

### Pass 3 — CRM (90 minutes)

**Contacts (`/crm/contacts`)**
- [ ] Add an individual contact (residential customer) — saves
- [ ] Add a commercial contact — saves, prompts for company
- [ ] Edit contact info — saves
- [ ] Delete a contact — confirms, removes
- [ ] Search contacts by name — filters
- [ ] Filter contacts by type, status — works
- [ ] Bulk select + bulk action — works

**Companies (`/crm/companies`)**
- [ ] Add a company manually — saves
- [ ] Add a contact linked to existing company — company appears in
  dropdown
- [ ] Multiple contacts on same company — all linked
- [ ] Edit company details — saves

**Properties (`/crm/properties`)**
- [ ] Add a property address — saves with normalized address
- [ ] Multiple properties per customer — linked correctly

**Opportunities + pipeline**
- [ ] Create an opportunity — appears in `/crm/opportunities`
- [ ] Move an opportunity through pipeline stages on `/crm/pipeline`
  via drag-and-drop — saves
- [ ] Edit opportunity details (value, expected close date) — saves
- [ ] Convert won opportunity → creates a job
- [ ] Attribution shows correctly (first / last / converting touch)

**Jobs (`/crm/jobs`)**
- [ ] Jobs created from won opportunities appear here
- [ ] Manual job creation works
- [ ] Job detail view shows scope, customer, status

---

### Pass 4 — Site survey (mobile-first) (120 minutes)

**This is the most important pass — test on a real phone if at all
possible.**

**Desktop happy path** (sanity check)
- [ ] Open `/site-surveys/mobile?customerId={existing}` — wizard loads
- [ ] Step 1 Property: add address, building age — saves
- [ ] Step 2 Access: parking, entry, special requirements — saves
- [ ] Step 3 Environment: occupancy, utilities — saves
- [ ] Step 4 Hazards: identify materials (asbestos, mold, lead, etc.)
  — multi-select works
- [ ] Step 5 Photos: upload at least one — queued
- [ ] Step 6 Review: summary shows everything entered
- [ ] Submit — survey appears in surveys list

**Mobile happy path** (install the PWA on a phone)
- [ ] PWA installs to home screen via Safari iOS / Chrome Android
- [ ] App icon appears with correct branding
- [ ] Opens in standalone mode (no browser chrome)
- [ ] Survey wizard touch targets are at least 44px tall
- [ ] Swipe forward / back between steps works
- [ ] Safe area handles iPhone notch / home indicator
- [ ] Form inputs don't trigger double-tap-to-zoom

**Offline / sync (the critical promise)**
- [ ] Start a survey while online — open dev tools, throttle to offline
- [ ] Continue editing — fields accept input, draft auto-saves to
  IndexedDB
- [ ] Upload a photo while offline — queues locally
- [ ] Throttle back to online — survey syncs, photo uploads
- [ ] Hard refresh while offline — draft survives, can resume editing
- [ ] Close and reopen the app — draft survives
- [ ] Resume an old draft via `/site-surveys/mobile?surveyId={id}` —
  loads correctly

**Photos**
- [ ] Take a photo (mobile) — captured, GPS coordinates attached if
  permission granted
- [ ] Upload from photo library — works
- [ ] Photo retry logic: simulate a failed upload — retries up to 3
  times, then surfaces error
- [ ] Many photos (20+) — queue handles it without crash
- [ ] Photo metadata stored (GPS, taken-at time, file size)

**Hazard data structure**
- [ ] Select multiple hazard types in one survey — all save
- [ ] Add quantity / location notes per hazard — saves
- [ ] Material-specific fields appear based on hazard type chosen

**Conversion to estimate**
- [ ] Submit survey — link to "Create estimate" appears
- [ ] Estimate auto-populated with line items from survey hazards
- [ ] Estimate references the source survey

---

### Pass 5 — Estimates (60 minutes)

- [ ] Open `/estimates` — list renders
- [ ] Create estimate from scratch (not from survey) — works
- [ ] Create estimate from a completed survey — pre-populated correctly
- [ ] Add line items with hazard-specific pricing rules
- [ ] Edit unit cost, quantity, markup — totals recalculate
- [ ] Save as draft — appears in drafts
- [ ] Approve estimate — moves to approved state
- [ ] Pricing rules from `/settings/pricing` are respected per-org
- [ ] Generate PDF preview — looks clean, no overlapping elements, no
  truncated text
- [ ] Send to customer — proposal flow triggers
- [ ] Edit an approved estimate — handled per policy (locked? versioned?)

---

### Pass 6 — Proposals & customer portal (60 minutes)

**Internal**
- [ ] Generate a proposal from an approved estimate — token URL
  created
- [ ] Proposal status updates as customer interacts
- [ ] Resend proposal email — works

**Public portal** (`/portal/proposal/[token]`) — open in incognito, no
auth
- [ ] Token URL loads the proposal correctly
- [ ] PDF download works
- [ ] All sections render: scope, line items, terms, signature pad
- [ ] E-signature pad accepts mouse + touch input
- [ ] Sign and submit — confirmation message
- [ ] Returning to the URL after signing shows the signed state
- [ ] Tamper test: change token in URL — 404 / unauthorized
- [ ] Try to view a proposal from another org by guessing the URL —
  fails

**Side effects of signing**
- [ ] Signed proposal → job auto-created in scheduler view
- [ ] Notification appears for office staff
- [ ] Estimate status updates to "Signed"

---

### Pass 7 — Jobs & job completion (90 minutes)

**Scheduling** (`/crm/jobs`)
- [ ] List of jobs renders with status badges
- [ ] Create a job manually — saves
- [ ] Edit job details (schedule, crew, scope) — saves
- [ ] Assign crew members — they appear in their job queue
- [ ] Job notifications sent to assigned crew (SMS + email per
  preference)

**Job completion** (`/jobs/[id]/complete`)
- [ ] Crew member opens assigned job on phone — loads
- [ ] Log start time — saves
- [ ] Log materials used (quantities) — saves
- [ ] Upload completion photos — queue + sync work like surveys
- [ ] Log equipment used — saves
- [ ] Notes field accepts text
- [ ] Submit completion — variance analysis shown (actual vs
  estimated)
- [ ] Office reviewer can approve / request changes — workflow works

**Variance analysis**
- [ ] Actual hours vs estimated hours visible
- [ ] Actual materials cost vs estimated visible
- [ ] Overrun flagged appropriately
- [ ] Under-budget jobs noted

---

### Pass 8 — Invoices & payments (60 minutes)

- [ ] `/invoices` lists all invoices for the org
- [ ] Filter by status, customer, date range
- [ ] Job completion auto-generates an invoice — line items match the
  completed job
- [ ] Manual invoice creation works
- [ ] Edit invoice line items before sending
- [ ] Send invoice via email — customer receives
- [ ] Send invoice via SMS (if customer opted in) — customer receives
- [ ] Invoice PDF looks clean, no formatting issues
- [ ] Mark invoice as paid manually — status updates
- [ ] Payment reminder schedule fires per cadence
- [ ] Past-due invoices flagged with appropriate styling
- [ ] QuickBooks integration (if configured) syncs the invoice
- [ ] Invoice link to customer — opens a clean view (no internal
  details)

---

### Pass 9 — Pipeline & analytics (45 minutes)

- [ ] `/crm/pipeline` renders the kanban board
- [ ] Drag-and-drop between stages saves immediately
- [ ] Stage values aggregate correctly per column
- [ ] Filter pipeline by sales user, date range, stage
- [ ] Move an opportunity backwards through stages — logged with
  reason
- [ ] Win an opportunity from the pipeline — converts to job
- [ ] Lose an opportunity — captures reason, archived
- [ ] Analytics dashboard shows pipeline value, win rate, average
  deal size
- [ ] Per-estimator accuracy metric (pattern learning) appears for
  Professional+ tier
- [ ] Numbers match the source data (spot-check 2-3 totals)

---

### Pass 10 — Commissions (30 minutes)

- [ ] `/sales/commissions` renders for users with permission
- [ ] Auto-calculated commissions appear per won job
- [ ] Calculation matches the commission rules configured
- [ ] Approval workflow: submit → reviewer approves / rejects
- [ ] Approved commissions exportable
- [ ] Period close prevents re-editing past periods

---

### Pass 11 — Customer feedback portal (30 minutes)

**Public portal** (`/feedback/[token]`) — incognito, no auth
- [ ] Open the survey link — loads
- [ ] NPS scale (0-10) renders, touch-friendly
- [ ] Comment / testimonial field works
- [ ] Submit — confirmation
- [ ] Returning after submission — shows "already submitted" state
- [ ] Invalid / expired token — friendly error, not a crash

**Internal**
- [ ] Submitted feedback appears in office analytics
- [ ] NPS average calculated correctly
- [ ] Testimonials filterable, exportable

---

### Pass 12 — SMS opt-in & communications (45 minutes)

**Opt-in flow** (`/public/sms-consent`) — TCPA-compliant
- [ ] Customer receives initial opt-in SMS link
- [ ] Open the link unauthenticated — opt-in screen renders
- [ ] Accept consent — recorded with timestamp + IP for compliance
- [ ] Reject / close — no consent recorded
- [ ] Opt out via STOP message — respected
- [ ] Re-opt-in via START — works

**Email + SMS preferences** (`/settings/email`, `/settings/sms`)
- [ ] Per-customer preference saved
- [ ] Quiet hours configurable — SMS not sent during quiet hours
- [ ] Customer can opt out of marketing but keep transactional
- [ ] Test send works
- [ ] Failed sends are surfaced in delivery logs

---

### Pass 13 — Settings & integrations (60 minutes)

**Team** (`/settings/team`)
- [ ] Invite, change role, remove — all work
- [ ] Pending invites list visible
- [ ] Audit trail of team changes (if implemented)

**Billing** (`/settings/billing`)
- [ ] Current plan visible
- [ ] Upgrade Starter → Professional → Enterprise via Stripe Checkout
- [ ] Test card `4242 4242 4242 4242` succeeds
- [ ] Test card `4000 0000 0000 0002` declines cleanly
- [ ] Downgrade enforces tier limits (e.g., excess users handled)
- [ ] Cancel subscription — keeps access until period end
- [ ] Webhook delivers tier updates within ~10 seconds

**API keys** (`/settings/api`) — Enterprise tier
- [ ] Generate an API key — shown once, secured after
- [ ] Use the key against `/api/v1/companies` — returns data
- [ ] Use without a key — 401
- [ ] Use a revoked key — 401
- [ ] Rate limits applied per key

**Pricing rules** (`/settings/pricing`)
- [ ] Edit base prices per material type — saves
- [ ] Rules apply to new estimates from this org only (not other orgs)

**Integrations** (`/settings/integrations`)
- [ ] QuickBooks connect flow works
- [ ] Disconnect cleanly
- [ ] Sync status visible

---

### Pass 14 — Cross-cutting tests (120 minutes)

**Mobile (iOS Safari + Android Chrome)**
- [ ] PWA installs on iOS — app icon, splash screen
- [ ] PWA installs on Android — same
- [ ] Standalone mode runs without browser chrome
- [ ] Mobile survey wizard usable on smallest supported viewport
  (iPhone SE, 320px)
- [ ] Touch targets at least 44px
- [ ] No horizontal scroll on any page at 375px width
- [ ] Forms don't trigger double-tap-zoom

**Offline-first (the differentiator)**
- [ ] Open the app online → go offline → continue using survey flow
- [ ] All draft surveys survive going offline
- [ ] Photo queue holds uploads while offline
- [ ] When online, sync triggers automatically
- [ ] Conflict handling: same survey edited offline on 2 devices —
  what happens?
- [ ] Hard cache test: clear the service worker, reinstall, drafts
  persist

**Accessibility**
- [ ] Keyboard-only navigation through the full app works
- [ ] Visible focus indicators on every interactive element
- [ ] Screen reader (VoiceOver / NVDA) announces form labels
- [ ] Color contrast hits WCAG AA on every text element
- [ ] All images have alt text
- [ ] Touch target sizes 44px+ on mobile

**Performance**
- [ ] Dashboard initial load < 3 seconds on a fast connection
- [ ] No layout shift on initial render
- [ ] Heavy pages (1000+ contacts, jobs list with 500 rows) stay
  responsive
- [ ] Notification bell polling doesn't crash the app over an hour of
  use

**Browser compatibility**
- [ ] Latest Chrome, Safari, Firefox on desktop
- [ ] Mobile Safari, mobile Chrome

**Error states**
- [ ] Disconnect mid-action — friendly error, retry option
- [ ] Server returns 500 — toast, no crash
- [ ] Visit a non-existent ID URL — 404, not crash
- [ ] Cross-tenant URL access — 403 / 404, never leaked data
- [ ] Session expired during action — re-auth flow works

**Data integrity**
- [ ] Survey survives offline → online sync
- [ ] Estimate edits never lost
- [ ] Job completion data persists through page refresh
- [ ] Invoice numbers are sequential per org

---

### Pass 15 — Security-conscious testing (60 minutes)

Some things to specifically check (beyond what the audit already
flagged — see "Known issues" in the product guide). These are areas
where a tester can confirm fixes have been applied or find new
problems:

- [ ] After a recent `npm audit fix`, are vulnerabilities resolved?
  (Mark will tell you when this has been done)
- [ ] Are raw Supabase error messages still leaking to clients? Try a
  malformed input and check error response
- [ ] Try accessing `/database-status` and `/migration-verification`
  as a non-platform user — should be blocked
- [ ] Try SQL-injection-style strings in CRM search fields (`%' OR
  '1`)
- [ ] Submit `<script>alert(1)</script>` in text fields — should be
  escaped on render
- [ ] Try to call `/api/v1/companies` without an API key — 401
- [ ] Try to call `/api/v1/companies` with a key from another
  organization — 401 or proper isolation
- [ ] Sign out — check that all session cookies AND localStorage are
  cleared
- [ ] Check that auth cookies are HTTPOnly + Secure in production

---

### Pass 16 — Exploratory / "try to break it" (open-ended)

The structured passes catch known cases. This catches the unknown.
Spend ~2 hours doing what a real user might try:

- Create 500 contacts via CSV import (if supported) — does it stay
  responsive?
- Open a survey on phone, open same survey on desktop in another
  session — both edit, sync — what wins?
- Sign in as Org A in Chrome, Org B in Firefox at the same time —
  cookie / session collisions?
- Try to upload an HEIC photo from iPhone — converts cleanly?
- Try a survey with 100 photos
- Try a customer with no email and no phone — can you still create
  invoice + send? What channel does it use?
- Try editing a finalized invoice — locked?
- Try to upgrade tier mid-month — proration correct?
- Try to assign a job to a removed user — handled?
- Try to view a job in an organization you were just removed from
  via stale URL — blocked?
- Try edge inputs: emoji in names, very long company names,
  non-Latin characters, BOM-prefixed CSV imports

Log anything weird, even if it's not strictly a bug.

---

## Bug report format

Keep bug reports short and declarative. Four things, in this order:

1. **What you're seeing** (and where, exactly)
2. **What you expected**
3. **How the result is different**
4. **Desired end-state** (what should happen instead)

That's it. Mark wants to be able to read each one in 10 seconds and
know exactly what to fix.

**Good example:**

> When you start a mobile survey and go offline mid-walkthrough, the
> draft saves to IndexedDB but the photo upload queue silently fails
> on reconnect — uploads don't retry.
>
> Expected: queued photos retry up to 3 times when network returns.
>
> Difference: queue stays full, no retry attempts visible in dev tools
> Network tab.
>
> Desired: automatic retry on reconnect, surfaced retry count in the
> sync indicator.

**Another good example:**

> On `/portal/proposal/[token]`, the customer-facing PDF has the
> internal estimate ID in the filename (`estimate-internal-78342.pdf`).
>
> Expected: customer-facing filename based on proposal number or
> company name.
>
> Difference: reveals internal numbering scheme to the customer.
>
> Desired: filename like `Proposal-{customerName}-{date}.pdf`.

### Add these only when they're not obvious from the above

- **Account / tier**: only if the bug differs by tier or role.
- **Browser / device**: only if you can't reproduce on a different
  one.
- **Screenshot / video**: when the issue is visual or hard to
  describe.
- **Reproducible?**: only if intermittent.
- **Severity** (only if strong opinion):
  - **critical**: data loss, cross-tenant leak, can't sign in, can't
    pay
  - **high**: a core workflow is broken
  - **medium**: works but the UX is broken
  - **low**: cosmetic / minor
- **Console errors**: paste them if the bug looks like a crash.

### Where to log them

Add each bug as a row in your tracking sheet (the `Bug Link` column),
or file them as GitHub issues if you have access. Either way the
four-bullet format above is what the body should look like.

## Cadence

- **Smoke pass**: run before every release / deploy to production.
- **Full regression** (passes 1–14): run before a major release.
- **Cross-cutting + exploratory**: monthly, or whenever a new feature
  area lands.
- **The area being changed**: every time that area's code changes.

## When you're done

Hand back:
1. The completed tracking sheet (pass/fail per item).
2. A list of all bugs logged, prioritized.
3. Any patterns you noticed (e.g., "offline sync is consistently
   weaker than online flows").
4. Any UX observations that aren't strictly bugs but feel off.
