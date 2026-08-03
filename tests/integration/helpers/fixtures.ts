import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clientAsUser, serviceClient } from './stack'

export const TEST_PASSWORD = 'IntegrationSuite-2026!'

/** Roles the suite signs in as. Platform roles are deliberately excluded. */
export const TENANT_ROLES = ['tenant_owner', 'admin', 'estimator', 'technician', 'viewer'] as const
export type TenantRole = (typeof TENANT_ROLES)[number]

export interface RoleHandle {
  role: TenantRole
  email: string
  userId: string
  client: SupabaseClient
}

export interface Tenant {
  orgId: string
  tag: string
  roles: Record<TenantRole, RoleHandle>
  fixtures: {
    customerId: string
    opportunityId: string
    stageId: string
    estimateId: string
    lineItemId: string
    jobId: string
    voidInvoiceId: string
  }
  svc: SupabaseClient
  cleanup: () => Promise<void>
}

function must<T>(label: string, res: { data: T | null; error: { message?: string } | null }): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`)
  if (res.data === null) throw new Error(`${label}: no data returned`)
  return res.data
}

/**
 * Build a self-contained organisation with one user per tenant role and a full
 * set of business fixtures. Everything is namespaced by `tag` so parallel or
 * repeated runs cannot collide, and `cleanup()` removes the whole tenant.
 */
export async function createTenant(label: string): Promise<Tenant> {
  const svc = serviceClient()
  const tag = `it-${label}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`

  const org = must(
    'create org',
    await svc.from('organizations').insert({ name: `${tag} Org` }).select('id').single(),
  ) as { id: string }
  const orgId = org.id

  // --- users, one per tenant role -----------------------------------------
  const roles = {} as Record<TenantRole, RoleHandle>
  for (const role of TENANT_ROLES) {
    const email = `${tag}+${role}@example.test`
    const { data: created, error: cErr } = await svc.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'IT', last_name: role },
    })
    if (cErr) throw new Error(`create user ${email}: ${cErr.message}`)
    const userId = created.user!.id

    // handle_new_user() creates the profile row; point it at this org + role.
    const { error: pErr } = await svc
      .from('profiles')
      .update({ organization_id: orgId, role, first_name: 'IT', last_name: role, is_active: true })
      .eq('id', userId)
    if (pErr) throw new Error(`profile ${email}: ${pErr.message}`)

    roles[role] = { role, email, userId, client: await clientAsUser(email, TEST_PASSWORD) }
  }


  // --- business fixtures ---------------------------------------------------
  const customer = must(
    'customer',
    await svc
      .from('customers')
      .insert({
        organization_id: orgId,
        first_name: 'Fixture',
        last_name: 'Contact',
        name: 'Fixture Contact', // computed elsewhere in the app; set explicitly
        contact_type: 'residential',
        status: 'prospect',
        city: 'Denver',
      })
      .select('id')
      .single(),
  ) as { id: string }

  // pipeline_stages are seeded by an AFTER INSERT trigger on organizations.
  const stages = must(
    'pipeline stage',
    await svc.from('pipeline_stages').select('id').eq('organization_id', orgId).limit(1),
  ) as Array<{ id: string }>
  if (!stages.length) throw new Error('org trigger did not seed pipeline_stages')

  const opportunity = must(
    'opportunity',
    await svc
      .from('opportunities')
      .insert({
        organization_id: orgId,
        customer_id: customer.id,
        name: `${tag} opportunity`,
        stage_id: stages[0].id,
      })
      .select('id')
      .single(),
  ) as { id: string }

  // estimate_root_id is NOT NULL with no default (it anchors the version chain
  // and points at the first revision), so the id has to be minted here.
  const estimateId = randomUUID()
  const estimate = must(
    'estimate',
    await svc
      .from('estimates')
      .insert({
        id: estimateId,
        estimate_root_id: estimateId,
        organization_id: orgId,
        customer_id: customer.id,
        estimate_number: `EST-${tag}`,
        project_name: 'Fixture project',
        status: 'draft',
      })
      .select('id')
      .single(),
  ) as { id: string }

  const lineItem = must(
    'estimate line item',
    await svc
      .from('estimate_line_items')
      .insert({
        estimate_id: estimate.id,
        description: 'Fixture line',
        quantity: 1,
        unit_price: 100,
        item_type: 'labor',
      })
      .select('id')
      .single(),
  ) as { id: string }

  const job = must(
    'job',
    await svc
      .from('jobs')
      .insert({
        organization_id: orgId,
        customer_id: customer.id,
        estimate_id: estimate.id,
        job_number: `JOB-${tag}`,
        scheduled_start_date: '2026-07-15',
        job_address: '1 Fixture Way, Denver CO',
        status: 'scheduled',
      })
      .select('id')
      .single(),
  ) as { id: string }

  const voidInvoice = must(
    'void invoice',
    await svc
      .from('invoices')
      .insert({
        organization_id: orgId,
        customer_id: customer.id,
        invoice_number: `INV-${tag}`,
        status: 'void',
        invoice_date: '2026-07-01',
        due_date: '2026-08-01',
        subtotal: 100,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: 100,
        amount_paid: 0,
        balance_due: 100,
      })
      .select('id')
      .single(),
  ) as { id: string }

  const cleanup = async () => {
    for (const t of [
      'invoices',
      'jobs',
      'estimate_line_items',
      'estimates',
      'opportunities',
      'customers',
    ]) {
      if (t === 'estimate_line_items') {
        await svc.from(t).delete().eq('estimate_id', estimate.id)
      } else {
        await svc.from(t).delete().eq('organization_id', orgId)
      }
    }
    for (const r of Object.values(roles)) {
      await r.client.auth.signOut()
      await svc.auth.admin.deleteUser(r.userId)
    }
    await svc.from('organizations').delete().eq('id', orgId)
  }

  return {
    orgId,
    tag,
    roles,
    svc,
    fixtures: {
      customerId: customer.id,
      opportunityId: opportunity.id,
      stageId: stages[0].id,
      estimateId: estimate.id,
      lineItemId: lineItem.id,
      jobId: job.id,
      voidInvoiceId: voidInvoice.id,
    },
    cleanup,
  }
}

/**
 * The harness's central trick, preserved: write a DISTINCT sentinel as the
 * low-privilege role, then read the row back with the SERVICE client to see
 * whether it actually landed. A plain "did the call error?" check produces false
 * passes, because RLS silently filters an UPDATE to zero rows without erroring.
 */
export async function updateProbe(args: {
  svc: SupabaseClient
  client: SupabaseClient
  table: string
  id: string
  column: string
  sentinel: string | number
}): Promise<{ applied: boolean; code: string | null }> {
  const { svc, client, table, id, column, sentinel } = args
  const { error } = await client
    .from(table)
    .update({ [column]: sentinel })
    .eq('id', id)
    .select()

  let applied = false
  if (!error) {
    const { data } = await svc.from(table).select(column).eq('id', id).single()
    // `select(column)` is a runtime-dynamic column, so the client's inferred row
    // type is not useful here; widen through unknown deliberately.
    const row = data as unknown as Record<string, unknown> | null
    applied = !!row && String(row[column]) === String(sentinel)
  }
  return { applied, code: error?.code ?? null }
}
