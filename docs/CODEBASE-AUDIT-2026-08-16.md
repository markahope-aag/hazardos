# HazardOS Codebase Audit

**2026-08-16.** Covers code quality, security, accessibility, performance,
dependencies, and maintainability.

Every finding below was measured or probed against the running system, not
inferred from reading. Where a probe corrected an earlier assumption, the
correction is recorded rather than quietly dropped.

---

## Summary

The codebase is in good health. On the measures that usually reveal decay
(`any` usage, stray logging, suppressed type errors, dependency
vulnerabilities) it scores close to perfect, and the test suite is substantial
and green.

One structural issue is worth acting on: **authorization is expressed
inconsistently**, and that inconsistency has already produced two confirmed
vulnerabilities this week. Everything else is ordinary maintenance.

| Area | Verdict |
|---|---|
| Code quality | Strong |
| Type safety | Strong |
| Test coverage | Strong |
| Dependency security | Clean |
| Authorization | **Needs work** (inconsistent, hard to audit) |
| Accessibility | Good, with one systemic gap |
| Performance | Healthy |
| Maintainability | Good, a few oversized files |

---

## What the numbers say

| Measure | Value |
|---|---|
| TypeScript files | 924 |
| Lines of code | 154,094 |
| Test files | 476 |
| Tests passing | 6,386 |
| Explicit `any` | **0** |
| `console.log` in app code | **0** |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `dangerouslySetInnerHTML` | **0** |
| npm vulnerabilities | **0** |
| Images missing `alt` | **0** |
| ESLint suppressions | 28 |

Zero `any` across 154k lines is unusual and worth protecting. It's the single
clearest signal that type safety here is real rather than nominal.

A note on method: my first pass reported 1 `any`, 2 `console.log` and 1 TODO.
All three were false positives from grep matching comment prose and a base64
example string. Verified individually; the true count is zero.

---

## 1. Authorization is inconsistent and hard to audit

**Severity: High. This is the finding that matters.**

Of 179 API route files containing mutating handlers (POST/PATCH/PUT/DELETE),
**77 (43%) declare no `allowedRoles`**.

That does not mean 77 open doors. Probing as a technician against production
showed three different outcomes:

| Route | Result | What actually protected it |
|---|---|---|
| `/api/commissions/plans` | 403 | A permission check inside the handler |
| `/api/customers/[id]/contacts` | 403 | A permission check inside the handler |
| `/api/estimates/[id]/activate` | 404 | RLS: the technician cannot see the row |
| `/api/estimates/[id]/revise` | 404 | RLS |
| `/api/estimates/[id]/submit` | 404 | RLS |
| `/api/follow-ups/[id]` | 404 | RLS |

Tested with a real estimate id from a real version chain, a technician got
`404 Estimate not found` and the active version did not move. So the data layer
is holding.

**The problem is not that these are open. It is that you cannot tell which
case you are in without probing each one.** Three mechanisms guard these routes
(declarative `allowedRoles`, an internal check, RLS), and only the first is
visible when reading the route.

That matters because RLS only defends where RLS is role-aware. Two confirmed
holes this week were exactly where it was not:

- **Change orders** (`7912b92`). No guard, and RLS was org-scoped only. A
  technician created and approved a change order. The approval then failed to
  roll into job totals because RLS refused *that* write, leaving an approved
  change order the job never counted. Silent, and worse than a clean failure.
- **Time clock** (`e2790c4`). The policy comment said the approve/reject
  distinction was "the API's job, not RLS's". That holds only if the API is the
  only path, and it is not: the browser reaches PostgREST directly. A technician
  approved their own timesheet.

Both were found by probing, not by reading, because reading the route told you
nothing.

**Recommendation.** Make the guard declarative on every mutating route, even
where RLS already covers it. `allowedRoles` costs one line and turns "is this
safe?" from an investigation into a glance. Where a route is deliberately open,
say so in a comment so the absence reads as a decision rather than an oversight.

A useful follow-up: extend the existing advisor gate in CI to fail when a new
mutating route ships without either `allowedRoles` or an explicit opt-out
comment. That converts this from a thing you fix once into a thing that stays
fixed.

---

## 2. Accessibility: tab strips are not exposed to assistive technology

**Severity: Medium.**

The codebase uses two tab patterns. Twelve files use Radix `TabsTrigger`, which
is accessible out of the box. Several primary screens hand-roll a tab strip from
`border-b-2` buttons with no `role="tab"`, no `aria-selected`, and no `tablist`
wrapper:

- `app/(dashboard)/crm/jobs/[id]/page.tsx`
- `app/(dashboard)/crm/companies/[id]/page.tsx`
- `app/(dashboard)/crm/opportunities/[id]/page.tsx`
- `components/customers/customer-detail.tsx`
- `app/(dashboard)/calendar/calendar-view.tsx`

A screen reader announces these as several unrelated buttons rather than a tab
set, so there's no indication of how many tabs exist, which is selected, or that
arrow keys should move between them. These are the CRM detail pages, so it's the
core of the product rather than a corner.

Not every `border-b-2` hit is a defect: the main nav and CRM sub-nav use the same
underline styling but are navigation, and should stay links inside a `<nav>`
rather than becoming tabs.

**Recommendation.** Converge the five detail pages onto the Radix `Tabs`
primitive already used elsewhere. This is a swap to an existing in-house
pattern, not new work.

### Accessibility elsewhere is good

Worth stating plainly, because it's better than most codebases: every image has
`alt` text, there are 464 `htmlFor` label associations, 161 `aria-label`
attributes, a skip link with its own tests, and `aria-live` regions for dynamic
updates.

---

## 3. Six files exceed your own size limit

**Severity: Medium.**

`CLAUDE.md` sets 800 lines as the maximum and 200 to 400 as typical.

| File | Lines |
|---|---|
| `lib/openapi/openapi-spec.ts` | 4,780 |
| `app/(dashboard)/work-orders/[id]/page.tsx` | 1,364 |
| `app/(dashboard)/estimates/[id]/page.tsx` | 1,132 |
| `app/(dashboard)/crm/opportunities/[id]/page.tsx` | 816 |
| `app/(dashboard)/settings/email/page.tsx` | 803 |
| `app/(dashboard)/estimates/page.tsx` | 803 |

The OpenAPI spec is a generated-style document and its length is not really a
maintainability problem, though it would be better generated from the route
definitions than maintained by hand, since a hand-written spec drifts from the
code it documents.

The two page components over 1,100 lines are the real targets. Both are among
the most complex screens in the product, which is exactly why they are worth
splitting: they now have test coverage, so extraction is safe.

---

## 4. Seven suppressed React hook dependency warnings

**Severity: Medium.**

Seven `react-hooks/exhaustive-deps` suppressions. Each one is a deliberate
decision to omit a dependency, and each is a potential stale closure: the effect
captures a value from an earlier render and silently keeps using it.

These are hard to spot in review and produce bugs that look like "it sometimes
shows the old data". Worth revisiting each with the question "what happens when
this omitted value changes?" and either adding the dependency or writing down
why it cannot change.

---

## 5. Two PDF stacks doing the same job

**Severity: Low, trending Medium.**

Both `jspdf` and `@react-pdf/renderer` are dependencies, and both generate PDFs:

- **jspdf**: invoice, proposal, work order generators
- **@react-pdf/renderer**: OPP, waste labels, lab chain-of-custody, and a
  proposal template

Proposals exist in both, which means two implementations of the same customer
document that can drift apart.

The good news: every PDF path is server-side, so neither library reaches the
client bundle. This is a maintenance cost, not a performance one.

**Recommendation.** Pick one and migrate. `@react-pdf/renderer` is the better
target given the component-based templates already in `lib/pdf/`.

---

## 6. Performance is healthy

| Measure | Value |
|---|---|
| Built client JS | 2.6 MB across 557 chunks (uncompressed) |
| Largest chunk | 628 kB |
| recharts | 456 kB, in its own split chunk |
| PDF libraries in client bundle | none, server-only |

Code splitting is working: the chart library is isolated rather than loaded on
every page, and the PDF generators never reach the browser. Those are the two
mistakes that usually dominate a bundle this size, and neither is present.

Twelve raw `<img>` elements bypass `next/image`. All are user-uploaded content
(survey photos, job note attachments, work order documents) where the
optimizer's benefit is limited and its constraints are awkward. Defensible.

### Database

From the Supabase advisors, currently reported but not gating CI:

| Finding | Count |
|---|---|
| `unindexed_foreign_keys` | 140 |
| `unused_index` | 337 |
| `auth_rls_initplan` | 67 |
| `multiple_permissive_policies` | 240 (down from 390) |

`auth_rls_initplan` is the one with real teeth: it flags policies where
`auth.uid()` is re-evaluated per row rather than once per query, which scales
badly with table size. That is worth a pass before your data grows.

The 337 unused indexes mostly reflect a young production database where the
query has not run yet, rather than genuinely dead indexes. Judge those against
real query plans, not the count.

---

## 7. Dependencies

Zero vulnerabilities, which is the number that matters.

Several packages are a major version behind: `eslint` 9 to 10, `lucide-react`
0.563 to 1.31, `jsdom` 27 to 29, `@vercel/analytics` 1 to 2, `nanoid` 5 to 6.

None is urgent. The one to plan for is `eslint` 10, because major ESLint
releases tend to require config changes, and doing that under time pressure
alongside something else is how a lint config ends up quietly weakened.

---

## Priorities

1. **Make authorization declarative on mutating routes**, then gate it in CI.
   This is the one finding with a demonstrated history of producing real
   vulnerabilities.
2. **Convert the five hand-rolled tab strips** to the Radix primitive already in
   use. Small, bounded, and it fixes the core CRM screens.
3. **Revisit the seven suppressed hook dependencies.**
4. **Split the two 1,100-plus-line page components**, now that tests make it
   safe.
5. **Consolidate onto one PDF library.**
6. **Address `auth_rls_initplan`** before data volume makes it matter.

Items 1 and 2 are worth doing soon. The rest is maintenance that can be
scheduled.

---

## Method

Findings came from: file and line counting against the project's own limits;
grep sweeps for quality markers, each hit verified individually rather than
counted; `npm audit` and `npm outdated`; build output and on-disk bundle
measurement; the Supabase database advisors; and live authorization probes
against production as a seeded technician account, using non-existent ids so
nothing mutated, plus one reversible probe with a real id to confirm data
impact. Any state touched was restored and verified.
