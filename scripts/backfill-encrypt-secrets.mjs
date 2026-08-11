#!/usr/bin/env node
/**
 * One-time backfill: encrypt third-party secrets that are currently stored as
 * plaintext (audit P1-9 / P1-10).
 *
 * Safe to run repeatedly. `encryptSecret` is idempotent — a value already
 * carrying the `enc:v1:` prefix is returned unchanged — so re-running only
 * picks up rows written before the encrypting code shipped.
 *
 * ORDER OF OPERATIONS
 *   1. Set SECRETS_ENCRYPTION_KEY everywhere the app runs (Vercel + local).
 *   2. Deploy the app code. It reads plaintext AND ciphertext, so nothing
 *      breaks while rows are still plaintext.
 *   3. Run this script once against production.
 *
 * Doing step 3 before step 2 would leave the old code reading ciphertext it
 * cannot decrypt, so the order matters.
 *
 * Usage:
 *   node scripts/backfill-encrypt-secrets.mjs [--dry-run]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           SECRETS_ENCRYPTION_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes } from 'crypto'
import "../_env.mjs";
const DRY_RUN = process.argv.includes('--dry-run')

// Mirrors lib/utils/secret-crypto.ts. Duplicated rather than imported because
// this is a plain .mjs script and the helper is TypeScript with path aliases.
const PREFIX = 'enc:v1:'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function getKey() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY
  if (!raw) throw new Error('SECRETS_ENCRYPTION_KEY is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`SECRETS_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`)
  }
  return key
}

function encryptSecret(plaintext, key) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  if (typeof plaintext === 'string' && plaintext.startsWith(PREFIX)) return plaintext

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

// Every table/column pair holding a third-party secret.
const TARGETS = [
  { table: 'organization_integrations', columns: ['access_token', 'refresh_token'] },
  { table: 'organization_sms_settings', columns: ['twilio_account_sid', 'twilio_auth_token'] },
  { table: 'webhooks', columns: ['secret'] },
  { table: 'lead_webhook_endpoints', columns: ['api_key', 'secret'] },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const key = getKey()
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(DRY_RUN ? '── DRY RUN (no writes) ──' : '── BACKFILL (writing) ──')

  let totalRows = 0
  let totalEncrypted = 0

  for (const { table, columns } of TARGETS) {
    const { data: rows, error } = await supabase.from(table).select(['id', ...columns].join(','))

    if (error) {
      console.error(`  ${table}: FAILED to read — ${error.message}`)
      process.exitCode = 1
      continue
    }

    let changedRows = 0
    let changedCols = 0

    for (const row of rows ?? []) {
      const update = {}
      for (const col of columns) {
        const current = row[col]
        if (current === null || current === undefined || current === '') continue
        if (String(current).startsWith(PREFIX)) continue // already encrypted
        update[col] = encryptSecret(String(current), key)
        changedCols++
      }

      if (Object.keys(update).length === 0) continue
      changedRows++

      if (!DRY_RUN) {
        const { error: updateError } = await supabase.from(table).update(update).eq('id', row.id)
        if (updateError) {
          console.error(`  ${table} ${row.id}: FAILED to write — ${updateError.message}`)
          process.exitCode = 1
        }
      }
    }

    totalRows += rows?.length ?? 0
    totalEncrypted += changedCols
    console.log(
      `  ${table.padEnd(28)} ${String(rows?.length ?? 0).padStart(4)} rows, ` +
        `${changedRows} needing encryption (${changedCols} values)`,
    )
  }

  console.log(`\nScanned ${totalRows} rows; ${totalEncrypted} plaintext values ${DRY_RUN ? 'would be' : ''} encrypted.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
