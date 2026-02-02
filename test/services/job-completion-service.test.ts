import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobCompletionService } from '@/lib/services/job-completion-service'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: {
    created: vi.fn(),
    updated: vi.fn(),
    deleted: vi.fn(),
    submitted: vi.fn(),
    statusChanged: vi.fn(),
  },
}))

import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'

describe('JobCompletionService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('Time Entries', () => {
    describe('getTimeEntries', () => {
      it('should return time entries for job', async () => {
        const mockEntries = [
          {
            id: 'entry-1',
            job_id: 'job-1',
            hours: 8,
            work_date: '2026-02-01',
            profile: { id: 'user-1', full_name: 'John Doe' },
            creator: { id: 'user-1', full_name: 'John Doe' },
          },
        ]

        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockEntries,
                error: null,
              }),
            })),
          })),
        }))

        const entries = await JobCompletionService.getTimeEntries('job-1')

        expect(entries).toHaveLength(1)
        expect(entries[0].hours).toBe(8)
      })

      it('should throw error when user not authenticated', async () => {
        mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        })

        await expect(JobCompletionService.getTimeEntries('job-1')).rejects.toThrow('Unauthorized')
      })
    })

    describe('createTimeEntry', () => {
      it('should create time entry', async () => {
        mockSupabase.from = vi.fn((table) => {
          if (table === 'job_time_entries') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'entry-1',
                      job_id: 'job-1',
                      hours: 8,
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        })

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        const entry = await JobCompletionService.createTimeEntry({
          job_id: 'job-1',
          work_date: '2026-02-01',
          hours: 8,
          hourly_rate: 50,
        })

        expect(entry.hours).toBe(8)
        expect(Activity.created).toHaveBeenCalledWith('time_entry', 'entry-1', '8 hours')
      })

      it('should default billable to true', async () => {
        let insertedData: any

        mockSupabase.from = vi.fn(() => ({
          insert: vi.fn((data) => {
            insertedData = data
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'entry-1' },
                  error: null,
                }),
              })),
            }
          }),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        await JobCompletionService.createTimeEntry({
          job_id: 'job-1',
          work_date: '2026-02-01',
          hours: 8,
          hourly_rate: 50,
        })

        expect(insertedData.billable).toBe(true)
      })
    })

    describe('updateTimeEntry', () => {
      it('should update time entry', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'entry-1',
                    job_id: 'job-1',
                    hours: 10,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        const entry = await JobCompletionService.updateTimeEntry('entry-1', {
          hours: 10,
        })

        expect(entry.hours).toBe(10)
        expect(Activity.updated).toHaveBeenCalledWith('time_entry', 'entry-1')
      })
    })

    describe('deleteTimeEntry', () => {
      it('should delete time entry', async () => {
        mockSupabase.from = vi.fn((table) => {
          if (table === 'job_time_entries') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { job_id: 'job-1' },
                    error: null,
                  }),
                })),
              })),
              delete: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            }
          }
          return {}
        })

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        await JobCompletionService.deleteTimeEntry('entry-1')

        expect(Activity.deleted).toHaveBeenCalledWith('time_entry', 'entry-1')
      })
    })
  })

  describe('Material Usage', () => {
    describe('getMaterialUsage', () => {
      it('should return material usage for job', async () => {
        const mockUsage = [
          {
            id: 'usage-1',
            job_id: 'job-1',
            material_name: 'Paint',
            quantity_used: 10,
            creator: { id: 'user-1', full_name: 'John Doe' },
          },
        ]

        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockUsage,
                error: null,
              }),
            })),
          })),
        }))

        const usage = await JobCompletionService.getMaterialUsage('job-1')

        expect(usage).toHaveLength(1)
        expect(usage[0].material_name).toBe('Paint')
      })
    })

    describe('createMaterialUsage', () => {
      it('should create material usage record', async () => {
        mockSupabase.from = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'usage-1',
                  material_name: 'Paint',
                  quantity_used: 10,
                },
                error: null,
              }),
            })),
          })),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        const usage = await JobCompletionService.createMaterialUsage({
          job_id: 'job-1',
          material_name: 'Paint',
          material_type: 'coating',
          quantity_estimated: 12,
          quantity_used: 10,
          unit: 'gallons',
          unit_cost: 50,
        })

        expect(usage.material_name).toBe('Paint')
        expect(Activity.created).toHaveBeenCalledWith('material_usage', 'usage-1', 'Paint')
      })
    })

    describe('updateMaterialUsage', () => {
      it('should update material usage', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usage-1',
                    job_id: 'job-1',
                    material_name: 'Paint',
                    quantity_used: 12,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        const usage = await JobCompletionService.updateMaterialUsage('usage-1', {
          quantity_used: 12,
        })

        expect(usage.quantity_used).toBe(12)
      })
    })

    describe('deleteMaterialUsage', () => {
      it('should delete material usage', async () => {
        mockSupabase.from = vi.fn((table) => {
          if (table === 'job_material_usage') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { job_id: 'job-1' },
                    error: null,
                  }),
                })),
              })),
              delete: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            }
          }
          return {}
        })

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        await JobCompletionService.deleteMaterialUsage('usage-1')

        expect(Activity.deleted).toHaveBeenCalledWith('material_usage', 'usage-1')
      })
    })
  })

  describe('Completion Photos', () => {
    describe('getPhotos', () => {
      it('should return photos for job', async () => {
        const mockPhotos = [
          {
            id: 'photo-1',
            job_id: 'job-1',
            photo_url: 'https://example.com/photo1.jpg',
            photo_type: 'before',
            caption: 'Before work',
            creator: { id: 'user-1', full_name: 'John Doe' },
          },
        ]

        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockPhotos,
                error: null,
              }),
            })),
          })),
        }))

        const photos = await JobCompletionService.getPhotos('job-1')

        expect(photos).toHaveLength(1)
        expect(photos[0].photo_type).toBe('before')
      })
    })

    describe('createPhoto', () => {
      it('should create completion photo', async () => {
        mockSupabase.from = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'photo-1',
                  photo_url: 'https://example.com/photo1.jpg',
                  photo_type: 'after',
                },
                error: null,
              }),
            })),
          })),
        }))

        const photo = await JobCompletionService.createPhoto({
          job_id: 'job-1',
          photo_url: 'https://example.com/photo1.jpg',
          photo_type: 'after',
        })

        expect(photo.photo_url).toBe('https://example.com/photo1.jpg')
        expect(Activity.created).toHaveBeenCalledWith('completion_photo', 'photo-1', 'after')
      })
    })

    describe('deletePhoto', () => {
      it('should delete photo', async () => {
        mockSupabase.from = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }))

        await JobCompletionService.deletePhoto('photo-1')

        expect(Activity.deleted).toHaveBeenCalledWith('completion_photo', 'photo-1')
      })
    })
  })

  describe('Completion Checklist', () => {
    describe('getChecklists', () => {
      it('should return checklists for job', async () => {
        const mockChecklists = [
          {
            id: 'check-1',
            job_id: 'job-1',
            category: 'safety',
            item: 'PPE used',
            is_completed: true,
          },
        ]

        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockChecklists,
                error: null,
              }),
            })),
          })),
        }))

        const checklists = await JobCompletionService.getChecklists('job-1')

        expect(checklists).toHaveLength(1)
        expect(checklists[0].category).toBe('safety')
      })
    })

    describe('updateChecklistItem', () => {
      it('should update checklist item', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'check-1',
                    is_completed: true,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        const item = await JobCompletionService.updateChecklistItem('check-1', {
          is_completed: true,
        })

        expect(item.is_completed).toBe(true)
      })
    })
  })

  describe('Job Completion', () => {
    describe('getCompletion', () => {
      it('should return job completion', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comp-1',
                  job_id: 'job-1',
                  status: 'draft',
                },
                error: null,
              }),
            })),
          })),
        }))

        const completion = await JobCompletionService.getCompletion('job-1')

        expect(completion).toBeDefined()
        expect(completion?.status).toBe('draft')
      })

      it('should return null when not found', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            })),
          })),
        }))

        const completion = await JobCompletionService.getCompletion('job-1')

        expect(completion).toBeNull()
      })
    })

    describe('createCompletion', () => {
      it('should create job completion', async () => {
        mockSupabase.from = vi.fn((table) => {
          if (table === 'profiles') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'job_completions') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'comp-1',
                      job_id: 'job-1',
                      status: 'draft',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        })

        const completion = await JobCompletionService.createCompletion({
          job_id: 'job-1',
        })

        expect(completion.status).toBe('draft')
      })
    })

    describe('submitCompletion', () => {
      it('should submit completion for review', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'comp-1',
                    job_id: 'job-1',
                    status: 'submitted',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        const completion = await JobCompletionService.submitCompletion('comp-1', {
          notes: 'Work completed successfully',
        })

        expect(completion.status).toBe('submitted')
        expect(Activity.submitted).toHaveBeenCalled()
      })
    })

    describe('approveCompletion', () => {
      it('should approve completion', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'comp-1',
                    job_id: 'job-1',
                    status: 'approved',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

        const completion = await JobCompletionService.approveCompletion('comp-1', {
          notes: 'Looks good',
        })

        expect(completion.status).toBe('approved')
        expect(Activity.statusChanged).toHaveBeenCalled()
      })
    })

    describe('rejectCompletion', () => {
      it('should reject completion', async () => {
        mockSupabase.from = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'comp-1',
                    job_id: 'job-1',
                    status: 'rejected',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        }))

        const completion = await JobCompletionService.rejectCompletion('comp-1', {
          reason: 'Incomplete checklist',
        })

        expect(completion.status).toBe('rejected')
        expect(Activity.statusChanged).toHaveBeenCalled()
      })
    })
  })

  describe('Variance Analysis', () => {
    describe('getVarianceAnalysis', () => {
      it('should return variance analysis for job', async () => {
        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: {
            time_variance_hours: 2,
            time_variance_cost: 100,
            material_variance_quantity: -1,
            material_variance_cost: -50,
          },
          error: null,
        })

        const analysis = await JobCompletionService.getVarianceAnalysis('job-1')

        expect(analysis.time_variance_hours).toBe(2)
        expect(analysis.material_variance_cost).toBe(-50)
      })
    })

    describe('getVarianceSummary', () => {
      it('should return variance summary', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123' },
                error: null,
              }),
            })),
          })),
        }))

        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: {
            total_jobs: 10,
            avg_time_variance: 1.5,
            avg_cost_variance: 500,
          },
          error: null,
        })

        const summary = await JobCompletionService.getVarianceSummary()

        expect(summary.total_jobs).toBe(10)
        expect(summary.avg_time_variance).toBe(1.5)
      })
    })
  })
})
