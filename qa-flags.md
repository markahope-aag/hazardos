# QA Autopilot — Flags (2026-07-20)

## CRITICAL · No browser automation in session
Run phase (browser-driven UI passes) · Cannot drive the authenticated SPA; ~360 UI test cases remain Blocked. Fix: `claude mcp add playwright -- npx -y @playwright/mcp@latest` then reopen the session (`npx playwright install chromium` on first navigation).

## RESOLVED (verified 2026-08-04) · v1 Public API findings from 2026-07-20
Every HIGH item below was re-tested on 2026-08-04 by the ported suite in
`tests/integration/`, which runs in CI on every PR. All of them now pass. The
original writeup is preserved at `docs/qa/FINDINGS-v1-api.md`; the `.qa-harness`
scripts that produced it have been retired.

| 2026-07-20 finding | Status | Covering test |
|---|---|---|
| All 4 v1 POST create endpoints 500 | **fixed** — all return 201 | `api-v1-write.test.ts` |
| Entity-number race (API20/HS10) | **fixed** — 8 concurrent creates, all distinct | `api-v1-write.test.ts` |
| `.or()` search injection (API21/HS11) | **fixed** — comma neutralised | `api-v1-behaviour.test.ts` |
| Collection `select('*')` leak (API22) | **fixed** — no internal/integration columns | `api-v1-behaviour.test.ts` |
| No per-IP throttle on estimates (API23) | **fixed** — burst is throttled | `zz-api-v1-throttle.test.ts` |
| DELETE 200 on unknown/cross-org id (API7) | **fixed** — returns 404, isolation holds | `api-v1-behaviour.test.ts` |
| API24 Upstash configured | still environmental | not portable — check `vercel env ls production` |

Because these are covered continuously now, a regression fails CI rather than
waiting for someone to remember to run a script.
