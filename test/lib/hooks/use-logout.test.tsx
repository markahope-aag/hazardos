import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLogout } from '@/lib/hooks/use-logout'

// Mock dependencies
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockToast = vi.fn()
const mockSignOut = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return logout function', () => {
    const { result } = renderHook(() => useLogout())
    
    expect(typeof result.current.logout).toBe('function')
  })

  it('should handle successful logout', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    
    const { result } = renderHook(() => useLogout())
    
    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
    })
    
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Signed out successfully',
      description: 'You have been logged out.',
    })
    expect(mockPush).toHaveBeenCalledWith('/login')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(logoutResult).toBe(true)
  })

  it('should handle logout error from Supabase', async () => {
    const mockError = { message: 'Sign out failed' }
    mockSignOut.mockResolvedValue({ error: mockError })
    
    const { result } = renderHook(() => useLogout())
    
    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
    })
    
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error signing out',
      description: 'Sign out failed',
      variant: 'destructive',
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(logoutResult).toBe(false)
  })

  it('should handle unexpected errors', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'))
    
    const { result } = renderHook(() => useLogout())
    
    let logoutResult: boolean | undefined
    await act(async () => {
      logoutResult = await result.current.logout()
    })
    
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'An unexpected error occurred while signing out.',
      variant: 'destructive',
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(logoutResult).toBe(false)
  })

  it('should call Supabase signOut method', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    
    const { result } = renderHook(() => useLogout())
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockSignOut).toHaveBeenCalledWith()
  })

  it('should navigate to login page only on successful logout', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    
    const { result } = renderHook(() => useLogout())
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockPush).toHaveBeenCalledWith('/login')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('should not navigate on failed logout', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Failed' } })
    
    const { result } = renderHook(() => useLogout())
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('should show appropriate toast messages', async () => {
    // Test success toast
    mockSignOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useLogout())
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Signed out successfully',
      description: 'You have been logged out.',
    })
    
    // Reset and test error toast
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: { message: 'Custom error' } })
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error signing out',
      description: 'Custom error',
      variant: 'destructive',
    })
  })

  it('should return boolean indicating success/failure', async () => {
    // Test successful logout returns true
    mockSignOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useLogout())
    
    let successResult: boolean | undefined
    await act(async () => {
      successResult = await result.current.logout()
    })
    expect(successResult).toBe(true)
    
    // Test failed logout returns false
    mockSignOut.mockResolvedValue({ error: { message: 'Failed' } })
    
    let failureResult: boolean | undefined
    await act(async () => {
      failureResult = await result.current.logout()
    })
    expect(failureResult).toBe(false)
  })
})