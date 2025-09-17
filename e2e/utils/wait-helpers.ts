import { Page, Locator, expect } from "@playwright/test"

export class WaitHelpers {
  constructor(private page: Page) {}

  // 拡張機能がコンテンツスクリプトを注入するまで待機
  async waitForContentScriptInjection(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        // 拡張機能がグローバル変数を設定しているかチェック
        return (
          typeof (window as Window & { promptHistoryExtension?: unknown })
            .promptHistoryExtension !== "undefined" ||
          document.querySelector('[data-extension="prompt-history"]') !== null
        )
      },
      { timeout },
    )
  }

  // 特定の要素が表示されるまで待機（複数セレクタ対応）
  async waitForAnyElement(
    selectors: string[],
    timeout = 5000,
  ): Promise<string> {
    const promises = selectors.map(async (selector) => {
      try {
        await this.page.waitForSelector(selector, { timeout })
        return selector
      } catch {
        throw new Error(`Element not found: ${selector}`)
      }
    })

    return Promise.any(promises)
  }

  // 要素がクリック可能になるまで待機
  async waitForClickable(selector: string, timeout = 5000): Promise<Locator> {
    const element = this.page.locator(selector)
    await expect(element).toBeVisible({ timeout })
    await expect(element).toBeEnabled({ timeout })
    return element
  }

  // ページのロードが完了するまで待機
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle")
    await this.page.waitForLoadState("domcontentloaded")
  }

  // 指定した条件が満たされるまで待機
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return
      }
      await this.page.waitForTimeout(interval)
    }
    throw new Error(`Condition not met within ${timeout}ms`)
  }

  // 拡張機能のUI要素が表示されるまで待機
  async waitForExtensionUI(timeout = 5000): Promise<void> {
    const extensionSelectors = [
      '[data-testid="prompt-history-trigger"]',
      '[data-extension="prompt-history"]',
      '[data-testid="input-popup"]',
      '[data-testid="autocomplete-popup"]',
    ]

    try {
      await this.waitForAnyElement(extensionSelectors, timeout)
    } catch {
      // 拡張機能のUI要素が見つからない場合は警告のみ
      // Extension UI elements not found within timeout
    }
  }
}
