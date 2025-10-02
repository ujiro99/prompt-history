import { type Page } from "@playwright/test"
import { readFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import { TestIds } from "@/components/const"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class ImportExportPage {
  constructor(private page: Page) {}

  // Load CSV fixture file content
  loadFixtureCSV(filename: string): string {
    const fixturePath = join(__dirname, "..", "fixtures", filename)
    return readFileSync(fixturePath, "utf-8")
  }

  // Open import dialog
  async openImportDialog(): Promise<void> {
    // Open settings menu and click import
    await this.page.hover(
      `[data-testid="${TestIds.inputPopup.settingsTrigger}"]`,
    )
    await this.page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.settingsContent}"]`,
      { state: "visible" },
    )

    // Click import button to open dialog
    await this.page.click(`[data-testid="${TestIds.settingsMenu.import}"]`)

    // Wait for import dialog to appear
    await this.page.waitForSelector(
      `[data-testid="${TestIds.import.dialog}"]`,
      {
        state: "visible",
        timeout: 5000,
      },
    )
  }

  // Select import file (set CSV content to file input)
  async selectImportFile(csvContent: string): Promise<void> {
    const fileInput = this.page.locator(
      `[data-testid="${TestIds.import.fileInput}"]`,
    )
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    })
  }

  // Open import dialog and set CSV content to file input
  async openAndSelectImportFile(csvContent: string): Promise<void> {
    await this.openImportDialog()
    await this.selectImportFile(csvContent)
  }

  // Execute import by clicking the import button
  async executeImport(): Promise<void> {
    await this.page.click(`[data-testid="${TestIds.import.executeButton}"]`)
  }

  // Get import status from dialog
  async getImportStatus(): Promise<{
    success: boolean
    error?: string
    imported?: number
    duplicates?: number
    errors?: number
    errorMessages?: string[]
  }> {
    const host = this.page.locator("prompt-history-ui")
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

    return { success: false, error: "Unknown state" }
  }

  // Complete import flow: open dialog, select file, and execute import
  async importFromCSV(csvContent: string): Promise<any> {
    await this.openAndSelectImportFile(csvContent)
    await this.executeImport()
    return await this.getImportStatus()
  }

  // Execute export and capture downloaded data
  async exportToCSV(): Promise<string> {
    // Set up download event listener to capture the actual download
    const downloadPromise = this.page.waitForEvent("download", {
      timeout: 10000,
    })

    // Alternative: Set up blob capture as fallback
    await this.page.evaluate(() => {
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
    await this.page.click(
      `[data-testid="${TestIds.inputPopup.settingsTrigger}"]`,
    )
    await this.page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.settingsContent}"]`,
      { state: "visible" },
    )

    // Click export button
    await this.page.click(`[data-testid="${TestIds.settingsMenu.export}"]`)

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
    await this.page.waitForTimeout(100) // Give time for export to complete

    const content = await this.page.evaluate(() => {
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
}
