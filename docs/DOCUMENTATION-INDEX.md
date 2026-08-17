# Documentation index

**Reviewed 2026-08-17.**

Read this first if you're looking for something. The previous version of this
index marked February documents as "Current" and had a review date that passed
on 1 August, so treat any status claim here as something to check rather than
trust.

## The rule this index follows

**Code, migrations and tests are the source of truth.** Prose is a guide to
where to look and why something is shaped the way it is. Where they disagree,
the code is right and the document is a bug.

Two things are generated and always accurate: `GET /api/openapi` and `/docs/api`
for the HTTP surface, and the test suite for behavior.

---

## Current

Written or verified since August, and believed accurate.

### Start here
| Document | What it is |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | Project context, conventions, and the traps that have bitten people |
| [`../README.md`](../README.md) | Setup and quick start |
| [`NEXT-SESSION.md`](./NEXT-SESSION.md) | Where the last session stopped and what needs a human |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md) | Development setup |

### Using the app
| Document | What it is |
|---|---|
| [`USER-MANUAL.md`](./USER-MANUAL.md) | End-user guide |
| [`ADMIN-MANUAL.md`](./ADMIN-MANUAL.md) | Administrator guide |

### Subsystems
| Document | What it is |
|---|---|
| [`AUTOMATIONS.md`](./AUTOMATIONS.md) | Chains, triggers, sending and cancellation. The whole automation engine |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production deployment |

### Current state and open work
| Document | What it is |
|---|---|
| [`CODEBASE-AUDIT-2026-08-16.md`](./CODEBASE-AUDIT-2026-08-16.md) | Latest audit. Four of six priorities closed |
| [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) | Known debt |
| [`AUDIT-2026-08-05.md`](./AUDIT-2026-08-05.md) | Earlier worklist, order encodes judgment |
| [`../qa-flags.md`](../qa-flags.md) | Issues surfaced by QA runs |

### The MarketSharp migration
| Document | What it is |
|---|---|
| [`marketsharp-audit.md`](./marketsharp-audit.md) | What AHS's MarketSharp holds, how they use it, and the API contract |
| [`marketsharp-hazardos-diff.md`](./marketsharp-hazardos-diff.md) | Every concept mapped onto HazardOS, plus the todo list |
| [`ahs-test-login-package.md`](./ahs-test-login-package.md) | Sandbox logins for the client |

### Reference trees
| Path | What it is |
|---|---|
| [`proposal-templates/`](./proposal-templates/) | The eight proposal templates the product uses |
| [`database/`](./database/) | Legacy schema notes |
| [`qa/`](./qa/) | QA findings |
| [`security/`](./security/) | Security notes |

---

## Older reference, useful but unverified

These predate a lot of what shipped. A currency check on 2026-08-17 against
eight shipped features (automations, work queue, time clock, work orders, lab
reports, change orders, RingCentral SMS, CRM properties) found that most mention
almost none of them, and `architecture.md` and `API-REFERENCE.md` mention none
at all.

They still hold real explanation of the parts that haven't changed, so they're
kept rather than archived. Each carries a header saying what it's known to be
missing. **Check anything specific against the code.**

| Document | Use it for |
|---|---|
| [`architecture.md`](./architecture.md) | The shape of the system, tenancy model, RLS approach |
| [`FEATURES.md`](./FEATURES.md) | Feature-by-feature description, pre-May scope |
| [`BUSINESS-LOGIC.md`](./BUSINESS-LOGIC.md) | Estimate, invoice and job workflows |
| [`API-REFERENCE.md`](./API-REFERENCE.md) | Narrative API guide. Prefer `/docs/api` |
| [`SECURITY.md`](./SECURITY.md) | Security architecture |
| [`TESTING.md`](./TESTING.md) | Testing approach |
| [`DATABASE-STRUCTURE.md`](./DATABASE-STRUCTURE.md) | Schema overview |
| [`MULTI_TENANT_SETUP.md`](./MULTI_TENANT_SETUP.md) | Tenancy configuration |
| [`CRM.md`](./CRM.md) | CRM behavior |
| [`CUSTOMER-MANAGEMENT.md`](./CUSTOMER-MANAGEMENT.md) | Contact and company handling |
| [`EMAIL-SMS-GUIDE.md`](./EMAIL-SMS-GUIDE.md) | Messaging setup. See `AUTOMATIONS.md` for how chains send |
| [`NOTIFICATIONS.md`](./NOTIFICATIONS.md) | In-app notifications |
| [`COMPLIANCE-CREDENTIAL-TRACKING.md`](./COMPLIANCE-CREDENTIAL-TRACKING.md) | Licenses and expiry tracking |
| [`OVERVIEW.md`](./OVERVIEW.md) | Short product overview |
| [`Hazardos Architecture Decisions.md`](./Hazardos%20Architecture%20Decisions.md) | Why certain decisions were made |

---

## Archive

[`archive/`](./archive/) holds 54 documents kept for history. Status snapshots,
finished workstreams, original specifications, and things superseded by
something newer. **Nothing in there describes the app as it is now**, and
several contain counts and percentages that have moved a long way since.
[`archive/README.md`](./archive/README.md) explains what's in it and why.

---

## Keeping this honest

Add a document when a subsystem is large enough that reading the code first
would waste someone's afternoon. `AUTOMATIONS.md` is the model: what it does,
why it's shaped that way, the decisions that look odd until explained, and its
known gaps.

Don't write a status snapshot. The git log is a better changelog than a
`CHANGELOG.md` nobody updates, and a status document is stale within a fortnight
and misleading within a month.

When something moves to `archive/`, say so in `archive/README.md`. A file that
silently vanishes is indistinguishable from one that was lost.
