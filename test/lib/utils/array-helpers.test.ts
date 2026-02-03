import { describe, it, expect } from 'vitest'

// Mock array helper functions
function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return []
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item)
  }, [])
}

function intersection<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => arr2.includes(item))
}

function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => !arr2.includes(item))
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function sample<T>(array: T[], count: number = 1): T[] {
  const shuffled = shuffle(array)
  return shuffled.slice(0, count)
}

function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = []
  const falsy: T[] = []
  
  array.forEach(item => {
    if (predicate(item)) {
      truthy.push(item)
    } else {
      falsy.push(item)
    }
  })
  
  return [truthy, falsy]
}

describe('array helpers', () => {
  describe('chunk', () => {
    it('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8]
      const result = chunk(array, 3)
      
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8]])
    })

    it('should handle exact divisions', () => {
      const array = [1, 2, 3, 4, 5, 6]
      const result = chunk(array, 2)
      
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]])
    })

    it('should handle empty array', () => {
      expect(chunk([], 3)).toEqual([])
    })

    it('should handle size larger than array', () => {
      const array = [1, 2, 3]
      const result = chunk(array, 5)
      
      expect(result).toEqual([[1, 2, 3]])
    })

    it('should handle invalid size', () => {
      const array = [1, 2, 3]
      expect(chunk(array, 0)).toEqual([])
      expect(chunk(array, -1)).toEqual([])
    })
  })

  describe('unique', () => {
    it('should remove duplicates', () => {
      const array = [1, 2, 2, 3, 3, 3, 4]
      expect(unique(array)).toEqual([1, 2, 3, 4])
    })

    it('should handle strings', () => {
      const array = ['a', 'b', 'a', 'c', 'b']
      expect(unique(array)).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty array', () => {
      expect(unique([])).toEqual([])
    })

    it('should handle array with no duplicates', () => {
      const array = [1, 2, 3, 4]
      expect(unique(array)).toEqual([1, 2, 3, 4])
    })
  })

  describe('groupBy', () => {
    const users = [
      { name: 'Alice', role: 'admin', age: 30 },
      { name: 'Bob', role: 'user', age: 25 },
      { name: 'Charlie', role: 'admin', age: 35 },
      { name: 'David', role: 'user', age: 28 }
    ]

    it('should group by role', () => {
      const result = groupBy(users, 'role')
      
      expect(result.admin).toHaveLength(2)
      expect(result.user).toHaveLength(2)
      expect(result.admin[0].name).toBe('Alice')
      expect(result.admin[1].name).toBe('Charlie')
    })

    it('should group by age', () => {
      const result = groupBy(users, 'age')
      
      expect(result['30']).toHaveLength(1)
      expect(result['25']).toHaveLength(1)
      expect(result['35']).toHaveLength(1)
      expect(result['28']).toHaveLength(1)
    })

    it('should handle empty array', () => {
      expect(groupBy([], 'role')).toEqual({})
    })
  })

  describe('sortBy', () => {
    const items = [
      { name: 'Charlie', score: 85 },
      { name: 'Alice', score: 92 },
      { name: 'Bob', score: 78 }
    ]

    it('should sort by name ascending', () => {
      const result = sortBy(items, 'name', 'asc')
      
      expect(result[0].name).toBe('Alice')
      expect(result[1].name).toBe('Bob')
      expect(result[2].name).toBe('Charlie')
    })

    it('should sort by score descending', () => {
      const result = sortBy(items, 'score', 'desc')
      
      expect(result[0].score).toBe(92)
      expect(result[1].score).toBe(85)
      expect(result[2].score).toBe(78)
    })

    it('should default to ascending', () => {
      const result = sortBy(items, 'score')
      
      expect(result[0].score).toBe(78)
      expect(result[1].score).toBe(85)
      expect(result[2].score).toBe(92)
    })

    it('should not mutate original array', () => {
      const original = [...items]
      sortBy(items, 'name')
      
      expect(items).toEqual(original)
    })
  })

  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      const nested = [1, [2, 3], [4, [5, 6]], 7]
      expect(flatten(nested)).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    it('should handle already flat array', () => {
      const flat = [1, 2, 3, 4]
      expect(flatten(flat)).toEqual([1, 2, 3, 4])
    })

    it('should handle empty array', () => {
      expect(flatten([])).toEqual([])
    })

    it('should handle deeply nested arrays', () => {
      const deep = [1, [2, [3, [4, 5]]]]
      expect(flatten(deep)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('intersection', () => {
    it('should find common elements', () => {
      const arr1 = [1, 2, 3, 4, 5]
      const arr2 = [3, 4, 5, 6, 7]
      
      expect(intersection(arr1, arr2)).toEqual([3, 4, 5])
    })

    it('should handle no intersection', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [4, 5, 6]
      
      expect(intersection(arr1, arr2)).toEqual([])
    })

    it('should handle identical arrays', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [1, 2, 3]
      
      expect(intersection(arr1, arr2)).toEqual([1, 2, 3])
    })

    it('should handle empty arrays', () => {
      expect(intersection([], [1, 2, 3])).toEqual([])
      expect(intersection([1, 2, 3], [])).toEqual([])
    })
  })

  describe('difference', () => {
    it('should find elements in first array but not second', () => {
      const arr1 = [1, 2, 3, 4, 5]
      const arr2 = [3, 4, 5, 6, 7]
      
      expect(difference(arr1, arr2)).toEqual([1, 2])
    })

    it('should handle no difference', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [1, 2, 3, 4, 5]
      
      expect(difference(arr1, arr2)).toEqual([])
    })

    it('should handle completely different arrays', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [4, 5, 6]
      
      expect(difference(arr1, arr2)).toEqual([1, 2, 3])
    })
  })

  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const array = [1, 2, 3, 4, 5]
      const shuffled = shuffle(array)
      
      expect(shuffled).toHaveLength(array.length)
      expect(shuffled.sort()).toEqual(array.sort())
    })

    it('should not mutate original array', () => {
      const original = [1, 2, 3, 4, 5]
      const copy = [...original]
      shuffle(original)
      
      expect(original).toEqual(copy)
    })

    it('should handle empty array', () => {
      expect(shuffle([])).toEqual([])
    })

    it('should handle single element', () => {
      expect(shuffle([1])).toEqual([1])
    })
  })

  describe('sample', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('should return single sample by default', () => {
      const result = sample(array)
      
      expect(result).toHaveLength(1)
      expect(array).toContain(result[0])
    })

    it('should return specified count', () => {
      const result = sample(array, 3)
      
      expect(result).toHaveLength(3)
      result.forEach(item => {
        expect(array).toContain(item)
      })
    })

    it('should handle count larger than array', () => {
      const result = sample([1, 2, 3], 5)
      
      expect(result).toHaveLength(3)
    })

    it('should handle empty array', () => {
      expect(sample([], 3)).toEqual([])
    })
  })

  describe('partition', () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('should partition by even/odd', () => {
      const [evens, odds] = partition(numbers, n => n % 2 === 0)
      
      expect(evens).toEqual([2, 4, 6, 8, 10])
      expect(odds).toEqual([1, 3, 5, 7, 9])
    })

    it('should partition by condition', () => {
      const [large, small] = partition(numbers, n => n > 5)
      
      expect(large).toEqual([6, 7, 8, 9, 10])
      expect(small).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle all true condition', () => {
      const [all, none] = partition(numbers, () => true)
      
      expect(all).toEqual(numbers)
      expect(none).toEqual([])
    })

    it('should handle all false condition', () => {
      const [none, all] = partition(numbers, () => false)
      
      expect(none).toEqual([])
      expect(all).toEqual(numbers)
    })

    it('should handle empty array', () => {
      const [truthy, falsy] = partition([], () => true)
      
      expect(truthy).toEqual([])
      expect(falsy).toEqual([])
    })
  })

  describe('integration tests', () => {
    it('should chain operations', () => {
      const data = [1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10]
      
      const result = chunk(unique(data), 3)
      
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])
    })

    it('should work with complex data', () => {
      const users = [
        { name: 'Alice', role: 'admin', active: true },
        { name: 'Bob', role: 'user', active: false },
        { name: 'Charlie', role: 'admin', active: true },
        { name: 'David', role: 'user', active: true }
      ]
      
      const [activeUsers, inactiveUsers] = partition(users, user => user.active)
      const groupedActive = groupBy(activeUsers, 'role')
      
      expect(activeUsers).toHaveLength(3)
      expect(inactiveUsers).toHaveLength(1)
      expect(groupedActive.admin).toHaveLength(2)
      expect(groupedActive.user).toHaveLength(1)
    })
  })
})