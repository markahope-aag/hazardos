import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { dbQuery } from './helpers/stack'
import { createTenant, type Tenant } from './helpers/fixtures'

/**
 * Atomicity of `create_estimate_revision`, plus the org and role rules around
 * it.
 *
 * The interesting claim is not that revision works — the code it replaced did
 * that too. It is that a failure part-way through leaves nothing behind. The
 * previous implementation inserted the estimate, inserted the line items, and
 * deleted the estimate by hand if the second step failed; when that
 * compensating delete failed in turn, the result was a revision showing a
 * total with no line items behind it.
 *
 * That can only be tested against a real Postgres. A mocked client has no
 * transaction to roll back, so the whole file would pass vacuously in the unit
 * suite.
 */
describe('create_estimate_revision is atomic', () => {
  let t: Tenant
  let parentId: string

  const revisionCount = async () =>
    Number(
      (
        await dbQuery<{ n: string }>(
          'select count(*) n from estimates where parent_estimate_id = $1',
          [parentId],
        )
      )[0].n,
    )

  const lineItemCount = async (estimateId: string) =>
    Number(
      (
        await dbQuery<{ n: string }>(
          'select count(*) n from estimate_line_items where estimate_id = $1',
          [estimateId],
        )
      )[0].n,
    )

  beforeAll(async () => {
    t = await createTenant('estrev')

    const [parent] = await dbQuery<{ id: string }>(
      `insert into estimates (organization_id, estimate_number, status, project_name, created_by)
       values ($1, 'EST-ITREV-' || substr(md5(random()::text), 1, 8), 'sent', 'revision probe', $2)
       returning id`,
      [t.orgId, t.roles.tenant_owner.userId],
    )
    parentId = parent.id

    await dbQuery(
      `insert into estimate_line_items
         (estimate_id, item_type, description, quantity, unit_price, total_price, sort_order)
       select $1, 'labor', 'item ' || g, 1, 100 * g, 100 * g, g from generate_series(1, 3) g`,
      [parentId],
    )
  })

  afterAll(async () => {
    if (parentId) {
      await dbQuery(
        `delete from estimates
          where estimate_root_id in (select estimate_root_id from estimates where id = $1)`,
        [parentId],
      )
    }
    await t?.cleanup()
  })

  test('CONTROL: a revision copies every line item and chains to its parent', async () => {
    // Without this, the failure test below could pass simply because the
    // function never manages to insert anything under any circumstances.
    const [row] = await dbQuery<{ create_estimate_revision: string }>(
      'select create_estimate_revision($1, $2, $3, $4, $5)',
      [parentId, t.orgId, t.roles.tenant_owner.userId, 'EST-ITREV-CONTROL', 'control'],
    )
    const revId = row.create_estimate_revision

    expect(await lineItemCount(revId)).toBe(3)

    const [rev] = await dbQuery<{
      version: number
      status: string
      parent_estimate_id: string
      estimate_root_id: string
      revision_notes: string
    }>(
      `select version, status, parent_estimate_id, estimate_root_id, revision_notes
         from estimates where id = $1`,
      [revId],
    )
    expect(rev.version).toBe(2)
    expect(rev.status).toBe('draft')
    expect(rev.parent_estimate_id).toBe(parentId)
    expect(rev.estimate_root_id).not.toBeNull()
    expect(rev.revision_notes).toBe('control')
  })

  test('a failure copying line items leaves no orphan estimate', async () => {
    // Reject every line-item insert, so the function fails after the estimate
    // row already exists — precisely the window the old compensating delete
    // was trying to cover.
    await dbQuery(`
      create or replace function _txn_probe_reject() returns trigger language plpgsql as $$
      begin raise exception 'probe: simulated line item failure'; end $$
    `)
    await dbQuery(
      `create trigger _txn_probe before insert on estimate_line_items
       for each row execute function _txn_probe_reject()`,
    )

    const before = await revisionCount()
    let raised = false
    try {
      await dbQuery('select create_estimate_revision($1, $2, $3, $4, $5)', [
        parentId,
        t.orgId,
        t.roles.tenant_owner.userId,
        'EST-ITREV-FAIL',
        null,
      ])
    } catch {
      raised = true
    } finally {
      await dbQuery('drop trigger if exists _txn_probe on estimate_line_items')
      await dbQuery('drop function if exists _txn_probe_reject()')
    }

    expect(raised).toBe(true)
    expect(await revisionCount()).toBe(before)
  })

  test('a parent in another organisation is not found', async () => {
    await expect(
      dbQuery('select create_estimate_revision($1, $2, $3, $4, $5)', [
        parentId,
        '00000000-0000-0000-0000-000000000000',
        t.roles.tenant_owner.userId,
        'EST-ITREV-OTHERORG',
        null,
      ]),
    ).rejects.toThrow(/not found/i)
  })

  test('anon cannot execute the function', async () => {
    // The grant is the only thing standing between an unauthenticated caller
    // and writing estimate rows, so it is worth asserting rather than assuming.
    const [grant] = await dbQuery<{ has: boolean }>(
      `select has_function_privilege('anon', p.oid, 'EXECUTE') has
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'create_estimate_revision'`,
    )
    expect(grant.has).toBe(false)
  })

  test('the function runs as INVOKER, so RLS still applies', async () => {
    // A SECURITY DEFINER version would bypass every policy on estimates and
    // silently turn this into a cross-tenant write primitive.
    const [fn] = await dbQuery<{ prosecdef: boolean; config: string[] | null }>(
      `select p.prosecdef, p.proconfig config
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'create_estimate_revision'`,
    )
    expect(fn.prosecdef).toBe(false)
    expect(fn.config).toContain('search_path=public')
  })
})
