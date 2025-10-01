import { test, expect } from "../fixtures/extension"
import { TestPage } from "../page-objects/TestPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"

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
      const initialPrompts = await storageHelpers.createMockPromptHistory(3)

      // Export prompts
      const exportedData = await storageHelpers.simulateExport(page)
      expect(exportedData).toBeTruthy()

      // Import the same data back (should not create duplicates)
      await storageHelpers.simulateFileImport(page, exportedData)

      // Verify no duplicates were created
      const finalPrompts = await storageHelpers.getPromptHistory()
      expect(finalPrompts.length).toBe(initialPrompts.length)
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

      // Verify special characters are preserved
      const importedPrompts = await storageHelpers.getPromptHistory()
      expect(importedPrompts.length).toBe(5)

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
      expect(exportedData).toContain("name,content,executionCount")
      expect(exportedData).toContain(
        "lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt",
      )

      // Should have header line + empty line only
      const lines = exportedData.trim().split("\n")
      expect(lines.length).toBe(1) // Just the header line when no data
    })

    test("should handle import of empty CSV file", async ({ page }) => {
      // Load empty CSV fixture
      const emptyCSV = storageHelpers.loadFixtureCSV("empty-prompts.csv")

      // Import empty file
      await storageHelpers.simulateFileImport(page, emptyCSV)

      // Verify no prompts were added
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(0)
    })

    test("should handle import of CSV with only whitespace", async ({
      page,
    }) => {
      // Create CSV with only whitespace
      const whitespaceCSV =
        '"name","content","executionCount","lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt"\n   \n  \t  \n'

      // Import whitespace file
      await storageHelpers.simulateFileImport(page, whitespaceCSV)

      // Verify no prompts were added
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(0)
    })
  })

  test.describe("準正常系 - Error Handling", () => {
    test("should handle CSV parse errors gracefully", async ({ page }) => {
      // Load malformed CSV fixture
      const malformedCSV = storageHelpers.loadFixtureCSV(
        "malformed-prompts.csv",
      )

      // Attempt import - this should complete without throwing
      try {
        await storageHelpers.simulateFileImport(page, malformedCSV)
      } catch (error) {
        // Import should handle errors gracefully, not throw
        console.log("Import completed with errors (expected):", error)
      }

      // Valid rows should still be imported despite some invalid ones
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBeGreaterThan(0) // Some valid rows should be imported
      expect(prompts.length).toBeLessThan(5) // But not all rows due to malformed data

      // Verify valid prompts were imported correctly
      const validPrompt = prompts.find((p) => p.name === "Valid Prompt")
      expect(validPrompt).toBeDefined()
      expect(validPrompt?.content).toBe("Valid content")
    })

    test("should handle CSV format errors (wrong headers)", async ({
      page,
    }) => {
      // Load CSV with wrong headers
      const wrongHeadersCSV = storageHelpers.loadFixtureCSV("wrong-headers.csv")

      // Attempt import - should handle wrong headers gracefully
      try {
        await storageHelpers.simulateFileImport(page, wrongHeadersCSV)
      } catch (error) {
        // Expected to fail due to wrong headers
        console.log("Import failed as expected due to wrong headers:", error)
      }

      // Should not import data with wrong headers
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(0) // No prompts should be imported
    })

    test("should truncate imports when exceeding 1000 prompt limit", async ({
      page,
    }) => {
      // Load large CSV with 1005 prompts
      const largeCSV = storageHelpers.loadFixtureCSV("large-prompts.csv")

      // Import large file
      await storageHelpers.simulateFileImport(page, largeCSV)

      // Verify limit is enforced
      const isWithinLimit = await storageHelpers.verifyPromptCountLimit(1000)
      expect(isWithinLimit).toBe(true)

      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBeLessThanOrEqual(1000)

      // Should have imported exactly 1000 (the limit)
      expect(prompts.length).toBe(1000)
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
      try {
        await storageHelpers.simulateFileImport(page, invalidCSV)
      } catch (error) {
        console.log("Import failed as expected for invalid CSV:", error)
      }

      // Should not import any invalid data
      const prompts = await storageHelpers.getPromptHistory()
      expect(prompts.length).toBe(0)
    })
  })

  test.describe("Import Result Feedback", () => {
    test("should handle mixed valid/invalid data appropriately", async ({
      page,
    }) => {
      // Start with clean state
      await storageHelpers.clearExtensionData()

      // Mix of valid and invalid data
      const mixedCSV = storageHelpers.loadFixtureCSV("malformed-prompts.csv")

      // Import should complete without throwing errors
      try {
        await storageHelpers.simulateFileImport(page, mixedCSV)
      } catch (error) {
        console.log("Import completed with some errors (expected):", error)
      }

      // Verify only valid data was imported
      const prompts = await storageHelpers.getPromptHistory()

      // Should have some prompts (the valid ones)
      expect(prompts.length).toBeGreaterThan(0)

      // All imported prompts should have valid required fields
      prompts.forEach((prompt) => {
        expect(prompt.name).toBeTruthy()
        expect(prompt.content).toBeTruthy()
        expect(prompt.id).toBeTruthy()
        expect(typeof prompt.executionCount).toBe("number")
        expect(typeof prompt.isPinned).toBe("boolean")
      })
    })

    test("should preserve data integrity during partial imports", async ({
      page,
    }) => {
      // Create some existing data
      const existingPrompts = await storageHelpers.createMockPromptHistory(2)

      // Import mixed data (some valid, some invalid)
      const mixedCSV = storageHelpers.loadFixtureCSV("malformed-prompts.csv")

      try {
        await storageHelpers.simulateFileImport(page, mixedCSV)
      } catch (error) {
        console.log("Partial import completed:", error)
      }

      const finalPrompts = await storageHelpers.getPromptHistory()

      // Should have original + new valid prompts
      expect(finalPrompts.length).toBeGreaterThan(existingPrompts.length)

      // Original prompts should still exist
      existingPrompts.forEach((originalPrompt) => {
        const stillExists = finalPrompts.some(
          (p) => p.name === originalPrompt.name,
        )
        expect(stillExists).toBe(true)
      })
    })
  })
})
