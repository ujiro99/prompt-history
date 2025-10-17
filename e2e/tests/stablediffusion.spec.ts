import { test, expect } from "../fixtures/extension"
import { StableDiffusionPage } from "../page-objects/StableDiffusionPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"

test.describe("Stable Diffusion Extension Tests", () => {
  let stableDiffusionPage: StableDiffusionPage
  let storageHelpers: StorageHelpers
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    stableDiffusionPage = new StableDiffusionPage(page)
    storageHelpers = new StorageHelpers(page.context())
    waitHelpers = new WaitHelpers(page)
    await storageHelpers.clearExtensionData()
  })

  test("should load extension and navigate to Stable Diffusion, and detect fields", async ({
    page,
    extensionId,
  }) => {
    await test.step("Visit Stable Diffusion page and confirm page loaded", async () => {
      await stableDiffusionPage.navigate()
      await expect(page).toHaveTitle(/Stable Diffusion/)

      // Confirm extension loaded
      // Extension ID logged for debugging
      expect(extensionId).toBeTruthy()

      // Confirm content script operation
      await stableDiffusionPage.waitForServiceReady()
    })

    let promptInput: any
    let sendButton: any

    await test.step("Confirm detection of input field and send button", async () => {
      promptInput = await stableDiffusionPage.getPromptInput()
      sendButton = await stableDiffusionPage.getSendButton()

      await expect(promptInput).toBeVisible()
      await expect(sendButton).toBeVisible()
    })

    await test.step("Verify autocomplete behavior", async () => {
      await storageHelpers.createMockPromptHistory(5)

      // Start prompt input
      await stableDiffusionPage.typePrompt("prompt")

      // Check if autocomplete popup is displayed
      const autocompletePopup = await stableDiffusionPage.getAutocompletePopup()
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

      // Check the value of prompt input field
      await waitHelpers.waitForCondition(async () => {
        const val = await promptInput.inputValue()
        return val === "Mock prompt 1 for testing"
      })
      const inputValue = await promptInput.inputValue()
      expect(inputValue).toBe("Mock prompt 1 for testing")

      // Confirm that popup is closed
      const isVisible = await autocompletePopup.isVisible()
      expect(isVisible).toBe(false)

      // Clear input field
      await stableDiffusionPage.typePrompt("")
      await page.waitForTimeout(100) // Wait a bit as this often fails
      await promptInput.clear()
      await promptInput.press("Control+A") // Execute multiple times as this often fails
      await promptInput.press("Delete")
      await waitHelpers.waitForCondition(async () => {
        const val = await promptInput.inputValue()
        return val?.trim() === ""
      })
      const inputValueCleared = await promptInput.inputValue()
      expect(inputValueCleared?.trim()).toBe("")
    })

    await test.step("Verify InputPopup behavior", async () => {
      // Find trigger element and hover/click
      const inputPopup = await stableDiffusionPage.getInputPopup()
      const triggerElement = await inputPopup.getHistoryTrigger()
      expect(await triggerElement.count()).toBeGreaterThan(0)
      await triggerElement.hover()

      // Confirm that history list is displayed
      const historyList = await inputPopup.getHistoryList()
      const isVisibleList = await historyList.isVisible()
      expect(isVisibleList).toBe(true)

      // Confirm that history items are displayed
      const historyItems = await inputPopup.getHistoryItems()
      expect(historyItems.length).toBeGreaterThan(0)

      // Select the first item
      await inputPopup.selectHistoryItem(0)

      // The sort order is `Recent usage & execution count score`.
      // If it appears under the menu, the previously entered ID 1 will be selected.
      // If it appears above the menu, the order will be reversed, and the oldest ID 2 will be selected.

      // Check the value of prompt input field
      await waitHelpers.waitForCondition(async () => {
        const val = await promptInput.inputValue()
        return val === "Mock prompt 1 for testing"
      })
      const inputValue = await promptInput.inputValue()
      expect(inputValue).toBe("Mock prompt 1 for testing") // Most recent history should be input
    })
  })
})
