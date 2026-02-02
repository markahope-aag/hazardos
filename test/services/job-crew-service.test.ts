import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobCrewService } from '@/lib/services/job-crew-service'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('JobCrewService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('assign', () => {
    it('should assign crew member to job', async () => {
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'crew-1',
                job_id: 'job-1',
                profile_id: 'user-1',
                role: 'crew',
                is_lead: false,
                profile: {
                  id: 'user-1',
                  full_name: 'John Doe',
                },
              },
              error: null,
            }),
          })),
        })),
      }))

      const result = await JobCrewService.assign({
        job_id: 'job-1',
        profile_id: 'user-1',
      })

      expect(result.job_id).toBe('job-1')
      expect(result.role).toBe('crew')
    })

    it('should default role to crew', async () => {
      let insertedData: any

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'crew-1' },
                error: null,
              }),
            })),
          }
        }),
      }))

      await JobCrewService.assign({
        job_id: 'job-1',
        profile_id: 'user-1',
      })

      expect(insertedData.role).toBe('crew')
      expect(insertedData.is_lead).toBe(false)
    })

    it('should assign as lead when specified', async () => {
      let insertedData: any

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'crew-1' },
                error: null,
              }),
            })),
          }
        }),
      }))

      await JobCrewService.assign({
        job_id: 'job-1',
        profile_id: 'user-1',
        role: 'lead',
        is_lead: true,
      })

      expect(insertedData.role).toBe('lead')
      expect(insertedData.is_lead).toBe(true)
    })

    it('should include schedule times', async () => {
      let insertedData: any

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'crew-1' },
                error: null,
              }),
            })),
          }
        }),
      }))

      await JobCrewService.assign({
        job_id: 'job-1',
        profile_id: 'user-1',
        scheduled_start: '2026-02-01T08:00:00Z',
        scheduled_end: '2026-02-01T17:00:00Z',
      })

      expect(insertedData.scheduled_start).toBe('2026-02-01T08:00:00Z')
      expect(insertedData.scheduled_end).toBe('2026-02-01T17:00:00Z')
    })

    it('should throw error on database failure', async () => {
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      }))

      await expect(
        JobCrewService.assign({
          job_id: 'job-1',
          profile_id: 'user-1',
        })
      ).rejects.toThrow()
    })
  })

  describe('remove', () => {
    it('should remove crew member from job', async () => {
      let deleteWasCalled = false

      mockSupabase.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => {
              deleteWasCalled = true
              return Promise.resolve({ error: null })
            }),
          })),
        })),
      }))

      await JobCrewService.remove('job-1', 'user-1')

      expect(deleteWasCalled).toBe(true)
    })

    it('should filter by both job and profile', async () => {
      let jobIdChecked = false
      let profileIdChecked = false

      mockSupabase.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn((field, value) => {
            if (field === 'job_id') {
              expect(value).toBe('job-1')
              jobIdChecked = true
            }
            return {
              eq: vi.fn((field, value) => {
                if (field === 'profile_id') {
                  expect(value).toBe('user-1')
                  profileIdChecked = true
                }
                return Promise.resolve({ error: null })
              }),
            }
          }),
        })),
      }))

      await JobCrewService.remove('job-1', 'user-1')

      expect(jobIdChecked).toBe(true)
      expect(profileIdChecked).toBe(true)
    })
  })

  describe('update', () => {
    it('should update crew assignment', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'crew-1',
                  role: 'lead',
                  is_lead: true,
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const result = await JobCrewService.update('crew-1', {
        role: 'lead',
        is_lead: true,
      })

      expect(result.role).toBe('lead')
      expect(result.is_lead).toBe(true)
    })

    it('should return profile information', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'crew-1',
                  profile: {
                    id: 'user-1',
                    full_name: 'John Doe',
                    email: 'john@example.com',
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const result = await JobCrewService.update('crew-1', { role: 'lead' })

      expect(result.profile).toBeDefined()
      expect(result.profile.full_name).toBe('John Doe')
    })
  })

  describe('clockInOut', () => {
    it('should clock in crew member', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'crew-1',
                    clock_in_at: data.clock_in_at,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      const _result = await JobCrewService.clockInOut({
        job_crew_id: 'crew-1',
        action: 'clock_in',
      })

      expect(updatedData.clock_in_at).toBeDefined()
      expect(updatedData.clock_out_at).toBeUndefined()
    })

    it('should clock out crew member', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'crew-1',
                    clock_out_at: data.clock_out_at,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      const _result = await JobCrewService.clockInOut({
        job_crew_id: 'crew-1',
        action: 'clock_out',
      })

      expect(updatedData.clock_out_at).toBeDefined()
      expect(updatedData.clock_in_at).toBeUndefined()
    })

    it('should use provided timestamp', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'crew-1' },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      const customTime = '2026-02-01T08:00:00Z'

      await JobCrewService.clockInOut({
        job_crew_id: 'crew-1',
        action: 'clock_in',
        timestamp: customTime,
      })

      expect(updatedData.clock_in_at).toBe(customTime)
    })

    it('should use current time when timestamp not provided', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'crew-1' },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      await JobCrewService.clockInOut({
        job_crew_id: 'crew-1',
        action: 'clock_in',
      })

      expect(updatedData.clock_in_at).toBeDefined()
      // Should be a recent timestamp
      const timestamp = new Date(updatedData.clock_in_at)
      const now = new Date()
      const diffMs = now.getTime() - timestamp.getTime()
      expect(diffMs).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('getAvailable', () => {
    it('should return available crew members', async () => {
      const mockProfiles = [
        { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', role: 'technician' },
        { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com', role: 'technician' },
      ]

      const mockJobs = [
        {
          crew: [{ profile_id: 'user-1' }],
        },
      ]

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({
                  data: mockJobs,
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const result = await JobCrewService.getAvailable('2026-02-01')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('user-1')
      expect(result[0].is_available).toBe(false) // Assigned
      expect(result[1].is_available).toBe(true) // Available
    })

    it('should filter by crew roles', async () => {
      let roleFilterCalled = false

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn((field, values) => {
                expect(field).toBe('role')
                expect(values).toContain('technician')
                expect(values).toContain('estimator')
                expect(values).toContain('admin')
                roleFilterCalled = true
                return Promise.resolve({ data: [], error: null })
              }),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      await JobCrewService.getAvailable('2026-02-01')

      expect(roleFilterCalled).toBe(true)
    })

    it('should exclude cancelled jobs', async () => {
      let statusFilterCalled = false

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn((field, value) => {
                  if (field === 'status') {
                    expect(value).toBe('cancelled')
                    statusFilterCalled = true
                  }
                  return Promise.resolve({ data: [], error: null })
                }),
              })),
            })),
          }
        }
        return {}
      })

      await JobCrewService.getAvailable('2026-02-01')

      expect(statusFilterCalled).toBe(true)
    })

    it('should return empty array when no profiles', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          }
        }
        if (table === 'jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const result = await JobCrewService.getAvailable('2026-02-01')

      expect(result).toEqual([])
    })
  })
})
