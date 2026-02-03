import { describe, it, expect } from 'vitest'

// Mock CORS middleware functionality
function createCorsMiddleware(options: {
  origin?: string | string[] | boolean
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
} = {}) {
  return function corsMiddleware(req: any, res: any, next: any) {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization'],
      credentials = false
    } = options

    // Set CORS headers
    if (typeof origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin
      if (requestOrigin && origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      }
    } else if (origin === true) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    }

    res.setHeader('Access-Control-Allow-Methods', methods.join(', '))
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '))

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    next()
  }
}

describe('CORS middleware', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: any

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {}
    }
    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn()
    }
    mockNext = vi.fn()
  })

  it('should set default CORS headers', () => {
    const middleware = createCorsMiddleware()
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    expect(mockNext).toHaveBeenCalled()
  })

  it('should handle specific origin', () => {
    const middleware = createCorsMiddleware({ origin: 'https://example.com' })
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com')
  })

  it('should handle array of origins', () => {
    const allowedOrigins = ['https://app.com', 'https://admin.com']
    const middleware = createCorsMiddleware({ origin: allowedOrigins })
    
    mockReq.headers.origin = 'https://app.com'
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.com')
  })

  it('should not set origin for disallowed origins', () => {
    const allowedOrigins = ['https://app.com']
    const middleware = createCorsMiddleware({ origin: allowedOrigins })
    
    mockReq.headers.origin = 'https://malicious.com'
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://malicious.com')
  })

  it('should handle credentials option', () => {
    const middleware = createCorsMiddleware({ credentials: true })
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
  })

  it('should handle custom methods', () => {
    const middleware = createCorsMiddleware({ methods: ['GET', 'POST'] })
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST')
  })

  it('should handle custom headers', () => {
    const middleware = createCorsMiddleware({ allowedHeaders: ['X-Custom-Header'] })
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'X-Custom-Header')
  })

  it('should handle OPTIONS preflight request', () => {
    const middleware = createCorsMiddleware()
    mockReq.method = 'OPTIONS'
    
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.end).toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should call next for non-OPTIONS requests', () => {
    const middleware = createCorsMiddleware()
    mockReq.method = 'POST'
    
    middleware(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
    expect(mockRes.end).not.toHaveBeenCalled()
  })

  it('should work with dynamic origin function', () => {
    const middleware = createCorsMiddleware({ origin: true })
    mockReq.headers.origin = 'https://dynamic.com'
    
    middleware(mockReq, mockRes, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://dynamic.com')
  })
})