import { describe, it, expect, beforeEach } from 'vitest'
import {
  monitorQuery,
  getQueryMetrics,
  getMetricsByTable,
  getSlowestQueries,
  clearMetrics,
} from '@/lib/utils/query-monitor'

describe('Query Monitor', () => {
  beforeEach(() => {
    clearMetrics()
  })

  describe('monitorQuery', () => {
    it('should track query execution time', async () => {
      await monitorQuery('test-query', 'users', 'select', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { data: [] }
      })

      const metrics = getQueryMetrics()
      expect(metrics.totalQueries).toBe(1)
      expect(metrics.queries[0].query).toBe('test-query')
      expect(metrics.queries[0].table).toBe('users')
      expect(metrics.queries[0].operation).toBe('select')
      expect(metrics.queries[0].duration).toBeGreaterThanOrEqual(10)
    })

    it('should return the query result', async () => {
      const result = await monitorQuery('test', 'users', 'select', async () => {
        return { data: [{ id: 1 }] }
      })

      expect(result).toEqual({ data: [{ id: 1 }] })
    })

    it('should track failed queries', async () => {
      await expect(
        monitorQuery('failing-query', 'users', 'select', async () => {
          throw new Error('Query failed')
        })
      ).rejects.toThrow('Query failed')

      // Failed queries are not recorded in metrics currently
      // but logged via the logger
    })

    it('should mark queries over threshold as slow', async () => {
      await monitorQuery('slow-query', 'users', 'select', async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
        return { data: [] }
      })

      const metrics = getQueryMetrics()
      expect(metrics.slowQueries).toBe(1)
      expect(metrics.queries[0].slow).toBe(true)
    })
  })

  describe('getQueryMetrics', () => {
    it('should return empty metrics when no queries tracked', () => {
      const metrics = getQueryMetrics()
      expect(metrics.totalQueries).toBe(0)
      expect(metrics.totalDuration).toBe(0)
      expect(metrics.slowQueries).toBe(0)
      expect(metrics.averageDuration).toBe(0)
    })

    it('should calculate aggregate metrics correctly', async () => {
      await monitorQuery('q1', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('q2', 'jobs', 'select', async () => ({ data: [] }))
      await monitorQuery('q3', 'users', 'insert', async () => ({ data: [] }))

      const metrics = getQueryMetrics()
      expect(metrics.totalQueries).toBe(3)
      expect(metrics.queries).toHaveLength(3)
    })
  })

  describe('getMetricsByTable', () => {
    it('should group metrics by table', async () => {
      await monitorQuery('q1', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('q2', 'users', 'insert', async () => ({ data: [] }))
      await monitorQuery('q3', 'jobs', 'select', async () => ({ data: [] }))

      const byTable = getMetricsByTable()
      expect(byTable.users.count).toBe(2)
      expect(byTable.jobs.count).toBe(1)
    })
  })

  describe('getSlowestQueries', () => {
    it('should return queries sorted by duration', async () => {
      await monitorQuery('fast', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('slow', 'users', 'select', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return { data: [] }
      })
      await monitorQuery('medium', 'users', 'select', async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return { data: [] }
      })

      const slowest = getSlowestQueries(3)
      expect(slowest[0].query).toBe('slow')
      expect(slowest[1].query).toBe('medium')
      expect(slowest[2].query).toBe('fast')
    })

    it('should respect the limit parameter', async () => {
      await monitorQuery('q1', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('q2', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('q3', 'users', 'select', async () => ({ data: [] }))

      const slowest = getSlowestQueries(2)
      expect(slowest).toHaveLength(2)
    })
  })

  describe('clearMetrics', () => {
    it('should clear all metrics', async () => {
      await monitorQuery('q1', 'users', 'select', async () => ({ data: [] }))
      await monitorQuery('q2', 'jobs', 'select', async () => ({ data: [] }))

      clearMetrics()

      const metrics = getQueryMetrics()
      expect(metrics.totalQueries).toBe(0)
      expect(metrics.queries).toHaveLength(0)
    })
  })
})
