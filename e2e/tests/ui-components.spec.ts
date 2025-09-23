import { test, expect } from "../fixtures/extension"
import { TestPage } from "../page-objects/TestPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"

test.describe("UI Components Tests", () => {
  let testPage: TestPage
  let storageHelpers: StorageHelpers
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    testPage = new TestPage(page)
    storageHelpers = new StorageHelpers(page.context())
    waitHelpers = new WaitHelpers(page)

    // Clear storage before test
    await page.goto(TestPage.url)
    await testPage.waitForServiceReady()
    await storageHelpers.clearExtensionData()
  })

  test("should display InputPopup and verify input", async () => {
    // Create mock history data
    await storageHelpers.createMockPromptHistory(5)

    // Test InputPopup display
    const inputPopup = await testPage.getInputPopup()

    // Find and hover over trigger element
    const triggerElement = await inputPopup.getHistoryTrigger()
    expect(await triggerElement.count()).toBeGreaterThan(0)
    await triggerElement.hover()

    // Confirm that history list is displayed
    await inputPopup.waitHistory()
    const historyList = await inputPopup.getHistoryList()
    const isVisible = await historyList.isVisible()
    expect(isVisible).toBe(true)

    // Confirm that history items are displayed
    const historyItems = await inputPopup.getHistoryItems()
    expect(historyItems.length).toBeGreaterThan(0)

    // Select first (most recent) history item
    await inputPopup.selectHistoryItem(0)

    // Check the value of prompt input field
    const promptInput = await testPage.getPromptInput()
    const inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 1 for testing") // Most recent history should be entered
  })

  test("should display AutocompletePopup on input", async () => {
    await storageHelpers.createMockPromptHistory(5)
    const autocompletePopup = await testPage.getAutocompletePopup()

    // Start prompt input
    await testPage.typePrompt("prompt")

    // Check if autocomplete popup is displayed
    await autocompletePopup.waitForDisplay()
    const isVisible = await autocompletePopup.isVisible()
    expect(isVisible).toBe(true)

    // Confirm that suggestions are displayed
    const suggestions = await autocompletePopup.getSuggestions()
    expect(suggestions.length).toBeGreaterThan(0)
  })

  test("should handle keyboard navigation in AutocompletePopup by Ctrl+N/P", async () => {
    await storageHelpers.createMockPromptHistory(5)
    const autocompletePopup = await testPage.getAutocompletePopup()

    // Start prompt input
    await testPage.typePrompt("prompt")

    await autocompletePopup.waitForDisplay()

    // Navigate down
    await autocompletePopup.pressCtrlN() // 1
    await autocompletePopup.pressCtrlN() // 2

    // Navigate up
    await autocompletePopup.pressCtrlP() // 1

    // Confirm that active item exists
    const activeItem = await autocompletePopup.getActiveItem()
    expect(activeItem).toBeTruthy()

    // Select with Tab key
    await autocompletePopup.pressTab()

    // Check the value of prompt input field
    const promptInput = await testPage.getPromptInput()
    await waitHelpers.waitForCondition(async () => {
      const val = await promptInput.textContent()
      return val === "Mock prompt 1 for testing"
    })
    const inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 1 for testing")

    // Confirm that popup is closed
    const isVisible = await autocompletePopup.isVisible()
    expect(isVisible).toBe(false)
  })

  test("should handle keyboard navigation in AutocompletePopup by ArrowUp/Down", async ({
    page,
  }) => {
    page.on("console", (msg) => {
      console.log(`[${msg.type()}] ${msg.text()}`)
    })

    await storageHelpers.createMockPromptHistory(5)
    const autocompletePopup = await testPage.getAutocompletePopup()

    // Start prompt input
    await testPage.typePrompt("prompt")

    await autocompletePopup.waitForDisplay()

    // Focus with Tab key
    await autocompletePopup.pressTab() // 1

    // Navigate with down arrow key
    await autocompletePopup.pressArrowDown() // 2
    await autocompletePopup.pressArrowDown() // 3

    // Navigate with up arrow key
    await autocompletePopup.pressArrowUp() // 2

    // Confirm that active item exists
    const activeItem = await autocompletePopup.getActiveItem()
    expect(activeItem).toBeTruthy()

    // Select with Tab key
    await autocompletePopup.pressTab()

    // Check the value of prompt input field
    const promptInput = await testPage.getPromptInput()
    await waitHelpers.waitForCondition(async () => {
      const val = await promptInput.textContent()
      return val === "Mock prompt 2 for testing"
    })
    const inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 2 for testing")

    // Confirm that popup is closed
    const isVisible = await autocompletePopup.isVisible()
    expect(isVisible).toBe(false)
  })

  test("should handle prompt input and save storage integration", async ({
    page,
  }) => {
    // Test prompt input and storage integration
    const testPrompt = "This is a test prompt for storage integration"

    // Prompt input
    await testPage.typePrompt(testPrompt)

    // Check the value of prompt input field
    const promptInput = await testPage.getPromptInput()
    const inputValue = await promptInput.textContent()

    expect(inputValue).toBe(testPrompt)
    // Wait for a short time to ensure any async operations complete
    await page.waitForTimeout(100)

    // Click send button
    const sendButton = await testPage.getSendButton()
    await sendButton.click()

    // Confirm data is saved to storage after sending
    const retrievedHistory = await storageHelpers.getPromptHistory()
    expect(retrievedHistory.length).toBeGreaterThan(0)
    for (const key in retrievedHistory) {
      const item = retrievedHistory[key]
      expect(item.name).toContain(
        "This is a test prompt for storage integration",
      )
    }
  })

  test("should persist data across page reloads", async () => {
    // Test data persistence after page reload
    const testData = {
      prompt: "Test prompt for persistence",
      timestamp: Date.now(),
    }

    // Save test data
    await storageHelpers.setExtensionData("persistenceTest", testData)

    // Reload page
    await testPage.pageInstance.reload()
    await testPage.waitForServiceReady()

    // Confirm data is retained
    const retrievedData =
      await storageHelpers.getExtensionData("persistenceTest")
    expect(retrievedData).toEqual(testData)
  })

  test("should handle multiple tabs correctly", async ({ context }) => {
    // Test behavior with multiple tabs
    const testPrompt1 = "Prompt from tab 1"
    const testPrompt2 = "Prompt from tab 2"

    // Input prompt in first tab
    await testPage.typePrompt(testPrompt1)

    // Create second tab
    const page2 = await context.newPage()
    const testPage2 = new TestPage(page2)
    const storageHelpers2 = new StorageHelpers(page2.context())

    await testPage2.navigate()
    await testPage2.waitForServiceReady()

    // Input prompt in second tab
    await testPage2.typePrompt(testPrompt2)

    // Confirm extension works in both tabs
    const input1Value = await (await testPage.getPromptInput()).textContent()
    const input2Value = await (await testPage2.getPromptInput()).textContent()

    expect(input1Value).toBe(testPrompt1)
    expect(input2Value).toBe(testPrompt2)

    // Confirm storage is shared
    await storageHelpers.setExtensionData("tabTest", "shared-data")
    const sharedData = await storageHelpers2.getExtensionData("tabTest")
    expect(sharedData).toBe("shared-data")

    await page2.close()
  })

  test("should handle edge cases gracefully", async () => {
    // Test edge case handling

    // Input very long text
    const longText = "A".repeat(5000)
    await testPage.typePrompt(longText)

    const promptInput = await testPage.getPromptInput()
    const inputValue = await promptInput.textContent()
    expect(inputValue?.length).toBe(5000)

    // Text with special characters
    const specialChars = '!@#$%^&*()_+-=[]{}|;":,./<>?`~'
    await testPage.typePrompt(specialChars)

    const specialValue = await promptInput.textContent()
    expect(specialValue).toContain("!@#$")
    expect(specialValue).toContain('%^&*()_+-=[]{}|;":,./<>?`~')

    // Handle empty string
    await testPage.typePrompt("")
    const emptyValue = await promptInput.textContent()
    expect(emptyValue).toBe("")
  })
})
