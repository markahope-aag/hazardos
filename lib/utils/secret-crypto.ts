import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Envelope encryption for third-party secrets at rest (OAuth access/refresh
 * tokens, Twilio credentials, webhook signing secrets, lead API keys).
 *
 * These columns were previously plaintext and readable by every member of the
 * owning organization. Encrypting them means a row leak (or an over-broad RLS
 * policy) no longer hands over usable credentials.
 *
 * Format: `enc:v1:<base64( iv(12) || authTag(16) || ciphertext )>`
 *
 * The `enc:v1:` prefix is load-bearing. It lets `decryptSecret` distinguish
 * ciphertext from values written before this change, so the code can be
 * deployed BEFORE the backfill migration runs without breaking every
 * integration: unprefixed values are passed through as legacy plaintext.
 * Once the backfill has run everywhere, the passthrough is dead weight but
 * harmless — a real secret never starts with `enc:v1:`.
 *
 * Key: SECRETS_ENCRYPTION_KEY, a base64-encoded 32 random bytes.
 * Generate with:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const PREFIX = 'enc:v1:'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // GCM standard nonce length
const TAG_BYTES = 16
const KEY_BYTES = 32

let cachedKey: Buffer | null = null

/**
 * Resolve the master key lazily so importing this module never throws — only
 * an actual encrypt (or a decrypt of real ciphertext) requires the key.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.SECRETS_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY is not set. Third-party secrets cannot be encrypted or decrypted. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    )
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SECRETS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        'It should be base64 of 32 random bytes.',
    )
  }

  cachedKey = key
  return cachedKey
}

/** Test seam — drop the memoized key after changing the env var. */
export function resetSecretKeyCache(): void {
  cachedKey = null
}

/** True when the value is already ciphertext produced by encryptSecret. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Encrypt a secret for storage. Null/undefined/empty pass through unchanged so
 * callers can hand over optional columns without branching. Already-encrypted
 * values are returned as-is, making this safe to apply more than once.
 */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  if (isEncrypted(plaintext)) return plaintext

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

/**
 * Decrypt a stored secret. Values without the `enc:v1:` prefix are returned
 * unchanged — they predate encryption (see the backfill note above).
 *
 * Throws if the payload is prefixed but corrupt or tampered with: GCM
 * authentication failing is a real integrity signal, not something to swallow.
 */
export function decryptSecret(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (!isEncrypted(value)) return value // legacy plaintext

  const payload = Buffer.from(value.slice(PREFIX.length), 'base64')
  if (payload.length < IV_BYTES + TAG_BYTES) {
    throw new Error('Encrypted secret is malformed: payload too short')
  }

  const iv = payload.subarray(0, IV_BYTES)
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES)

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
