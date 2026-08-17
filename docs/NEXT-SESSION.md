# Start here

Written 2026-08-16 at the end of a long session, for whoever picks this up next
(likely on `asy-hope-work`, which is a different machine, so this lives in the
repo rather than in local notes).

Everything below is pushed. Tree is clean, `6,398` tests passing, type-check and
lint clean.

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

## Where the work stopped

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

## What shipped today

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
