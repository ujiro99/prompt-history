import { useState, useEffect } from "react"
import { HistoryManager } from "../services/promptHistory/historyManager"
import { SaveDialog } from "./SaveDialog"
import { PromptList } from "./PromptList"
import { NotificationManager } from "./Notification"

// Singleton instance for compatibility
const sessionManager = HistoryManager.getInstance()
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

  /**
   * 初期化処理
   */
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        await sessionManager.initialize()

        if (mounted) {
          // 初期データロード
          loadPrompts()
          setCurrentSession(sessionManager.getCurrentSession())
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

    const handlePromptSave = (prompt: Prompt) => {
      loadPrompts() // プロンプト一覧を更新
    }

    const handleNotification = (notification: NotificationData) => {
      addNotification(notification)
    }

    const handleError = (error: PromptError) => {
      console.error("SessionManager error:", error)
    }

    // コールバック登録
    sessionManager.onSessionChange(handleSessionChange)
    sessionManager.onPromptSave(handlePromptSave)
    sessionManager.onNotification(handleNotification)
    sessionManager.onError(handleError)

    // クリーンアップは自動的に行われないため、手動実装が必要
    return () => {
      // 注意: 実際のUnsubscribe機能があればここで実装
    }
  }, [])

  /**
   * プロンプト一覧の読み込み
   */
  const loadPrompts = () => {
    try {
      const allPrompts = sessionManager.getPrompts()
      const pinned = sessionManager.getPinnedPrompts()

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
  const openSaveDialog = () => {
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
      const savedPrompt = await sessionManager.savePromptManually(saveData)
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
      await sessionManager.executePrompt(promptId)
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
        await sessionManager.deletePrompt(promptId)
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
        await sessionManager.pinPrompt(promptId)
      } else {
        await sessionManager.unpinPrompt(promptId)
      }
      loadPrompts() // 一覧を更新
    } catch (error) {
      console.error("Pin toggle failed:", error)
    }
  }

  // 初期化中の表示
  if (isInitializing) {
    return (
      <div className="prompt-history-widget prompt-history-initializing">
        <div className="prompt-history-spinner">Loading...</div>
        <style>{`
          .prompt-history-initializing {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .prompt-history-spinner {
            color: #6b7280;
            font-size: 14px;
          }

          @media (prefers-color-scheme: dark) {
            .prompt-history-initializing {
              background: #1f2937;
              color: #d1d5db;
            }
          }
        `}</style>
      </div>
    )
  }

  // 初期化エラーの表示
  if (initError) {
    return (
      <div className="prompt-history-widget prompt-history-error">
        <div className="prompt-history-error-content">
          <span>❌</span>
          <span>Failed to initialize: {initError}</span>
        </div>
        <style>{`
          .prompt-history-error {
            padding: 12px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #991b1b;
          }

          .prompt-history-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
          }

          @media (prefers-color-scheme: dark) {
            .prompt-history-error {
              background: #7f1d1d;
              border-color: #991b1b;
              color: #fca5a5;
            }
          }
        `}</style>
      </div>
    )
  }

  // ウィジェット非表示時
  if (!isVisible) {
    return null
  }

  return (
    <>
      <div className="prompt-history-widget">
        {currentView === "closed" && (
          <div className="prompt-history-controls">
            <button
              className="prompt-history-button prompt-history-button-save"
              onClick={openSaveDialog}
              title="Save current prompt"
            >
              💾 Save
            </button>
            <button
              className="prompt-history-button prompt-history-button-list"
              onClick={openPromptList}
              title="View prompt history"
            >
              📋 History ({prompts.length})
            </button>
            <button
              className="prompt-history-close"
              onClick={() => setIsVisible(false)}
              title="Hide prompt history"
            >
              ×
            </button>
          </div>
        )}

        {currentView === "list" && (
          <div className="prompt-history-panel">
            <div className="prompt-history-panel-header">
              <h3>Prompt History</h3>
              <div className="prompt-history-panel-actions">
                <button
                  className="prompt-history-button prompt-history-button-save"
                  onClick={openSaveDialog}
                  title="Save current prompt"
                >
                  💾 Save
                </button>
                <button
                  className="prompt-history-close"
                  onClick={closeView}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="prompt-history-panel-content">
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

        <style>{`
          .prompt-history-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family:
              -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
              sans-serif;
          }

          .prompt-history-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow:
              0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }

          .prompt-history-button {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
          }

          .prompt-history-button-save {
            background: #3b82f6;
            color: white;
          }

          .prompt-history-button-save:hover {
            background: #2563eb;
          }

          .prompt-history-button-list {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .prompt-history-button-list:hover {
            background: #e5e7eb;
          }

          .prompt-history-close {
            background: none;
            border: none;
            font-size: 16px;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.15s ease;
          }

          .prompt-history-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .prompt-history-panel {
            width: 400px;
            max-height: 600px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow:
              0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .prompt-history-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
            background: #f9fafb;
          }

          .prompt-history-panel-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }

          .prompt-history-panel-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .prompt-history-panel-content {
            flex: 1;
            overflow: hidden;
          }

          /* ダークモード対応 */
          @media (prefers-color-scheme: dark) {
            .prompt-history-controls {
              background: #1f2937;
              border-color: #374151;
            }

            .prompt-history-button-list {
              background: #374151;
              color: #d1d5db;
              border-color: #4b5563;
            }

            .prompt-history-button-list:hover {
              background: #4b5563;
            }

            .prompt-history-close {
              color: #9ca3af;
            }

            .prompt-history-close:hover {
              background: #374151;
              color: #d1d5db;
            }

            .prompt-history-panel {
              background: #1f2937;
              border-color: #374151;
            }

            .prompt-history-panel-header {
              background: #111827;
              border-bottom-color: #374151;
            }

            .prompt-history-panel-header h3 {
              color: #f9fafb;
            }
          }

          /* モバイル対応 */
          @media (max-width: 640px) {
            .prompt-history-widget {
              bottom: 10px;
              right: 10px;
              left: 10px;
            }

            .prompt-history-panel {
              width: 100%;
            }

            .prompt-history-controls {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>

      {/* 保存ダイアログ */}
      {currentView === "save" && (
        <SaveDialog
          {...sessionManager.prepareSaveDialogData()}
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
