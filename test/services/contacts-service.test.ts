import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock activity service
const mockActivity = vi.hoisted(() => ({
  created: vi.fn(),
  updated: vi.fn(),
  deleted: vi.fn(),
}))

// Create mock Supabase client with chainable methods
const mockSupabase = vi.hoisted(() => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }

  // Make chain methods return the chain itself by default
  chain.from.mockImplementation(() => chain)
  chain.select.mockImplementation(() => chain)
  chain.insert.mockImplementation(() => chain)
  chain.update.mockImplementation(() => chain)
  chain.delete.mockImplementation(() => chain)
  chain.eq.mockImplementation(() => chain)
  chain.order.mockImplementation(() => chain)

  return chain
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: mockActivity,
}))

import { ContactsService } from '@/lib/services/contacts-service'

describe('ContactsService', () => {
  const mockUser = { id: 'user-1' }
  const mockProfile = { organization_id: 'org-1' }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the chain implementations to default behavior
    const chain = mockSupabase as any
    chain.from.mockImplementation(() => chain)
    chain.select.mockImplementation(() => chain)
    chain.insert.mockImplementation(() => chain)
    chain.update.mockImplementation(() => chain)
    chain.delete.mockImplementation(() => chain)
    chain.eq.mockImplementation(() => chain)
    chain.order.mockImplementation(() => chain)

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('list', () => {
    it('should list all contacts for a customer ordered by primary first', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          customer_id: 'customer-1',
          name: 'John Primary',
          is_primary: true,
          email: 'john@example.com',
        },
        {
          id: 'contact-2',
          customer_id: 'customer-1',
          name: 'Jane Secondary',
          is_primary: false,
          email: 'jane@example.com',
        },
      ]

      // Last .order() in the chain returns the data
      mockSupabase.order.mockImplementationOnce(() => mockSupabase).mockImplementationOnce(() => Promise.resolve({ data: mockContacts, error: null }))

      const result = await ContactsService.list('customer-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('is_primary', { ascending: false })
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(result).toEqual(mockContacts)
    })

    it('should throw when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(ContactsService.list('customer-1')).rejects.toThrow('Unauthorized')
    })

    it('should return empty array when no contacts found', async () => {
      mockSupabase.order.mockImplementationOnce(() => mockSupabase).mockImplementationOnce(() => Promise.resolve({ data: null, error: null }))

      const result = await ContactsService.list('customer-1')

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('should get contact by id', async () => {
      const mockContact = {
        id: 'contact-1',
        customer_id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
      }

      mockSupabase.single.mockResolvedValue({ data: mockContact, error: null })

      const result = await ContactsService.get('contact-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'contact-1')
      expect(result).toEqual(mockContact)
    })

    it('should return null when contact not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await ContactsService.get('non-existent')

      expect(result).toBeNull()
    })

    it('should throw when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(ContactsService.get('contact-1')).rejects.toThrow('Unauthorized')
    })
  })

  describe('create', () => {
    beforeEach(() => {
      mockActivity.created.mockResolvedValue(undefined)
    })

    it('should create contact and make it primary if first contact', async () => {
      const input = {
        customer_id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0100',
        role: 'decision_maker',
      }

      const mockCreatedContact = {
        id: 'contact-1',
        ...input,
        is_primary: true,
      }

      // The create method does:
      // 1. .from('profiles').select().eq().single() -> get profile
      // 2. .from('customer_contacts').select().eq() -> count (no single!)
      // 3. .from('customer_contacts').insert().select().single() -> create contact
      // 4. .from('customers').select().eq().single() -> get customer name
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCreatedContact, error: null })
        .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null })

      // For the count query, the final .eq() returns a promise-like with count
      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((...args) => {
        eqCallCount++
        // The second from() call is for counting, return count on its eq() call
        if (eqCallCount === 2) {
          return Promise.resolve({ count: 0, error: null })
        }
        return mockSupabase
      })

      const result = await ContactsService.create(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          customer_id: 'customer-1',
          name: 'John Doe',
          is_primary: true,
          role: 'decision_maker',
        })
      )
      expect(mockActivity.created).toHaveBeenCalledWith(
        'contact',
        'contact-1',
        'John Doe (Acme Corp)'
      )
      expect(result).toEqual(mockCreatedContact)
    })

    it('should create contact with is_primary=false if other contacts exist', async () => {
      const input = {
        customer_id: 'customer-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
      }

      const mockCreatedContact = {
        id: 'contact-2',
        ...input,
        is_primary: false,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCreatedContact, error: null })
        .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null })

      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((...args) => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ count: 2, error: null })
        }
        return mockSupabase
      })

      await ContactsService.create(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_primary: false,
        })
      )
    })

    it('should respect is_primary if explicitly set', async () => {
      const input = {
        customer_id: 'customer-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        is_primary: true,
      }

      const mockCreatedContact = { id: 'contact-2', ...input }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCreatedContact, error: null })
        .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null })

      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((...args) => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ count: 2, error: null })
        }
        return mockSupabase
      })

      await ContactsService.create(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_primary: true,
        })
      )
    })

    it('should default role to general if not provided', async () => {
      const input = {
        customer_id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
      }

      const mockCreatedContact = { id: 'contact-1', ...input, role: 'general' }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCreatedContact, error: null })
        .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null })

      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((...args) => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ count: 0, error: null })
        }
        return mockSupabase
      })

      await ContactsService.create(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'general',
        })
      )
    })

    it('should throw when profile not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      await expect(
        ContactsService.create({
          customer_id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
        })
      ).rejects.toThrow('Profile not found')
    })
  })

  describe('update', () => {
    const mockCurrentContact = {
      id: 'contact-1',
      name: 'John Doe',
      customer: { name: 'Acme Corp' },
    }

    beforeEach(() => {
      mockActivity.updated.mockResolvedValue(undefined)
    })

    it('should update contact successfully', async () => {
      const updates = {
        name: 'John Updated',
        email: 'john.updated@example.com',
        title: 'Manager',
      }

      // Update method does:
      // 1. .from('customer_contacts').select().eq().single() -> get current contact
      // 2. .from('customer_contacts').update().eq().select().single() -> update and return
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCurrentContact, error: null })
        .mockResolvedValueOnce({
          data: { ...mockCurrentContact, ...updates },
          error: null,
        })

      const result = await ContactsService.update('contact-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Updated',
          email: 'john.updated@example.com',
          title: 'Manager',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'contact-1')
      expect(mockActivity.updated).toHaveBeenCalledWith(
        'contact',
        'contact-1',
        'John Updated (Acme Corp)'
      )
      expect(result.name).toBe('John Updated')
    })

    it('should throw when contact not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      await expect(
        ContactsService.update('non-existent', { name: 'Updated' })
      ).rejects.toThrow('Contact not found')
    })
  })

  describe('delete', () => {
    const mockContact = {
      name: 'John Doe',
      customer: { name: 'Acme Corp' },
    }

    beforeEach(() => {
      mockActivity.deleted.mockResolvedValue(undefined)
    })

    it('should delete contact successfully', async () => {
      // Delete method does:
      // 1. .from('customer_contacts').select().eq().single() -> get contact for activity log
      // 2. .from('customer_contacts').delete().eq() -> perform deletion
      mockSupabase.single.mockResolvedValue({ data: mockContact, error: null })

      // Track eq() calls: first is for select chain, second is for delete chain
      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((field, value) => {
        eqCallCount++
        if (eqCallCount === 2) {
          // This is the delete().eq() call, return the final result
          return Promise.resolve({ error: null })
        }
        return mockSupabase
      })

      await ContactsService.delete('contact-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'contact-1')
      expect(mockActivity.deleted).toHaveBeenCalledWith(
        'contact',
        'contact-1',
        'John Doe (Acme Corp)'
      )
    })

    it('should handle delete without activity log if contact fetch fails', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((field, value) => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null })
        }
        return mockSupabase
      })

      await ContactsService.delete('contact-1')

      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockActivity.deleted).not.toHaveBeenCalled()
    })

    it('should throw on delete error', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockContact, error: null })

      let eqCallCount = 0
      mockSupabase.eq.mockImplementation((field, value) => {
        eqCallCount++
        if (eqCallCount === 2) {
          return Promise.resolve({ error: { message: 'Delete failed' } })
        }
        return mockSupabase
      })

      await expect(ContactsService.delete('contact-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('setPrimary', () => {
    beforeEach(() => {
      mockActivity.updated.mockResolvedValue(undefined)
    })

    it('should set contact as primary', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'John Doe',
        is_primary: true,
        customer: { name: 'Acme Corp' },
      }

      // setPrimary does:
      // .from('customer_contacts').update().eq().select().single()
      mockSupabase.single.mockResolvedValue({ data: mockContact, error: null })

      const result = await ContactsService.setPrimary('contact-1')

      expect(mockSupabase.update).toHaveBeenCalledWith({
        is_primary: true,
        updated_at: expect.any(String),
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'contact-1')
      expect(mockActivity.updated).toHaveBeenCalledWith(
        'contact',
        'contact-1',
        'John Doe set as primary (Acme Corp)'
      )
      expect(result.is_primary).toBe(true)
    })
  })

  describe('getByRole', () => {
    it('should get contacts by role for a customer', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          customer_id: 'customer-1',
          name: 'John Doe',
          role: 'decision_maker',
          is_primary: true,
        },
        {
          id: 'contact-2',
          customer_id: 'customer-1',
          name: 'Jane Smith',
          role: 'decision_maker',
          is_primary: false,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockContacts, error: null })

      const result = await ContactsService.getByRole('customer-1', 'decision_maker')

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'decision_maker')
      expect(mockSupabase.order).toHaveBeenCalledWith('is_primary', { ascending: false })
      expect(result).toEqual(mockContacts)
    })

    it('should return empty array when no contacts with role found', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null })

      const result = await ContactsService.getByRole('customer-1', 'influencer')

      expect(result).toEqual([])
    })
  })

  describe('getPrimary', () => {
    it('should get primary contact for customer', async () => {
      const mockContact = {
        id: 'contact-1',
        customer_id: 'customer-1',
        name: 'John Doe',
        is_primary: true,
        email: 'john@example.com',
      }

      mockSupabase.single.mockResolvedValue({ data: mockContact, error: null })

      const result = await ContactsService.getPrimary('customer-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_contacts')
      expect(mockSupabase.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_primary', true)
      expect(result).toEqual(mockContact)
    })

    it('should return null when no primary contact found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await ContactsService.getPrimary('customer-1')

      expect(result).toBeNull()
    })
  })
})
