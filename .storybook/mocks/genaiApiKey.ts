/**
 * Mock implementation of getGenaiApiKey for Storybook
 */

/**
 * Get Gemini API key from window mock object
 */
export async function getGenaiApiKey(): Promise<string> {
  const windowWithMock = window as Window & {
    __STORYBOOK_GENAI_API_KEY__?: string | null
  }

  const apiKey = windowWithMock.__STORYBOOK_GENAI_API_KEY__
  console.log("Mock: getGenaiApiKey called, returning:", apiKey)

  return apiKey || ""
}
