# Archive

Documents kept for history, not for guidance. **Nothing in here describes the
app as it is now.** If you need to know how something behaves today, read the
code, the migrations, or the small set of current documents listed in
[`../DOCUMENTATION-INDEX.md`](../DOCUMENTATION-INDEX.md).

## Why these moved (2026-08-17)

The `docs/` folder held 71 files. A currency check against eight shipped
features (automations, the work queue, time clock, work orders, lab reports,
change orders, RingCentral SMS, CRM properties) found that the main reference
documents mentioned almost none of them. `architecture.md` and `API-REFERENCE.md`
mentioned none at all. The index meanwhile marked February documents as
"Current" and had a "next review" date that passed on 1 August.

Documentation that asserts currency it does not have is worse than no
documentation, because it gets believed. Rather than refresh eight thousand
lines of prose, much of it speculative when written, everything that was a
point-in-time report or had been superseded moved here.

## What is in here

**Status snapshots and audits.** `APP-STATUS 020226`, `CURRENT-STATUS-FEB-2026`,
`PROJECT-STATUS`, `ROADMAP`, `CHANGELOG`, `CODEBASE-AUDIT-2026-04-07`,
`CODEBASE-AUDIT-2026-05-03`, `audit-2026-07-22`, the two
`DOCUMENTATION-REVIEW-SUMMARY` files, `session-summary-2026-07-28`. Each was
true on its date. The git log is the honest changelog.

**Completed workstreams.** The three `API-DOCUMENTATION-*` reports, the two
performance guides, `BUNDLE-OPTIMIZATION`, `CUSTOMER-LIST-OPTIMIZATION`,
`SECURITY-AUDIT-FINDINGS`, `SECURITY_UPDATES`, `secret-rotation-2026-07`, the
two `TEST-COVERAGE-REPORT` files, `SIMPLE-COVERAGE-METHOD`,
`TESTING-STRATEGY-GUIDE`, `SITE-SURVEY-TERMINOLOGY-UPDATE`. Work that finished;
the outcome is in the code.

**Original specifications.** `HazardOS-PRD`, `HazardOS-Project-Overview`,
`HazardOS-Site-Assessment-Requirements`, `hazardos-site-survey-ui-spec`. Useful
for understanding why something is shaped the way it is. Not a description of
what was built.

**Superseded by something newer.** `USER-GUIDE` (see `../USER-MANUAL.md`),
`ARCHITECTURE-DEEP-DIVE` and `ARCHITECTURE-OVERVIEW` (duplicates of
`../architecture.md`), `QUICK-REFERENCE` and `QUICK-API-REFERENCE`,
`MIGRATION-GUIDE` and `DATABASE-SETUP-CHECKLIST` (the schema is a squashed
baseline now, see `CLAUDE.md`), `MOBILE-SURVEY-APP`, the two QA program
documents (QA now runs through the `qa-autopilot` skill).

**MarketSharp analysis.** `Marketsharp Comparison` and
`MarketSharp Migration Guide`. Both predate having actual API access to their
system. The guide assumes a hand-exported CSV, which is obsolete: everything
except proposals and template bodies is reachable through their API. Current
work is in `../marketsharp-audit.md` and `../marketsharp-hazardos-diff.md`.

**Earlier security and infrastructure notes**, from before this cleanup:
the `SECURITY_*`, `DEPENDABOT_*`, `GITHUB_*`, `NEXTJS_UPDATE_MONITORING`,
`RATE_LIMIT_FIX_SUMMARY` and `COMPREHENSIVE_AUDIT_REPORT` files.

## Before you cite anything in here

Check it against the code first. Several of these documents contain counts,
vulnerability tallies and coverage percentages that were accurate on the day and
have moved a long way since.
