import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  resetSecretKeyCache,
} from '@/lib/utils/secret-crypto'

const TEST_KEY = randomBytes(32).toString('base64')

describe('secret-crypto', () => {
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = TEST_KEY
    resetSecretKeyCache()
  })

  afterEach(() => {
    delete process.env.SECRETS_ENCRYPTION_KEY
    resetSecretKeyCache()
  })

  describe('round trip', () => {
    it('decrypts back to the original plaintext', () => {
      const secret = 'ya29.a0AfH6SMB-example-oauth-access-token'

      const encrypted = encryptSecret(secret)

      expect(encrypted).not.toBe(secret)
      expect(decryptSecret(encrypted)).toBe(secret)
    })

    it('preserves unicode and long values', () => {
      const secret = 'tøken-✓-' + 'x'.repeat(4000)

      expect(decryptSecret(encryptSecret(secret))).toBe(secret)
    })

    it('produces a different ciphertext each time (random IV)', () => {
      const secret = 'same-input'

      const a = encryptSecret(secret)
      const b = encryptSecret(secret)

      expect(a).not.toBe(b)
      expect(decryptSecret(a)).toBe(secret)
      expect(decryptSecret(b)).toBe(secret)
    })
  })

  describe('null and empty handling', () => {
    it('returns null for nullish or empty input', () => {
      expect(encryptSecret(null)).toBeNull()
      expect(encryptSecret(undefined)).toBeNull()
      expect(encryptSecret('')).toBeNull()
      expect(decryptSecret(null)).toBeNull()
      expect(decryptSecret(undefined)).toBeNull()
      expect(decryptSecret('')).toBeNull()
    })
  })

  describe('legacy plaintext passthrough', () => {
    // This is what lets the code deploy before the backfill migration runs.
    it('returns unprefixed values unchanged', () => {
      expect(decryptSecret('legacy-plaintext-token')).toBe('legacy-plaintext-token')
    })

    it('does not require the key to read legacy plaintext', () => {
      delete process.env.SECRETS_ENCRYPTION_KEY
      resetSecretKeyCache()

      expect(decryptSecret('legacy-plaintext-token')).toBe('legacy-plaintext-token')
    })
  })

  describe('idempotence', () => {
    it('does not double-encrypt an already-encrypted value', () => {
      const once = encryptSecret('token')

      const twice = encryptSecret(once)

      expect(twice).toBe(once)
      expect(decryptSecret(twice)).toBe('token')
    })
  })

  describe('isEncrypted', () => {
    it('distinguishes ciphertext from plaintext', () => {
      expect(isEncrypted(encryptSecret('token'))).toBe(true)
      expect(isEncrypted('plaintext')).toBe(false)
      expect(isEncrypted(null)).toBe(false)
    })
  })

  describe('integrity', () => {
    it('throws when the ciphertext has been tampered with', () => {
      const encrypted = encryptSecret('token')!
      // Flip the last base64 character to corrupt the GCM auth tag/ciphertext.
      const lastChar = encrypted.slice(-1)
      const tampered = encrypted.slice(0, -1) + (lastChar === 'A' ? 'B' : 'A')

      expect(() => decryptSecret(tampered)).toThrow()
    })

    it('throws when the payload is too short to contain iv + tag', () => {
      expect(() => decryptSecret('enc:v1:' + Buffer.from('short').toString('base64'))).toThrow(
        /malformed/i,
      )
    })

    it('throws a clear error when the key is missing but ciphertext is present', () => {
      const encrypted = encryptSecret('token')!
      delete process.env.SECRETS_ENCRYPTION_KEY
      resetSecretKeyCache()

      expect(() => decryptSecret(encrypted)).toThrow(/SECRETS_ENCRYPTION_KEY is not set/)
    })

    it('rejects a key that is not 32 bytes', () => {
      process.env.SECRETS_ENCRYPTION_KEY = Buffer.from('too-short').toString('base64')
      resetSecretKeyCache()

      expect(() => encryptSecret('token')).toThrow(/must decode to 32 bytes/)
    })
  })
})
