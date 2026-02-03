import { describe, it, expect } from 'vitest'

describe('validations index', () => {
  it('should export common validations', async () => {
    const commonModule = await import('@/lib/validations/common')
    expect(commonModule).toBeDefined()
    expect(typeof commonModule.paginationSchema).toBe('object')
  })

  it('should export customer validations', async () => {
    const customerModule = await import('@/lib/validations/customer')
    expect(customerModule).toBeDefined()
    expect(typeof customerModule.createCustomerSchema).toBe('object')
  })

  it('should export jobs validations', async () => {
    const jobsModule = await import('@/lib/validations/jobs')
    expect(jobsModule).toBeDefined()
    expect(typeof jobsModule.createJobSchema).toBe('object')
  })

  it('should export estimates validations', async () => {
    const estimatesModule = await import('@/lib/validations/estimates')
    expect(estimatesModule).toBeDefined()
    expect(typeof estimatesModule.createEstimateSchema).toBe('object')
  })

  it('should export invoices validations', async () => {
    const invoicesModule = await import('@/lib/validations/invoices')
    expect(invoicesModule).toBeDefined()
    expect(typeof invoicesModule.createInvoiceSchema).toBe('object')
  })

  it('should export proposals validations', async () => {
    const proposalsModule = await import('@/lib/validations/proposals')
    expect(proposalsModule).toBeDefined()
    expect(typeof proposalsModule.createProposalSchema).toBe('object')
  })

  it('should re-export all schemas from main index', async () => {
    const indexModule = await import('@/lib/validations/index')
    
    // Check that schemas from different modules are available
    expect(indexModule.paginationSchema).toBeDefined()
    expect(indexModule.createCustomerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
    expect(indexModule.createEstimateSchema).toBeDefined()
    expect(indexModule.createInvoiceSchema).toBeDefined()
    expect(indexModule.createProposalSchema).toBeDefined()
  })

  it('should have consistent schema structure', async () => {
    const indexModule = await import('@/lib/validations/index')
    
    // Test that schemas are Zod objects with safeParse method
    expect(typeof indexModule.paginationSchema.safeParse).toBe('function')
    expect(typeof indexModule.createCustomerSchema.safeParse).toBe('function')
    expect(typeof indexModule.createJobSchema.safeParse).toBe('function')
  })

  it('should validate schemas work correctly when imported from index', async () => {
    const { paginationSchema, createCustomerSchema } = await import('@/lib/validations/index')
    
    // Test pagination schema
    const paginationResult = paginationSchema.safeParse({
      page: '1',
      limit: '10'
    })
    expect(paginationResult.success).toBe(true)
    
    // Test customer schema
    const customerResult = createCustomerSchema.safeParse({
      name: 'Test Customer',
      email: 'test@example.com'
    })
    expect(customerResult.success).toBe(true)
  })

  it('should maintain type exports', async () => {
    // This test ensures TypeScript types are properly exported
    // The actual type checking happens at compile time
    const indexModule = await import('@/lib/validations/index')
    
    // We can't directly test types at runtime, but we can test that
    // the schemas exist and can be used for type inference
    expect(indexModule.createCustomerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
    expect(indexModule.createEstimateSchema).toBeDefined()
  })

  it('should handle schema validation errors consistently', async () => {
    const { createCustomerSchema, createJobSchema } = await import('@/lib/validations/index')
    
    // Test that all schemas handle validation errors consistently
    const customerResult = createCustomerSchema.safeParse({
      name: '', // Invalid empty name
      email: 'invalid-email'
    })
    expect(customerResult.success).toBe(false)
    
    const jobResult = createJobSchema.safeParse({
      title: '', // Invalid empty title
      customer_id: 'not-a-uuid'
    })
    expect(jobResult.success).toBe(false)
  })

  it('should provide access to all validation utilities', async () => {
    const indexModule = await import('@/lib/validations/index')
    
    // Check that common utilities are available
    expect(indexModule.paginationSchema).toBeDefined()
    expect(indexModule.sortOrderSchema).toBeDefined()
    
    // Check that entity-specific schemas are available
    expect(indexModule.createCustomerSchema).toBeDefined()
    expect(indexModule.updateCustomerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
    expect(indexModule.updateJobSchema).toBeDefined()
  })

  it('should support schema composition', async () => {
    const { paginationSchema, sortOrderSchema } = await import('@/lib/validations/index')
    
    // Test that schemas can be used together
    const combinedResult = paginationSchema.safeParse({
      page: '1',
      limit: '20',
      sort: 'name',
      order: 'asc'
    })
    
    expect(combinedResult.success).toBe(true)
    
    const sortResult = sortOrderSchema.safeParse('desc')
    expect(sortResult.success).toBe(true)
  })

  it('should maintain backward compatibility', async () => {
    // Test that the index exports maintain the same interface
    const indexModule = await import('@/lib/validations/index')
    
    // These should all be available and functional
    const requiredExports = [
      'paginationSchema',
      'createCustomerSchema',
      'updateCustomerSchema',
      'createJobSchema',
      'updateJobSchema',
      'createEstimateSchema',
      'createInvoiceSchema',
      'createProposalSchema'
    ]
    
    for (const exportName of requiredExports) {
      expect(indexModule[exportName]).toBeDefined()
      expect(typeof indexModule[exportName].safeParse).toBe('function')
    }
  })
})