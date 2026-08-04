import { describe, expect, test } from 'vitest'
import { dbQuery } from './helpers/stack'

/**
 * Properties of the schema itself, checked against pg_catalog.
 *
 * None of this is reachable through PostgREST — it deliberately does not expose
 * pg_catalog — so these run over a direct connection. Ported from SEC14 in
 * .qa-harness/50-sec-extra.mjs, plus regression guards for defects found while
 * baselining the schema.
 */
describe('schema hardening', () => {
  test('every SECURITY DEFINER function pins its search_path', async () => {
    // A SECURITY DEFINER function runs as its owner. Without a pinned
    // search_path, a caller who can create objects in an earlier schema can
    // shadow a table or operator the body references and have it executed with
    // the owner's rights.
    const rows = await dbQuery<{ proname: string; config: string[] | null }>(`
      select p.proname, p.proconfig as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
      order by p.proname
    `)

    expect(rows.length, 'no SECURITY DEFINER functions found at all').toBeGreaterThan(0)

    const unpinned = rows
      .filter((r) => !(r.config ?? []).some((c) => c.startsWith('search_path=')))
      .map((r) => r.proname)

    expect(unpinned, `unpinned search_path on: ${unpinned.join(', ')}`).toHaveLength(0)
  })

  test('no invalid indexes exist', async () => {
    // idx_customers_search sat invalid in production for an unknown period: the
    // debris of a failed CREATE INDEX CONCURRENTLY. Postgres will not use an
    // invalid index for scans but still maintains it on every write, so the
    // symptom is silent — queries quietly go back to sequential scans.
    const rows = await dbQuery<{ index_name: string; table_name: string }>(`
      select c.relname as index_name, t.relname as table_name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not i.indisvalid
      order by c.relname
    `)

    const names = rows.map((r) => `${r.table_name}.${r.index_name}`)
    expect(names, `invalid indexes: ${names.join(', ')}`).toHaveLength(0)
  })

  test('row level security is enabled on every public table', async () => {
    const rows = await dbQuery<{ relname: string }>(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by c.relname
    `)

    const names = rows.map((r) => r.relname)
    expect(names, `tables without RLS: ${names.join(', ')}`).toHaveLength(0)
  })

  test('the auth trigger that creates profiles exists', async () => {
    // The baseline dump covers the public schema only, so this trigger went
    // missing once already. Without it, signup creates no profiles row and every
    // new user lands with no organisation and no role.
    const rows = await dbQuery<{ tgname: string }>(`
      select t.tgname
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal
    `)
    expect(rows.map((r) => r.tgname)).toContain('on_auth_user_created')
  })
})
