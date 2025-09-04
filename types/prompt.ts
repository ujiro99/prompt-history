// プロンプト管理機能の型定義

/**
 * プロンプトデータの基本構造
 */
export interface Prompt {
  /** プロンプトの一意識別子（UUID） */
  id: string
  /** プロンプト名 */
  name: string
  /** プロンプト内容 */
  content: string
  /** 実行回数 */
  executionCount: number
  /** 最新実行日時 */
  lastExecutedAt: Date
  /** ピン留めフラグ */
  isPinned: boolean
  /** 最終実行URL */
  lastExecutionUrl: string
  /** 作成日時 */
  createdAt: Date
  /** 更新日時 */
  updatedAt: Date
}

/**
 * セッション状態管理
 */
export interface Session {
  /** 実行中プロンプトID（セッションなしの場合はnull） */
  activePromptId: string | null
  /** セッション開始URL */
  url: string
  /** セッション開始時刻 */
  startedAt: Date
}

/**
 * プロンプト保存ダイアログのProps
 */
export interface SaveDialogProps {
  /** 初期プロンプト名（編集時） */
  initialName?: string
  /** 初期プロンプト内容 */
  initialContent: string
  /** 上書き保存が可能かどうか */
  isOverwriteAvailable: boolean
  /** 保存時のコールバック */
  onSave: (data: SaveDialogData) => void
  /** キャンセル時のコールバック */
  onCancel: () => void
}

/**
 * プロンプト保存データ
 */
export interface SaveDialogData {
  /** プロンプト名 */
  name: string
  /** プロンプト内容 */
  content: string
  /** 保存モード */
  saveMode: "new" | "overwrite"
}

/**
 * ストレージに保存するデータの型
 */
export interface StorageData {
  /** プロンプト一覧 */
  prompts: Record<string, Prompt>
  /** 現在のセッション状態 */
  session: Session | null
  /** ピン留めプロンプトの順序 */
  pinnedOrder: string[]
  /** アプリケーション設定 */
  settings: AppSettings
}

/**
 * アプリケーション設定
 */
export interface AppSettings {
  /** 自動保存機能の有効/無効 */
  autoSaveEnabled: boolean
  /** 最大保存プロンプト数 */
  maxPrompts: number
  /** デフォルトの並び順 */
  defaultSortOrder: "recent" | "execution" | "name"
  /** 通知表示設定 */
  showNotifications: boolean
}

/**
 * AIサービス抽象化インターフェース
 */
export interface AIServiceInterface {
  /** このサービスがサポートされているかチェック */
  isSupported(): boolean
  /** テキスト入力要素を取得 */
  getTextInput(): Element | null
  /** 送信ボタン要素を取得 */
  getSendButton(): Element | null
  /** 現在のプロンプト内容を抽出 */
  extractPromptContent(): string
  /** プロンプト内容を入力欄に挿入 */
  injectPromptContent(content: string): void
  /** 送信イベント監視の設定 */
  onSend(callback: () => void): void
  /** サービス名を取得 */
  getServiceName(): string
}

/**
 * ChatGPT用のDOMセレクタ定義
 */
export interface ChatGPTSelectors {
  /** テキスト入力欄のセレクタ（フォールバック用配列） */
  textInput: string[]
  /** 送信ボタンのセレクタ（フォールバック用配列） */
  sendButton: string[]
  /** チャット履歴のセレクタ（フォールバック用配列） */
  chatHistory: string[]
}

/**
 * プロンプト一覧表示用のデータ
 */
export interface PromptListItem {
  /** プロンプトの基本情報 */
  prompt: Prompt
  /** 表示用の短縮された内容 */
  truncatedContent: string
  /** 最終実行からの経過時間（表示用） */
  relativeLastExecuted: string
}

/**
 * 並び順の設定
 */
export type SortOrder = "recent" | "execution" | "name" | "pinned"

/**
 * プロンプト検索・フィルタリングの条件
 */
export interface PromptFilter {
  /** キーワード検索 */
  keyword?: string
  /** ピン留めプロンプトのみ表示 */
  pinnedOnly?: boolean
  /** 並び順 */
  sortOrder?: SortOrder
}

/**
 * エラー情報
 */
export interface PromptError {
  /** エラーコード */
  code: string
  /** エラーメッセージ */
  message: string
  /** エラー詳細 */
  details?: any
}

/**
 * 通知情報
 */
export interface NotificationData {
  /** 通知タイプ */
  type: "success" | "error" | "info" | "warning"
  /** 通知メッセージ */
  message: string
  /** 自動消去時間（ms、0で自動消去しない） */
  duration?: number
}

/**
 * プロンプト統計情報
 */
export interface PromptStats {
  /** 総プロンプト数 */
  totalPrompts: number
  /** ピン留めプロンプト数 */
  pinnedPrompts: number
  /** 総実行回数 */
  totalExecutions: number
  /** 最も実行されたプロンプト */
  mostExecutedPrompt?: Prompt
  /** 最近実行されたプロンプト */
  recentlyExecutedPrompt?: Prompt
}
