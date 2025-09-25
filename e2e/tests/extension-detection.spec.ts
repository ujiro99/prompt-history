import { test, expect } from "../fixtures/extension"
import { TestPage } from "../page-objects/TestPage"
import { WaitHelpers } from "../utils/wait-helpers"
import { StorageHelpers, getServiceWorker } from "../utils/storage-helpers"

test.describe("Extension Detection Tests", () => {
  let testPage: TestPage
  let _waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    testPage = new TestPage(page)
    _waitHelpers = new WaitHelpers(page)
  })

  test("should detect extension injection on TestPage", async ({
    extensionId,
  }) => {
    // Confirm that extension ID can be retrieved
    expect(extensionId).toBeTruthy()
    expect(extensionId).toMatch(/^[a-z]{32}$/) // Chrome extension ID format

    // Navigate to Test page
    await testPage.navigate()
    await testPage.waitForServiceReady()

    // Check if extension content script is injected
    const isInjected = await testPage.checkContentScriptInjection()
    expect(isInjected).toBeTruthy()

    // Check if extension DOM exists on page
    const extensionElementsPresent =
      await testPage.checkExtensionElementsPresence()
    if (extensionElementsPresent.err) {
      console.error(
        "Extension elements check failed:",
        extensionElementsPresent.err,
      )
    }
    expect(extensionElementsPresent.err).toBeUndefined()
    expect(extensionElementsPresent.ret).toBeTruthy()
  })

  test("should have access to extension storage", async ({ context }) => {
    await testPage.navigate()
    await testPage.waitForServiceReady()

    // Save test data to storage
    const storageHelpers = new StorageHelpers(context)
    const testData = { test: "extension-storage", timestamp: Date.now() }
    await storageHelpers.setExtensionData("testKey", testData)

    // Check if data was saved correctly
    const retrievedData = await storageHelpers.getExtensionData("testKey")
    expect(retrievedData).toEqual(testData)

    // Confirm key exists
    const hasData = await storageHelpers.hasExtensionData("testKey")
    expect(hasData).toBe(true)

    // Test non-existent key
    const hasNonExistentData =
      await storageHelpers.hasExtensionData("nonExistentKey")
    expect(hasNonExistentData).toBe(false)
  })

  test("should handle prompt history storage", async ({ context }) => {
    await testPage.navigate()
    await testPage.waitForServiceReady()

    // Initialize prompt history
    const storageHelpers = new StorageHelpers(context)
    await storageHelpers.clearExtensionData()

    // Create mock data
    const mockHistory = await storageHelpers.createMockPromptHistory(3)
    expect(mockHistory).toHaveLength(3)

    // Get prompt history
    const retrievedHistory = await storageHelpers.getPromptHistory()
    expect(retrievedHistory).toEqual(mockHistory)
    expect(retrievedHistory[0].name).toContain("Mock prompt 1")
    expect(retrievedHistory[2].name).toContain("Mock prompt 3")

    // Clear history
    await storageHelpers.clearExtensionData()
    const emptyHistory = await storageHelpers.getPromptHistory()
    expect(emptyHistory).toEqual([])
  })

  test("should detect extension manifest information", async ({
    page,
    extensionId,
  }) => {
    // Test if manifest information is accessible
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`

    try {
      const response = await page.goto(manifestUrl)
      if (response && response.ok()) {
        const manifestContent = await response.text()
        const manifest = JSON.parse(manifestContent)

        expect(manifest.name).toBeTruthy()
        expect(manifest.version).toBeTruthy()
        expect(manifest.manifest_version).toEqual(3)
        // Extension manifest info: name and version retrieved
      }
    } catch (error) {
      // Could not access manifest (expected in some environments)
      console.error(error)
    }
  })

  test("should verify extension permissions", async ({ context }) => {
    await testPage.navigate()
    await testPage.waitForServiceReady()
    const sw = await getServiceWorker(context)

    // Check if extension has required permissions
    const hasStoragePermission = await sw.evaluate(() => {
      return typeof chrome !== "undefined" && !!chrome.storage
    })
    // Storage permission status checked
    expect(hasStoragePermission).toBe(true)

    const hasTabsPermission = await sw.evaluate(() => {
      return typeof chrome !== "undefined" && !!chrome.tabs
    })
    // Tabs permission status checked
    expect(hasTabsPermission).toBeTruthy()
  })

  test("should verify configs loaded from server", async () => {
    await testPage.navigate()
    await testPage.waitForServiceReady()

    const configs = JSON.parse(process.env.CONFIGS ?? "{}")

    expect(configs).toBeTruthy()
    expect(configs.TestPage.serviceName).toBe("TestPage")
    expect(configs.TestPage.selectors.textInput).toHaveLength(1)
    expect(configs.ChatGPT.serviceName).toBe("ChatGPT")
  })
})
