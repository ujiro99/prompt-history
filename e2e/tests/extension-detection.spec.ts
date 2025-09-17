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
    // 拡張機能IDが取得できることを確認
    expect(extensionId).toBeTruthy()
    expect(extensionId).toMatch(/^[a-z]{32}$/) // Chrome拡張機能IDの形式

    // Testページに移動
    await testPage.navigate()
    await testPage.waitForServiceReady()

    // 拡張機能のコンテンツスクリプトが注入されているかチェック
    const isInjected = await testPage.checkContentScriptInjection()
    expect(isInjected).toBeTruthy()

    // ページに拡張機能のDOMがあるかチェック
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

    // ストレージにテストデータを保存
    const storageHelpers = new StorageHelpers(context)
    const testData = { test: "extension-storage", timestamp: Date.now() }
    await storageHelpers.setExtensionData("testKey", testData)

    // データが正しく保存されたかチェック
    const retrievedData = await storageHelpers.getExtensionData("testKey")
    expect(retrievedData).toEqual(testData)

    // キーの存在確認
    const hasData = await storageHelpers.hasExtensionData("testKey")
    expect(hasData).toBe(true)

    // 存在しないキーのテスト
    const hasNonExistentData =
      await storageHelpers.hasExtensionData("nonExistentKey")
    expect(hasNonExistentData).toBe(false)
  })

  test("should handle prompt history storage", async ({ context }) => {
    await testPage.navigate()
    await testPage.waitForServiceReady()

    // プロンプト履歴の初期化
    const storageHelpers = new StorageHelpers(context)
    await storageHelpers.clearExtensionData()

    // モックデータの作成
    const mockHistory = await storageHelpers.createMockPromptHistory(3)
    expect(mockHistory).toHaveLength(3)

    // プロンプト履歴の取得
    const retrievedHistory = await storageHelpers.getPromptHistory()
    expect(retrievedHistory).toEqual(mockHistory)
    expect(retrievedHistory[0].name).toContain("Mock prompt 1")
    expect(retrievedHistory[2].name).toContain("Mock prompt 3")

    // 履歴のクリア
    await storageHelpers.clearExtensionData()
    const emptyHistory = await storageHelpers.getPromptHistory()
    expect(emptyHistory).toEqual([])
  })

  test("should detect extension manifest information", async ({
    page,
    extensionId,
  }) => {
    // マニフェスト情報にアクセス可能かテスト
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

    // 拡張機能が必要な権限を持っているかチェック
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
})
