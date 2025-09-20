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
