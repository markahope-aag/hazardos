# Start here

Last updated **2026-08-19**, for whoever picks this up next (likely on a
different machine, so this lives in the repo rather than in local notes).

Everything is pushed and the tree is clean. `6,432` tests passing across 481
files, type-check and lint clean, production build green, E2E 38 passed at
`--workers=1`.

**Commit straight to `main`.** No branches, no PRs. This was asked for twice
and two PRs got opened anyway because the note was not indexed. See
`~/.claude/projects/D--projects-hazardos/memory/`.

**Judge a test run at `--workers=1`.** Parallel full-suite runs fail a
different 3 to 5 tests every time and every one passes single-worker. Same for
the vitest `test/integration/` files while a dev server is running. It is
contention, not regressions, and it has already been re-diagnosed as a code
fault more than once.

---

## 2026-08-19: AHS client feedback round

Gina Richardson (AHS office manager) and Brady Mautz are testing during
cutover week, so this whole day was their reported issues. The live list is
their Google Doc, "Harzard OS Issues 8-2026". **Fixed items stay on it, struck
through, at Gina's request.** She opened it one morning, found it empty, and
questioned whether she had ever written anything down. The Drive tooling here
cannot write into her doc, so the current version is a separate doc in Mark's
Drive that gets pasted in.

### The one worth reading about

Two independent faults made most of the mobile survey form unusable, and they
masked each other.

1. **Pointer capture.** The swipe-between-steps handler called
   `setPointerCapture` on every `pointerdown` in `<main>`. A captured pointer
   retargets its events, so `click` fired on `<main>` and never on the control.
   Building type, the state dropdown, stories, occupancy, the access questions
   and Use Location were all dead to taps. The footer Next/Back buttons kept
   working because they sit outside `<main>`, which is exactly why the existing
   offline spec never caught it: it fills inputs by value and uses the footer.
2. **`<label>` wrappers.** Five option groups were wrapped in `<Label>`. The
   options render as `<button>`, which is labelable, so the label forwarded
   every click to the first option. Tapping any building type selected
   Single-Family.

Both fixed, both covered by `e2e/mobile/survey-property-controls.spec.ts`.

### Shipped

| Area | What |
|---|---|
| OPP | Project description pre-fills from the estimate's scope of work, then project description, line items, survey measurements, hazard stub. Says which source it used. Refuses to put labor hours on a DHS form. |
| Crew | "Lead" is "Supervisor" everywhere; the Role dropdown's own "Lead" is now "Foreman". Supervisor list covers the whole team and auto-assigns someone not already on the crew. |
| Crew (bug) | The assign dialog defaulted to `role: 'worker'`, which `crewRoleSchema` rejects, so **every assignment silently failed** unless the user changed the Role dropdown. Pre-existing. |
| Survey | The two faults above. |
| Contacts | Address autocomplete via new `GET /api/geocode/search`; picking a suggestion fills city, state, ZIP. |
| Forms | State defaults from the **organization's** address, not hardcoded WI. AHS get WI, Summit get CO. |
| PWA | Install prompt now reaches iPhone/iPad (Safari never fires `beforeinstallprompt`) and is offered app-wide rather than only on the survey screen. Gated to handhelds. |
| Survey chrome | The wizard no longer renders inside the dashboard header, which was routing users around its own Save-and-Exit guard. |
| Guides | Both manuals revised (the OPP was in neither) and downloadable in-app. `npm run guides` regenerates the PDFs. |

### Needs a human, not code

- **Swipe navigation is unverified.** Chromium touch emulation dispatches no
  pointer events for `page.mouse`, and CDP touch dispatch does not drive the
  gesture either. The control test is committed **skipped** and fails
  identically against pre-fix code, so it is an unprovable gap rather than a
  regression. Brady has been asked to confirm on a real handset.
- **Gina's work order error never reproduced.** `POST /api/work-orders` returns
  201 with the row created and no error toast. Waiting on her screenshot.
- **Is "Foreman" their word?** Chosen by us, not by them.
- **The activity chains.** Biggest open item, outstanding since 8/10. Needs
  twenty minutes on the phone with Gina, not another email.
- **Job-scheduled text to all three of them** (Gina's newest item). Blocked on
  one question: every job, or only their own?

---

---

## 2026-08-20: Safari coverage, and a production bug it exposed

Added a `mobile-safari` project (iPhone 14 / WebKit) to `playwright.config.ts`,
running the same mobile specs as the Pixel 7 project. CI now installs
`chromium webkit`. Nothing had ever run on Safari's engine, which is the blind
spot that let the PWA install prompt reach no iPhone user for months.

**It immediately paid for itself.** The WebKit run surfaced CSP console errors
showing that survey photo uploads were blocked. Photos upload browser-direct to
R2 with a presigned PUT, and the R2 host was in neither the dev nor the
production `connect-src`. Confirmed against the live header on hazardos.app.
Every upload would have been refused, retried three times, and dropped. Fixed
by deriving the host from `R2_ACCOUNT_ID`, the same env var the server signs
with. **This was equally broken on Chromium and had simply never been noticed,
because the failure is a console error rather than an exception.**

Also added `e2e/mobile/pwa-install-prompt.spec.ts`, which asserts iPhone gets
the Share instruction and Android never does. Two offline photo specs are
skipped on WebKit with the reason inline: the same capture queues fine on
WebKit online and offline on Chromium, so it is the emulation that does not
reproduce, not the product.

**Before judging a slow suite, reset the local stack.** Each `setup` run seeds
an organization; after a day it held 39 orgs and 195 profiles and page-level
timeouts appear that are not code faults. `npx supabase db reset`.

---

## 2026-08-20: WebKit added, and what it found

`playwright.config.ts` now has a **`mobile-safari`** project (iPhone 14,
WebKit) running the same mobile specs as the Pixel 7 one. CI installs webkit
too. AHS crews are on iPhones and nothing had ever run on Safari's engine.

**It immediately paid for itself, indirectly.** The WebKit run failed
differently from Chromium, and chasing the difference surfaced that
**survey photo uploads were blocked by CSP in production**. Photos upload
browser-direct to R2 with a presigned PUT, and `connect-src` listed no R2 host
in either environment. Confirmed against the live header on hazardos.app.
Every upload was refused, retried three times, and dropped. `connect-src` now
derives the R2 host from `R2_ACCOUNT_ID`, the same env var the server signs
with, so the two cannot drift apart.

The iOS install path also has real coverage now
(`e2e/mobile/pwa-install-prompt.spec.ts`), which is the branch that sat dead
for months because nothing ran on WebKit.

Two offline photo tests are skipped on WebKit with the reason written into the
spec: a capture queues fine on WebKit online, and offline on Chromium, but not
offline under WebKit emulation.

**Local stack hygiene.** Every `setup` run seeds a tenant and nothing removes
them; this session ended at 39 organizations and 195 profiles. One work-order
E2E case began timing out on element stability with no app code changed. Run
`npx supabase db reset` when local runs start dragging.

---

## Needs you, not code

**1. Leaked password protection is still off.** You said you'd enabled it, and I
re-tested twice afterwards: a brand-new signup with `Password123!` (breached
295,389 times per HIBP) was accepted, and so was a password change. Either it
saved to a different project or it didn't take. Worth reopening **Auth →
Password settings** for project `inzwwbbbdookxkkotbxj` and confirming. Re-check
with:

```bash
node qa-harness/probe-leaked-password.mjs   # reverts the password either way
```

**2. `OPENAI_API_KEY` is not set in production.** Voice transcription needs
*both* keys: Whisper does the transcription and Claude only cleans up the text
afterwards. `ANTHROPIC_API_KEY` is now set and working, so estimate suggestions
and photo analysis both work. Voice fails with `OPENAI_API_KEY is not
configured`. Add it in Vercel and **redeploy**, since env vars only apply at
build time.

**3. AI is consent-gated per organization.** Separate from the keys. Every org
starts with `ai_enabled` false in `organization_ai_settings`. Real customers
grant it in **Settings → AI & Automation**. Both the key and the consent must be
present or the features stay dark.

---

## Where the 2026-08-16 work stopped

Four of the six audit priorities are done (see
`docs/CODEBASE-AUDIT-2026-08-16.md` for the full findings). Two remain, and I
stopped deliberately rather than ran out of time.

### Outstanding: split two oversized components

`app/(dashboard)/work-orders/[id]/page.tsx` (1,364 lines) and
`app/(dashboard)/estimates/[id]/page.tsx` (1,132 lines), against a stated limit
of 800.

Both now have test coverage, which makes extraction safer but not safe. These
are among the most complex screens in the product.

### Outstanding: consolidate onto one PDF library

Both `jspdf` and `@react-pdf/renderer` are dependencies and both generate PDFs:

- `jspdf`: invoice, proposal, work order generators
- `@react-pdf/renderer`: OPP, waste labels, lab chain-of-custody, and a
  proposal template

**Proposals exist in both**, so there are two implementations of the same
customer document that can drift. Migrate toward `@react-pdf/renderer`, which
already has component templates in `lib/pdf/`.

Neither library reaches the client bundle, so this is a maintenance cost rather
than a performance one.

**Why these two were left.** Everything completed today had a cheap way to prove
equivalence: probe a role and read the status code, count advisor findings,
assert an ARIA role. These two do not. A subtly wrong proposal PDF passes every
test in the suite and still reaches a customer. Before touching the PDF work,
generate a proposal and an invoice from both stacks and compare the rendered
output page by page. That check is manual and it is the only real one.

---

## What shipped on 2026-08-16

Security and correctness, all verified against production in both directions
(hole closed, and every role that should still work does):

| Fix | Commit |
|---|---|
| Technicians could read every estimate and invoice total | `10ccb77` |
| Technicians could create and approve job change orders | `7912b92` |
| Time clock approve/reject enforced only in the API, not RLS | `e2790c4` |
| Quick Add Appointment silently created nothing | `f380ad6` |
| Four RPCs executable by anyone, signed in or not | `afd52f7`, `b1155d9` |
| Reporting views exposed money to technicians | `7d83536`, `023ee2e` |
| Every rate limiter tier shared one counter | `1bfc19e` |
| Role guards now declarative on all 68 mutating routes | `44f225e` |
| CRM tab strips readable by assistive technology | `08c23da` |
| `auth.uid()` evaluated once per query instead of per row | `33b36a3` |

Plus: RingCentral added as a second SMS provider (`3aad8bc`), user and admin
manuals (`dec57c0`), and the audit itself (`56e126f`).

---

## Guardrails now in CI

Both run in `.github/workflows/rls-integration.yml`:

```bash
npm run check:route-guards   # fails on a new mutating route with no guard
npm run db:advisors          # fails on a new database advisor finding
```

Both use a ratchet: an allowlist of what was already accepted, with anything new
failing the build. The route-guard baseline is **empty**, so there is nothing
left to burn down there. The advisor baseline holds 58 reviewed security
findings, each with a written reason in
`supabase/lints/advisor-exceptions.json`.

`db:advisors` needs a database URL:

```bash
npm run db:advisors -- --db-url "<pooler url>"
```

---

## Things that will bite you

**`supabase start` does not re-apply migrations** to an existing volume. My
first local run reported migrations as missing that were already written. Use
`supabase db reset` to rebuild from empty. CI gets a fresh runner so it is
unaffected.

**The advisor gate cannot see Auth settings.** `auth_leaked_password_protection`
is an Auth API check, not a database property, and the string appears nowhere in
splinter's SQL. A green `db:advisors` run says nothing about Auth configuration.
Recorded under `_known_gaps` in the exceptions file.

**Applying migrations from Windows** needs the pooler URL with a URL-encoded
password. There is a working one-liner in the project memory note
`reference_supabase_migration_quirks.md`, and the same recipe is used throughout
today's session history.

**Paths in instruction files must be relative.** The same repos are checked out
on three machines, one of them Linux. `../workspace/...` for sibling checkouts.
CLAUDE.md had a `D:/` path that was wrong on every machine.

---

## Verification scripts

These live in `qa-harness/`, which is gitignored, so **they exist only on
`asy-hope-home`**. If you need them on Work, they are quick to rewrite, or copy
the directory across. The useful ones:

| Script | Proves |
|---|---|
| `verify-financial.mjs` | technicians blocked from money, others not |
| `verify-profiles-rls.mjs` | profile visibility rules across orgs and roles |
| `verify-pricing-rls.mjs` | pricing read/write split by role |
| `verify-rpc.mjs` | the four closed RPCs stay closed |
| `probe-leaked-password.mjs` | whether the Auth toggle actually took |
| `verify-ai-final.mjs` | the three AI features end to end |

Each restores anything it changes and prints whether the restore succeeded.

---

## Still open, lower priority

- **240 `multiple_permissive_policies`** across 22 tables, down from 390.
  `profiles` and the six pricing tables are done. The rest have differing policy
  shapes so they need per-table review rather than a batch.
- **Job materials endpoints** now allow `TENANT_FIELD` and strip cost per role.
  Worth confirming with the client that technicians recording materials without
  seeing cost matches how they actually work.
- **RingCentral inbound and delivery status** are not built. Sending and logging
  work. Inbound needs their subscription API, and until then **STOP replies are
  not captured on RingCentral**, which is a compliance matter if you go live on
  it at volume.
- **Dependency majors**: `eslint` 9 to 10 is the one to plan for, since major
  ESLint releases usually need config changes.
