import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import {
  importChunkSchema,
  parseImportRow,
  type ContactImportRow,
  type ImportRowResult,
} from '@/lib/validations/customer-import'

/**
 * Map a Postgres/PostgREST insert error to a safe, user-facing reason without
 * leaking internal schema details (column/constraint names) to the client.
 */
function safeImportError(err: { code?: string }): string {
  switch (err.code) {
    case '23505':
      return 'Duplicate contact'
    case '23514':
      return 'A value failed a validation rule'
    case '23502':
      return 'A required field was missing'
    case '22001':
      return 'A value was too long'
    default:
      return 'Could not import this row'
  }
}

/**
 * POST /api/customers/import
 * Bulk-import a chunk of contacts from a CSV (EX1). The client parses/maps the
 * CSV and posts field-keyed rows in chunks; this endpoint validates each row,
 * skips rows whose email already exists (in the org or earlier in the same
 * batch), and bulk-inserts the rest. Returns a per-row result aligned to the
 * input order so the client can tally imported / skipped / failed.
 */
export const POST = createApiHandler(
  { allowedRoles: ROLES.TENANT_WRITE, bodySchema: importChunkSchema },
  async (_request, context, body) => {
    const { contacts } = body
    const orgId = context.profile.organization_id
    const results: ImportRowResult[] = new Array(contacts.length)

    // 1. Validate every row; collect the ones that parse as insert candidates.
    interface Candidate {
      index: number
      row: ContactImportRow
    }
    const candidates: Candidate[] = []
    for (let i = 0; i < contacts.length; i++) {
      const parsed = parseImportRow(contacts[i])
      if (!parsed.success) {
        results[i] = { status: 'error', reason: parsed.error.issues[0]?.message || 'Invalid row' }
        continue
      }
      candidates.push({ index: i, row: parsed.data })
    }

    // 2. Dedup by email — against existing org contacts and within this batch.
    const emails = Array.from(
      new Set(candidates.map((c) => c.row.email).filter((e): e is string => !!e)),
    )
    const existing = new Set<string>()
    if (emails.length > 0) {
      const { data: rows } = await context.supabase
        .from('customers')
        .select('email')
        .eq('organization_id', orgId)
        .in('email', emails)
      for (const r of rows || []) {
        if (r.email) existing.add(r.email.toLowerCase())
      }
    }

    const seen = new Set<string>()
    const toInsert: Candidate[] = []
    for (const c of candidates) {
      const email = c.row.email
      if (email) {
        if (existing.has(email) || seen.has(email)) {
          results[c.index] = { status: 'skipped', reason: 'Duplicate email' }
          continue
        }
        seen.add(email)
      }
      toInsert.push(c)
    }

    // 3. Build the insert payloads. name is computed from first + last (the
    //    customers.name column is always set from the parts), org + defaults
    //    are stamped server-side.
    const buildRow = (row: Candidate['row']) => ({
      organization_id: orgId,
      created_by: context.user.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      first_name: row.first_name,
      last_name: row.last_name ?? null,
      email: row.email ?? null,
      mobile_phone: row.mobile_phone ?? null,
      office_phone: row.office_phone ?? null,
      title: row.title ?? null,
      company_name: row.company_name ?? null,
      contact_type: row.contact_type,
      address_line1: row.address_line1 ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      zip: row.zip ?? null,
      notes: row.notes ?? null,
      status: 'inquiry' as const,
    })

    if (toInsert.length > 0) {
      const { error } = await context.supabase
        .from('customers')
        .insert(toInsert.map((c) => buildRow(c.row)))

      if (error) {
        // A single bad row fails the whole bulk insert, so fall back to
        // per-row inserts to isolate the failure and still import the rest.
        for (const c of toInsert) {
          const { error: rowErr } = await context.supabase
            .from('customers')
            .insert(buildRow(c.row))
          results[c.index] = rowErr
            ? { status: 'error', reason: safeImportError(rowErr) }
            : { status: 'imported' }
        }
      } else {
        for (const c of toInsert) results[c.index] = { status: 'imported' }
      }
    }

    const imported = results.filter((r) => r.status === 'imported').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const failed = results.filter((r) => r.status === 'error').length

    context.log.info(
      { imported, skipped, failed, chunkSize: contacts.length },
      'Contact CSV import chunk processed',
    )

    return NextResponse.json({ results, imported, skipped, failed })
  },
)
