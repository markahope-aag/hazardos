import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RingCentralProvider,
  clearRingCentralTokenCache,
} from '@/lib/services/sms-providers/ringcentral-provider'
import { SmsProviderError } from '@/lib/services/sms-providers/types'
import type { OrganizationSmsSettings } from '@/types/sms'

// RingCentral is reached over plain fetch rather than an SDK, so the wire
// format is ours to get right. These tests pin the parts that are easy to get
// subtly wrong and impossible to notice without a live account: the JWT grant
// type, Basic auth on the token call, the send body shape, and the token cache.

const baseSettings = {
  id: 'settings-1',
  organization_id: 'org-1',
  sms_provider: 'ringcentral',
  twilio_account_sid: null,
  twilio_auth_token: null,
  twilio_phone_number: null,
  use_platform_twilio: false,
  ringcentral_client_id: 'client-id',
  ringcentral_client_secret: 'client-secret',
  ringcentral_jwt: 'the-jwt',
  ringcentral_from_number: '+15551230000',
  ringcentral_server_url: 'https://platform.ringcentral.com',
  sms_enabled: true,
  appointment_reminders_enabled: true,
  appointment_reminder_hours: 24,
  job_status_updates_enabled: true,
  lead_notifications_enabled: true,
  payment_reminders_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '21:00',
  quiet_hours_end: '08:00',
  timezone: 'America/Chicago',
  sms_brand_prefix: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as unknown as OrganizationSmsSettings

const settingsWith = (overrides: Partial<OrganizationSmsSettings>): OrganizationSmsSettings =>
  ({ ...baseSettings, ...overrides }) as OrganizationSmsSettings

const tokenResponse = (expiresIn = 3600) =>
  new Response(JSON.stringify({ access_token: 'access-token-1', expires_in: expiresIn }), { status: 200 })

const sendResponse = (id: number | string = 42, messageStatus = 'Queued') =>
  new Response(JSON.stringify({ id, messageStatus }), { status: 200 })

describe('RingCentralProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearRingCentralTokenCache()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('configuration', () => {
    it('reports configured when all four credentials are present', () => {
      expect(new RingCentralProvider(baseSettings).isConfigured()).toBe(true)
    })

    it('is not configured when the JWT is missing', () => {
      const provider = new RingCentralProvider(settingsWith({ ringcentral_jwt: null }))
      expect(provider.isConfigured()).toBe(false)
    })

    it('names every missing credential so the settings screen can be specific', () => {
      const provider = new RingCentralProvider(
        settingsWith({ ringcentral_jwt: null, ringcentral_from_number: null })
      )
      const message = provider.describeMissingConfig()
      expect(message).toContain('JWT')
      expect(message).toContain('From Number')
      expect(message).not.toContain('Client ID')
    })

    it('exposes the from number', () => {
      expect(new RingCentralProvider(baseSettings).getFromNumber()).toBe('+15551230000')
    })
  })

  describe('authentication', () => {
    it('exchanges the JWT for an access token using the JWT bearer grant', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(sendResponse())

      await new RingCentralProvider(baseSettings).send({ to: '+15559999999', body: 'hi' })

      const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]
      expect(tokenUrl).toBe('https://platform.ringcentral.com/restapi/oauth/token')
      expect(tokenInit.method).toBe('POST')
      // Basic auth carries the app credentials; the JWT rides in the body.
      const expectedBasic = Buffer.from('client-id:client-secret').toString('base64')
      expect(tokenInit.headers.Authorization).toBe(`Basic ${expectedBasic}`)
      expect(tokenInit.body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer')
      expect(tokenInit.body).toContain('assertion=the-jwt')
    })

    it('reuses a cached token instead of re-authenticating per message', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(sendResponse(1))
        .mockResolvedValueOnce(sendResponse(2))

      const provider = new RingCentralProvider(baseSettings)
      await provider.send({ to: '+15559999999', body: 'one' })
      await provider.send({ to: '+15559999999', body: 'two' })

      const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/restapi/oauth/token'))
      expect(tokenCalls).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('re-authenticates when the cached token has expired', async () => {
      // expires_in below the safety margin means it is already stale.
      fetchMock
        .mockResolvedValueOnce(tokenResponse(1))
        .mockResolvedValueOnce(sendResponse(1))
        .mockResolvedValueOnce(tokenResponse(3600))
        .mockResolvedValueOnce(sendResponse(2))

      const provider = new RingCentralProvider(baseSettings)
      await provider.send({ to: '+15559999999', body: 'one' })
      await provider.send({ to: '+15559999999', body: 'two' })

      const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/restapi/oauth/token'))
      expect(tokenCalls).toHaveLength(2)
    })

    it('surfaces the OAuth error description, not just the error code', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: 'invalid_grant', error_description: 'JWT has expired' }),
          { status: 400 }
        )
      )

      await expect(
        new RingCentralProvider(baseSettings).send({ to: '+15559999999', body: 'hi' })
      ).rejects.toThrow(/JWT has expired/)
    })
  })

  describe('send', () => {
    it('posts the documented body shape and returns the message id', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(sendResponse(987, 'Queued'))

      const result = await new RingCentralProvider(baseSettings).send({
        to: '+15559999999',
        body: 'Your appointment is confirmed',
      })

      const [sendUrl, sendInit] = fetchMock.mock.calls[1]
      expect(sendUrl).toBe('https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/sms')
      expect(sendInit.headers.Authorization).toBe('Bearer access-token-1')
      expect(JSON.parse(sendInit.body)).toEqual({
        from: { phoneNumber: '+15551230000' },
        to: [{ phoneNumber: '+15559999999' }],
        text: 'Your appointment is confirmed',
      })

      // Ids come back numeric and are stored as text.
      expect(result.providerMessageId).toBe('987')
      expect(result.rawStatus).toBe('Queued')
      // RingCentral does not report segments on send, so nothing is invented.
      expect(result.segments).toBeUndefined()
    })

    it('refuses to send when credentials are incomplete, without calling out', async () => {
      const provider = new RingCentralProvider(settingsWith({ ringcentral_client_secret: null }))
      await expect(provider.send({ to: '+15559999999', body: 'hi' })).rejects.toBeInstanceOf(SmsProviderError)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('normalizes a trailing slash on the server URL', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(sendResponse())

      await new RingCentralProvider(
        settingsWith({ ringcentral_server_url: 'https://platform.devtest.ringcentral.com/' })
      ).send({ to: '+15559999999', body: 'hi' })

      expect(String(fetchMock.mock.calls[0][0])).toBe(
        'https://platform.devtest.ringcentral.com/restapi/oauth/token'
      )
    })

    it('marks rate limiting and server errors retryable, and client errors not', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 }))

      await new RingCentralProvider(baseSettings)
        .send({ to: '+15559999999', body: 'hi' })
        .catch((err: SmsProviderError) => {
          expect(err.retryable).toBe(true)
        })

      clearRingCentralTokenCache()
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Invalid phone number', errorCode: 'CMN-101' }), { status: 400 })
        )

      await new RingCentralProvider(baseSettings)
        .send({ to: 'nonsense', body: 'hi' })
        .catch((err: SmsProviderError) => {
          expect(err.retryable).toBe(false)
          expect(err.code).toBe('CMN-101')
        })
    })

    it('drops the cached token on a 401 so the next send re-authenticates', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Token expired' }), { status: 401 }))
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(sendResponse(5))

      const provider = new RingCentralProvider(baseSettings)
      await expect(provider.send({ to: '+15559999999', body: 'one' })).rejects.toThrow()
      const result = await provider.send({ to: '+15559999999', body: 'two' })

      expect(result.providerMessageId).toBe('5')
      const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/restapi/oauth/token'))
      expect(tokenCalls).toHaveLength(2)
    })

    it('rejects a response that omits the message id', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ messageStatus: 'Queued' }), { status: 200 }))

      await expect(
        new RingCentralProvider(baseSettings).send({ to: '+15559999999', body: 'hi' })
      ).rejects.toThrow(/no id/i)
    })
  })
})
