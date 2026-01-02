import { storage } from "wxt/utils/storage"
import { ImprovePromptInputMethod } from "@/types/prompt"
import type {
  StoredPrompt,
  StoredVariablePreset,
  Session,
  AppSettings,
  ImprovePromptSettings,
} from "@/types/prompt"
import type { VariableGenerationSettings } from "@/types/variableGeneration"
import type {
  Category,
  PromptOrganizerSettings,
  PendingOrganizerTemplates,
} from "@/types/promptOrganizer"
import type { AiConfigCacheData } from "./aiConfigCache"
import type { ImprovePromptCacheData } from "./improvePromptCache"
import { DEFAULT_ORGANIZATION_PROMPT } from "../genai/defaultPrompts"

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
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

/**
 * Prompt storage definition
 */
export const promptsStorage = storage.defineItem<Record<string, StoredPrompt>>(
  "local:prompts",
  {
    fallback: {},
    version: 2,
    migrations: {
      2: (oldData: Record<string, StoredPrompt>) => {
        // Migrate all variables with type "textarea" to "text"
        const migratedData: Record<string, StoredPrompt> = {}

        for (const [id, prompt] of Object.entries(oldData)) {
          if (prompt.variables) {
            const migratedVariables = prompt.variables.map((variable) => {
              // Type assertion needed for migration from old "textarea" type
              if ((variable.type as any) === "textarea") {
                return { ...variable, type: "text" as const }
              }
              return variable
            })
            migratedData[id] = { ...prompt, variables: migratedVariables }
          } else {
            migratedData[id] = prompt
          }
        }

        return migratedData
      },
    },
  },
)

/**
 * Session storage definition
 */
export const sessionStorage = storage.defineItem<Session | null>(
  "local:session",
  {
    fallback: null,
    version: 1,
    migrations: {},
  },
)

/**
 * Pinned order storage definition
 */
export const pinnedOrderStorage = storage.defineItem<string[]>(
  "local:pinnedOrder",
  {
    fallback: [],
    version: 1,
    migrations: {},
  },
)

/**
 * Settings storage definition
 */
export const settingsStorage = storage.defineItem<AppSettings>(
  "local:settings",
  {
    fallback: DEFAULT_SETTINGS,
    version: 2,
    migrations: {
      2: (oldSettings: AppSettings) => {
        // Migrate existing sortOrder menuType-specific settings
        // If historySettings or pinnedSettings are not set, initialize them with current values
        const migratedSettings = { ...oldSettings }

        if (!migratedSettings.historySettings) {
          migratedSettings.historySettings = {
            ...DEFAULT_SETTINGS.historySettings,
            sortOrder: oldSettings.sortOrder,
          }
        }

        if (!migratedSettings.pinnedSettings) {
          migratedSettings.pinnedSettings = {
            ...DEFAULT_SETTINGS.pinnedSettings,
            sortOrder: oldSettings.sortOrder,
          }
        }
        return migratedSettings
      },
    },
  },
)

/**
 * AI Config Cache storage definition
 */
export const aiConfigCacheStorage =
  storage.defineItem<AiConfigCacheData | null>("local:aiConfigCache", {
    fallback: null,
    version: 1,
    migrations: {},
  })

/**
 * Improve Prompt Cache storage definition
 */
export const improvePromptCacheStorage =
  storage.defineItem<ImprovePromptCacheData | null>(
    "local:improvePromptCache",
    {
      fallback: null,
      version: 1,
      migrations: {},
    },
  )

/**
 * Gemini API Key storage definition
 */
export const genaiApiKeyStorage = storage.defineItem<string>(
  "local:genaiApiKey",
  {
    fallback: "",
    version: 1,
    migrations: {},
  },
)

/**
 * Improve Prompt Settings storage definition
 */
export const improvePromptSettingsStorage =
  storage.defineItem<ImprovePromptSettings>("local:improvePromptSettings", {
    fallback: {
      mode: ImprovePromptInputMethod.URL,
      textContent: "",
      urlContent: import.meta.env.WXT_IMPROVE_PROMPT_URL || "",
      lastModified: 0,
    },
    version: 1,
    migrations: {},
  })

/**
 * Default Prompt Organizer Settings
 */
export const DEFAULT_ORGANIZER_SETTINGS: PromptOrganizerSettings = {
  filterPeriodDays: 7,
  filterMinExecutionCount: 2,
  filterMaxPrompts: 100,
  organizationPrompt: DEFAULT_ORGANIZATION_PROMPT,
}

/**
 * Categories storage definition
 */
export const categoriesStorage = storage.defineItem<Record<string, Category>>(
  "local:categories",
  {
    fallback: {},
    version: 1,
    migrations: {},
  },
)

/**
 * Prompt Organizer Settings storage definition
 */
export const promptOrganizerSettingsStorage =
  storage.defineItem<PromptOrganizerSettings>("local:promptOrganizerSettings", {
    fallback: DEFAULT_ORGANIZER_SETTINGS,
    version: 1,
    migrations: {},
  })

/**
 * Pending Organizer Templates storage definition
 * Stores template candidates that are pending user action (save/discard)
 */
export const pendingOrganizerTemplatesStorage =
  storage.defineItem<PendingOrganizerTemplates | null>(
    "local:pendingOrganizerTemplates",
    {
      fallback: null,
      version: 1,
      migrations: {},
    },
  )

/**
 * Variable Presets storage definition
 */
export const variablePresetsStorage = storage.defineItem<
  Record<string, StoredVariablePreset>
>("local:variablePresets", {
  fallback: {},
  version: 1,
  migrations: {},
})

/**
 * Variable Presets Order storage definition
 */
export const variablePresetsOrderStorage = storage.defineItem<string[]>(
  "local:variablePresetsOrder",
  {
    fallback: [],
    version: 1,
    migrations: {},
  },
)

/**
 * Variable Generation Settings storage definition
 */
export const variableGenerationSettingsStorage =
  storage.defineItem<VariableGenerationSettings>(
    "local:variableGenerationSettings",
    {
      fallback: {
        useDefault: true,
        promptHistoryCount: 200,
      },
      version: 1,
      migrations: {},
    },
  )
