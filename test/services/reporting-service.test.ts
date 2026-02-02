import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportingService } from '@/lib/services/reporting-service'
import type { DateRange } from '@/types/reporting'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('ReportingService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock supabase client
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

  describe('getDateRange', () => {
    it('should return today date range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'today' })

      const startDate = new Date(result.start)
      expect(startDate.getFullYear()).toBe(now.getFullYear())
      expect(startDate.getMonth()).toBe(now.getMonth())
      expect(startDate.getDate()).toBe(now.getDate())
    })

    it('should return yesterday date range', () => {
      const result = ReportingService.getDateRange({ type: 'yesterday' })

      const startDate = new Date(result.start)
      const endDate = new Date(result.end)

      expect(startDate.getDate()).toBe(endDate.getDate())
      expect(endDate.getHours()).toBe(23)
      expect(endDate.getMinutes()).toBe(59)
    })

    it('should return last 7 days range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'last_7_days' })

      const startDate = new Date(result.start)
      const daysDiff = (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      expect(daysDiff).toBeGreaterThanOrEqual(6)
      expect(daysDiff).toBeLessThanOrEqual(7)
    })

    it('should return last 30 days range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'last_30_days' })

      const startDate = new Date(result.start)
      const daysDiff = (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      expect(daysDiff).toBeGreaterThanOrEqual(29)
      expect(daysDiff).toBeLessThanOrEqual(30)
    })

    it('should return this month range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'this_month' })

      const startDate = new Date(result.start)
      expect(startDate.getFullYear()).toBe(now.getFullYear())
      expect(startDate.getMonth()).toBe(now.getMonth())
      expect(startDate.getDate()).toBe(1)
    })

    it('should return last month range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'last_month' })

      const startDate = new Date(result.start)
      const endDate = new Date(result.end)

      expect(startDate.getMonth()).toBe((now.getMonth() - 1 + 12) % 12)
      expect(startDate.getDate()).toBe(1)
      expect(endDate.getDate()).toBeGreaterThan(27) // End of month
    })

    it('should return this quarter range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'this_quarter' })

      const startDate = new Date(result.start)
      const quarter = Math.floor(now.getMonth() / 3)
      expect(startDate.getMonth()).toBe(quarter * 3)
      expect(startDate.getDate()).toBe(1)
    })

    it('should return this year range', () => {
      const now = new Date()
      const result = ReportingService.getDateRange({ type: 'this_year' })

      const startDate = new Date(result.start)
      expect(startDate.getFullYear()).toBe(now.getFullYear())
      expect(startDate.getMonth()).toBe(0)
      expect(startDate.getDate()).toBe(1)
    })

    it('should return custom date range', () => {
      const result = ReportingService.getDateRange({
        type: 'custom',
        start: '2026-01-01',
        end: '2026-01-31',
      })

      const startDate = new Date(result.start)
      const endDate = new Date(result.end)

      expect(startDate.getFullYear()).toBe(2026)
      expect(startDate.getMonth()).toBe(0)
      expect(startDate.getDate()).toBe(1)
      expect(endDate.getMonth()).toBe(0)
      expect(endDate.getDate()).toBe(31)
    })

    it('should use defaults for custom range without dates', () => {
      const result = ReportingService.getDateRange({ type: 'custom' })

      expect(result.start).toBeDefined()
      expect(result.end).toBeDefined()
    })
  })

  describe('runSalesReport', () => {
    it('should return sales performance data', async () => {
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
        if (table === 'mv_sales_performance') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          month: '2026-01',
                          total_proposals: 10,
                          proposals_won: 5,
                          win_rate: 0.5,
                        },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          }
        }
        return {}
      })

      const result = await ReportingService.runSalesReport({
        date_range: { type: 'this_month' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].total_proposals).toBe(10)
      expect(result[0].win_rate).toBe(0.5)
    })

    it('should throw error when user not authenticated', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(
        ReportingService.runSalesReport({
          date_range: { type: 'this_month' },
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should filter by organization', async () => {
      let orgIdChecked = false

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
        if (table === 'mv_sales_performance') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field, value) => {
                if (field === 'organization_id') {
                  expect(value).toBe('org-123')
                  orgIdChecked = true
                }
                return {
                  gte: vi.fn(() => ({
                    lte: vi.fn(() => ({
                      order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    })),
                  })),
                }
              }),
            })),
          }
        }
        return {}
      })

      await ReportingService.runSalesReport({
        date_range: { type: 'this_month' },
      })

      expect(orgIdChecked).toBe(true)
    })
  })

  describe('runJobCostReport', () => {
    it('should return job cost data', async () => {
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
        if (table === 'mv_job_costs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          month: '2026-01',
                          total_costs: 15000,
                          total_revenue: 20000,
                          margin: 0.25,
                        },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          }
        }
        return {}
      })

      const result = await ReportingService.runJobCostReport({
        date_range: { type: 'this_month' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].total_costs).toBe(15000)
      expect(result[0].margin).toBe(0.25)
    })
  })

  describe('runLeadSourceReport', () => {
    it('should return lead source ROI data', async () => {
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
        if (table === 'mv_lead_source_roi') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          source: 'Google Ads',
                          leads: 50,
                          conversions: 10,
                          conversion_rate: 0.2,
                        },
                        {
                          source: 'Referral',
                          leads: 30,
                          conversions: 15,
                          conversion_rate: 0.5,
                        },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          }
        }
        return {}
      })

      const result = await ReportingService.runLeadSourceReport({
        date_range: { type: 'last_30_days' },
      })

      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('Google Ads')
      expect(result[1].conversion_rate).toBe(0.5)
    })

    it('should order by source', async () => {
      let orderCalled = false

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
        if (table === 'mv_lead_source_roi') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn((field) => {
                      expect(field).toBe('source')
                      orderCalled = true
                      return Promise.resolve({ data: [], error: null })
                    }),
                  })),
                })),
              })),
            })),
          }
        }
        return {}
      })

      await ReportingService.runLeadSourceReport({
        date_range: { type: 'this_month' },
      })

      expect(orderCalled).toBe(true)
    })
  })

  describe('listReports', () => {
    it('should return list of saved reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          name: 'Monthly Sales',
          report_type: 'sales',
        },
        {
          id: 'report-2',
          name: 'Job Costs',
          report_type: 'job_costs',
        },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: mockReports,
            error: null,
          }),
        })),
      }))

      const result = await ReportingService.listReports()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Monthly Sales')
    })

    it('should order by updated_at descending', async () => {
      let orderCalled = false

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn((field, options) => {
            expect(field).toBe('updated_at')
            expect(options.ascending).toBe(false)
            orderCalled = true
            return Promise.resolve({ data: [], error: null })
          }),
        })),
      }))

      await ReportingService.listReports()
      expect(orderCalled).toBe(true)
    })
  })

  describe('getReport', () => {
    it('should return single saved report', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'Monthly Sales',
        report_type: 'sales',
        config: { date_range: { type: 'this_month' } },
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockReport,
              error: null,
            }),
          })),
        })),
      }))

      const result = await ReportingService.getReport('report-1')

      expect(result).toBeDefined()
      expect(result?.name).toBe('Monthly Sales')
    })

    it('should return null when report not found', async () => {
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

      const result = await ReportingService.getReport('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createReport', () => {
    it('should create new saved report', async () => {
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
        if (table === 'saved_reports') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'report-1',
                    name: 'New Report',
                    report_type: 'sales',
                    is_shared: false,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const result = await ReportingService.createReport({
        name: 'New Report',
        report_type: 'sales',
        config: { date_range: { type: 'this_month' } },
      })

      expect(result.name).toBe('New Report')
      expect(result.is_shared).toBe(false)
    })

    it('should set created_by to current user', async () => {
      let insertedData: any

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
        if (table === 'saved_reports') {
          return {
            insert: vi.fn((data) => {
              insertedData = data
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { ...data, id: 'report-1' },
                    error: null,
                  }),
                })),
              }
            }),
          }
        }
        return {}
      })

      await ReportingService.createReport({
        name: 'Test Report',
        report_type: 'sales',
        config: { date_range: { type: 'today' } },
      })

      expect(insertedData.created_by).toBe('user-1')
      expect(insertedData.organization_id).toBe('org-123')
    })
  })

  describe('updateReport', () => {
    it('should update report fields', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'report-1',
                  name: 'Updated Name',
                  is_shared: true,
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const result = await ReportingService.updateReport('report-1', {
        name: 'Updated Name',
        is_shared: true,
      })

      expect(result.name).toBe('Updated Name')
      expect(result.is_shared).toBe(true)
    })

    it('should only update provided fields', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'report-1' },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      await ReportingService.updateReport('report-1', {
        name: 'New Name',
      })

      expect(updatedData.name).toBe('New Name')
      expect(updatedData.description).toBeUndefined()
      expect(updatedData.updated_at).toBeDefined()
    })

    it('should update schedule settings', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'report-1' },
                  error: null,
                }),
              })),
            })),
          }
        }),
      }))

      await ReportingService.updateReport('report-1', {
        schedule_enabled: true,
        schedule_frequency: 'weekly',
        schedule_recipients: ['user1@example.com'],
      })

      expect(updatedData.schedule_enabled).toBe(true)
      expect(updatedData.schedule_frequency).toBe('weekly')
      expect(updatedData.schedule_recipients).toEqual(['user1@example.com'])
    })
  })

  describe('deleteReport', () => {
    it('should delete report', async () => {
      let deleteCalled = false

      mockSupabase.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => {
            deleteCalled = true
            return Promise.resolve({ error: null })
          }),
        })),
      }))

      await ReportingService.deleteReport('report-1')
      expect(deleteCalled).toBe(true)
    })
  })

  describe('recordExport', () => {
    it('should record report export', async () => {
      let exportData: any

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
        if (table === 'report_exports') {
          return {
            insert: vi.fn((data) => {
              exportData = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {}
      })

      await ReportingService.recordExport({
        report_id: 'report-1',
        report_name: 'Sales Report',
        export_format: 'pdf',
        file_size: 1024,
      })

      expect(exportData.report_id).toBe('report-1')
      expect(exportData.export_format).toBe('pdf')
      expect(exportData.file_size).toBe(1024)
      expect(exportData.exported_by).toBe('user-1')
    })

    it('should record export without report_id', async () => {
      let exportData: any

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
        if (table === 'report_exports') {
          return {
            insert: vi.fn((data) => {
              exportData = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {}
      })

      await ReportingService.recordExport({
        report_name: 'Ad-hoc Export',
        export_format: 'csv',
      })

      expect(exportData.report_id).toBeNull()
      expect(exportData.report_name).toBe('Ad-hoc Export')
    })
  })

  describe('refreshViews', () => {
    it('should call refresh RPC', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

      await ReportingService.refreshViews()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('refresh_report_views')
    })

    it('should throw error on RPC failure', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        error: { message: 'RPC failed' },
      })

      await expect(ReportingService.refreshViews()).rejects.toThrow()
    })
  })
})
