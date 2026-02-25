import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock authentication API functionality
interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

interface LoginResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
  token?: string
  refreshToken?: string
  expiresAt?: number
  error?: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  password: string
  active: boolean
  lastLogin?: string
  loginAttempts: number
  lockedUntil?: string
}

class MockAuthService {
  private users: Map<string, User> = new Map()
  private sessions: Map<string, { userId: string; expiresAt: number }> = new Map()
  private maxLoginAttempts = 5
  private lockoutDuration = 15 * 60 * 1000 // 15 minutes

  constructor() {
    // Add test users
    this.users.set('admin@example.com', {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      password: 'hashedPassword123',
      active: true,
      loginAttempts: 0
    })

    this.users.set('user@example.com', {
      id: 'user-2',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
      password: 'hashedPassword456',
      active: true,
      loginAttempts: 0
    })

    this.users.set('locked@example.com', {
      id: 'user-3',
      email: 'locked@example.com',
      name: 'Locked User',
      role: 'user',
      password: 'hashedPassword789',
      active: true,
      loginAttempts: 5,
      lockedUntil: new Date(Date.now() + this.lockoutDuration).toISOString()
    })

    this.users.set('inactive@example.com', {
      id: 'user-4',
      email: 'inactive@example.com',
      name: 'Inactive User',
      role: 'user',
      password: 'hashedPassword000',
      active: false,
      loginAttempts: 0
    })
  }

  async login(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
    // Input validation
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      }
    }

    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    const user = this.users.get(email.toLowerCase())
    
    if (!user) {
      // Simulate timing attack protection
      await this.simulatePasswordHash()
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return {
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      }
    }

    // Check if account is active
    if (!user.active) {
      return {
        success: false,
        error: 'Account is deactivated'
      }
    }

    // Verify password (in real app, would use bcrypt.compare)
    const isPasswordValid = await this.verifyPassword(password, user.password)
    
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts++
      
      // Lock account if too many attempts
      if (user.loginAttempts >= this.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + this.lockoutDuration).toISOString()
      }
      
      this.users.set(email.toLowerCase(), user)
      
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0
    user.lockedUntil = undefined
    user.lastLogin = new Date().toISOString()
    this.users.set(email.toLowerCase(), user)

    // Generate tokens
    const token = this.generateToken(user.id)
    const refreshToken = this.generateRefreshToken(user.id)
    const expiresAt = Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000) // 30 days or 1 day

    // Store session
    this.sessions.set(token, {
      userId: user.id,
      expiresAt
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token,
      refreshToken,
      expiresAt
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private async simulatePasswordHash(): Promise<void> {
    // Simulate bcrypt timing to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    // Simulate bcrypt.compare timing
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simple mock verification (in real app, would use bcrypt)
    const mockPasswords: Record<string, string> = {
      'hashedPassword123': 'admin123',
      'hashedPassword456': 'user456',
      'hashedPassword789': 'locked789',
      'hashedPassword000': 'inactive000'
    }
    
    return mockPasswords[hashedPassword] === password
  }

  private generateToken(userId: string): string {
    return `token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRefreshToken(userId: string): string {
    return `refresh_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getUser(email: string): User | undefined {
    return this.users.get(email.toLowerCase())
  }

  isSessionValid(token: string): boolean {
    const session = this.sessions.get(token)
    return session ? session.expiresAt > Date.now() : false
  }
}

// Mock API handler
async function loginHandler(request: NextRequest): Promise<Response> {
  const authService = new MockAuthService()

  try {
    // Parse request body
    const body: LoginRequest = await request.json()
    const { email, password, rememberMe } = body

    // Rate limiting check (mock)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    if (await isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many login attempts. Please try again later.' 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Attempt login
    const result = await authService.login(email, password, rememberMe)

    if (result.success) {
      // Set secure cookie
      const response = new Response(
        JSON.stringify(result),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )

      response.headers.set(
        'Set-Cookie',
        `auth-token=${result.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${rememberMe ? 2592000 : 86400}`
      )

      return response
    } else {
      const statusCode = result.error?.includes('locked') ? 423 : 
                        result.error?.includes('deactivated') ? 403 : 401

      return new Response(
        JSON.stringify(result),
        { 
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request format'
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function isRateLimited(clientIP: string): Promise<boolean> {
  // Mock rate limiting - in real app would use Redis or similar
  return clientIP === 'rate-limited-ip'
}

describe('Login API', () => {
  let authService: MockAuthService

  beforeEach(() => {
    authService = new MockAuthService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('input validation', () => {
    it('should reject empty email', async () => {
      const result = await authService.login('', 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email and password are required')
    })

    it('should reject empty password', async () => {
      const result = await authService.login('user@example.com', '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email and password are required')
    })

    it('should reject invalid email format', async () => {
      const result = await authService.login('invalid-email', 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@sub.domain.com'
      ]

      for (const email of validEmails) {
        const result = await authService.login(email, 'wrongpassword')
        expect(result.error).not.toBe('Invalid email format')
      }
    })
  })

  describe('authentication', () => {
    it('should successfully authenticate valid credentials', async () => {
      const result = await authService.login('admin@example.com', 'admin123')
      
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      })
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.expiresAt).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const result = await authService.login('admin@example.com', 'wrongpassword')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
      expect(result.user).toBeUndefined()
      expect(result.token).toBeUndefined()
    })

    it('should reject non-existent user', async () => {
      const result = await authService.login('nonexistent@example.com', 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should be case insensitive for email', async () => {
      const result = await authService.login('ADMIN@EXAMPLE.COM', 'admin123')
      
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('admin@example.com')
    })
  })

  describe('account security', () => {
    it('should reject deactivated accounts', async () => {
      const result = await authService.login('inactive@example.com', 'inactive000')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Account is deactivated')
    })

    it('should reject locked accounts', async () => {
      const result = await authService.login('locked@example.com', 'locked789')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Account is temporarily locked due to too many failed login attempts')
    })

    it('should increment login attempts on failed login', async () => {
      const user = authService.getUser('user@example.com')!
      expect(user.loginAttempts).toBe(0)

      await authService.login('user@example.com', 'wrongpassword')
      
      const updatedUser = authService.getUser('user@example.com')!
      expect(updatedUser.loginAttempts).toBe(1)
    })

    it('should lock account after max failed attempts', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.login('user@example.com', 'wrongpassword')
      }

      const user = authService.getUser('user@example.com')!
      expect(user.loginAttempts).toBe(5)
      expect(user.lockedUntil).toBeDefined()

      // Next login should be rejected due to lock
      const result = await authService.login('user@example.com', 'user456')
      expect(result.success).toBe(false)
      expect(result.error).toContain('locked')
    })

    it('should reset login attempts on successful login', async () => {
      // Make some failed attempts
      await authService.login('user@example.com', 'wrongpassword')
      await authService.login('user@example.com', 'wrongpassword')

      let user = authService.getUser('user@example.com')!
      expect(user.loginAttempts).toBe(2)

      // Successful login should reset attempts
      const result = await authService.login('user@example.com', 'user456')
      expect(result.success).toBe(true)

      user = authService.getUser('user@example.com')!
      expect(user.loginAttempts).toBe(0)
      expect(user.lockedUntil).toBeUndefined()
    })

    it('should update last login timestamp', async () => {
      const beforeLogin = Date.now()
      
      const result = await authService.login('user@example.com', 'user456')
      expect(result.success).toBe(true)

      const user = authService.getUser('user@example.com')!
      expect(user.lastLogin).toBeDefined()
      expect(new Date(user.lastLogin!).getTime()).toBeGreaterThanOrEqual(beforeLogin)
    })
  })

  describe('session management', () => {
    it('should generate unique tokens', async () => {
      const result1 = await authService.login('admin@example.com', 'admin123')
      const result2 = await authService.login('user@example.com', 'user456')
      
      expect(result1.token).not.toBe(result2.token)
      expect(result1.refreshToken).not.toBe(result2.refreshToken)
    })

    it('should set longer expiration for remember me', async () => {
      const normalResult = await authService.login('user@example.com', 'user456', false)
      const rememberResult = await authService.login('admin@example.com', 'admin123', true)
      
      expect(rememberResult.expiresAt!).toBeGreaterThan(normalResult.expiresAt!)
    })

    it('should validate session tokens', async () => {
      const result = await authService.login('user@example.com', 'user456')
      
      expect(authService.isSessionValid(result.token!)).toBe(true)
      expect(authService.isSessionValid('invalid-token')).toBe(false)
    })
  })

  describe('API endpoint', () => {
    it('should handle successful login request', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
          rememberMe: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('admin@example.com')
      expect(response.headers.get('Set-Cookie')).toContain('auth-token=')
    })

    it('should handle invalid credentials', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'wrongpassword'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should handle locked account', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'locked789'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(423)
      expect(data.success).toBe(false)
      expect(data.error).toContain('locked')
    })

    it('should handle deactivated account', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'inactive@example.com',
          password: 'inactive000'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account is deactivated')
    })

    it('should handle malformed request', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request format')
    })

    it('should handle rate limiting', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': 'rate-limited-ip'
        }
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Too many login attempts')
    })

    it('should set secure cookie with remember me', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
          rememberMe: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const cookie = response.headers.get('Set-Cookie')

      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('SameSite=Strict')
      expect(cookie).toContain('Max-Age=2592000') // 30 days
    })

    it('should set shorter cookie without remember me', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
          rememberMe: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const cookie = response.headers.get('Set-Cookie')

      expect(cookie).toContain('Max-Age=86400') // 1 day
    })
  })

  describe('security considerations', () => {
    it('should have consistent timing for invalid users', async () => {
      const start1 = Date.now()
      await authService.login('nonexistent@example.com', 'password')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await authService.login('admin@example.com', 'wrongpassword')
      const time2 = Date.now() - start2

      // Times should be similar (within 50ms) to prevent timing attacks
      expect(Math.abs(time1 - time2)).toBeLessThan(50)
    })

    it('should not leak information about user existence', async () => {
      const existingUserResult = await authService.login('admin@example.com', 'wrongpassword')
      const nonExistentUserResult = await authService.login('nonexistent@example.com', 'wrongpassword')

      expect(existingUserResult.error).toBe(nonExistentUserResult.error)
    })

    it('should handle SQL injection attempts', async () => {
      const maliciousInputs = [
        "admin@example.com'; DROP TABLE users; --",
        "admin@example.com' OR '1'='1",
        "admin@example.com' UNION SELECT * FROM passwords --"
      ]

      for (const maliciousEmail of maliciousInputs) {
        const result = await authService.login(maliciousEmail, 'password')
        expect(result.success).toBe(false)
      }
    })

    it('should handle XSS attempts in input', async () => {
      const xssInputs = [
        '<script>alert("xss")</script>@example.com',
        'admin@example.com<img src=x onerror=alert(1)>',
        'javascript:alert(1)@example.com'
      ]

      for (const xssEmail of xssInputs) {
        const result = await authService.login(xssEmail, 'password')
        expect(result.success).toBe(false)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle very long inputs', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com'
      const longPassword = 'b'.repeat(1000)

      const result = await authService.login(longEmail, longPassword)
      expect(result.success).toBe(false)
    })

    it('should handle unicode characters', async () => {
      const unicodeEmail = 'üser@exämple.com'
      const unicodePassword = 'pässwörd123'

      const result = await authService.login(unicodeEmail, unicodePassword)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should handle null and undefined inputs gracefully', async () => {
      // @ts-expect-error - Testing runtime behavior
      const result1 = await authService.login(null, 'password')
      expect(result1.success).toBe(false)

      // @ts-expect-error - Testing runtime behavior
      const result2 = await authService.login('email@example.com', undefined)
      expect(result2.success).toBe(false)
    })

    it('should handle concurrent login attempts', async () => {
      const promises = Array.from({ length: 10 }, () =>
        authService.login('admin@example.com', 'admin123')
      )

      const results = await Promise.all(promises)
      
      // All should succeed
      expect(results.every(r => r.success)).toBe(true)
      
      // All should have unique tokens
      const tokens = results.map(r => r.token)
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(tokens.length)
    })
  })
})