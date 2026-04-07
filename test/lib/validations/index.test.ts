import { describe, it, expect } from 'vitest'

describe('validations index', () => {
  it('should export common validations', async () => {
    const commonModule = await import('@/lib/validations/common')
    expect(commonModule).toBeDefined()
    expect(typeof commonModule.paginationQuerySchema).toBe('object')
  })

  it('should export customer validations', async () => {
    const customerModule = await import('@/lib/validations/customer')
    expect(customerModule).toBeDefined()
    expect(typeof customerModule.customerSchema).toBe('object')
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
    expect(indexModule.paginationQuerySchema).toBeDefined()
    expect(indexModule.customerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
    expect(indexModule.createEstimateSchema).toBeDefined()
    expect(indexModule.createInvoiceSchema).toBeDefined()
    expect(indexModule.createProposalSchema).toBeDefined()
  })

  it('should have consistent schema structure', async () => {
    const indexModule = await import('@/lib/validations/index')

    // Test that schemas are Zod objects with safeParse method
    expect(typeof indexModule.paginationQuerySchema.safeParse).toBe('function')
    expect(typeof indexModule.customerSchema.safeParse).toBe('function')
    expect(typeof indexModule.createJobSchema.safeParse).toBe('function')
  })

  it('should validate schemas work correctly when imported from index', async () => {
    const { paginationQuerySchema, customerSchema } = await import('@/lib/validations/index')

    // Test pagination schema
    const paginationResult = paginationQuerySchema.safeParse({
      limit: '10',
      offset: '0'
    })
    expect(paginationResult.success).toBe(true)

    // Test customer schema
    const customerResult = customerSchema.safeParse({
      first_name: 'Test',
      contact_type: 'residential',
      status: 'lead',
      marketing_consent: false,
    })
    expect(customerResult.success).toBe(true)
  })

  it('should maintain type exports', async () => {
    const indexModule = await import('@/lib/validations/index')

    expect(indexModule.customerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
    expect(indexModule.createEstimateSchema).toBeDefined()
  })

  it('should handle schema validation errors consistently', async () => {
    const { customerSchema, createJobSchema } = await import('@/lib/validations/index')

    // Test that all schemas handle validation errors consistently
    const customerResult = customerSchema.safeParse({
      first_name: '', // Invalid empty first_name
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
    expect(indexModule.paginationQuerySchema).toBeDefined()
    expect(indexModule.idParamSchema).toBeDefined()

    // Check that entity-specific schemas are available
    expect(indexModule.customerSchema).toBeDefined()
    expect(indexModule.createJobSchema).toBeDefined()
  })

  it('should support schema composition', async () => {
    const { paginationQuerySchema } = await import('@/lib/validations/index')

    // Test that schemas can be used together
    const combinedResult = paginationQuerySchema.safeParse({
      limit: '20',
      offset: '0',
    })

    expect(combinedResult.success).toBe(true)
  })

  it('should maintain backward compatibility', async () => {
    // Test that the index exports maintain the same interface
    const indexModule = await import('@/lib/validations/index')

    // These should all be available and functional
    const requiredExports = [
      'paginationQuerySchema',
      'customerSchema',
      'createJobSchema',
      'createEstimateSchema',
      'createInvoiceSchema',
      'createProposalSchema'
    ]

    for (const exportName of requiredExports) {
      expect((indexModule as Record<string, any>)[exportName]).toBeDefined()
      expect(typeof (indexModule as Record<string, any>)[exportName].safeParse).toBe('function')
    }
  })
})
