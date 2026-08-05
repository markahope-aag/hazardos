import { afterAll, describe, expect, test } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serviceClient, stack } from './helpers/stack'

/**
 * Self-serve signup and onboarding: the path a paying customer walks on day one,
 * and until now the only major flow with no coverage at all.
 *
 * That gap was not theoretical. Four accounts were found in production sitting
 * half-onboarded — a login, a profile, and no organisation — two of them the
 * first client's own staff, in that state for three months. A user in that
 * position can authenticate and then see nothing, because
 * get_user_organization_id() returns NULL and every policy denies.
 *
 * Every org and user created here is torn down in afterAll.
 */
describe('self-serve signup and onboarding', () => {
  const createdUsers: string[] = []
  const createdOrgs: string[] = []
  const svc = serviceClient()

  afterAll(async () => {
    for (const id of createdOrgs) await svc.from('organizations').delete().eq('id', id)
    for (const id of createdUsers) await svc.auth.admin.deleteUser(id)
  })

  /** Signs up the way the signup form does, then returns that user's session. */
  async function signUpFresh(): Promise<{ client: SupabaseClient; userId: string; email: string }> {
    const s = stack()
    const email = `onboard-${randomBytes(4).toString('hex')}@example.test`
    const password = 'Onboarding-2026!'
    const client = createClient(s.url, s.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw new Error(`signUp failed: ${error.message}`)
    const userId = data.user!.id
    createdUsers.push(userId)

    // Local stacks may not auto-confirm; make the session usable either way.
    await svc.auth.admin.updateUserById(userId, { email_confirm: true })
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password })
    if (signInErr) throw new Error(`sign-in after signUp failed: ${signInErr.message}`)

    return { client, userId, email }
  }

  test('signing up creates a profile with no organisation', async () => {
    // handle_new_user() on auth.users does this. When that trigger went missing
    // from the baseline, signup silently produced no profile at all.
    const { userId, email } = await signUpFresh()

    const { data: profile, error } = await svc
      .from('profiles')
      .select('id, email, organization_id, role')
      .eq('id', userId)
      .single()

    expect(error, 'no profile row was created for a new signup').toBeNull()
    expect(profile?.email).toBe(email)
    expect(profile?.organization_id, 'a fresh signup should have no organisation yet').toBeNull()
  })

  test('a user with no organisation can see nothing until they onboard', async () => {
    // This is exactly the state the four stranded production accounts were in.
    const { client } = await signUpFresh()
    const { data } = await client.from('customers').select('id').limit(5)
    expect(data ?? []).toHaveLength(0)
  })

  test('onboarding creates the organisation and promotes the user to owner', async () => {
    const { client, userId } = await signUpFresh()

    const { data: org, error } = await client.rpc('create_organization_for_onboarding', {
      p_org: { name: `Onboarded ${randomBytes(3).toString('hex')}`, email: 'owner@example.test' },
    })
    expect(error, `onboarding RPC failed: ${error?.message}`).toBeNull()
    expect(org?.id).toBeTruthy()
    createdOrgs.push(org.id as string)

    const { data: profile } = await svc
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single()

    expect(profile?.organization_id, 'profile was not linked to the new organisation').toBe(org.id)
    expect(profile?.role, 'the creator should own the organisation they made').toBe('tenant_owner')
  })

  test('CONTROL: after onboarding the user can actually use the app', async () => {
    // Without this, the test above could pass while leaving the user in the same
    // can-authenticate-but-see-nothing state the whole suite exists to catch.
    const { client, userId } = await signUpFresh()

    const { data: org } = await client.rpc('create_organization_for_onboarding', {
      p_org: { name: `Usable ${randomBytes(3).toString('hex')}` },
    })
    createdOrgs.push(org.id as string)

    // A write, then a read back through the user's own session.
    const { error: insErr } = await client.from('customers').insert({
      organization_id: org.id,
      first_name: 'First',
      last_name: 'Contact',
      name: 'First Contact',
      contact_type: 'residential',
      status: 'prospect',
    })
    expect(insErr, `a newly onboarded owner could not create a contact: ${insErr?.message}`).toBeNull()

    const { data: rows } = await client.from('customers').select('id, organization_id')
    expect(rows ?? [], 'the owner cannot see the contact they just created').toHaveLength(1)
    expect(rows![0].organization_id).toBe(org.id)

    // And the org seed triggers ran for them.
    const { data: stages } = await svc
      .from('pipeline_stages')
      .select('id')
      .eq('organization_id', org.id)
    expect(stages ?? [], 'default pipeline stages were not seeded').not.toHaveLength(0)

    expect(userId).toBeTruthy()
  })

  test('a user cannot create a second organisation', async () => {
    const { client } = await signUpFresh()

    const { data: first } = await client.rpc('create_organization_for_onboarding', {
      p_org: { name: `First ${randomBytes(3).toString('hex')}` },
    })
    createdOrgs.push(first.id as string)

    const { error } = await client.rpc('create_organization_for_onboarding', {
      p_org: { name: `Second ${randomBytes(3).toString('hex')}` },
    })
    expect(error, 'a user was allowed to create a second organisation').not.toBeNull()
  })

  test('a user with no organisation cannot claim an EXISTING one as owner', async () => {
    // The abuse case the onboarding exemption has to exclude. Without the
    // "organisation must be empty" condition, any account with no organisation
    // could attach itself to a live tenant as its owner.
    const victim = await signUpFresh()
    const { data: victimOrg } = await victim.client.rpc('create_organization_for_onboarding', {
      p_org: { name: `Victim ${randomBytes(3).toString('hex')}` },
    })
    createdOrgs.push(victimOrg.id as string)

    const attacker = await signUpFresh()
    await attacker.client
      .from('profiles')
      .update({ organization_id: victimOrg.id, role: 'tenant_owner' })
      .eq('id', attacker.userId)

    // Service read-back is the arbiter: RLS filtering an update to zero rows
    // does not raise, so a passing error check alone would prove nothing.
    const { data: after } = await svc
      .from('profiles')
      .select('organization_id, role')
      .eq('id', attacker.userId)
      .single()

    expect(after?.organization_id, 'an outsider joined an existing organisation').toBeNull()
    expect(after?.role).not.toBe('tenant_owner')
  })

  test('a user still cannot promote themselves inside their own organisation', async () => {
    // The original guard must survive the exemption.
    const { client, userId } = await signUpFresh()
    const { data: org } = await client.rpc('create_organization_for_onboarding', {
      p_org: { name: `Own ${randomBytes(3).toString('hex')}` },
    })
    createdOrgs.push(org.id as string)

    await svc.from('profiles').update({ role: 'viewer' }).eq('id', userId)
    await client.from('profiles').update({ role: 'tenant_owner' }).eq('id', userId)

    const { data: after } = await svc.from('profiles').select('role').eq('id', userId).single()
    expect(after?.role, 'a viewer promoted themselves to owner').toBe('viewer')
  })

  test('onboarding is rejected without a session', async () => {
    const s = stack()
    const anon = createClient(s.url, s.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await anon.rpc('create_organization_for_onboarding', {
      p_org: { name: 'Anonymous Org' },
    })
    expect(error, 'an unauthenticated caller created an organisation').not.toBeNull()
  })
})
