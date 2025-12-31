// Mock storage for Storybook
export const genaiApiKeyStorage = {
  setValue: async (value: string) => {
    console.log("Mock: genaiApiKeyStorage.setValue called with:", value)
  },
  getValue: async () => {
    return null
  },
  watch: () => {
    return () => {}
  },
}

export const improvePromptSettingsStorage = {
  setValue: async (value: unknown) => {
    console.log(
      "Mock: improvePromptSettingsStorage.setValue called with:",
      value,
    )
  },
  getValue: async () => {
    return {
      mode: "url",
      textContent: "",
      urlContent: "",
      lastModified: Date.now(),
    }
  },
  watch: () => {
    return () => {}
  },
}
