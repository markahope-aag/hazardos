# HazardOS — Notification System

This document describes **in-app notifications**, **email digests for those events**, **user preferences**, and how they differ from **SMS** and other messaging. Schema source: `supabase/migrations/20260215000003_notifications.sql` and follow-ups such as `20260419000001_fix_notification_prefs_rpc.sql`.

**Last updated:** April 29, 2026

---

## What “Notifications” Means Here

| Channel | Purpose |
|---------|---------|
| **In-app** | Rows in `notifications`, shown in the header bell (`components/notifications/notification-bell.tsx`), unread badge, optional deep link via `action_url`. |
| **Email** | Same events can email the user via `EmailService` + org email config (Resend), if the user has **email** enabled for that `notification_type`. |
| **Push (PWA)** | `notification_preferences.push` and table `push_subscriptions` exist for Web Push–style delivery. **Browser push sending is not wired** in the application layer as of this writing—preferences are stored for future use. |
| **SMS** | **Not** part of this subsystem. SMS uses `organization_sms_settings`, `sms_messages`, Twilio, and settings under **Settings → SMS**. |

---

## Data Model

### `notifications`

Per-user, per-org alerts.

| Area | Columns (conceptual) |
|------|----------------------|
| Identity | `id`, `organization_id`, `user_id` → `profiles` |
| Classification | `type` (see [notification types](#notification-types)) |
| Content | `title`, `message` |
| Deep link | `entity_type`, `entity_id`, `action_url`, `action_label` |
| State | `is_read`, `read_at` |
| Priority | `priority`: `low` \| `normal` \| `high` \| `urgent` |
| Email audit | `email_sent`, `email_sent_at` (columns exist; the TypeScript service does not currently update them when mail is sent) |
| Extra | `metadata` JSONB, `expires_at` (expired rows excluded from list/count queries) |

**RLS:** Users **SELECT/UPDATE** only their own rows. **INSERT** is allowed when `organization_id` matches the caller’s org (`get_user_organization_id()`), so server-side code acting as an authenticated user can create notifications for others in the same tenant.

### `notification_preferences`

One row per `(user_id, notification_type)` with booleans **`in_app`**, **`email`**, **`push`**. Initialized by RPC **`initialize_notification_preferences`** (must use pinned `search_path`—see fix migration `20260419000001_fix_notification_prefs_rpc.sql`).

### `push_subscriptions`

Stores Web Push subscription endpoints/keys per user/device. **Managing subscriptions via API is not implemented** in the routes under `app/api/notifications/`; the table is ready for a future PWA push pipeline.

---

## Notification Types

Canonical union type: [`types/notifications.ts`](../types/notifications.ts) — `NotificationType`.

Examples: `job_assigned`, `job_completed`, `job_completion_review`, `proposal_signed`, `proposal_viewed`, `invoice_paid`, `invoice_overdue`, `invoice_viewed`, `payment_failed`, `feedback_received`, `testimonial_pending`, `system`, `reminder`.

UI labels and default channel defaults live in **`notificationTypeConfig`** and **`defaultNotificationPreferences`** in the same file.

---

## Server: `NotificationService`

**File:** [`lib/services/notification-service.ts`](../lib/services/notification-service.ts)

### `create(input)`

Used when the current request has a logged-in user (Supabase server client).

1. Loads `notification_preferences` for **target** `user_id` + `type`.
2. If a preference row exists and **`in_app` is false**: **no row** is inserted; **`sendEmailNotification`** may still run (email-only path).
3. Otherwise inserts into `notifications`, then calls **`sendEmailNotification`**.

**Email:** Loads preference `email`, recipient profile email, org name; sends HTML via **`EmailService.send`**. Includes optional CTA from `action_url` / `action_label` and a footer link to **`/settings/notifications`**.

### `createForRole(input)`

Calls Postgres RPC **`create_notification_for_role`**, which inserts one notification per profile in the org matching **`p_role`**.

- Does **not** run the TypeScript email helper after each insert.
- The RPC does **not** consult `notification_preferences` (broadcast semantics).

**Used for:** e.g. alerting all `admin` users on estimate submission, all `tenant_owner` for final approval steps, cron failure alerts to `platform_owner` / `tenant_owner` (see [`lib/services/cron-runner.ts`](../lib/services/cron-runner.ts)).

### Reads and updates

- **`getUnread` / `getAll`** — paginated lists; filters out expired rows (`expires_at` null or future).
- **`getUnreadCount`** — RPC **`get_unread_notification_count`**.
- **`markAsRead` / `markAllAsRead` / `delete`** — scoped to `auth.uid()`.

### `getPreferences` / `updatePreference`

- **`getPreferences`** calls **`initialize_notification_preferences`** first so new users get default rows.
- **`updatePreference`** PATCHes one type’s channel flags.

### Helpers: `notify()` and `NotificationHelpers`

- **`notify(type, userId, options)`** — wraps `create` and swallows errors (returns `null` on failure).
- **`NotificationHelpers`** — typed helpers (`jobAssigned`, `proposalSigned`, etc.) for common events. These are **ready to call from feature code**; wire them where jobs/proposals/invoices emit events (today, some flows use `NotificationService` directly instead).

---

## Where Notifications Are Created (Call Sites)

| Area | Mechanism | Notes |
|------|-----------|--------|
| Estimate approvals | `NotificationService.create` / `createForRole` | [`lib/services/approval-service.ts`](../lib/services/approval-service.ts) — submit for review, rejection, forward to owner. |
| Stripe billing failures | `NotificationService.create` | [`lib/services/stripe-service.ts`](../lib/services/stripe-service.ts) — `payment_failed` + billing email. |
| Cron failures | `NotificationService.createForRole` | [`lib/services/cron-runner.ts`](../lib/services/cron-runner.ts) — `system` alerts to `platform_owner` and `tenant_owner`. |
| Manual / integrations | `POST /api/notifications` | Authenticated create with validation. |

Other product areas can add calls to **`notify()`** or **`NotificationService.create`** as features need them.

---

## HTTP API

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/notifications` | List; query `unread=true` for unread-only; `limit`, `offset`. |
| `POST` | `/api/notifications` | Create notification (validated body). |
| `GET` | `/api/notifications/count` | Unread count for current user. |
| `POST` | `/api/notifications/[id]/read` | Mark one read. |
| `POST` | `/api/notifications/read-all` | Mark all read. |
| `GET` | `/api/notifications/preferences` | List preferences (initializes defaults if needed). |
| `PATCH` | `/api/notifications/preferences` | Update one type’s `in_app` / `email` / `push`. |

Handlers use **`createApiHandler`** with rate limiting where configured ([`lib/utils/api-handler.ts`](../lib/utils/api-handler.ts)).

---

## Client UI

- **Bell:** [`components/notifications/notification-bell.tsx`](../components/notifications/notification-bell.tsx) — TanStack Query, polls **`/api/notifications`** and **`/api/notifications/count`** every **30 seconds** when mounted, mark-read actions, navigate to `action_url`.
- **Settings:** [`app/(dashboard)/settings/notifications/page.tsx`](../app/(dashboard)/settings/notifications/page.tsx) — loads preferences from **`GET /api/notifications/preferences`**, updates with **`PATCH`**.

---

## Database Maintenance

- **`cleanup_expired_notifications()`** — SQL function to delete expired rows; intended to be run on a schedule (e.g. cron) if you want hard deletes.

---

## Related Documentation

| Doc | Topic |
|-----|--------|
| [DATABASE-STRUCTURE.md](./DATABASE-STRUCTURE.md) | Tables index including `notifications` |
| [EMAIL-SMS-GUIDE.md](./EMAIL-SMS-GUIDE.md) | Resend/Twilio (SMS is separate from in-app notifications) |
| [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) | App layers |

---

*When adding a new `NotificationType`, update `types/notifications.ts`, `notificationTypeConfig`, defaults, the `initialize_notification_preferences` array in SQL (or migration), and validation schemas under `lib/validations/notifications.ts`.*
