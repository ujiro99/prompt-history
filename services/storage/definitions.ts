import { storage } from "wxt/utils/storage"
import type { Prompt, Session, AppSettings } from "../../types/prompt"

/**
 * デフォルト設定値
 */
const DEFAULT_SETTINGS: AppSettings = {
  autoSaveEnabled: true,
  maxPrompts: 1000,
  defaultSortOrder: "recent",
  showNotifications: true,
}

/**
 * プロンプトストレージの定義
 */
export const promptsStorage = storage.defineItem<Record<string, Prompt>>(
  "local:prompts",
  {
    fallback: {},
    version: 1,
    migrations: {
      // 将来的なマイグレーション用の予約
      // 例: 2: (oldData: any) => { /* migration logic */ }
    },
  },
)

/**
 * セッションストレージの定義
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
 * ピン留め順序ストレージの定義
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
 * 設定ストレージの定義
 */
export const settingsStorage = storage.defineItem<AppSettings>(
  "local:settings",
  {
    fallback: DEFAULT_SETTINGS,
    version: 1,
    migrations: {},
  },
)
