import { describe, it, expect } from 'vitest'
import { organizationFiltersSchema } from '@/lib/validations/platform'

describe('platform validations', () => {
  describe('organizationFiltersSchema', () => {
    it('should validate empty object', () => {
      const result = organizationFiltersSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should validate with search parameter', () => {
      const validData = {
        search: 'test company'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('test company')
      }
    })

    it('should validate with status parameter', () => {
      const validData = {
        status: 'active'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('active')
      }
    })

    it('should validate with planSlug parameter', () => {
      const validData = {
        planSlug: 'pro'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.planSlug).toBe('pro')
      }
    })

    it('should validate valid sortBy values', () => {
      const validSortByValues = ['created_at', 'name', 'user_count', 'job_count']
      
      for (const sortBy of validSortByValues) {
        const result = organizationFiltersSchema.safeParse({ sortBy })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy)
        }
      }
    })

    it('should reject invalid sortBy values', () => {
      const invalidData = {
        sortBy: 'invalid_sort'
      }
      
      const result = organizationFiltersSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate valid sortOrder values', () => {
      const validSortOrderValues = ['asc', 'desc']
      
      for (const sortOrder of validSortOrderValues) {
        const result = organizationFiltersSchema.safeParse({ sortOrder })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.sortOrder).toBe(sortOrder)
        }
      }
    })

    it('should reject invalid sortOrder values', () => {
      const invalidData = {
        sortOrder: 'invalid_order'
      }
      
      const result = organizationFiltersSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should transform string page to number', () => {
      const validData = {
        page: '2'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(typeof result.data.page).toBe('number')
      }
    })

    it('should transform string limit to number', () => {
      const validData = {
        limit: '50'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should validate complex filter combination', () => {
      const validData = {
        search: 'acme corp',
        status: 'active',
        planSlug: 'enterprise',
        sortBy: 'name',
        sortOrder: 'asc',
        page: '1',
        limit: '25'
      }
      
      const result = organizationFiltersSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('acme corp')
        expect(result.data.status).toBe('active')
        expect(result.data.planSlug).toBe('enterprise')
        expect(result.data.sortBy).toBe('name')
        expect(result.data.sortOrder).toBe('asc')
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(25)
      }
    })

    it('should pass through unknown fields due to passthrough()', () => {
      const dataWithExtra = {
        search: 'test',
        unknownField: 'should pass through'
      }
      
      const result = organizationFiltersSchema.safeParse(dataWithExtra)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('test')
        expect((result.data as any).unknownField).toBe('should pass through')
      }
    })
  })
})