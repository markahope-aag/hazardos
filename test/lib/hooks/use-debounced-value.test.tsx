import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )
    
    expect(result.current).toBe('initial')
    
    // Change the value
    rerender({ value: 'updated', delay: 500 })
    
    // Value should not change immediately
    expect(result.current).toBe('initial')
    
    // Fast-forward time by 499ms (just before delay)
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(result.current).toBe('initial')
    
    // Fast-forward time by 1ms more (completing the delay)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )
    
    // Change value multiple times rapidly
    rerender({ value: 'first', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    rerender({ value: 'second', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    rerender({ value: 'final', delay: 500 })
    
    // Value should still be initial after 400ms total
    expect(result.current).toBe('initial')
    
    // Complete the final delay
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // Should have the final value
    expect(result.current).toBe('final')
  })

  it('should work with different data types', () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 0, delay: 100 }
      }
    )
    
    numberRerender({ value: 42, delay: 100 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    expect(numberResult.current).toBe(42)
    
    // Test with boolean
    const { result: boolResult, rerender: boolRerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: false, delay: 100 }
      }
    )
    
    boolRerender({ value: true, delay: 100 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    expect(boolResult.current).toBe(true)
    
    // Test with object
    const initialObj = { name: 'initial' }
    const updatedObj = { name: 'updated' }
    
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: initialObj, delay: 100 }
      }
    )
    
    objRerender({ value: updatedObj, delay: 100 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    expect(objResult.current).toBe(updatedObj)
  })

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 }
      }
    )
    
    rerender({ value: 'updated', delay: 1000 })
    
    // Should not update after 500ms
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')
    
    // Should update after full 1000ms
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )
    
    // Change value and delay simultaneously
    rerender({ value: 'updated', delay: 200 })
    
    // Should update after the new delay (200ms)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('updated')
  })

  it('should clean up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    
    const { result: _, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )
    
    rerender({ value: 'updated', delay: 500 })
    
    // Unmount before timer completes
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    )
    
    rerender({ value: 'updated', delay: 0 })
    
    // Should update immediately with zero delay
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe('updated')
  })

  it('should handle same value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'same', delay: 500 }
      }
    )
    
    // Update with same value
    rerender({ value: 'same', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // Should still have the same value
    expect(result.current).toBe('same')
  })

  it('should work with undefined and null values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: undefined as string | undefined, delay: 100 }
      }
    )
    
    expect(result.current).toBeUndefined()
    
    rerender({ value: null as any, delay: 100 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    expect(result.current).toBeNull()
    
    rerender({ value: 'defined', delay: 100 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    expect(result.current).toBe('defined')
  })
})