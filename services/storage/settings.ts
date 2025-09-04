import type { AppSettings, PromptError } from "../../types/prompt"
import { settingsStorage } from "./definitions"

/**
 * 設定管理サービス
 */
export class SettingsService {
  /**
   * 設定を取得
   */
  async getSettings(): Promise<AppSettings> {
    return await settingsStorage.getValue()
  }

  /**
   * 設定を更新
   */
  async setSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings()
      const newSettings = { ...currentSettings, ...settings }
      await settingsStorage.setValue(newSettings)
    } catch (error) {
      throw this.createError(
        "SETTINGS_FAILED",
        "Failed to update settings",
        error,
      )
    }
  }

  /**
   * ストレージをクリア（デバッグ用）
   */
  async clearSettings(): Promise<void> {
    await settingsStorage.setValue({
      autoSaveEnabled: true,
      maxPrompts: 1000,
      defaultSortOrder: "recent",
      showNotifications: true,
    })
  }

  /**
   * エラーオブジェクトの生成
   */
  private createError(
    code: string,
    message: string,
    details?: unknown,
  ): PromptError {
    return {
      code,
      message,
      details,
    }
  }
}

/**
 * 設定サービスのシングルトンインスタンス
 */
export const settingsService = new SettingsService()
