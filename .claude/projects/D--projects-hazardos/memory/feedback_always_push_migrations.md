---
name: Always push migrations
description: Push Supabase migrations immediately without asking for confirmation
type: feedback
---

Always push migrations with `npx supabase db push` immediately after creating them. Don't ask for confirmation.

**Why:** User wants migrations applied right away as part of the development flow, not queued for later.

**How to apply:** After writing any new file to `supabase/migrations/`, run `npx supabase db push` immediately.
