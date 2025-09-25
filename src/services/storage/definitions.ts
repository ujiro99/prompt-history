import { storage } from "wxt/utils/storage"
import type { StoredPrompt, Session, AppSettings } from "../../types/prompt"
import type { AiConfigCacheData } from "./aiConfigCache"

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
