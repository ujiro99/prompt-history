import { test, expect } from "../fixtures/extension"
import { PerplexityPage } from "../page-objects/PerplexityPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"

test.describe("Perplexity Extension Tests", () => {
  let perplexityPage: PerplexityPage
  let storageHelpers: StorageHelpers
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    perplexityPage = new PerplexityPage(page)
    storageHelpers = new StorageHelpers(page.context())
    waitHelpers = new WaitHelpers(page)
    await storageHelpers.clearExtensionData()
  })

  test("should load extension and navigate to Perplexity, and detect fields", async ({
    page,
    extensionId,
  }) => {
    // 1. Visit Perplexity page
    await perplexityPage.navigate()
    // Confirm page loaded successfully
    await expect(page).toHaveTitle(/Perplexity/)

    // 2. Confirm extension loaded
    // Extension ID logged for debugging
    expect(extensionId).toBeTruthy()

    // 3. Confirm content script operation
    await perplexityPage.waitForServiceReady()

    // Close comment modal if present
    const commetBtn = page.getByRole("button").getByText("Download Comet")
    if (commetBtn) {
      await page.mouse.click(10, 10) // Click outside to close
    }

    // 4. Confirm detection of input field and send button
    const promptInput = await perplexityPage.getPromptInput()
    const sendButton = await perplexityPage.getSendButton()

    await expect(promptInput).toBeVisible()
    await expect(sendButton).toBeVisible()

    // should verify autocomplete behavior
    await storageHelpers.createMockPromptHistory(5)

    // Start prompt input
    await perplexityPage.typePrompt("prompt")

    // 5. Check if autocomplete popup is displayed
    const autocompletePopup = await perplexityPage.getAutocompletePopup()
    await autocompletePopup.waitForDisplay()

    // Navigate down
    await autocompletePopup.pressCtrlN() // 1
    await autocompletePopup.pressCtrlN() // 2

    // Navigate up
    await autocompletePopup.pressCtrlP() // 1

    // Wait until active item exists
    await autocompletePopup.waitActiveItem()

    // Select with Tab key
    await autocompletePopup.pressTab()

    // 6. Check the value of prompt input field
    await waitHelpers.waitForCondition(async () => {
      const val = await promptInput.textContent()
      return val === "Mock prompt 1 for testing"
    })
    let inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 1 for testing")

    // Confirm that popup is closed
    const isVisible = await autocompletePopup.isVisible()
    expect(isVisible).toBe(false)

    // Clear input field
    await perplexityPage.typePrompt("")
    await page.waitForTimeout(100) // Wait a bit as this often fails
    await promptInput.clear()
    await promptInput.press("Control+A") // Execute multiple times as this often fails
    await promptInput.press("Delete")
    await waitHelpers.waitForCondition(async () => {
      const val = await promptInput.textContent()
      return val?.trim() === ""
    })
    inputValue = await promptInput.textContent()
    expect(inputValue?.trim()).toBe("")

    // Close google modal if present (e.g. sign-in prompt)
    const frame = page
      .locator("#credential_picker_container iframe")
      .contentFrame()
    if (frame) {
      const closeButton = frame.locator("#close")
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }
    }

    // Find trigger element and hover/click
    const inputPopup = await perplexityPage.getInputPopup()
    const triggerElement = await inputPopup.getHistoryTrigger()
    expect(await triggerElement.count()).toBeGreaterThan(0)
    await triggerElement.hover()

    // 7. Confirm that history list is displayed
    const historyList = await inputPopup.getHistoryList()
    const isVisibleList = await historyList.isVisible()
    expect(isVisibleList).toBe(true)

    // 8. Confirm that history items are displayed
    const historyItems = await inputPopup.getHistoryItems()
    expect(historyItems.length).toBeGreaterThan(0)

    // Select the first item
    await inputPopup.selectHistoryItem(0)

    // 9. Check the value of prompt input field
    await waitHelpers.waitForCondition(async () => {
      const val = await promptInput.textContent()
      return val === "Mock prompt 1 for testing"
    })
    inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 1 for testing") // Most recent history should be input
  })
})
