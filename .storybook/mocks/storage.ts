// Mock storage for Storybook
// Use window object to allow stories to set different API key values
export const genaiApiKeyStorage = {
  setValue: async (value: string) => {
    console.log("Mock: genaiApiKeyStorage.setValue called with:", value)
    const windowWithMock = window as Window & {
      __STORYBOOK_GENAI_API_KEY__?: string | null
    }
    windowWithMock.__STORYBOOK_GENAI_API_KEY__ = value
  },
  getValue: async () => {
    const windowWithMock = window as Window & {
      __STORYBOOK_GENAI_API_KEY__?: string | null
    }
    console.log(
      "Mock: genaiApiKeyStorage.getValue called,",
      windowWithMock.__STORYBOOK_GENAI_API_KEY__,
    )
    return windowWithMock.__STORYBOOK_GENAI_API_KEY__ ?? null
  },
  watch: () => {
    return () => {}
  },
}

export const promptsStorage = {
  setValue: async (value: unknown) => {
    console.log("Mock: promptsStorage.setValue called with:", value)
  },
  getValue: async () => {
    return {}
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

export const variableGenerationSettingsStorage = {
  setValue: async (value: unknown) => {
    console.log(
      "Mock: variableGenerationSettingsStorage.setValue called with:",
      value,
    )
  },
  getValue: async () => {
    return {
      useDefault: true,
      promptHistoryCount: 200,
    }
  },
  watch: () => {
    return () => {}
  },
}

export const categoriesStorage = {
  setValue: async (value: unknown) => {
    console.log("Mock: categoriesStorage.setValue called with:", value)
  },
  getValue: async () => {
    return {}
  },
  watch: () => {
    return () => {}
  },
}

export const promptOrganizerSettingsStorage = {
  setValue: async (value: unknown) => {
    console.log(
      "Mock: promptOrganizerSettingsStorage.setValue called with:",
      value,
    )
  },
  getValue: async () => {
    return {
      filterPeriodDays: 7,
      filterMinExecutionCount: 2,
      filterMaxPrompts: 100,
      organizationPrompt: "",
    }
  },
  watch: (_callback: (value: unknown) => void) => {
    return () => {}
  },
}

export const pendingOrganizerTemplatesStorage = {
  setValue: async (value: unknown) => {
    console.log(
      "Mock: pendingOrganizerTemplatesStorage.setValue called with:",
      value,
    )
  },
  getValue: async () => {
    return null
  },
  watch: () => {
    return () => {}
  },
}

export const settingsStorage = {
  setValue: async (value: unknown) => {
    console.log("Mock: settingsStorage.setValue called with:", value)
  },
  getValue: async () => {
    return {
      autoSaveEnabled: true,
      autoCompleteEnabled: true,
      maxPrompts: 1000,
      showNotifications: true,
      minimalMode: false,
      autoCompleteTarget: "all",
      historySettings: {
        sortOrder: "recent",
        hideOrganizerExcluded: true,
      },
      pinnedSettings: {
        sortOrder: "composite",
        hideOrganizerExcluded: true,
      },
    }
  },
  watch: () => {
    return () => {}
  },
}
