# HazardOS Admin Manual

For the people who configure HazardOS: business owners, office managers, and
whoever ends up owning the system.

For day to day use (booking surveys, building estimates, running jobs), see the
**HazardOS User Manual**. This manual covers setting the system up and keeping
it healthy.

*Last updated 19 August 2026.*

---

## Contents

1. [Roles and what each one can do](#1-roles-and-what-each-one-can-do)
2. [Your team](#2-your-team)
3. [Company, locations, and branding](#3-company-locations-and-branding)
4. [Pricing](#4-pricing)
5. [Message templates](#5-message-templates)
6. [SMS setup](#6-sms-setup)
7. [Email setup](#7-email-setup)
8. [Activity vocabulary](#8-activity-vocabulary)
9. [Automations](#9-automations)
10. [Credentials](#10-credentials)
11. [Notifications](#11-notifications)
12. [Integrations](#12-integrations)
13. [AI features](#13-ai-features)
14. [API keys and webhooks](#14-api-keys-and-webhooks)
15. [Billing](#15-billing)
16. [Security](#16-security)
17. [Things worth checking monthly](#17-things-worth-checking-monthly)

---

## 1. Roles and what each one can do

Seven roles, in descending order of access.

| Role | Intended for |
|---|---|
| **Platform Owner** | HazardOS staff, across all customers |
| **Platform Admin** | HazardOS support staff |
| **Tenant Owner** | The business owner |
| **Admin** | Office manager, operations lead |
| **Estimator** | Sales and estimating |
| **Technician** | Field crew |
| **Viewer** | Read-only office staff, bookkeeping |

### What each role can reach

| Capability | Owner | Admin | Estimator | Technician | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|
| See financial screens (estimates, invoices) | Yes | Yes | Yes | **No** | Read-only |
| Sales hub (commissions, approvals, win/loss) | Yes | Yes | No | No | No |
| Create and edit estimates and jobs | Yes | Yes | Yes | No | No |
| Record time, photos, materials, checklists | Yes | Yes | Yes | Yes | No |
| Approve timesheets | Yes | Yes | Yes | **No** | No |
| Create and approve change orders | Yes | Yes | Yes | **No** | No |
| See material cost | Yes | Yes | Yes | **No** | Yes |
| Team, billing, and settings | Yes | Yes | No | No | No |

### The money rule

Technicians see no financial information anywhere: not estimates, not invoices,
not contract values, job costs, material costs, or margin. This was a specific
business requirement and it's enforced in the database, not just by hiding menu
items. A technician who types the URL of a financial screen is redirected.

Technicians *can* record materials used on a job, because that's field work.
They enter what was used and the office adds the cost afterward.

If you need someone to see money, give them Estimator rather than working around
the rule.

---

## 2. Your team

**Settings → Team**

### Inviting someone

Send an invitation to their work email and pick their role. They set their own
password from the emailed link, so you never handle their password. Invitations
expire; resend if one goes stale.

### Changing a role

Change it here. It takes effect on their next page load, and menus adjust
immediately.

Think about role changes in terms of the money rule above. Promoting a
technician to estimator gives them every financial screen in the system, so do it
because they need to quote work, not as a general reward.

### Removing someone

Removing access does not delete their history. Timesheets, jobs, estimates, and
notes stay attributed to them, which is what you want for records.

Remove access the day someone leaves. It's the single highest-value security
habit in the system.

---

## 3. Company, locations, and branding

**Settings → Company** holds your business details, which appear on customer
documents. It also holds two things the Occupant Protection Plan depends on:
your **License number**, which prints on the OPP as the DHS company number, and
your **OPP defaults**.

The defaults are your standing wording for containment, ventilation, work
practices, and final cleaning. They pre-fill every OPP the office generates.
Write them once and write them properly, because the alternative is somebody
retyping four paragraphs of regulatory boilerplate per job and getting it
slightly different each time. They stay editable on each individual plan, for
the job that genuinely differs.

**Settings → Locations** covers multi-branch operations. New records can inherit
the creating user's default location, which keeps regional reporting honest
without asking anyone to think about it.

**Settings → Branding** controls how your documents look to customers: logo and
presentation on proposals and invoices. Worth doing properly. These documents
are often the most polished thing a customer sees from you.

---

## 4. Pricing

**Settings → Pricing**

Five rate types feed estimate line items:

| Type | Covers |
|---|---|
| **Labor rates** | Crew day rates |
| **Equipment rates** | Negative air machines, scaffolding, and similar |
| **Material costs** | Consumables |
| **Disposal fees** | Landfill and manifest costs |
| **Travel rates** | Mileage and travel time |

Estimators pick from these rather than typing numbers, which is what keeps
quotes consistent between people.

### Keeping rates current

Rates drift out of date quietly, and the first sign is usually a job with poor
margin. Review them when disposal pricing changes, at least annually, and any
time material variance on jobs starts trending against you.

Job **material variance** is the useful signal here: it compares what was
estimated against what was actually used. Consistent overruns on one material
usually mean the rate or the estimate template is wrong rather than that crews
are careless.

Only admins and owners can change pricing. Everyone in the organization can read
it, because estimators need it to quote.

---

## 5. Message templates

**Settings → Message Templates**

Two tabs, Email and SMS. The system ships six default templates: one email (job
confirmation) and five SMS (appointment reminder a week out, appointment
reminder day of, payment reminder before due, payment reminder due today,
payment reminder overdue).

Defaults are marked as such. You can edit their wording freely, and your edits
persist. Templates use `{{variable}}` placeholders that fill in from the job,
customer, and appointment.

Write templates the way you'd actually speak to a customer. The defaults are a
starting point, not house style.

---

## 6. SMS setup

**Settings → SMS**

### Choosing a provider

HazardOS supports **Twilio** and **RingCentral**. Pick one under **Provider**;
the credential fields change to match.

Choose RingCentral if you already run your phone system there and would rather
not hold a second account. Choose Twilio otherwise.

Switching provider affects new messages only. Messages already sent keep their
original provider in the delivery log.

### Twilio

Enter Account SID, Auth Token, and Phone Number from the Twilio Console. The
number must be SMS-capable and in E.164 format (`+15551234567`).

### RingCentral

Create a REST app in the RingCentral Developer Console with SMS permission, then
generate a JWT credential for the user whose number will send. Enter:

- **Client ID** and **Client Secret** from the app
- **JWT Credential** generated under Credentials
- **From Number** in E.164 format, which must be assigned to the JWT user and
  SMS-enabled on the RingCentral side
- **Server**: Production or Sandbox

**Check the server setting first if authentication fails.** Sandbox credentials
against production fail with an error that reads like a bad JWT, and this is the
most common setup mistake.

### Current RingCentral limitations

Sending and logging work. Two things do not, and both need RingCentral's
subscription API:

- **Delivery confirmation.** A RingCentral message logs as sent when RingCentral
  accepts it, and won't progress to delivered the way a Twilio message does.
- **Inbound messages.** Customer replies are not captured, which includes STOP
  replies. If you run on RingCentral, you must handle opt-out requests manually
  until this is built.

That second point is a compliance matter, not a convenience one. Raise it before
going live on RingCentral at volume.

### Quiet hours

Set a window outside which no messages send. Appointment reminders that would
land at 6am are the main thing this prevents.

### Brand prefix

An optional short label prepended in square brackets, so customers know who is
texting them.

### Opt-out handling

On Twilio this is automatic and not optional. STOP, UNSUBSCRIBE, CANCEL, END,
and QUIT opt a customer out of everything, including transactional messages like
appointment reminders. START, SUBSCRIBE, YES, and UNSTOP opt them back in.

Do not attempt to work around an opt-out. It's a legal obligation, and the
system will not send regardless.

### Testing

**Send Test SMS** sends a single message to a number you choose to confirm
credentials work. Use it after any credential change.

---

## 7. Email setup

**Settings → Email** configures the address customer email is sent from, and
sender verification. Proposals, invoices, and feedback requests all go out this
way.

Get the sending domain properly verified. Unverified senders land in junk mail,
and the symptom customers report is "we never got your proposal".

---

## 8. Activity vocabulary

**Settings → Activity Vocabulary**

Two tabs:

- **Activity Types**: the kinds of work your team logs (initial contact, confirm
  appointment, send estimate, chase payment, and so on)
- **Outcomes**: how an activity ended (completed, left message, no answer)

Rename these to match how your business actually talks. The vocabulary drives
automations, so the names matter beyond labeling.

**Rows in use cannot be deleted.** If an automation references an activity type,
deleting it is refused and the message names the blocking chain, so you know
what to change first. Deactivate rather than delete when retiring something that
has history.

---

## 9. Automations

**Settings → Automations**

Automations are chains of steps that fire on an event: an opportunity reaching a
stage, a job status changing, a lab result arriving, a message failing to send.

Each step has a kind, an assignee (a named person, unassigned for a queue, or
whoever completed the triggering step), and a due date relative to when the chain
fires.

### Weekends

Each chain has **use Saturdays** and **use Sundays** settings, off by default. A
due date landing on a day the office is closed pushes work into a day nobody
works, and follow-up cadence drifts as a result. Leave them off unless you
genuinely work weekends.

### Building chains

Start smaller than you think you need. A three-step chain everyone follows beats
a twelve-step chain people work around. Add steps once the simple version is
running.

---

## 10. Credentials

**Settings → Credentials**

Track crew certifications and expiry dates. **Credential assignment
enforcement** is set per organization and controls what happens when you assign
someone whose certification has lapsed: warn, or block outright.

Blocking is stricter and occasionally inconvenient. It's also the setting that
stops an uncertified technician reaching a regulated site, which is the more
expensive problem.

---

## 11. Notifications

**Settings → Notifications** controls what the system tells people about, in-app
and by email. Individuals can also set their own preferences under their
profile.

Turn off what nobody reads. Notification fatigue is real, and a team that
ignores every notification will ignore the important one too.

---

## 12. Integrations

**Settings → Integrations**

**QuickBooks** syncs customers and invoices. Connect through the OAuth flow.

Note: if QuickBooks credentials aren't configured on the server, the Connect
button will send you to Intuit and fail there rather than telling you here.
If Connect behaves oddly, check with your HazardOS contact that the integration
is configured before troubleshooting your QuickBooks account.

---

## 13. AI features

**Settings → AI & Automation**

Three optional features: estimate suggestions, photo hazard analysis, and voice
transcription cleanup.

**They're off until you turn them on, deliberately.** They involve sending job
information to a third-party model, so they're gated behind explicit consent
rather than enabled by default. The settings record who granted consent and when.

Related controls:

- **Retain AI data**: whether inputs are kept
- **Anonymize customer data**: strips identifying details before sending
- **Allow model improvement**: off by default

Turn on only what earns its place. Estimate suggestions help most on unusual
scopes; on routine work your own templates are faster and better.

---

## 14. API keys and webhooks

**Settings → API** issues keys for the public API, with scoped permissions.
**Settings → Webhooks** registers URLs the system calls when events occur.

Two habits worth keeping: give each integration its own key so you can revoke
one without breaking the others, and revoke keys when the integration that used
them is retired.

**Settings → API Docs** documents the available endpoints.

---

## 15. Billing

**Settings → Billing** holds your subscription, plan, and invoices from
HazardOS. Owner and admin only.

---

## 16. Security

**Settings → Security** covers organization-level security settings.

### What matters most

**Remove people the day they leave.** More important than every other setting
here combined.

**Give the least role that does the job.** Estimator is not a courtesy title; it
opens every financial screen in the system.

**Rotate API keys** when someone with access to them leaves.

**Review the team list quarterly.** People accumulate. Check the list matches
who actually works here and that roles still match responsibilities.

---

## 17. Things worth checking monthly

A short list that catches most problems before customers do.

**Delivery log.** Are messages arriving? A rising failure rate usually means bad
phone numbers or a provider issue, and it's invisible unless you look.

**Pricing.** Have disposal or material costs moved since you last updated rates?

**Material variance on recent jobs.** Consistent overruns point at estimate
templates rather than crews.

**Credential expiry.** Anyone lapsing in the next sixty days.

**Team list.** Does it match who works here?

**Unsubmitted and unapproved timesheets.** Old submitted entries mean somebody
isn't approving, and payroll finds out later.

**Estimates sent but never opened.** The estimate record shows first-view time.
Never opened usually means the email didn't arrive.

---

## Getting help

Your HazardOS contact can help with anything configured above the organization
level: platform settings, integration credentials, and environment
configuration. When reporting a problem, include what you expected, what
happened, the affected record, and roughly when. That's usually enough to
diagnose without a call.
