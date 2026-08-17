# Creating a production tenant

How to stand up a real customer organization, and the traps that are not
guessable from the code.

Written 2026-08-17 immediately after doing it for Advanced Health & Safety, so
this describes what actually happened rather than what should work.

---

## Before you start

**Decide who gets a login and at what address.** This is the only irreversible
part. Creating an account with someone's real work address means that person can
be reached by the system, and once they sign in and set a password the account is
theirs rather than yours to delete.

**Decide roles deliberately.** Role determines who can see money. An estimator
sees estimate and invoice totals; a technician does not. Getting this wrong
either hides financials from someone who needs them or shows them to someone who
should not have them. Roles are easy to change afterwards in Settings → Team,
so err toward the lower one.

**Have the real details.** Name, address, phone, website, timezone. Do **not**
put a placeholder in `license_number`. An empty field is visibly missing; the
string "PENDING" reads like a value and renders onto a proposal.

## 1. Create the organization

Insert a row into `organizations` with the service-role client. The columns that
matter:

```
name, email, phone, website, address, city, state, zip,
timezone            -- IANA, e.g. America/Chicago. Drives every date in the app
license_number      -- null rather than a placeholder
status              -- 'active' for a paying customer, 'trial' otherwise
subscription_tier   -- 'trial' | 'starter' | 'professional' | 'enterprise'
```

`business_hours_start` and `business_hours_end` default to 06:00 and 19:00 and
bound the scheduling time pickers. Adjust in Settings → Company Profile if the
customer works different hours.

### What happens by itself

AFTER INSERT triggers on `organizations` seed the tenant. Do not seed these by
hand and do not add them to a shared migration:

| Seeded | Count |
|---|---|
| `pipeline_stages` | 6 |
| `activity_types` | 12 |
| `activity_outcomes` | 9 |
| `credential_types` | 5 |
| `organization_ai_settings` | 1 row, `ai_enabled` false |

Verify they arrived before going further. If any are missing, a trigger did not
fire and everything downstream will be subtly wrong.

## 2. Create the logins

Two steps, because one does not imply the other.

```js
// 1. the auth user
const { data } = await db.auth.admin.createUser({
  email, password,
  email_confirm: true,                    // no confirmation mail is sent
  user_metadata: { first_name, last_name },
})

// 2. attach the profile the signup trigger just created
await db.from('profiles').update({
  organization_id: orgId,
  role,                                   // tenant_owner | admin | estimator | technician | viewer
  first_name, last_name,
  is_active: true,
}).eq('id', data.user.id)
```

**`email_confirm: true` means no mail is sent.** That is deliberate: you want to
pass credentials on deliberately rather than have the system surprise someone's
staff. Print the passwords once and hand them over however you choose.

### The trap: self-signup leaves people stranded

`on_auth_user_created` creates a `profiles` row **with no organization**. Nothing
attaches it. So anyone who signs up through the front door lands in an account
that authenticates successfully and shows nothing at all.

This happened to a real client contact three days before their cutover: he
signed up with his own address, saw an empty app, and drew his own conclusions.

Two consequences:

- **Check for existing accounts on the customer's domain before creating any.**
  Search `auth.users` for their email domain and look at each profile's
  `organization_id`.
- **Attach an orphan, do not duplicate it.** If someone has already signed up,
  set `organization_id` on their existing profile. Their password is theirs and
  they keep it. Creating a second account with the same address fails anyway:
  "A user with this email address has already been registered".

### Do not delete an account you did not create

An account somebody signed up for and signed into is theirs. If it needs to
leave the org, set `organization_id` to null rather than deleting the login.
Deleting is for accounts you created that were never used.

## 3. Leave the org empty until the data is ready

If the customer's records are being migrated, **do not seed anything**. Anything
you add has to be told apart from real data later, and seeded rows look exactly
like real ones once they are in.

Equally, consider not giving the client access until the import is done and
checked. An empty organization with their real name on it invites someone to
start entering data into a system you are about to overwrite.

## 4. Verify

```
people                 profiles where organization_id = <org>
seeded vocab           pipeline_stages, activity_types, activity_outcomes, credential_types
business data          customers, jobs, opportunities  (should be zero)
```

Then sign in as the owner account and confirm the app renders. An organization
that looks right in the database and fails to load is usually a missing seed.

---

## Removing a tenant

`scripts/delete-org.mjs` exists and does this properly. It is irreversible and
points at production by default, so:

- It is a **dry run** unless you pass `--confirm="<exact org name>"`.
- It **refuses an `active` organization**. Suspend it first, which is itself
  reversible and already revokes access.
- It reports what would go before it goes.

The database does most of the work: 80 foreign keys cascade from
`organizations`. Two things do not cascade and the script handles them: the
`auth.users` logins behind the profiles, and storage objects keyed by org id.

`audit_log.organization_id` is SET NULL on purpose, so the audit trail survives
the deletion.

**Look at the auth users it lists before confirming.** That list is how you tell
a throwaway test org from one a real person has been using. On the last delete it
showed `e2e-test@hazardos.app` and two addresses belonging to a tester, which
made the decision obvious.

## Related

- Seeded demo and QA tenants: `scripts/demo-seed/` with `--profile=`. The seeder
  wipes an org's business data before reseeding, so it refuses profiles marked
  `inUseByClient` without an explicit override flag.
- [`ENVIRONMENT.md`](./ENVIRONMENT.md) for what has to be configured for a tenant
  to actually use email, SMS and AI.
