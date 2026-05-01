import { ROLE, type UserRole } from './roles'

/**
 * Read-only capability matrix used by Settings → Roles to describe
 * what each role can do inside the product.
 *
 * This is documentation, not enforcement: the actual permission gate
 * is `allowedRoles` on each API route plus RLS policies on the database.
 * Keep this in sync with those when capabilities change.
 *
 * Phase 2 (see docs/TECHNICAL-DEBT.md) will replace this with a
 * `role_capabilities` table so admins can toggle individual capabilities.
 */

export interface CapabilityGroup {
  label: string
  capabilities: string[]
}

export interface RoleCapabilities {
  role: UserRole
  label: string
  shortDescription: string
  intendedFor: string
  groups: CapabilityGroup[]
  cannotDo: string[]
}

const TENANT_OWNER: RoleCapabilities = {
  role: ROLE.TENANT_OWNER,
  label: 'Tenant Owner',
  shortDescription:
    'Full control of the organization. There is exactly one owner per tenant.',
  intendedFor:
    'The person who signed the contract — typically the company owner or principal.',
  groups: [
    {
      label: 'Organization',
      capabilities: [
        'Manage company profile, locations, branding, and timezone',
        'Promote or demote any team member, including other admins',
        'Transfer tenant ownership to another user',
        'Manage subscription, billing, and payment methods',
      ],
    },
    {
      label: 'Team & access',
      capabilities: [
        'Invite, edit, and deactivate team members',
        'Send password resets',
        'Configure API keys and webhooks',
      ],
    },
    {
      label: 'Workflow',
      capabilities: [
        'Configure pricing (labor, equipment, materials, disposal, travel)',
        'Manage integrations (QuickBooks, Mailchimp, HubSpot, calendars)',
        'Configure email/SMS templates and notifications',
      ],
    },
    {
      label: 'Day-to-day',
      capabilities: [
        'Everything an Admin, Estimator, Technician, and Viewer can do',
      ],
    },
  ],
  cannotDo: ['Access platform-level admin tools (HazardOS staff only)'],
}

const ADMIN: RoleCapabilities = {
  role: ROLE.ADMIN,
  label: 'Admin',
  shortDescription:
    'Day-to-day operational lead. Can manage almost everything except tenant ownership.',
  intendedFor:
    'Operations managers, office managers, or anyone running the business under the owner.',
  groups: [
    {
      label: 'Team & access',
      capabilities: [
        'Invite, edit, and deactivate team members (except the tenant owner)',
        'Assign and change roles below tenant owner',
        'Send password resets',
      ],
    },
    {
      label: 'Workflow',
      capabilities: [
        'Configure pricing, locations, integrations, and templates',
        'Approve job completions, void invoices, sign off proposals',
        'Manage API keys and webhooks',
      ],
    },
    {
      label: 'Sales & finance',
      capabilities: [
        'View and edit all opportunities, estimates, jobs, and invoices',
        'Approve discounts and out-of-policy pricing',
        'View commissions and reports',
      ],
    },
  ],
  cannotDo: [
    'Promote anyone to Tenant Owner (or modify the existing owner)',
    'Transfer tenant ownership',
  ],
}

const ESTIMATOR: RoleCapabilities = {
  role: ROLE.ESTIMATOR,
  label: 'Estimator',
  shortDescription:
    'Owns the sales pipeline. Builds estimates, sends proposals, runs surveys.',
  intendedFor:
    'Estimators, sales reps, and salespeople responsible for winning work.',
  groups: [
    {
      label: 'Sales',
      capabilities: [
        'Create and edit opportunities and contacts',
        'Build estimates and proposals',
        'Send proposals to customers and request signatures',
        'View their own commission ledger',
      ],
    },
    {
      label: 'Surveys',
      capabilities: [
        'Schedule and conduct site surveys (web + mobile)',
        'Capture photos, materials, and hazard assessments',
      ],
    },
    {
      label: 'Read access',
      capabilities: [
        'View jobs, invoices, and reports relevant to their work',
        'View pricing settings (read-only)',
      ],
    },
  ],
  cannotDo: [
    'Edit pricing, billing, integrations, or team',
    'Approve job completions or void invoices',
    'Manage API keys or webhooks',
  ],
}

const TECHNICIAN: RoleCapabilities = {
  role: ROLE.TECHNICIAN,
  label: 'Technician',
  shortDescription:
    'Field worker. Executes assigned jobs, captures evidence, logs time.',
  intendedFor:
    'Crew members, field technicians, and anyone whose primary tool is the mobile app.',
  groups: [
    {
      label: 'Jobs',
      capabilities: [
        'View their assigned jobs and crew schedule',
        'Update job status (started / paused / completed)',
        'Capture photos and notes against a job',
        'Log time entries and equipment usage',
      ],
    },
    {
      label: 'Surveys',
      capabilities: [
        'Run mobile surveys on assigned properties',
        'Upload survey photos and observations',
      ],
    },
  ],
  cannotDo: [
    'View or edit estimates, proposals, invoices, commissions, or pricing',
    'See the team list or invite anyone',
    'Access settings beyond their own profile',
    'View reports or analytics',
  ],
}

const VIEWER: RoleCapabilities = {
  role: ROLE.VIEWER,
  label: 'Viewer',
  shortDescription:
    'Read-only access. Can see the data but cannot change anything.',
  intendedFor:
    'Stakeholders who need visibility — executives, accountants, auditors, partners.',
  groups: [
    {
      label: 'Read access',
      capabilities: [
        'View the CRM (contacts, companies, opportunities, pipeline)',
        'View jobs, estimates, proposals, and invoices',
        'View reports and analytics',
      ],
    },
  ],
  cannotDo: [
    'Create, edit, or delete anything',
    'Run surveys, log time, or capture photos',
    'Access settings (other than their own profile)',
  ],
}

export const ROLE_CAPABILITIES: RoleCapabilities[] = [
  TENANT_OWNER,
  ADMIN,
  ESTIMATOR,
  TECHNICIAN,
  VIEWER,
]
