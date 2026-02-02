/**
 * Database Query Performance Monitor
 *
 * Tracks query execution times and logs slow queries for debugging.
 * Use in development to identify performance bottlenecks.
 */

import { createRequestLogger } from '@/lib/utils/logger'

const log = createRequestLogger({ requestId: 'query-monitor' })

// Threshold for slow query warnings (ms)
const SLOW_QUERY_THRESHOLD = 500
const VERY_SLOW_QUERY_THRESHOLD = 2000

interface QueryMetrics {
  query: string
  table: string
  operation: string
  duration: number
  timestamp: Date
  slow: boolean
}

interface AggregateMetrics {
  totalQueries: number
  totalDuration: number
  slowQueries: number
  averageDuration: number
  queries: QueryMetrics[]
}

// In-memory storage for metrics (resets on server restart)
const queryMetrics: QueryMetrics[] = []
const MAX_STORED_QUERIES = 1000

/**
 * Wrap a Supabase query with performance monitoring
 */
export async function monitorQuery<T>(
  queryName: string,
  table: string,
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    const result = await queryFn()
    const duration = Math.round(performance.now() - start)

    recordQuery({
      query: queryName,
      table,
      operation,
      duration,
      timestamp: new Date(),
      slow: duration > SLOW_QUERY_THRESHOLD,
    })

    // Log slow queries
    if (duration > VERY_SLOW_QUERY_THRESHOLD) {
      log.error({
        msg: 'Very slow query detected',
        query: queryName,
        table,
        operation,
        duration: `${duration}ms`,
      })
    } else if (duration > SLOW_QUERY_THRESHOLD) {
      log.warn({
        msg: 'Slow query detected',
        query: queryName,
        table,
        operation,
        duration: `${duration}ms`,
      })
    }

    return result
  } catch (error) {
    const duration = Math.round(performance.now() - start)
    log.error({
      msg: 'Query failed',
      query: queryName,
      table,
      operation,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Record query metrics
 */
function recordQuery(metrics: QueryMetrics): void {
  queryMetrics.push(metrics)

  // Keep only the last N queries
  if (queryMetrics.length > MAX_STORED_QUERIES) {
    queryMetrics.shift()
  }
}

/**
 * Get aggregate metrics for all recorded queries
 */
export function getQueryMetrics(): AggregateMetrics {
  const totalQueries = queryMetrics.length
  const totalDuration = queryMetrics.reduce((sum, q) => sum + q.duration, 0)
  const slowQueries = queryMetrics.filter((q) => q.slow).length

  return {
    totalQueries,
    totalDuration,
    slowQueries,
    averageDuration: totalQueries > 0 ? Math.round(totalDuration / totalQueries) : 0,
    queries: [...queryMetrics],
  }
}

/**
 * Get metrics grouped by table
 */
export function getMetricsByTable(): Record<string, {
  count: number
  totalDuration: number
  avgDuration: number
  slowCount: number
}> {
  const byTable: Record<string, QueryMetrics[]> = {}

  for (const query of queryMetrics) {
    if (!byTable[query.table]) {
      byTable[query.table] = []
    }
    byTable[query.table].push(query)
  }

  const result: Record<string, {
    count: number
    totalDuration: number
    avgDuration: number
    slowCount: number
  }> = {}

  for (const [table, queries] of Object.entries(byTable)) {
    const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0)
    result[table] = {
      count: queries.length,
      totalDuration,
      avgDuration: Math.round(totalDuration / queries.length),
      slowCount: queries.filter((q) => q.slow).length,
    }
  }

  return result
}

/**
 * Get the slowest queries
 */
export function getSlowestQueries(limit = 10): QueryMetrics[] {
  return [...queryMetrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
}

/**
 * Clear all recorded metrics
 */
export function clearMetrics(): void {
  queryMetrics.length = 0
}

/**
 * Create a monitored Supabase client wrapper
 */
export function createMonitoredQuery(supabase: {
  from: (table: string) => unknown
}) {
  return {
    from: (table: string) => {
      const builder = supabase.from(table)
      return new Proxy(builder as object, {
        get(target, prop) {
          const value = (target as Record<string | symbol, unknown>)[prop]
          if (typeof value === 'function') {
            return (...args: unknown[]) => {
              const operation = String(prop)
              const result = (value as (...args: unknown[]) => unknown).apply(target, args)

              // If it returns a promise-like object with then
              if (result && typeof result === 'object' && 'then' in result) {
                const start = performance.now()
                return (result as Promise<unknown>).then((data) => {
                  const duration = Math.round(performance.now() - start)
                  recordQuery({
                    query: `${table}.${operation}`,
                    table,
                    operation,
                    duration,
                    timestamp: new Date(),
                    slow: duration > SLOW_QUERY_THRESHOLD,
                  })

                  if (duration > SLOW_QUERY_THRESHOLD) {
                    log.warn({
                      msg: 'Slow query',
                      table,
                      operation,
                      duration: `${duration}ms`,
                    })
                  }

                  return data
                })
              }

              return result
            }
          }
          return value
        },
      })
    },
  }
}
