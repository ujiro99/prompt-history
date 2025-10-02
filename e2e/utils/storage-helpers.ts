import type { StoredPrompt } from "@/types/prompt"
import { type BrowserContext, type Page } from "@playwright/test"
import { readFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import { TestIds } from "@/components/const"

export const getServiceWorker = async (context: BrowserContext) => {
  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker)
    serviceWorker = await context.waitForEvent("serviceworker").then((sw) => sw)
  return serviceWorker
}

export class StorageHelpers {
  constructor(private context: BrowserContext) {}

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

  // Load CSV fixture file content
  loadFixtureCSV(filename: string): string {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const fixturePath = join(__dirname, "..", "fixtures", filename)
    return readFileSync(fixturePath, "utf-8")
  }

  // Open import dialog and set CSV content to file input
  async openAndSetImportDialog(page: Page, csvContent: string): Promise<void> {
    // Open settings menu and click import
    await page.hover(`[data-testid="${TestIds.inputPopup.settingsTrigger}"]`)
    await page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.settingsContent}"]`,
      { state: "visible" },
    )

    // Click import button to open dialog
    await page.click(`[data-testid="${TestIds.settingsMenu.import}"]`)

    // Wait for import dialog to appear
    await page.waitForSelector(`[data-testid="${TestIds.import.dialog}"]`, {
      state: "visible",
      timeout: 5000,
    })

    // Create a file from CSV content and set it to the file input
    const fileInput = page.locator(
      `[data-testid="${TestIds.import.fileInput}"]`,
    )
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    })
  }

  // Simulate file import using new dialog-based UI
  async simulateFileImport(page: Page, csvContent: string): Promise<any> {
    // Open settings menu and click import
    await this.openAndSetImportDialog(page, csvContent)

    // Click the execute import button.
    await page.click(`[data-testid="${TestIds.import.executeButton}"]`)

    // Extract the import result from shadow-dom
    const host = page.locator("prompt-history-ui")
    const dialog = host.locator(`[data-testid="${TestIds.import.dialog}"]`)
    await dialog.waitFor({ state: "visible" })

    // Check for success
    const successElement = dialog.locator(
      `[data-testid="${TestIds.import.ui.imported}"]`,
    )
    const isSuccess = await successElement.isVisible()

    if (isSuccess) {
      return {
        success: true,
      }
    }

    // Check for error
    const errorElement = dialog.locator(
      `[data-testid="${TestIds.import.ui.errors}"]`,
    )
    const isError = await errorElement.isVisible()

    if (isError) {
      const errorText = (await errorElement.textContent()) || "Unknown error"
      return {
        success: false,
        error: errorText,
        imported: 0,
        duplicates: 0,
        errors: 1,
        errorMessages: [errorText],
      }
    }

    return { error: "Unknown state" }
  }

  // Simulate export operation and capture downloaded data
  async simulateExport(page: Page): Promise<string> {
    // Set up download event listener to capture the actual download
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 })

    // Alternative: Set up blob capture as fallback
    await page.evaluate(() => {
      window.__exportedContent = undefined

      // Override both URL.createObjectURL and download mechanisms
      const originalCreateObjectURL = URL.createObjectURL
      URL.createObjectURL = function (blob: Blob) {
        if (blob.type === "text/csv;charset=utf-8;") {
          blob
            .text()
            .then((text) => {
              window.__exportedContent = text
            })
            .catch(console.error)
        }
        return originalCreateObjectURL.call(this, blob)
      }
    })

    // Open settings menu
    await page.click(`[data-testid="${TestIds.inputPopup.settingsTrigger}"]`)
    await page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.settingsContent}"]`,
      { state: "visible" },
    )

    // Click export button
    await page.click(`[data-testid="${TestIds.settingsMenu.export}"]`)

    try {
      // Try to capture via download event first
      const download = await downloadPromise
      const path = await download.path()
      if (path) {
        console.log("Download captured at path:", path)
        const fs = await import("fs")
        return fs.readFileSync(path, "utf-8")
      }
    } catch (error) {
      console.log("Download event failed, trying blob capture:", error)
    }

    // Fallback to blob capture method
    await page.waitForTimeout(100) // Give time for export to complete

    const content = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        if (window.__exportedContent) {
          console.log("Captured via blob override", window.__exportedContent)
          resolve(window.__exportedContent)
        } else {
          let attempts = 0
          const checkContent = () => {
            if (window.__exportedContent) {
              resolve(window.__exportedContent)
            } else if (attempts < 50) {
              attempts++
              setTimeout(checkContent, 100)
            } else {
              reject(new Error("Export content not captured"))
            }
          }
          checkContent()
        }
      })
    })

    return content
  }

  // Compare two sets of prompts for equality (ignoring IDs and timestamps)
  comparePrompts(expected: StoredPrompt[], actual: StoredPrompt[]): boolean {
    if (expected.length !== actual.length) {
      return false
    }

    const normalize = (prompt: StoredPrompt) => ({
      name: prompt.name,
      content: prompt.content,
      executionCount: prompt.executionCount,
      isPinned: prompt.isPinned,
      lastExecutionUrl: prompt.lastExecutionUrl,
    })

    const expectedNormalized = expected
      .map(normalize)
      .sort((a, b) => a.name.localeCompare(b.name))
    const actualNormalized = actual
      .map(normalize)
      .sort((a, b) => a.name.localeCompare(b.name))

    return (
      JSON.stringify(expectedNormalized) === JSON.stringify(actualNormalized)
    )
  }

  // Verify prompt count limit
  async verifyPromptCountLimit(expectedMax: number): Promise<boolean> {
    const prompts = await this.getPromptHistory()
    return prompts.length <= expectedMax
  }
}
