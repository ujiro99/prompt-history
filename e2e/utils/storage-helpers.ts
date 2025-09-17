import type { StoredPrompt } from "@/types/prompt"
import { type BrowserContext } from "@playwright/test"

export const getServiceWorker = async (context: BrowserContext) => {
  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent("serviceworker").then((sw) => sw)
  return serviceWorker
}

export class StorageHelpers {
  constructor(private context: BrowserContext) {}

  // 拡張機能のローカルストレージからデータを取得
  async getExtensionData<T>(key: string): Promise<T> {
    // Service Workerを取得
    const serviceWorker = await getServiceWorker(this.context)

    // chrome.storage API（local）に値を保存する
    return await serviceWorker.evaluate(
      ({ key }) => {
        // Chrome拡張機能のstorageAPIを使用
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

  // 拡張機能のローカルストレージにデータを設定
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

  // プロンプト履歴データを取得
  async getPromptHistory(): Promise<StoredPrompt[]> {
    const history =
      await this.getExtensionData<Record<string, StoredPrompt>>("prompts")
    if (history) {
      // オブジェクトを配列に変換
      return Object.values(history)
    }
    return history || []
  }

  // プロンプト履歴データを設定
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

  // ストレージをクリア
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

  // 特定のキーが存在するかチェック
  async hasExtensionData(key: string): Promise<boolean> {
    const data = await this.getExtensionData(key)
    return data !== null && data !== undefined
  }

  // ストレージのサイズを取得
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
      // localStorageのサイズ計算
      let totalSize = 0
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalSize += localStorage[key].length + key.length
        }
      }
      return totalSize
    })
  }

  // テスト用のモックデータを作成
  async createMockPromptHistory(count = 5): Promise<StoredPrompt[]> {
    const mockData = Array.from({ length: count }, (_, i) => ({
      id: `mock-${i + 1}`,
      name: `Mock prompt ${i + 1}`,
      content: `Mock prompt ${i + 1} for testing`,
      executionCount: 0,
      lastExecutedAt: new Date(Date.now() - i * 60000).toISOString(),
      isPinned: false,
      lastExecutionUrl: `https://example.com/mock${i + 1}`,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
      updatedAt: new Date(Date.now() - i * 60000).toISOString(),
    }))

    await this.setPromptHistory(mockData)
    return mockData
  }
}
