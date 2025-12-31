// Mock analytics for Storybook
export const analyticsService = {
  track: async (event: string, properties?: Record<string, unknown>) => {
    console.log("Mock: analyticsService.track called with:", event, properties)
  },
  page: async () => {
    console.log("Mock: analyticsService.page called")
  },
  identify: async () => {
    console.log("Mock: analyticsService.identify called")
  },
}

export const ANALYTICS_EVENTS = {
  SET_API_KEY: "set_api_key",
  IMPORT_PROMPTS: "import_prompts",
  EXPORT_PROMPTS: "export_prompts",
  SAVE_PROMPT: "save_prompt",
  DELETE_PROMPT: "delete_prompt",
  PIN_PROMPT: "pin_prompt",
  UNPIN_PROMPT: "unpin_prompt",
  EXECUTE_PROMPT: "execute_prompt",
  AUTOCOMPLETE_USED: "autocomplete_used",
}
