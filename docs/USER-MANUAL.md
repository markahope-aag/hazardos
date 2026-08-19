# HazardOS User Manual

For everyone who uses HazardOS day to day: office staff, estimators, project
managers, and field technicians.

If you administer the system (adding people, setting prices, configuring
messaging), see the **HazardOS Admin Manual** instead. This manual covers doing
the work, not configuring it.

*Last updated 19 August 2026.*

---

## Contents

1. [Getting started](#1-getting-started)
2. [Finding your way around](#2-finding-your-way-around)
3. [What your role can see](#3-what-your-role-can-see)
4. [Dashboard and My Work](#4-dashboard-and-my-work)
5. [Time Clock](#5-time-clock)
6. [The CRM](#6-the-crm)
7. [Site Surveys](#7-site-surveys)
8. [Lab Reports](#8-lab-reports)
9. [Estimates and Proposals](#9-estimates-and-proposals)
10. [Jobs and Work Orders](#10-jobs-and-work-orders)
11. [Invoices and getting paid](#11-invoices-and-getting-paid)
12. [Messages](#12-messages)
13. [Compliance](#13-compliance)
14. [Calendar](#14-calendar)
15. [What your customers see](#15-what-your-customers-see)
16. [Working offline](#16-working-offline)
17. [Common questions](#17-common-questions)

---

## 1. Getting started

### Signing in

Go to your company's HazardOS address and sign in with your work email and
password. If you've forgotten your password, use **Forgot password** on the
sign-in screen and follow the emailed link.

If you were invited by an administrator, your invitation email contains a link
that lets you set your own password. Invitations expire, so if yours no longer
works, ask your administrator to send a new one.

### Your profile

**Settings → Profile** holds your name, contact details, and notification
preferences. Keeping your name accurate matters more than it looks: it appears
on estimates you build, jobs you're assigned to, and timesheets your supervisor
approves.

### On your phone

HazardOS installs to a phone or tablet home screen like an app. There is no App
Store download: it installs from the browser, and updates arrive on their own.

- **iPhone or iPad:** open HazardOS in Safari, tap **Share**, then **Add to Home
  Screen**. Safari never shows an install banner, so this is the only route.
- **Android:** open HazardOS in Chrome and take the **Install** banner when it
  appears. If it doesn't, use the three-dot menu and choose **Install app**.

This matters for field work, because the mobile survey tool is built for
one-handed use on site and keeps working with no signal. Working from a desk?
There's nothing to install. Use the browser.

---

## 2. Finding your way around

The main navigation runs across the top. What you see depends on your role, so
your menu may be shorter than a colleague's.

| Section | What it's for |
|---|---|
| **Dashboard** | Your overview: what's happening today and what needs attention |
| **My Work** | Everything assigned to you, in one list |
| **Time Clock** | Clocking in and out, and submitting your week |
| **CRM** | Properties, contacts, companies, opportunities, pipeline, jobs |
| **Surveys** | Site surveys, scheduled and completed |
| **Lab Reports** | Sample results and the reports that come back |
| **Estimates** | Building and sending estimates and proposals |
| **Jobs** | Scheduled and active work |
| **Work Orders** | The paperwork crews take to site |
| **Compliance** | Regulatory notifications, permits, and credentials |
| **Invoices** | Billing and payment tracking |
| **Sales** | Commissions, approvals, win/loss analysis |
| **Calendar** | Scheduled surveys, jobs, and appointments |
| **Feedback** | Customer satisfaction responses |

### The CRM is its own space

When you open the CRM, the main menu is replaced by CRM tabs: Properties,
Contacts, Companies, Opportunities, Pipeline, Jobs, and Calendar. Use **Main
Menu** to come back out. This trips people up the first time, so if the top of
the screen looks unfamiliar, check whether you're inside the CRM.

---

## 3. What your role can see

HazardOS has seven roles. Yours determines both what appears in your menu and
what you can open directly.

| Role | Typically | Can see money? |
|---|---|---|
| **Tenant Owner** | The business owner | Yes |
| **Admin** | Office manager, operations lead | Yes |
| **Estimator** | Sales and estimating staff | Yes |
| **Viewer** | Read-only office staff, bookkeeping | Yes, read-only |
| **Technician** | Field crew | **No** |
| **Platform Owner / Platform Admin** | HazardOS support staff | Yes |

### A note for technicians

Technicians do not see money anywhere in the system. Estimates, invoices,
contract values, job costs, material costs, and margin are all hidden. This is
deliberate and was requested by the business: the field crew works the job, and
what it's worth is not part of that job.

You'll still see everything you need: your assigned work, job details, hazards,
containment requirements, site contacts, photos, and your own hours. If you
believe you're missing something you need to do your job, tell your
administrator rather than working around it.

### A note for viewers

Viewers can read financial screens but cannot change anything. Buttons that
create, edit, or delete are not shown, and the system refuses those actions even
if reached another way.

---

## 4. Dashboard and My Work

**Dashboard** is the overview: what's scheduled, what's overdue, and what needs
a decision. It's the sensible first stop each morning.

**My Work** is narrower and more useful once the day starts. It lists what is
assigned specifically to you across surveys, jobs, and follow-up tasks, so you
don't have to check several screens to find your own work.

---

## 5. Time Clock

### Clocking in

Open **Time Clock** and choose what you're working on:

- **General time (no job)** for anything not tied to a specific job: shop time,
  travel between sites, meetings.
- **A specific job** from the dropdown, which lists scheduled and in-progress
  jobs.

Press **Clock In**. The screen then shows a running total and a **Clock Out**
button.

You can only have one clock running at a time. If you try to clock in while
already clocked in, the system stops you and tells you to clock out first. This
is deliberate: it's easy to double-clock on a phone in a work glove, and the
resulting timesheet is worse than the inconvenience.

### Clocking out

Press **Clock Out**. The entry moves into **This Week** with its total.

### Submitting your week

Once everything for the week is clocked out, press **Submit Week**. This sends
your hours to your supervisor for approval.

**Submit Week stays disabled while any entry is still running.** Submitting a
week with a live clock would freeze a total that's still changing, so clock out
of everything first.

After submitting, entries show as **submitted** until your supervisor reviews
them. Approved entries show as **approved**. If something is sent back, it shows
as **rejected** with your supervisor's note explaining why, and you can correct
and resubmit.

### Approving time (supervisors)

If your role allows it, an **Approve Time** button appears at the top of the
Time Clock screen. It opens the approvals queue, grouped by person, where you can
approve or reject submitted entries in a batch. Rejections take a note, and the
technician sees it.

Technicians cannot approve their own hours. The system enforces this at the
database, not just by hiding the button.

---

## 6. The CRM

The CRM holds everyone and everything you sell to.

### Properties

Physical sites. Because remediation work is tied to buildings rather than
people, a property can outlive any particular owner or contact and carry its own
history of surveys, hazards, and jobs.

### Contacts

People. Each contact is either **residential** or **commercial**, and carries a
role such as decision maker, billing contact, or site contact. Contacts hold
phone numbers, a preferred contact method, and email and SMS consent flags.

**Consent matters.** If a contact hasn't opted into SMS, the system will not
text them, and no amount of clicking Send will change that. The same applies to
marketing email.

### Companies

Business accounts: contractors, property management firms, HOAs, government
bodies. A company can have many contacts.

Companies are created through the commercial contact flow rather than on their
own. If you need a new company, start by adding the commercial contact who works
there.

### Opportunities

Potential work. An opportunity records the hazard types involved, the property
type and age, urgency (routine, urgent, or emergency), any regulatory trigger,
and an estimated value with a probability.

Urgency is worth setting honestly. Emergency work is scheduled differently, and
an inbox where everything is an emergency helps nobody.

### Pipeline

The Kanban board view of opportunities. Drag a card between columns to move the
work along. Columns are configured by your administrator to match how your
business actually sells.

### Jobs

Won work, scheduled and tracked. See [Jobs and Work Orders](#10-jobs-and-work-orders).

### How it all connects

```
Property ──┐
           ├── Opportunity ──→ Job ──→ Invoice
Contact ───┤
Company ───┘
```

Source information carries forward automatically. Where a contact came from is
inherited by the opportunity created for them, and then by the job created from
that opportunity, so you can see which marketing actually produced paid work
without re-entering anything.

---

## 7. Site Surveys

### Scheduling a survey

From **Surveys**, choose **Schedule Site Survey**. The form asks for the
customer, the site address, and the **hazard type** being investigated.

**You don't need an existing customer.** The contact picker has an **Add New
Contact** option that creates the contact inline, so a phone call can become a
scheduled survey without leaving the screen.

### Quick Add Appointment

When someone calls and you just need it in the diary, use **Quick Add
Appointment**. It asks for four things only: name, address, hazard type, and
email. It creates a draft survey you can finish scheduling later from the survey
list.

Use this when you're on the phone and detail can wait. Use the full scheduling
form when you have the information to hand.

### Doing the survey on site

Open **Surveys → Mobile** on your phone or tablet. The wizard walks through six
sections:

1. **Property**: address, building type, year built, size, stories,
   construction type, occupancy, and an optional owner contact
2. **Access**: restrictions, parking, equipment access
3. **Environment**: conditions affecting the work
4. **Areas & Hazards**: the areas you document and what you find in each
5. **Photos & Videos**: site media
6. **Review**: a completion checklist and submit

**Environment and Photos are optional.** Leaving either blank will not stop you
submitting. They appear in the completion checklist so you can see what you
skipped, but they don't block the survey. This was changed in response to
customer feedback: crews were being stopped from filing a survey by sections
that didn't apply to the work in front of them.

What *does* block submission is the information the office genuinely needs:
Property (address, state, building type), Access, and at least one documented
area under Areas & Hazards. The review screen lists exactly what's missing and
lets you tap through to fix it.

The **Save** button in the header saves progress at any point, so an interrupted
survey isn't lost.

### Photos

Photos upload in the background as you take them. The Next button waits if
uploads are still in flight on the photo step, so give it a moment on a weak
signal rather than forcing it.

---

## 8. Lab Reports

Where sample results live. Create a lab report against a survey or job, record
what was sampled, and attach the result when the laboratory returns it. Each
report gets a reference number automatically.

Lab results feed compliance, and depending on your configuration a returned
result can trigger follow-up work automatically.

---

## 9. Estimates and Proposals

*Estimators, admins, owners, and viewers. Technicians don't see this section.*

### Building an estimate

From **Estimates → New**, choose the customer and survey, then add line items.
Line items draw on the pricing your administrator configured (labor, equipment,
materials, disposal, travel), so rates stay consistent between estimators.

Markup, discount, and tax apply at the estimate level and the totals recalculate
as you change them.

### Versions

Estimates are versioned. When you revise a sent estimate, HazardOS creates a new
version rather than overwriting the old one, so what the customer originally saw
is preserved.

The estimate header shows **Version X of Y**, and a **Version History** panel
lists the chain. Exactly one version in a chain is the **active** one, which is
the version the rest of the system treats as current. Use **Mark active** to
switch, and when you're viewing an older version a banner tells you it isn't the
active one.

Practical advice: revise rather than edit once anything has gone to the
customer. The version history is what protects you in a disagreement about what
was quoted.

### Sending a proposal

From an estimate, generate and send the proposal. The customer receives a link
to a page where they can read and sign it. See
[What your customers see](#15-what-your-customers-see).

---

## 10. Jobs and Work Orders

### Creating a job

Jobs are created from won opportunities, which carries the customer, property,
and hazard details forward automatically.

### The job record

A job holds:

- **Schedule and crew**: dates and who's assigned
- **Hazards and containment**: hazard types and the OSHA containment level
  (Type I, II, or III)
- **Permits and manifests**: permit numbers and disposal manifest numbers
- **Air monitoring and clearance testing**: whether each is required
- **Documents**: everything filed against the job
- **Notes and activity**: the running history

### Assigning crew

**Assign Crew** on the job's Crew tab. Check off everyone who's going, pick the
role they'll all carry, and name a supervisor.

The supervisor list covers your whole team, not only the people you just checked
off. The handful of people who normally run work are always in it, and so is
everyone else, for the occasional job where somebody runs a crew who usually
doesn't. If you name someone you didn't check off, they're added to the job for
you rather than the designation landing on nobody.

Whoever you name carries the Supervisor role on the job, so the crew list shows
who was in charge without anyone having to remember.

If a credential the job requires has lapsed, you'll be warned before you assign,
and depending on how your administrator set it up the assignment may be refused
outright.

### Work orders

**Generate Work Order** produces the document the crew takes to site: scope,
hazards, containment requirements, site contact, and access notes.

It's created as a draft, and it takes a snapshot of the job as it stands, so
later edits to the job don't quietly rewrite paperwork a crew is already
carrying. Before you issue it, you can correct any section:

- **Crew**: pick people from your team, or choose *Someone else* and type a name
  for a subcontractor or a temp. Tick **Supervisor** for whoever is running it.
- **Materials and equipment**: taken from the approved estimate's line items.
- **Vehicles**: what's going, who's driving, and rental details if it's hired.
- **Extra items**: anything else the crew needs to know about.

**Issue** it once it's final. You can download it as a PDF or email it straight
to the crew.

### Occupant Protection Plan (OPP)

*The Wisconsin DHS form, required where occupants stay in the building during
the work.*

Open the job's **Documents** tab and click **Generate OPP**. The wizard fills in
what it can: your company details, the property, the schedule, and the
protective-measures wording your administrator set up once in Settings.

**Check the project description before you save.** The form asks for the type
and the amount of material being removed or disturbed, and that's the part an
inspector actually reads. HazardOS takes it from the proposal's scope of work,
so on a job with a proposal behind it you should find your own wording already
sitting there:

> Removal and disposal of approximately 225 sq feet of asbestos containing two
> layers of sheet vinyl in the lower level kitchen. 15' x 15', on a plywood
> underlayment.

Underneath the box, the wizard tells you where that text came from. If the job
has no proposal behind it, it says so and asks you to type the quantity and the
material in yourself. Take that seriously. A description with no quantity in it
is the usual reason this form comes back.

One thing it won't do is put labor hours in that box. Estimates price labor by
the hour, and hours are not an amount of asbestos.

Save, and the finished PDF is filed against the job under OPP. A blank copy of
the form is linked there too, if you'd rather complete one by hand.

### Change orders

*Requires estimator level or above.*

When scope changes on site, record a change order against the job with a
description, a reason, and an amount. It starts as **pending**.

Once approved, the amount rolls into the job's final value automatically. A
negative amount records a credit and reduces it. The job's contract amount stays
as originally agreed, and the change order total is tracked separately, so you
can always see what was agreed at the start against what the job became.

Technicians cannot create or approve change orders.

### Materials used

Record what was actually consumed on site: material name, quantity used, and
unit. If you supplied an estimated quantity, a variance badge shows how far
actual differs from estimate, highlighted when it exceeds ten percent.

**Technicians can record materials but do not see or set cost.** Enter what was
used and the office adds cost afterward.

Material variance is one of the more useful numbers in the system. Consistent
overruns on a material usually mean the estimate template needs revisiting
rather than that the crew is wasteful.

### Completing a job

**Complete** walks through the closing checklist. Depending on configuration,
completed jobs may enter a review queue before invoicing.

---

## 11. Invoices and getting paid

*Not visible to technicians.*

Invoices are raised against completed jobs. The invoice records what was billed,
what's been paid, and what remains.

Payment status is worked out from the job's own dates rather than being set by
hand, so it can't drift out of step with reality. Deposit received, final
invoice raised, and final payment received each move the status along.

Customers can be sent a link to view and pay an invoice online. See
[What your customers see](#15-what-your-customers-see).

---

## 12. Messages

**Messages** is the SMS conversation view, threaded per customer. **Delivery
Log** shows what was sent, when, and whether it arrived.

A few rules the system enforces regardless of what you type:

- **Consent.** Customers who haven't opted in are not texted.
- **Opt-out.** A customer who replies STOP is opted out immediately, of
  everything, including appointment reminders. START opts them back in. This is
  handled automatically.
- **Quiet hours.** If your administrator set quiet hours, messages aren't sent
  outside them.

Messages may carry a short brand prefix in square brackets so customers know who
is texting.

---

## 13. Compliance

Regulatory notifications, permits, and crew credentials. Credentials track
expiry, and depending on configuration the system can warn or block when
assigning someone whose certification has lapsed.

Keep credential records current. An expired certification discovered during an
inspection is a much more expensive problem than one discovered here.

Occupant Protection Plans are produced from the job itself rather than from
here. See [Jobs and Work Orders](#10-jobs-and-work-orders).

---

## 14. Calendar

Scheduled surveys, jobs, and appointments in one view. The CRM has its own
calendar scoped to sales activity.

---

## 15. What your customers see

Customers don't sign in. They receive links that open a single page.

- **Proposals.** The customer reads the proposal and signs it online. The
  signature, name, and timestamp are recorded against the estimate. You can see
  when they first opened it, which is useful before chasing.
- **Invoices.** The customer views the invoice and pays online where payment is
  configured.
- **Feedback surveys.** After a job, customers can be asked to rate the work.
  Responses appear under **Feedback**.

These links are private and specific to that customer and document. Treat them
like a password: don't post them anywhere public.

---

## 16. Working offline

The mobile survey tool keeps working when signal drops. Survey progress is held
on the device and photos queue for upload, syncing when you're back in coverage.

Two practical points:

- **Finish the survey before you leave the site.** Filling gaps from memory in
  the truck is where errors come from.
- **Check the photos uploaded** before you consider the survey done. The photo
  step shows outstanding uploads.

---

## 17. Common questions

**I can't see Estimates or Invoices in my menu.**
You're most likely a technician. Financial screens are hidden from field crew by
design. If your job requires them, your administrator can change your role.

**I can't submit my week.**
Something is still clocked in. Clock out of every entry, then submit.

**The customer says they never got the proposal.**
Check the estimate for when it was first viewed. If it was never opened, resend
it and confirm the email address. Check junk mail with them.

**A survey won't submit.**
The review screen lists what's blocking it. It won't be Environment or Photos,
which are optional. It's most likely a missing state or building type on
Property, an unanswered Access question, or no documented area under Areas &
Hazards.

**I texted a customer and nothing sent.**
Either they haven't opted into SMS, they've replied STOP at some point, or
you're inside quiet hours. The delivery log will say which.

**I changed an estimate and the customer is quoting a different price.**
Check the version history. They may be looking at an older version. The active
version is the one the system treats as current, and older ones stay readable
precisely for this conversation.

**Something looks wrong with a number.**
Don't correct it by editing around the system. Tell your administrator what you
expected and what you saw. Job totals, change orders, and material variance are
calculated, and a number that looks wrong usually means an input needs fixing
rather than the total.
