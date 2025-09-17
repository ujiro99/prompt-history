import { test, expect } from "../fixtures/extension"
import { ChatGPTPage } from "../page-objects/ChatGPTPage"
import { StorageHelpers } from "../utils/storage-helpers"
import { WaitHelpers } from "../utils/wait-helpers"

test.describe("ChatGPT Extension Tests", () => {
  let chatGPTPage: ChatGPTPage
  let storageHelpers: StorageHelpers
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    chatGPTPage = new ChatGPTPage(page)
    storageHelpers = new StorageHelpers(page.context())
    waitHelpers = new WaitHelpers(page)
    await storageHelpers.clearExtensionData()
  })

  test("should load extension and navigate to ChatGPT, and detect fields", async ({
    page,
    extensionId,
  }) => {
    // 1. ChatGPTページへの訪問
    await chatGPTPage.navigate()
    // ページが正常に読み込まれたことを確認
    await expect(page).toHaveTitle(/ChatGPT/)

    // 2. 拡張機能のロード確認
    // Extension ID logged for debugging
    expect(extensionId).toBeTruthy()

    // 3. コンテンツスクリプトの動作確認
    await chatGPTPage.waitForServiceReady()

    // 4. 入力欄と送信ボタンの検出確認
    const promptInput = await chatGPTPage.getPromptInput()
    const sendButton = await chatGPTPage.getSendButton()

    await expect(promptInput).toBeVisible()
    await expect(sendButton).toBeVisible()

    // should verify autocomplete behavior
    await storageHelpers.createMockPromptHistory(5)

    // プロンプト入力を開始
    await chatGPTPage.typePrompt("prompt")

    // 5. オートコンプリートポップアップが表示されるかチェック
    const autocompletePopup = await chatGPTPage.getAutocompletePopup()
    await autocompletePopup.waitForDisplay()

    // 下へナビゲーション
    await autocompletePopup.pressCtrlN() // 1
    await autocompletePopup.pressCtrlN() // 2

    // 上へナビゲーション
    await autocompletePopup.pressCtrlP() // 1

    // アクティブなアイテムが存在するまで待機
    await autocompletePopup.waitActiveItem()

    // Tabキーで選択
    await autocompletePopup.pressTab()

    // 6. プロンプト入力フィールドの値を確認
    let inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 1 for testing")

    // ポップアップが閉じることを確認
    const isVisible = await autocompletePopup.isVisible()
    expect(isVisible).toBe(false)

    // 入力欄をクリア
    await chatGPTPage.typePrompt("")
    await page.waitForTimeout(500) // 良く失敗するので、少し待つ
    await promptInput.clear()
    await promptInput.press("Control+A") // よく失敗するので、念のため複数回実行
    await promptInput.press("Delete")
    await waitHelpers.waitForCondition(
      async () => {
        const val = await promptInput.textContent()
        return val?.trim() === ""
      },
      2000,
      20,
    )
    inputValue = await promptInput.textContent()
    expect(inputValue?.trim()).toBe("")

    // トリガー要素を探してホバー/クリック
    const inputPopup = await chatGPTPage.getInputPopup()
    const triggerElement = await inputPopup.getHistoryTrigger()
    expect(await triggerElement.count()).toBeGreaterThan(0)
    await triggerElement.hover()

    // 7. 履歴リストが表示されることを確認
    const historyList = await inputPopup.getHistoryList()
    const isVisibleList = await historyList.isVisible()
    expect(isVisibleList).toBe(true)

    // 8. 履歴アイテムが表示されることを確認
    const historyItems = await inputPopup.getHistoryItems()
    expect(historyItems.length).toBeGreaterThan(0)

    // 最初(直近)の履歴アイテムを選択
    await inputPopup.selectHistoryItem(0)

    // 9. プロンプト入力フィールドの値を確認
    inputValue = await promptInput.textContent()
    expect(inputValue).toBe("Mock prompt 5 for testing") // 直近の履歴が入力されるはず
  })
})
