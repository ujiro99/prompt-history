/**
 * Gemini API Key Storage Helper
 * Provides environment variable fallback for development mode
 */

import { genaiApiKeyStorage } from "./definitions"

/**
 * Get Gemini API key with environment variable fallback
 *
 * Priority:
 * 1. Stored API key from storage
 * 2. Environment variable (development mode only)
 *
 * @returns API key string (empty string if not configured)
 */
export async function getGenaiApiKey(): Promise<string> {
  // 1. Try loading from storage first
  const storedApiKey = await genaiApiKeyStorage.getValue()
  if (storedApiKey && storedApiKey.trim() !== "") {
    return storedApiKey
  }

  // 2. In development mode, fallback to environment variable
  const isProductionMode = import.meta.env.MODE === "production"
  if (!isProductionMode) {
    const envApiKey = import.meta.env.WXT_GENAI_API_KEY
    if (envApiKey) {
      return envApiKey
    }
  }

  // 3. Not configured
  return ""
}
