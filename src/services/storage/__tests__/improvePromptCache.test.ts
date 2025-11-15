/**
 * Tests for ImprovePromptCacheService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ImprovePromptCacheService } from '../improvePromptCache'

// Mock improvePromptCacheStorage
vi.mock('../definitions', () => ({
  improvePromptCacheStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
    removeValue: vi.fn(),
  },
}))

// Import mocked storage after vi.mock
import { improvePromptCacheStorage } from '../definitions'

const mockGetValue = vi.mocked(improvePromptCacheStorage.getValue)
const mockSetValue = vi.mocked(improvePromptCacheStorage.setValue)
const mockRemoveValue = vi.mocked(improvePromptCacheStorage.removeValue)

describe('ImprovePromptCacheService', () => {
  let service: ImprovePromptCacheService
  let originalDateNow: () => number

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ImprovePromptCacheService()

    // Mock Date.now and Date constructor for consistent testing
    originalDateNow = Date.now
    const mockDate = new Date('2024-01-15T12:00:00Z')
    vi.spyOn(globalThis, 'Date').mockImplementation((() => mockDate) as any)
    Date.now = vi.fn(() => mockDate.getTime())
  })

  afterEach(() => {
    // Restore original Date
    Date.now = originalDateNow
    vi.restoreAllMocks()
  })

  describe('getTodaysCache', () => {
    it('should return instruction when cache date is today', async () => {
      const cacheData = {
        date: '2024-01-15',
        instruction: 'test instruction',
        cachedAt: Date.now(),
      }
      mockGetValue.mockResolvedValue(cacheData)

      const result = await service.getTodaysCache()

      expect(result).toBe('test instruction')
      expect(mockGetValue).toHaveBeenCalledTimes(1)
    })

    it('should return null when cache date is not today', async () => {
      const cacheData = {
        date: '2024-01-14',
        instruction: 'old instruction',
        cachedAt: Date.now() - 86400000, // 1 day ago
      }
      mockGetValue.mockResolvedValue(cacheData)

      const result = await service.getTodaysCache()

      expect(result).toBeNull()
    })

    it('should return null when no cache exists', async () => {
      mockGetValue.mockResolvedValue(null)

      const result = await service.getTodaysCache()

      expect(result).toBeNull()
    })
  })

  describe('saveCache', () => {
    it('should save instruction with current date and timestamp', async () => {
      const instruction = 'new instruction'
      mockSetValue.mockResolvedValue(undefined)

      await service.saveCache(instruction)

      expect(mockSetValue).toHaveBeenCalledWith({
        date: '2024-01-15',
        instruction: 'new instruction',
        cachedAt: Date.now(),
      })
    })
  })

  describe('getLatestCache', () => {
    it('should return instruction regardless of date', async () => {
      const cacheData = {
        date: '2024-01-01',
        instruction: 'old instruction',
        cachedAt: Date.now() - 86400000 * 14, // 14 days ago
      }
      mockGetValue.mockResolvedValue(cacheData)

      const result = await service.getLatestCache()

      expect(result).toBe('old instruction')
    })

    it('should return null when no cache exists', async () => {
      mockGetValue.mockResolvedValue(null)

      const result = await service.getLatestCache()

      expect(result).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should remove cache', async () => {
      mockRemoveValue.mockResolvedValue(undefined)

      await service.clearCache()

      expect(mockRemoveValue).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCacheMetadata', () => {
    it('should return cache metadata when cache exists', async () => {
      const cacheData = {
        date: '2024-01-15',
        instruction: 'test instruction',
        cachedAt: 1705320000000,
      }
      mockGetValue.mockResolvedValue(cacheData)

      const result = await service.getCacheMetadata()

      expect(result).toEqual({
        date: '2024-01-15',
        cachedAt: 1705320000000,
      })
    })

    it('should return null when no cache exists', async () => {
      mockGetValue.mockResolvedValue(null)

      const result = await service.getCacheMetadata()

      expect(result).toBeNull()
    })
  })

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const result = service.isToday('2024-01-15')

      expect(result).toBe(true)
    })

    it('should return false for past date', () => {
      const result = service.isToday('2024-01-14')

      expect(result).toBe(false)
    })

    it('should return false for future date', () => {
      const result = service.isToday('2024-01-16')

      expect(result).toBe(false)
    })
  })

  describe('getCurrentDateString', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = service.getCurrentDateString()

      expect(result).toBe('2024-01-15')
    })

    it('should pad single-digit month and day with zeros', () => {
      // Restore the original mock first
      vi.restoreAllMocks()

      // Test with a date that has single-digit month and day
      const mockDate = new Date('2024-03-05T12:00:00Z')
      vi.spyOn(globalThis, 'Date').mockImplementation((() => mockDate) as any)

      const result = service.getCurrentDateString()

      expect(result).toBe('2024-03-05')

      // Restore back to the original setup
      vi.restoreAllMocks()
    })
  })
})
