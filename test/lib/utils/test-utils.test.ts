import { describe, it, expect } from 'vitest'

// Mock utility functions for testing
function createMockUser(overrides: Partial<{ id: string; name: string; email: string }> = {}) {
  return {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }
}

function createMockCustomer(overrides: Partial<{ id: string; name: string; email: string; status: string }> = {}) {
  return {
    id: 'customer-123',
    name: 'Test Customer',
    email: 'customer@example.com',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

function createMockJob(overrides: Partial<{ id: string; title: string; status: string; customer_id: string }> = {}) {
  return {
    id: 'job-123',
    title: 'Test Job',
    status: 'pending',
    customer_id: 'customer-123',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

describe('test utilities', () => {
  describe('createMockUser', () => {
    it('should create user with default values', () => {
      const user = createMockUser()
      
      expect(user.id).toBe('user-123')
      expect(user.name).toBe('Test User')
      expect(user.email).toBe('test@example.com')
    })

    it('should override default values', () => {
      const user = createMockUser({
        id: 'custom-id',
        name: 'Custom User',
        email: 'custom@example.com'
      })
      
      expect(user.id).toBe('custom-id')
      expect(user.name).toBe('Custom User')
      expect(user.email).toBe('custom@example.com')
    })

    it('should partially override values', () => {
      const user = createMockUser({ name: 'Partial User' })
      
      expect(user.id).toBe('user-123') // default
      expect(user.name).toBe('Partial User') // overridden
      expect(user.email).toBe('test@example.com') // default
    })
  })

  describe('createMockCustomer', () => {
    it('should create customer with default values', () => {
      const customer = createMockCustomer()
      
      expect(customer.id).toBe('customer-123')
      expect(customer.name).toBe('Test Customer')
      expect(customer.email).toBe('customer@example.com')
      expect(customer.status).toBe('active')
      expect(customer.created_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should override customer values', () => {
      const customer = createMockCustomer({
        status: 'inactive',
        name: 'Inactive Customer'
      })
      
      expect(customer.status).toBe('inactive')
      expect(customer.name).toBe('Inactive Customer')
      expect(customer.email).toBe('customer@example.com') // default
    })
  })

  describe('createMockJob', () => {
    it('should create job with default values', () => {
      const job = createMockJob()
      
      expect(job.id).toBe('job-123')
      expect(job.title).toBe('Test Job')
      expect(job.status).toBe('pending')
      expect(job.customer_id).toBe('customer-123')
      expect(job.created_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should override job values', () => {
      const job = createMockJob({
        status: 'completed',
        title: 'Completed Job',
        customer_id: 'different-customer'
      })
      
      expect(job.status).toBe('completed')
      expect(job.title).toBe('Completed Job')
      expect(job.customer_id).toBe('different-customer')
    })
  })

  describe('waitFor', () => {
    it('should wait for specified time', async () => {
      const start = Date.now()
      await waitFor(100)
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(90) // Allow some variance
    })

    it('should resolve after timeout', async () => {
      const promise = waitFor(50)
      expect(promise).toBeInstanceOf(Promise)
      
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID()
      
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      
      expect(uuid1).not.toBe(uuid2)
    })

    it('should have correct length', () => {
      const uuid = generateUUID()
      
      expect(uuid).toHaveLength(36) // 32 chars + 4 hyphens
    })

    it('should have version 4 indicator', () => {
      const uuid = generateUUID()
      
      expect(uuid.charAt(14)).toBe('4') // Version 4 UUID
    })
  })

  describe('utility composition', () => {
    it('should work together for test scenarios', () => {
      const customer = createMockCustomer({ id: generateUUID() })
      const job = createMockJob({ 
        customer_id: customer.id,
        id: generateUUID()
      })
      
      expect(job.customer_id).toBe(customer.id)
      expect(job.id).not.toBe(customer.id)
      expect(job.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should support async test patterns', async () => {
      const user = createMockUser()
      
      // Simulate async operation
      await waitFor(10)
      
      const updatedUser = { ...user, name: 'Updated User' }
      expect(updatedUser.name).toBe('Updated User')
      expect(updatedUser.id).toBe(user.id)
    })
  })

  describe('mock data consistency', () => {
    it('should maintain referential integrity', () => {
      const customerId = generateUUID()
      const customer = createMockCustomer({ id: customerId })
      const job1 = createMockJob({ customer_id: customerId })
      const job2 = createMockJob({ customer_id: customerId })
      
      expect(job1.customer_id).toBe(customer.id)
      expect(job2.customer_id).toBe(customer.id)
      expect(job1.customer_id).toBe(job2.customer_id)
    })

    it('should support different entity states', () => {
      const activeCustomer = createMockCustomer({ status: 'active' })
      const inactiveCustomer = createMockCustomer({ status: 'inactive' })
      const pendingJob = createMockJob({ status: 'pending' })
      const completedJob = createMockJob({ status: 'completed' })
      
      expect(activeCustomer.status).toBe('active')
      expect(inactiveCustomer.status).toBe('inactive')
      expect(pendingJob.status).toBe('pending')
      expect(completedJob.status).toBe('completed')
    })
  })
})