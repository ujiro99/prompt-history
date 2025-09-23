import type { StoredPrompt } from "@/types/prompt"
import { type BrowserContext } from "@playwright/test"

export const getServiceWorker = async (context: BrowserContext) => {
  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent("serviceworker").then((sw) => sw)
  return serviceWorker
}

export class StorageHelpers {
  constructor(private context: BrowserContext) { }

  // Get data from extension local storage
  async getExtensionData<T>(key: string): Promise<T> {
    // Get Service Worker
    const serviceWorker = await getServiceWorker(this.context)

    // Save value to chrome.storage API (local)
    return await serviceWorker.evaluate(
      ({ key }) => {
        // Use Chrome extension storage API
        if (typeof chrome !== "undefined" && chrome.storage) {
          return new Promise((resolve, reject) => {
            chrome.storage.local.get(
              [key],
              (result: Record<string, unknown>) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError)
                } else {
                  resolve(result[key] as T)
                }
              },
            )
          })
        }
        throw new Error("chrome.storage is not available")
      },
      { key },
    )
  }

  // Set data to extension local storage
  async setExtensionData(key: string, value: unknown): Promise<void> {
    const serviceWorker = await getServiceWorker(this.context)

    await serviceWorker.evaluate(
      async ({ key, value }) => {
        if (typeof chrome !== "undefined" && chrome.storage) {
          return new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
              } else {
                resolve()
              }
            })
          })
        }
        throw new Error("chrome.storage is not available")
      },
      { key, value },
    )
  }

  // Get prompt history data
  async getPromptHistory(): Promise<StoredPrompt[]> {
    const history =
      await this.getExtensionData<Record<string, StoredPrompt>>("prompts")
    if (history) {
      // Convert object to array
      return Object.values(history)
    }
    return history || []
  }

  // Set prompt history data
  async setPromptHistory(prompts: StoredPrompt[]): Promise<void> {
    const data = prompts.reduce(
      (acc, prompt) => {
        acc[prompt.id] = prompt
        return acc
      },
      {} as Record<string, StoredPrompt>,
    )
    await this.setExtensionData("prompts", data)
  }

  // Clear storage
  async clearExtensionData(): Promise<void> {
    const serviceWorker = await getServiceWorker(this.context)
    await serviceWorker.evaluate(() => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.clear()
      } else {
        localStorage.clear()
      }
    })
  }

  // Check if specific key exists
  async hasExtensionData(key: string): Promise<boolean> {
    const data = await this.getExtensionData(key)
    return data !== null && data !== undefined
  }

  // Get storage size
  async getStorageSize(): Promise<number> {
    const serviceWorker = await getServiceWorker(this.context)
    return await serviceWorker.evaluate(() => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        return new Promise<number>((resolve) => {
          chrome.storage.local.getBytesInUse(null, (bytesInUse: number) => {
            resolve(bytesInUse)
          })
        })
      }
      // Calculate localStorage size
      let totalSize = 0
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage[key].length + key.length
        }
      }
      return totalSize
    })
  }

  // Create mock data for testing
  async createMockPromptHistory(count = 5): Promise<StoredPrompt[]> {
    const date = (i: number) =>
      new Date(Date.now() - (count - i) * 60000).toISOString()
    const mockData = Array.from({ length: count }, (_, i) => ({
      id: `mock-${i + 1}`,
      name: `Mock prompt ${i + 1}`,
      content: `Mock prompt ${i + 1} for testing`,
      executionCount: 0,
      lastExecutedAt: date(i),
      isPinned: false,
      lastExecutionUrl: `https://example.com/mock${i + 1}`,
      createdAt: date(i),
      updatedAt: date(i),
    }))

    await this.setPromptHistory(mockData)
    return mockData
  }
}
