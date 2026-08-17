# HazardOS documentation

**Start at [`DOCUMENTATION-INDEX.md`](./DOCUMENTATION-INDEX.md).**

Thirteen documents. Each describes something that exists in the app now, or work
that is genuinely open. There is no archive: material that had gone stale or
described features speculatively was deleted rather than kept with a warning on
it, because the warning gets skipped and the content gets believed.

Git history has everything that was removed:

```bash
git log --diff-filter=D --name-only -- docs/
```

## What is authoritative

Code, migrations and tests. Where prose disagrees with them, the prose is wrong
and should be fixed or deleted.

For the HTTP surface, `GET /api/openapi` and `/docs/api` are generated from the
routes and cannot drift.

## Adding to this

Write a document when a subsystem is large enough that reading the code first
would waste someone's afternoon. [`AUTOMATIONS.md`](./AUTOMATIONS.md) is the
model. Anything that does not exist yet belongs in
[`ROADMAP.md`](./ROADMAP.md) as a line, not as a file.
