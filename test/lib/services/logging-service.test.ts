import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock logging service functionality
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  requestId?: string
  service?: string
}

interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  maxFileSize: number
  maxFiles: number
  remoteEndpoint?: string
}

class LoggingService {
  private logs: LogEntry[] = []
  private config: LoggerConfig
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  }

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.config.level]
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      userId: context?.userId,
      requestId: context?.requestId,
      service: context?.service
    }
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    // Store in memory
    this.logs.push(entry)

    // Keep only recent logs to prevent memory issues
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000)
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry)
    }

    // File output (mocked)
    if (this.config.enableFile) {
      await this.writeToFile(entry)
    }

    // Remote output (mocked)
    if (this.config.enableRemote) {
      await this.writeToRemote(entry)
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp
    const level = entry.level.toUpperCase().padEnd(5)
    const message = entry.message
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    
    console.log(`[${timestamp}] ${level} ${message}${context}`)
    
    if (entry.error) {
      console.error(entry.error)
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    // Mock file writing
    const _logLine = JSON.stringify(entry) + '\n'
    // In real implementation, would write to file system
    await new Promise(resolve => setTimeout(resolve, 1))
  }

  private async writeToRemote(_entry: LogEntry): Promise<void> {
    // Mock remote logging
    if (!this.config.remoteEndpoint) return
    
    try {
      // In real implementation, would send HTTP request
      await new Promise(resolve => setTimeout(resolve, 10))
    } catch (error) {
      // Fallback to console if remote fails
      console.error('Failed to send log to remote endpoint:', error)
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return
    
    const entry = this.createLogEntry('debug', message, context)
    this.writeLog(entry)
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return
    
    const entry = this.createLogEntry('info', message, context)
    this.writeLog(entry)
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return
    
    const entry = this.createLogEntry('warn', message, context)
    this.writeLog(entry)
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return
    
    const entry = this.createLogEntry('error', message, context, error)
    this.writeLog(entry)
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog('fatal')) return
    
    const entry = this.createLogEntry('fatal', message, context, error)
    this.writeLog(entry)
  }

  // Structured logging methods
  logRequest(method: string, url: string, statusCode: number, duration: number, context?: Record<string, any>): void {
    this.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ...context
    })
  }

  logDatabaseQuery(query: string, duration: number, context?: Record<string, any>): void {
    this.debug('Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      ...context
    })
  }

  logUserAction(userId: string, action: string, resource?: string, context?: Record<string, any>): void {
    this.info('User Action', {
      userId,
      action,
      resource,
      ...context
    })
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>): void {
    const level: LogLevel = severity === 'critical' ? 'fatal' : 
                           severity === 'high' ? 'error' :
                           severity === 'medium' ? 'warn' : 'info'
    
    const entry = this.createLogEntry(level, `Security Event: ${event}`, {
      securityEvent: true,
      severity,
      ...context
    })
    
    this.writeLog(entry)
  }

  // Query and analysis methods
  getLogs(options: {
    level?: LogLevel
    service?: string
    userId?: string
    requestId?: string
    startTime?: string
    endTime?: string
    limit?: number
    offset?: number
  } = {}): LogEntry[] {
    let filtered = [...this.logs]

    if (options.level) {
      const minPriority = this.levelPriority[options.level]
      filtered = filtered.filter(log => this.levelPriority[log.level] >= minPriority)
    }

    if (options.service) {
      filtered = filtered.filter(log => log.service === options.service)
    }

    if (options.userId) {
      filtered = filtered.filter(log => log.userId === options.userId)
    }

    if (options.requestId) {
      filtered = filtered.filter(log => log.requestId === options.requestId)
    }

    if (options.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime!)
    }

    if (options.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime!)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || 100
    
    return filtered.slice(offset, offset + limit)
  }

  getLogStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    byService: Record<string, number>
    recentErrors: number
    oldestLog?: string
    newestLog?: string
  } {
    const total = this.logs.length
    
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    }

    const byService: Record<string, number> = {}

    this.logs.forEach(log => {
      byLevel[log.level]++
      
      if (log.service) {
        byService[log.service] = (byService[log.service] || 0) + 1
      }
    })

    // Count errors in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentErrors = this.logs.filter(log => 
      (log.level === 'error' || log.level === 'fatal') && 
      log.timestamp >= oneHourAgo
    ).length

    const timestamps = this.logs.map(log => log.timestamp).sort()
    const oldestLog = timestamps.length > 0 ? timestamps[0] : undefined
    const newestLog = timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined

    return {
      total,
      byLevel,
      byService,
      recentErrors,
      oldestLog,
      newestLog
    }
  }

  searchLogs(query: string, options: { caseSensitive?: boolean; limit?: number } = {}): LogEntry[] {
    const { caseSensitive = false, limit = 100 } = options
    const searchTerm = caseSensitive ? query : query.toLowerCase()

    const matches = this.logs.filter(log => {
      const message = caseSensitive ? log.message : log.message.toLowerCase()
      const contextStr = log.context ? JSON.stringify(log.context) : ''
      const searchableContent = caseSensitive ? contextStr : contextStr.toLowerCase()
      
      return message.includes(searchTerm) || searchableContent.includes(searchTerm)
    })

    return matches.slice(0, limit)
  }

  // Configuration methods
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  getLevel(): LogLevel {
    return this.config.level
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // Cleanup methods
  clearLogs(): void {
    this.logs = []
  }

  clearOldLogs(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()
    const initialCount = this.logs.length
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime)
    
    return initialCount - this.logs.length
  }

  // Child logger creation
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context)
  }
}

class ChildLogger {
  constructor(
    private parent: LoggingService,
    private defaultContext: Record<string, any>
  ) {}

  private mergeContext(context?: Record<string, any>): Record<string, any> {
    return { ...this.defaultContext, ...context }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.parent.debug(message, this.mergeContext(context))
  }

  info(message: string, context?: Record<string, any>): void {
    this.parent.info(message, this.mergeContext(context))
  }

  warn(message: string, context?: Record<string, any>): void {
    this.parent.warn(message, this.mergeContext(context))
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.parent.error(message, error, this.mergeContext(context))
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.parent.fatal(message, error, this.mergeContext(context))
  }
}

describe('LoggingService', () => {
  let logger: LoggingService
  let consoleSpy: any

  beforeEach(() => {
    logger = new LoggingService({ enableConsole: false }) // Disable console for tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('basic logging', () => {
    it('should log messages at different levels', () => {
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')
      logger.fatal('Fatal message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(4) // debug is filtered out by default level (info)
      
      const levels = logs.map(log => log.level)
      expect(levels).toContain('info')
      expect(levels).toContain('warn')
      expect(levels).toContain('error')
      expect(levels).toContain('fatal')
    })

    it('should respect log level filtering', () => {
      logger.setLevel('warn')
      
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(2) // Only warn and error
      expect(logs.every(log => ['warn', 'error'].includes(log.level))).toBe(true)
    })

    it('should include context in log entries', () => {
      const context = { userId: 'user-123', action: 'login' }
      logger.info('User logged in', context)

      const logs = logger.getLogs()
      expect(logs[0].context).toEqual(context)
      expect(logs[0].userId).toBe('user-123')
    })

    it('should include error objects', () => {
      const error = new Error('Test error')
      logger.error('Something went wrong', error, { component: 'auth' })

      const logs = logger.getLogs()
      expect(logs[0].error).toBe(error)
      expect(logs[0].context?.component).toBe('auth')
    })
  })

  describe('structured logging', () => {
    it('should log HTTP requests', () => {
      logger.logRequest('GET', '/api/users', 200, 150, { userId: 'user-123' })

      const logs = logger.getLogs()
      expect(logs[0].message).toBe('HTTP Request')
      expect(logs[0].context).toMatchObject({
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        duration: 150,
        userId: 'user-123'
      })
    })

    it('should log database queries', () => {
      logger.logDatabaseQuery('SELECT * FROM users WHERE id = ?', 25, { table: 'users' })

      const logs = logger.getLogs()
      expect(logs[0].message).toBe('Database Query')
      expect(logs[0].context?.query).toBe('SELECT * FROM users WHERE id = ?')
      expect(logs[0].context?.duration).toBe(25)
    })

    it('should log user actions', () => {
      logger.logUserAction('user-123', 'create', 'job', { jobId: 'job-456' })

      const logs = logger.getLogs()
      expect(logs[0].message).toBe('User Action')
      expect(logs[0].context).toMatchObject({
        userId: 'user-123',
        action: 'create',
        resource: 'job',
        jobId: 'job-456'
      })
    })

    it('should log security events with appropriate levels', () => {
      logger.logSecurityEvent('Failed login attempt', 'medium', { ip: '192.168.1.1' })
      logger.logSecurityEvent('SQL injection detected', 'critical', { query: 'malicious' })

      const logs = logger.getLogs()
      expect(logs[1].level).toBe('warn') // medium severity
      expect(logs[0].level).toBe('fatal') // critical severity
      expect(logs[0].context?.securityEvent).toBe(true)
    })
  })

  describe('log querying', () => {
    beforeEach(() => {
      logger.info('Info message', { service: 'auth', userId: 'user-1' })
      logger.warn('Warning message', { service: 'api', userId: 'user-2' })
      logger.error('Error message', { service: 'auth', userId: 'user-1' })
      logger.fatal('Fatal message', { service: 'db' })
    })

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogs({ level: 'error' })
      expect(errorLogs).toHaveLength(2) // error and fatal
      expect(errorLogs.every(log => ['error', 'fatal'].includes(log.level))).toBe(true)
    })

    it('should filter logs by service', () => {
      const authLogs = logger.getLogs({ service: 'auth' })
      expect(authLogs).toHaveLength(2)
      expect(authLogs.every(log => log.service === 'auth')).toBe(true)
    })

    it('should filter logs by user', () => {
      const user1Logs = logger.getLogs({ userId: 'user-1' })
      expect(user1Logs).toHaveLength(2)
      expect(user1Logs.every(log => log.userId === 'user-1')).toBe(true)
    })

    it('should handle pagination', () => {
      const page1 = logger.getLogs({ limit: 2, offset: 0 })
      const page2 = logger.getLogs({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      expect(page1[0].id).not.toBe(page2[0].id)
    })

    it('should filter by time range', () => {
      const now = new Date().toISOString()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const recentLogs = logger.getLogs({ startTime: oneHourAgo, endTime: now })
      expect(recentLogs).toHaveLength(4) // All logs are recent
    })
  })

  describe('log statistics', () => {
    beforeEach(() => {
      logger.info('Info 1', { service: 'auth' })
      logger.info('Info 2', { service: 'api' })
      logger.warn('Warning 1', { service: 'auth' })
      logger.error('Error 1', { service: 'db' })
      logger.fatal('Fatal 1')
    })

    it('should provide comprehensive statistics', () => {
      const stats = logger.getLogStats()

      expect(stats.total).toBe(5)
      expect(stats.byLevel.info).toBe(2)
      expect(stats.byLevel.warn).toBe(1)
      expect(stats.byLevel.error).toBe(1)
      expect(stats.byLevel.fatal).toBe(1)
      expect(stats.byService.auth).toBe(2)
      expect(stats.byService.api).toBe(1)
      expect(stats.byService.db).toBe(1)
      expect(stats.recentErrors).toBe(2) // error + fatal
    })
  })

  describe('log searching', () => {
    beforeEach(() => {
      logger.info('User authentication successful', { userId: 'user-123' })
      logger.warn('Authentication failed for user', { userId: 'user-456' })
      logger.error('Database connection error', { database: 'postgres' })
    })

    it('should search log messages', () => {
      const results = logger.searchLogs('authentication')
      expect(results).toHaveLength(2)
      expect(results.every(log => log.message.toLowerCase().includes('authentication'))).toBe(true)
    })

    it('should search log context', () => {
      const results = logger.searchLogs('user-123')
      expect(results).toHaveLength(1)
      expect(results[0].context?.userId).toBe('user-123')
    })

    it('should handle case sensitivity', () => {
      const caseSensitive = logger.searchLogs('Authentication', { caseSensitive: true })
      const caseInsensitive = logger.searchLogs('Authentication', { caseSensitive: false })

      expect(caseSensitive).toHaveLength(1) // Only "Authentication failed"
      expect(caseInsensitive).toHaveLength(2) // Both "authentication" entries
    })

    it('should limit search results', () => {
      const results = logger.searchLogs('user', { limit: 1 })
      expect(results).toHaveLength(1)
    })
  })

  describe('configuration', () => {
    it('should update log level', () => {
      expect(logger.getLevel()).toBe('info')
      
      logger.setLevel('error')
      expect(logger.getLevel()).toBe('error')
      
      logger.info('This should not be logged')
      logger.error('This should be logged')
      
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
    })

    it('should update configuration', () => {
      const newConfig = { enableFile: true, maxFileSize: 5000000 }
      logger.setConfig(newConfig)
      
      const config = logger.getConfig()
      expect(config.enableFile).toBe(true)
      expect(config.maxFileSize).toBe(5000000)
    })
  })

  describe('cleanup operations', () => {
    beforeEach(() => {
      logger.info('Message 1')
      logger.warn('Message 2')
      logger.error('Message 3')
    })

    it('should clear all logs', () => {
      expect(logger.getLogs()).toHaveLength(3)
      
      logger.clearLogs()
      
      expect(logger.getLogs()).toHaveLength(0)
    })

    it('should clear old logs', () => {
      // Mock old timestamps
      const _logs = logger.getLogs()
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      
      // Make first log old
      logger['logs'][logger['logs'].length - 1].timestamp = oldTime
      
      const removedCount = logger.clearOldLogs(24) // Remove logs older than 24 hours
      
      expect(removedCount).toBe(1)
      expect(logger.getLogs()).toHaveLength(2)
    })
  })

  describe('child loggers', () => {
    it('should create child logger with default context', () => {
      const childLogger = logger.child({ service: 'auth', requestId: 'req-123' })
      
      childLogger.info('Authentication started')
      childLogger.error('Authentication failed', new Error('Invalid credentials'))
      
      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs.every(log => log.context?.service === 'auth')).toBe(true)
      expect(logs.every(log => log.context?.requestId === 'req-123')).toBe(true)
    })

    it('should merge context in child logger', () => {
      const childLogger = logger.child({ service: 'auth' })
      
      childLogger.info('Login attempt', { userId: 'user-123', ip: '192.168.1.1' })
      
      const logs = logger.getLogs()
      expect(logs[0].context).toMatchObject({
        service: 'auth',
        userId: 'user-123',
        ip: '192.168.1.1'
      })
    })

    it('should allow context override in child logger', () => {
      const childLogger = logger.child({ service: 'auth', environment: 'dev' })
      
      childLogger.info('Production issue', { environment: 'prod' })
      
      const logs = logger.getLogs()
      expect(logs[0].context?.service).toBe('auth')
      expect(logs[0].context?.environment).toBe('prod') // Overridden
    })
  })

  describe('integration tests', () => {
    it('should handle complex logging scenario', () => {
      // Simulate request processing
      const requestId = 'req-abc123'
      const userId = 'user-456'
      
      const requestLogger = logger.child({ requestId, service: 'api' })
      
      requestLogger.info('Request started', { method: 'POST', url: '/api/jobs' })
      requestLogger.logUserAction(userId, 'create', 'job', { jobType: 'asbestos' })
      requestLogger.logDatabaseQuery('INSERT INTO jobs (...) VALUES (...)', 45)
      requestLogger.info('Request completed', { statusCode: 201, duration: 150 })
      
      // Verify all logs have request context
      const requestLogs = logger.getLogs({ requestId })
      expect(requestLogs).toHaveLength(4)
      expect(requestLogs.every(log => log.requestId === requestId)).toBe(true)
      expect(requestLogs.every(log => log.context?.service === 'api')).toBe(true)
      
      // Check statistics
      const stats = logger.getLogStats()
      expect(stats.total).toBe(4)
      expect(stats.byService.api).toBe(4)
    })

    it('should handle error tracking and alerting', () => {
      // Simulate error conditions
      logger.error('Database connection failed', new Error('Connection timeout'), {
        service: 'db',
        database: 'postgres',
        severity: 'high'
      })
      
      logger.logSecurityEvent('Suspicious login pattern', 'high', {
        userId: 'user-789',
        ip: '192.168.1.100',
        attempts: 5
      })
      
      logger.fatal('Service unavailable', new Error('Out of memory'), {
        service: 'api',
        memory: '95%'
      })
      
      // Query for critical issues
      const criticalLogs = logger.getLogs({ level: 'error' })
      expect(criticalLogs).toHaveLength(3)
      
      const securityLogs = logger.searchLogs('security')
      expect(securityLogs).toHaveLength(1)
      expect(securityLogs[0].context?.securityEvent).toBe(true)
      
      const stats = logger.getLogStats()
      expect(stats.recentErrors).toBe(3)
    })
  })
})