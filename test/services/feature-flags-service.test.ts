import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeatureFlagsService } from '@/lib/services/feature-flags-service'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('FeatureFlagsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isFeatureEnabled', () => {
    it('should return false when user not authenticated', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabled('api_access')
      expect(result).toBe(false)
    })

    it('should return false when no profile found', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabled('api_access')
      expect(result).toBe(false)
    })

    it('should check feature for user organization', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table) => {
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
          if (table === 'organization_subscriptions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      status: 'active',
                      plan: {
                        feature_flags: {
                          api_access: true,
                          quickbooks: false,
                        },
                      },
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabled('api_access')
      expect(result).toBe(true)
    })
  })

  describe('isFeatureEnabledForOrg', () => {
    it('should return true when feature enabled in active subscription', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  status: 'active',
                  plan: {
                    feature_flags: {
                      quickbooks: true,
                      api_access: false,
                    },
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabledForOrg(
        'org-123',
        'quickbooks'
      )
      expect(result).toBe(true)
    })

    it('should return false when feature disabled', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  status: 'active',
                  plan: {
                    feature_flags: {
                      quickbooks: false,
                    },
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabledForOrg(
        'org-123',
        'quickbooks'
      )
      expect(result).toBe(false)
    })

    it('should return false when subscription inactive', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  status: 'canceled',
                  plan: {
                    feature_flags: {
                      quickbooks: true,
                    },
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabledForOrg(
        'org-123',
        'quickbooks'
      )
      expect(result).toBe(false)
    })

    it('should return true for trialing subscriptions', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  status: 'trialing',
                  plan: {
                    feature_flags: {
                      api_access: true,
                    },
                  },
                },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.isFeatureEnabledForOrg(
        'org-123',
        'api_access'
      )
      expect(result).toBe(true)
    })
  })

  describe('checkUsageWarnings', () => {
    it('should return no warnings when under limits', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  plan: {
                    max_users: 10,
                    max_jobs_per_month: 100,
                    max_storage_gb: 50,
                  },
                  users_count: 3,
                  jobs_this_month: 20,
                  storage_used_mb: 5000,
                },
                error: null,
              }),
            })),
          })),
        })),
      } as any)

      const warnings = await FeatureFlagsService.checkUsageWarnings('org-123')
      expect(warnings).toHaveLength(0)
    })

    it('should return warning when approaching user limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: {
                  max_users: 10,
                  max_jobs_per_month: null,
                  max_storage_gb: null,
                },
                users_count: 8,
                jobs_this_month: 0,
                storage_used_mb: 0,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const warnings = await FeatureFlagsService.checkUsageWarnings('org-123')
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0]).toMatchObject({
        type: 'users',
        current: 8,
        limit: 10,
        level: 'warning',
      })
    })

    it('should return critical warning when near limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: {
                  max_users: 10,
                  max_jobs_per_month: null,
                  max_storage_gb: null,
                },
                users_count: 9,
                jobs_this_month: 0,
                storage_used_mb: 0,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const warnings = await FeatureFlagsService.checkUsageWarnings('org-123')
      expect(warnings[0].level).toBe('critical')
    })

    it('should return exceeded warning when over limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: {
                  max_users: null,
                  max_jobs_per_month: 100,
                  max_storage_gb: null,
                },
                users_count: 0,
                jobs_this_month: 105,
                storage_used_mb: 0,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const warnings = await FeatureFlagsService.checkUsageWarnings('org-123')
      expect(warnings[0]).toMatchObject({
        type: 'jobs',
        level: 'exceeded',
        current: 105,
        limit: 100,
      })
    })

    it('should check storage in GB correctly', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: {
                  max_users: null,
                  max_jobs_per_month: null,
                  max_storage_gb: 10,
                },
                users_count: 0,
                jobs_this_month: 0,
                storage_used_mb: 8500, // 8.3 GB
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const warnings = await FeatureFlagsService.checkUsageWarnings('org-123')
      expect(warnings[0]).toMatchObject({
        type: 'storage',
        level: 'warning',
        limit: 10,
      })
      expect(warnings[0].current).toBeCloseTo(8.3, 1)
    })
  })

  describe('canAddUser', () => {
    it('should return true when under user limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_users: 10 },
                users_count: 5,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canAddUser('org-123')
      expect(result).toBe(true)
    })

    it('should return false when at user limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_users: 10 },
                users_count: 10,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canAddUser('org-123')
      expect(result).toBe(false)
    })

    it('should return true when no user limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_users: null },
                users_count: 100,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canAddUser('org-123')
      expect(result).toBe(true)
    })
  })

  describe('canCreateJob', () => {
    it('should return true when under job limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_jobs_per_month: 100 },
                jobs_this_month: 50,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canCreateJob('org-123')
      expect(result).toBe(true)
    })

    it('should return false when at job limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_jobs_per_month: 100 },
                jobs_this_month: 100,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canCreateJob('org-123')
      expect(result).toBe(false)
    })

    it('should return true when no job limit', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: {
                plan: { max_jobs_per_month: null },
                jobs_this_month: 1000,
              },
              error: null,
            }),
          })),
        })),
      } as any)

      const result = await FeatureFlagsService.canCreateJob('org-123')
      expect(result).toBe(true)
    })
  })

  describe('getUsageLimits', () => {
    it('should return usage limits for authenticated user', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table) => {
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
          if (table === 'organization_subscriptions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      plan: {
                        max_users: 20,
                        max_jobs_per_month: 200,
                        max_storage_gb: 100,
                      },
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const limits = await FeatureFlagsService.getUsageLimits()
      expect(limits).toEqual({
        maxUsers: 20,
        maxJobsPerMonth: 200,
        maxStorageGb: 100,
      })
    })

    it('should return default limits when no subscription', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table) => {
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
          if (table === 'organization_subscriptions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const limits = await FeatureFlagsService.getUsageLimits()
      expect(limits).toEqual({
        maxUsers: 3,
        maxJobsPerMonth: 50,
        maxStorageGb: 5,
      })
    })
  })
})
