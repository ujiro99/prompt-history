import type { AppSettings, PromptError } from "../../types/prompt"
import { settingsStorage, DEFAULT_SETTINGS } from "./definitions"

/**
 * Settings management service
 */
export class SettingsService {
  /**
   * Get settings
   */
  async getSettings(): Promise<AppSettings> {
    return await settingsStorage.getValue()
  }

  /**
   * Update settings
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
   * Clear storage (for debugging)
   */
  async clearSettings(): Promise<void> {
    await settingsStorage.setValue(DEFAULT_SETTINGS)
  }

  /**
   * Watch for changes in AppSettings
   * Returns an unsubscribe function
   */
  watchSettings(
    callback: (settings: AppSettings, oldSettings: AppSettings) => void,
  ): () => void {
    return settingsStorage.watch(callback)
  }

  /**
   * Watch for changes in a specific setting key.
   * Returns an unsubscribe function.
   *
   * @param key The setting key to watch
   * @param callback Callback function to receive updated value and old value
   *
   * @returns Unsubscribe function
   */
  watchSetting<K extends keyof AppSettings>(
    key: K,
    callback: (value: AppSettings[K], oldValue: AppSettings[K]) => void,
  ): () => void {
    return settingsStorage.watch((settings, oldSettings) => {
      if (settings[key] !== oldSettings[key]) {
        callback(settings[key], oldSettings[key])
      }
    })
  }

  /**
   * Create error object
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
 * Singleton instance of settings service
 */
export const settingsService = new SettingsService()
