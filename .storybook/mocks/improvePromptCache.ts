// Mock improve prompt cache service for Storybook
export const improvePromptCacheService = {
  clearCache: async () => {
    console.log("Mock: improvePromptCacheService.clearCache called")
  },
  getCache: async () => {
    return null
  },
  setCache: async () => {
    console.log("Mock: improvePromptCacheService.setCache called")
  },
}
