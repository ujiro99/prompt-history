import { test, expect } from "../fixtures/extension"
import { TestPage } from "../page-objects/TestPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"
import { TestIds } from "@/components/const"

test.describe("Import/Export Functionality Tests", () => {
  let testPage: TestPage
  let storageHelpers: StorageHelpers
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    testPage = new TestPage(page)
    storageHelpers = new StorageHelpers(page.context())
    waitHelpers = new WaitHelpers(page)

    // Clear storage before each test
    await page.goto(TestPage.url)
    await testPage.waitForServiceReady()
    await storageHelpers.clearExtensionData()
  })

  test.describe("正常系 - Normal Import/Export Operations", () => {
    test("should export and import prompts successfully with data integrity", async ({
      page,
    }) => {
      // Setup: Create initial test data
      const originalPrompts = await storageHelpers.createMockPromptHistory(5)

      // Export the data
      const exportedData = await storageHelpers.simulateExport(page)
      expect(exportedData).toContain(`"name","content","executionCount"`)
      expect(exportedData.split("\n").length).toBeGreaterThan(5) // Header + 5 data rows

      // Clear storage to simulate fresh state
      await storageHelpers.clearExtensionData()
      const emptyPrompts = await storageHelpers.getPromptHistory()
      expect(emptyPrompts.length).toBe(0)

      // Import the data back
      await storageHelpers.simulateFileImport(page, exportedData)
      await waitHelpers.waitForCondition(async () => {
        const prompts = await storageHelpers.getPromptHistory()
        return prompts.length === originalPrompts.length
      }, 1000)

      // Verify imported data matches original
      const importedPrompts = await storageHelpers.getPromptHistory()
      expect(importedPrompts.length).toBe(originalPrompts.length)

      // Verify data integrity (ignoring IDs and exact timestamps)
      expect(
        storageHelpers.comparePrompts(originalPrompts, importedPrompts),
      ).toBe(true)
    })

    test("should handle round trip export/import without creating duplicates", async ({
      page,
    }) => {
      // Create initial prompts
      await storageHelpers.createMockPromptHistory(3)

      // Export prompts
      const exportedData = await storageHelpers.simulateExport(page)
      expect(exportedData).toBeTruthy()

      // Import the same data back (should not create duplicates)
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
        buffer: Buffer.from(exportedData),
      })

      // Verify duplicates prompts were not created.
      await page.waitForSelector(
        `[data-testid="${TestIds.import.ui.noPrompts}"]`,
        {
          state: "visible",
          timeout: 5000,
        },
      )
      await page.waitForSelector(
        `[data-testid="${TestIds.import.ui.duplicate}"]`,
        {
          state: "visible",
          timeout: 5000,
        },
      )
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })

    test("should export prompts with correct CSV format", async ({ page }) => {
      // Create specific test data
      const testPrompts = [
        {
          id: "test-1",
          name: "Test Prompt",
          content: "Test content",
          executionCount: 2,
          lastExecutedAt: "2024-01-10T10:00:00.000Z",
          isPinned: true,
          lastExecutionUrl: "https://example.com",
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:00:00.000Z",
        },
      ]

      await storageHelpers.setPromptHistory(testPrompts)

      // Export and verify CSV format
      const exportedData = await storageHelpers.simulateExport(page)

      // Check CSV headers
      expect(exportedData).toContain(
        '"name","content","executionCount","lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt"',
      )

      // Check data row
      expect(exportedData).toContain('"Test Prompt"')
      expect(exportedData).toContain('"Test content"')
      expect(exportedData).toContain("2")
      expect(exportedData).toContain("true")
      expect(exportedData).toContain("https://example.com")
    })
  })

  test.describe("特殊文字 - Special Characters Handling", () => {
    test("should export and import prompts with special characters correctly", async ({
      page,
    }) => {
      // Load special characters test data
      const specialCharsCSV = storageHelpers.loadFixtureCSV(
        "special-chars-prompts.csv",
      )

      // Import special characters data
      await storageHelpers.simulateFileImport(page, specialCharsCSV)

      // Wait until all prompts are imported
      const expectedCount = 5
      await waitHelpers.waitForCondition(async () => {
        const prompts = await storageHelpers.getPromptHistory()
        return prompts.length === expectedCount
      }, 1000)

      // Verify special characters are preserved
      const importedPrompts = await storageHelpers.getPromptHistory()
      expect(importedPrompts.length).toBe(expectedCount)

      // Check for specific special character preservation
      const quotesPrompt = importedPrompts.find((p) =>
        p.name.includes("quotes"),
      )
      expect(quotesPrompt?.name).toContain('"quotes"')
      expect(quotesPrompt?.content).toContain('"double quotes"')

      const newlinePrompt = importedPrompts.find((p) =>
        p.name.includes("newlines"),
      )
      expect(newlinePrompt?.content).toContain("\n")

      const commaPrompt = importedPrompts.find((p) => p.name.includes("commas"))
      expect(commaPrompt?.content).toContain(",")

      const japanesePrompt = importedPrompts.find((p) =>
        p.name.includes("プロンプト"),
      )
      expect(japanesePrompt?.name).toContain("プロンプト日本語")
      expect(japanesePrompt?.content).toContain("日本語")

      const emojiPrompt = importedPrompts.find((p) => p.name.includes("🚀"))
      expect(emojiPrompt?.content).toContain("🎉")
    })

    test("should export prompts with special characters and maintain formatting", async ({
      page,
    }) => {
      // Create prompts with special characters
      const specialPrompts = [
        {
          id: "special-1",
          name: 'Prompt with "quotes"',
          content: "Content with \"double quotes\" and 'single quotes'",
          executionCount: 1,
          lastExecutedAt: new Date().toISOString(),
          isPinned: false,
          lastExecutionUrl: "https://example.com",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "special-2",
          name: "プロンプト日本語",
          content: "日本語の内容\nwith newline 🎌",
          executionCount: 2,
          lastExecutedAt: new Date().toISOString(),
          isPinned: true,
          lastExecutionUrl: "https://example.com",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      await storageHelpers.setPromptHistory(specialPrompts)

      // Export and verify CSV formatting
      const exportedData = await storageHelpers.simulateExport(page)

      // Verify special characters are properly escaped in CSV
      expect(exportedData).toContain('""quotes""') // Double quotes should be escaped
      expect(exportedData).toContain("プロンプト日本語") // Japanese characters preserved
      expect(exportedData).toContain("🎌") // Emojis preserved
      expect(exportedData).toContain("\n") // Newlines preserved in quoted fields

      // Verify round-trip: import back and check data integrity
      await storageHelpers.clearExtensionData()
      await storageHelpers.simulateFileImport(page, exportedData)

      await waitHelpers.waitForCondition(async () => {
        const prompts = await storageHelpers.getPromptHistory()
        return prompts.length === 2
      }, 1000)

      const reimportedPrompts = await storageHelpers.getPromptHistory()
      expect(reimportedPrompts.length).toBe(2)

      const reimportedQuotes = reimportedPrompts.find((p) =>
        p.name.includes("quotes"),
      )
      expect(reimportedQuotes?.name).toBe('Prompt with "quotes"')
      expect(reimportedQuotes?.content).toBe(
        "Content with \"double quotes\" and 'single quotes'",
      )

      const reimportedJapanese = reimportedPrompts.find((p) =>
        p.name.includes("プロンプト"),
      )
      expect(reimportedJapanese?.name).toBe("プロンプト日本語")
      expect(reimportedJapanese?.content).toBe("日本語の内容\nwith newline 🎌")
    })
  })

  test.describe("空データ - Empty Data Handling", () => {
    test("should handle export when no prompts exist", async ({ page }) => {
      // Ensure storage is empty
      await storageHelpers.clearExtensionData()
      const emptyCheck = await storageHelpers.getPromptHistory()
      expect(emptyCheck.length).toBe(0)

      // Attempt export
      const exportedData = await storageHelpers.simulateExport(page)

      // Should export headers only
      expect(exportedData).toContain(`"name","content","executionCount"`)
      expect(exportedData).toContain(
        `"lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt"`,
      )

      // Should have header line + empty line only
      const lines = exportedData.trim().split("\n")
      expect(lines.length).toBe(1) // Just the header line when no data
    })

    test("should handle import of empty CSV file", async ({ page }) => {
      // Load empty CSV fixture
      const emptyCSV = storageHelpers.loadFixtureCSV("empty-prompts.csv")

      // Set import file to dialog
      await storageHelpers.openAndSetImportDialog(page, emptyCSV)

      // Verify no prompts were added
      expect(page.getByTestId(TestIds.import.ui.errors)).toBeVisible()
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })

    test("should handle import of CSV with only whitespace", async ({
      page,
    }) => {
      // Create CSV with only whitespace
      const whitespaceCSV =
        '"name","content","executionCount","lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt"\n   \n  \t  \n'

      // Set import file to dialog
      await storageHelpers.openAndSetImportDialog(page, whitespaceCSV)

      // Verify no prompts were added
      expect(page.getByTestId(TestIds.import.ui.errors)).toBeVisible()
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })
  })

  test.describe("準正常系 - Error Handling", () => {
    test("should handle CSV parse errors gracefully", async ({ page }) => {
      // Load malformed CSV fixture
      const malformedCSV = storageHelpers.loadFixtureCSV(
        "malformed-prompts.csv",
      )

      // Attempt import - this should complete without throwing
      await storageHelpers.openAndSetImportDialog(page, malformedCSV)

      // Verify no prompts were added
      expect(page.getByTestId(TestIds.import.ui.errors)).toBeVisible()
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })

    test("should handle CSV format errors (wrong headers)", async ({
      page,
    }) => {
      // Load CSV with wrong headers
      const wrongHeadersCSV = storageHelpers.loadFixtureCSV("wrong-headers.csv")

      // Attempt import - this should complete without throwing
      await storageHelpers.openAndSetImportDialog(page, wrongHeadersCSV)

      // Verify no prompts were added
      expect(page.getByTestId(TestIds.import.ui.errors)).toBeVisible()
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })

    test("should truncate imports when exceeding 1000 prompt limit", async ({
      page,
    }) => {
      // Load large CSV with 1005 prompts
      const largeCSV = storageHelpers.loadFixtureCSV("large-prompts.csv")

      // Import large file
      await storageHelpers.simulateFileImport(page, largeCSV)

      // Wait until import is processed
      const expectedMaxCount = 1000
      await waitHelpers.waitForCondition(async () => {
        const prompts = await storageHelpers.getPromptHistory()
        return prompts.length === expectedMaxCount
      }, 1000)

      // Verify limit is enforced
      const isWithinLimit =
        await storageHelpers.verifyPromptCountLimit(expectedMaxCount)
      expect(isWithinLimit).toBe(true)

      // Should have imported exactly 1000 (the limit)
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(expectedMaxCount)
    })

    test("should handle existing prompts + import limit correctly", async ({
      page,
    }) => {
      // Create 995 existing prompts (close to limit)
      await storageHelpers.createMockPromptHistory(995)

      // Load CSV with 5 valid prompts
      const additionalCSV = storageHelpers.loadFixtureCSV("valid-prompts.csv")

      // Import additional prompts
      await storageHelpers.simulateFileImport(page, additionalCSV)

      // Should still respect 1000 limit
      const isWithinLimit = await storageHelpers.verifyPromptCountLimit(1000)
      expect(isWithinLimit).toBe(true)

      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(1000) // Should be exactly at the limit
    })

    test("should handle completely invalid CSV data", async ({ page }) => {
      // Create completely invalid CSV
      const invalidCSV =
        "this,is,not,valid,csv,data\n{json:like,data},invalid\n"

      // Attempt import
      await storageHelpers.openAndSetImportDialog(page, invalidCSV)

      // Should not import any invalid data
      expect(page.getByTestId(TestIds.import.ui.errors)).toBeVisible()
      expect(page.getByTestId(TestIds.import.executeButton)).not.toBeVisible()
    })
  })
})
