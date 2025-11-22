import { storage } from "wxt/utils/storage"
import { ImprovePromptInputMethod } from "@/types/prompt"
import type {
  StoredPrompt,
  Session,
  AppSettings,
  ImprovePromptSettings,
} from "@/types/prompt"
import type { Category, PromptOrganizerSettings } from "@/types/promptOrganizer"
import type { AiConfigCacheData } from "./aiConfigCache"
import type { ImprovePromptCacheData } from "./improvePromptCache"
import { DEFAULT_CATEGORIES } from "../promptOrganizer/defaultCategories"
import { DEFAULT_ORGANIZATION_PROMPT } from "../genai/defaultPrompts"

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveEnabled: true,
  autoCompleteEnabled: true,
  maxPrompts: 1000,
  sortOrder: "composite",
  showNotifications: true,
  minimalMode: false,
  autoCompleteTarget: "all",
}

/**
 * Prompt storage definition
 */
export const promptsStorage = storage.defineItem<Record<string, StoredPrompt>>(
  "local:prompts",
  {
    fallback: {},
    version: 1,
    migrations: {
      // Reserved for future migrations
      // Example: 2: (oldData: any) => { /* migration logic */ }
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
    version: 1,
    migrations: {},
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
      urlContent: "",
      lastModified: 0,
    },
    version: 1,
    migrations: {},
  })

/**
 * Default Prompt Organizer Settings
 */
export const DEFAULT_ORGANIZER_SETTINGS: PromptOrganizerSettings = {
  filterPeriodDays: 30,
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
    fallback: DEFAULT_CATEGORIES,
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
