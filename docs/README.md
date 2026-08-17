# HazardOS documentation

**Start at [`DOCUMENTATION-INDEX.md`](./DOCUMENTATION-INDEX.md).**

This file used to be a second index. Two indexes is how both end up stale, and
both did: between them they pointed at a dozen documents that had been moved or
never existed. There is one index now.

## The short version

- **Current documents** are listed at the top of the index. They were written or
  verified in August and are believed accurate.
- **Older reference** documents are kept, but each carries a header stating what
  it is known to be missing. Check anything specific against the code.
- **[`archive/`](./archive/)** holds status snapshots, finished workstreams and
  superseded material. Nothing in there describes the app as it is now.

## What is actually authoritative

Code, migrations and tests. Where prose disagrees with them, the prose is wrong.

For the HTTP surface, `GET /api/openapi` and `/docs/api` are generated from the
routes and cannot drift.
