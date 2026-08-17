# Documentation index

**Reviewed 2026-08-17.**

Thirteen documents. Every one describes something that exists in the app now, or
work that is actually open. Nothing here is speculative, and there is no archive.

## The rule

**Code, migrations and tests are the truth.** Prose exists to explain why
something is shaped the way it is, and to save someone an afternoon of reading.
Where they disagree, the code is right and the document is a bug to be fixed or
deleted.

Two things are generated and cannot drift: `GET /api/openapi` and `/docs/api`
for the HTTP surface, and the test suite for behavior.

---

## Start here

| Document | What it is |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | Project context, conventions, and the traps that have cost people time |
| [`../README.md`](../README.md) | Setup and quick start |
| [`NEXT-SESSION.md`](./NEXT-SESSION.md) | Where the last session stopped and what needs a human |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How the system is put together, with measured numbers |
| [`ROADMAP.md`](./ROADMAP.md) | Everything actually open |

## Using the app

| Document | What it is |
|---|---|
| [`USER-MANUAL.md`](./USER-MANUAL.md) | End-user guide |
| [`ADMIN-MANUAL.md`](./ADMIN-MANUAL.md) | Administrator guide |

## Subsystems

| Document | What it is |
|---|---|
| [`AUTOMATIONS.md`](./AUTOMATIONS.md) | Chains, triggers, sending, cancellation. The whole engine |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production deployment |
| [`security/supabase-auth-config.md`](./security/supabase-auth-config.md) | Auth settings, including the leaked-password toggle that is still off |

## Current state

| Document | What it is |
|---|---|
| [`CODEBASE-AUDIT-2026-08-16.md`](./CODEBASE-AUDIT-2026-08-16.md) | Latest audit. Four of six priorities closed |
| [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) | Known debt |
| [`AUDIT-2026-08-05.md`](./AUDIT-2026-08-05.md) | Earlier worklist, order encodes judgment |
| [`../qa-flags.md`](../qa-flags.md) | Issues surfaced by QA runs |

## The MarketSharp migration

| Document | What it is |
|---|---|
| [`marketsharp-audit.md`](./marketsharp-audit.md) | What AHS's MarketSharp holds, how they use it, the API contract |
| [`marketsharp-hazardos-diff.md`](./marketsharp-hazardos-diff.md) | Every concept mapped onto HazardOS, plus the todo list |
| [`ahs-test-login-package.md`](./ahs-test-login-package.md) | Sandbox logins for the client |

## Content

| Path | What it is |
|---|---|
| [`proposal-templates/`](./proposal-templates/) | The eight proposal templates, their shared sections, and the `{{variable}}` convention |

---

## What was removed, and why

On 2026-08-17 this folder held 71 documents. A check against eight shipped
features found the main reference documents mentioned almost none of them, and
`architecture.md` and `API-REFERENCE.md` mentioned none at all. The index marked
February documents as current.

Everything speculative, superseded or point-in-time was deleted rather than
archived. **Git history has all of it** (`git log --diff-filter=D --name-only`),
so nothing is lost, and a repo that keeps stale documents around invites someone
to read them.

Deleted: status snapshots and roadmaps that were never updated, three API
documentation progress reports, performance and coverage reports from finished
workstreams, original product specifications, duplicate architecture and quick
reference documents, pre-baseline SQL, and QA findings whose items are now
covered by tests in CI.

`architecture.md` was replaced by a shorter [`ARCHITECTURE.md`](./ARCHITECTURE.md)
that states only what was measured.

## Keeping it this way

Add a document when a subsystem is large enough that reading the code first
would waste an afternoon. [`AUTOMATIONS.md`](./AUTOMATIONS.md) is the model:
what it does, why it is shaped that way, the decisions that look wrong until
explained, and its known gaps.

Do not add a status snapshot. The git log is a better changelog than one nobody
updates, and a status document is stale within a fortnight.

Do not add a document for something that does not exist yet. That belongs in
[`ROADMAP.md`](./ROADMAP.md) as a line, not a file.

When a document stops being true, fix it or delete it. Leaving it with a warning
on top was tried and did not work: the warning gets skipped and the content gets
believed.
