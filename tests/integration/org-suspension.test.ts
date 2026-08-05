import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * Suspending an organisation must actually revoke access.
 *
 * `organizations.status` accepted 'suspended' and 'cancelled' for months while
 * nothing read it, so freezing an account was a no-op and the only way to stop
 * an org was to delete it. Gating `get_user_organization_id()` covers reads and
 * writes at once, because nearly every policy is written against that function.
 */
describe('organisation suspension', () => {
  let t: Tenant

  beforeAll(async () => {
    t = await createTenant('susp')
  })

  afterAll(async () => {
    // Restore before teardown so cleanup is not fighting its own policy change.
    await t?.svc.from('organizations').update({ status: 'active' }).eq('id', t.orgId)
    await t?.cleanup()
  })

  test('CONTROL: an active organisation can read its own data', async () => {
    const { data, error } = await t.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', t.fixtures.customerId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(1)
  })

  test('suspending the organisation revokes reads', async () => {
    await t.svc.from('organizations').update({ status: 'suspended' }).eq('id', t.orgId)

    const { data } = await t.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', t.fixtures.customerId)
    expect(data ?? [], 'a suspended organisation could still read its contacts').toHaveLength(0)
  })

  test('suspending the organisation revokes writes', async () => {
    await t.svc.from('organizations').update({ status: 'suspended' }).eq('id', t.orgId)

    await t.roles.admin.client
      .from('customers')
      .update({ city: 'ShouldNotApply' })
      .eq('id', t.fixtures.customerId)

    // Service read-back is the arbiter: a filtered-to-zero update does not error.
    const { data } = await t.svc
      .from('customers')
      .select('city')
      .eq('id', t.fixtures.customerId)
      .single()
    expect(data?.city).not.toBe('ShouldNotApply')
  })

  test('reactivating restores access', async () => {
    // Without this, the two tests above would pass on an org that had simply
    // become permanently unreadable for some unrelated reason.
    await t.svc.from('organizations').update({ status: 'suspended' }).eq('id', t.orgId)
    await t.svc.from('organizations').update({ status: 'active' }).eq('id', t.orgId)

    const { data, error } = await t.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', t.fixtures.customerId)
    expect(error).toBeNull()
    expect(data ?? [], 'access did not come back after reactivation').toHaveLength(1)
  })

  test('a trial organisation keeps access', async () => {
    // AHS-Test runs on 'trial'; gating must not lock out trials.
    await t.svc.from('organizations').update({ status: 'trial' }).eq('id', t.orgId)

    const { data, error } = await t.roles.tenant_owner.client
      .from('customers')
      .select('id')
      .eq('id', t.fixtures.customerId)
    expect(error).toBeNull()
    expect(data ?? [], 'a trial organisation lost access').toHaveLength(1)
  })
})
