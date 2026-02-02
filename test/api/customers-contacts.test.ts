import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/customers/[id]/contacts/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/contacts-service', () => ({
  ContactsService: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { ContactsService } from '@/lib/services/contacts-service'

const CUSTOMER_UUID = '550e8400-e29b-41d4-a716-446655440001'

describe('Customer Contacts API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers/[id]/contacts', () => {
    it('should return list of contacts for a customer', async () => {
      setupAuthenticatedUser()

      const mockContacts = [
        { id: 'contact-1', customer_id: CUSTOMER_UUID, name: 'John Doe', email: 'john@example.com', is_primary: true },
        { id: 'contact-2', customer_id: CUSTOMER_UUID, name: 'Jane Smith', email: 'jane@example.com', is_primary: false },
      ]
      vi.mocked(ContactsService.list).mockResolvedValue(mockContacts)

      const request = new NextRequest(`http://localhost:3000/api/customers/${CUSTOMER_UUID}/contacts`)
      const response = await GET(request, { params: Promise.resolve({ id: CUSTOMER_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockContacts)
      expect(ContactsService.list).toHaveBeenCalledWith(CUSTOMER_UUID)
    })

    it('should return empty array when customer has no contacts', async () => {
      setupAuthenticatedUser()

      vi.mocked(ContactsService.list).mockResolvedValue([])

      const request = new NextRequest(`http://localhost:3000/api/customers/${CUSTOMER_UUID}/contacts`)
      const response = await GET(request, { params: Promise.resolve({ id: CUSTOMER_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/customers/[id]/contacts', () => {
    it('should create a new contact for a customer', async () => {
      setupAuthenticatedUser()

      const newContact = {
        id: 'contact-new',
        customer_id: CUSTOMER_UUID,
        name: 'New Contact',
        email: 'new@example.com',
        phone: '555-1234',
        is_primary: false,
      }
      vi.mocked(ContactsService.create).mockResolvedValue(newContact)

      const request = new NextRequest(`http://localhost:3000/api/customers/${CUSTOMER_UUID}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Contact',
          email: 'new@example.com',
          phone: '555-1234',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: CUSTOMER_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(newContact)
      expect(ContactsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: CUSTOMER_UUID,
          name: 'New Contact',
          email: 'new@example.com',
          phone: '555-1234',
        })
      )
    })

    it('should create primary contact', async () => {
      setupAuthenticatedUser()

      const primaryContact = {
        id: 'contact-primary',
        customer_id: CUSTOMER_UUID,
        name: 'Primary Contact',
        email: 'primary@example.com',
        is_primary: true,
      }
      vi.mocked(ContactsService.create).mockResolvedValue(primaryContact)

      const request = new NextRequest(`http://localhost:3000/api/customers/${CUSTOMER_UUID}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Primary Contact',
          email: 'primary@example.com',
          is_primary: true,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: CUSTOMER_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.is_primary).toBe(true)
    })

    it('should create contact with full details', async () => {
      setupAuthenticatedUser()

      const fullContact = {
        id: 'contact-full',
        customer_id: CUSTOMER_UUID,
        name: 'Full Contact',
        title: 'Property Manager',
        email: 'full@example.com',
        phone: '555-1234',
        mobile: '555-5678',
        role: 'billing',
        preferred_contact_method: 'email',
        notes: 'Prefers morning calls',
      }
      vi.mocked(ContactsService.create).mockResolvedValue(fullContact)

      const request = new NextRequest(`http://localhost:3000/api/customers/${CUSTOMER_UUID}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Full Contact',
          title: 'Property Manager',
          email: 'full@example.com',
          phone: '555-1234',
          mobile: '555-5678',
          role: 'billing',
          preferred_contact_method: 'email',
          notes: 'Prefers morning calls',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: CUSTOMER_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(fullContact)
    })
  })
})
