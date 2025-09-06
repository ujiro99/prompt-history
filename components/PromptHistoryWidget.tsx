import { useState, useEffect } from "react"
import { HistoryManager } from "../services/promptHistory/historyManager"
import { SaveDialog } from "./SaveDialog"
import { PromptList } from "./PromptList"
import { NotificationManager } from "./Notification"

// Singleton instance for compatibility
const historyManager = HistoryManager.getInstance()
import type {
  Prompt,
  Session,
  SaveDialogData,
  NotificationData,
  PromptError,
} from "../types/prompt"

/**
 * プロンプト履歴管理のメインウィジェット
 */
export const PromptHistoryWidget: React.FC = () => {
  // 状態管理
  const [isVisible, setIsVisible] = useState(true)
  const [currentView, setCurrentView] = useState<"closed" | "list" | "save">(
    "closed",
  )
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [pinnedPrompts, setPinnedPrompts] = useState<Prompt[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [saveDialogData, setSaveDialogData] = useState<SaveDialogData | null>(
    null,
  )

  /**
   * 初期化処理
   */
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        await historyManager.initialize()

        if (mounted) {
          // 初期データロード
          loadPrompts()
          setCurrentSession(historyManager.getCurrentSession())
          setIsInitializing(false)
        }
      } catch (error) {
        if (mounted) {
          setInitError(
            error instanceof Error ? error.message : "Initialization failed",
          )
          setIsInitializing(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  /**
   * イベントリスナー設定
   */
  useEffect(() => {
    const handleSessionChange = (session: Session | null) => {
      setCurrentSession(session)
    }

    const handlePromptSave = (_prompt: Prompt) => {
      loadPrompts() // プロンプト一覧を更新
    }

    const handleNotification = (notification: NotificationData) => {
      addNotification(notification)
    }

    const handleError = (error: PromptError) => {
      console.error("SessionManager error:", error)
    }

    // コールバック登録
    historyManager.onSessionChange(handleSessionChange)
    historyManager.onPromptSave(handlePromptSave)
    historyManager.onNotification(handleNotification)
    historyManager.onError(handleError)

    // クリーンアップは自動的に行われないため、手動実装が必要
    return () => {
      // 注意: 実際のUnsubscribe機能があればここで実装
    }
  }, [])

  /**
   * プロンプト一覧の読み込み
   */
  const loadPrompts = async () => {
    try {
      const [allPrompts, pinned] = await Promise.all([
        historyManager.getPrompts(),
        historyManager.getPinnedPrompts(),
      ])

      setPrompts(allPrompts)
      setPinnedPrompts(pinned)
    } catch (error) {
      console.error("Failed to load prompts:", error)
      addNotification({
        type: "error",
        message: "Failed to load prompts",
        duration: 3000,
      })
    }
  }

  /**
   * 通知追加
   */
  const addNotification = (notification: NotificationData) => {
    setNotifications((prev) => [...prev, notification])
  }

  /**
   * 通知削除
   */
  const removeNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * 保存ダイアログを開く
   */
  const openSaveDialog = async () => {
    const data = await historyManager.prepareSaveDialogData()
    setSaveDialogData({
      name: data.initialName ?? "",
      content: data.initialContent,
      saveMode: data.isOverwriteAvailable ? "overwrite" : "new",
    })
    setCurrentView("save")
  }

  /**
   * プロンプト一覧を開く
   */
  const openPromptList = () => {
    loadPrompts() // 最新データをロード
    setCurrentView("list")
  }

  /**
   * ビューを閉じる
   */
  const closeView = () => {
    setCurrentView("closed")
  }

  /**
   * プロンプト保存処理
   */
  const handleSavePrompt = async (saveData: SaveDialogData) => {
    try {
      const savedPrompt = await historyManager.savePromptManually(saveData)
      if (savedPrompt) {
        closeView()
        loadPrompts() // 一覧を更新
      }
    } catch (error) {
      console.error("Save failed:", error)
      addNotification({
        type: "error",
        message: "Failed to save prompt",
        duration: 3000,
      })
    }
  }

  /**
   * プロンプト実行処理
   */
  const handleExecutePrompt = async (promptId: string) => {
    try {
      await historyManager.executePrompt(promptId)
      closeView() // 実行後はビューを閉じる
    } catch (error) {
      console.error("Execute failed:", error)
    }
  }

  /**
   * プロンプト削除処理
   */
  const handleDeletePrompt = async (promptId: string) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      try {
        await historyManager.deletePrompt(promptId)
        loadPrompts() // 一覧を更新
      } catch (error) {
        console.error("Delete failed:", error)
      }
    }
  }

  /**
   * ピン留めトグル処理
   */
  const handleTogglePin = async (promptId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await historyManager.pinPrompt(promptId)
      } else {
        await historyManager.unpinPrompt(promptId)
      }
      loadPrompts() // 一覧を更新
    } catch (error) {
      console.error("Pin toggle failed:", error)
    }
  }

  // 初期化中の表示
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-gray-500 dark:text-gray-300 text-sm">
          Loading...
        </div>
      </div>
    )
  }

  // 初期化エラーの表示
  if (initError) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200">
        <div className="flex items-center gap-2 text-sm">
          <span>❌</span>
          <span>Failed to initialize: {initError}</span>
        </div>
      </div>
    )
  }

  // ウィジェット非表示時
  if (!isVisible) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 sm:left-auto sm:w-auto left-2.5 w-[calc(100%-1.25rem)] z-[9999] font-sans">
        {currentView === "closed" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              onClick={openSaveDialog}
              title="Save current prompt"
            >
              💾 Save
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm font-medium border border-gray-300 dark:border-gray-500 rounded-md transition-colors whitespace-nowrap"
              onClick={openPromptList}
              title="View prompt history"
            >
              📋 History ({prompts.length})
            </button>
            <button
              className="flex items-center justify-center w-6 h-6 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              onClick={() => setIsVisible(false)}
              title="Hide prompt history"
            >
              ×
            </button>
          </div>
        )}

        {currentView === "list" && (
          <div className="w-full sm:w-96 max-h-[600px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
              <h3 className="m-0 text-base font-semibold text-gray-900 dark:text-gray-100">
                Prompt History
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                  onClick={openSaveDialog}
                  title="Save current prompt"
                >
                  💾 Save
                </button>
                <button
                  className="flex items-center justify-center w-6 h-6 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
                  onClick={closeView}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <PromptList
                prompts={prompts}
                pinnedPrompts={pinnedPrompts}
                currentSessionPromptId={currentSession?.activePromptId}
                onExecutePrompt={handleExecutePrompt}
                onDeletePrompt={handleDeletePrompt}
                onTogglePin={handleTogglePin}
              />
            </div>
          </div>
        )}
      </div>

      {/* 保存ダイアログ */}
      {currentView === "save" && saveDialogData && (
        <SaveDialog
          initialName={saveDialogData.name}
          initialContent={saveDialogData.content}
          isOverwriteAvailable={saveDialogData.saveMode === "overwrite"}
          onSave={handleSavePrompt}
          onCancel={closeView}
        />
      )}

      {/* 通知システム */}
      <NotificationManager
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </>
  )
}
