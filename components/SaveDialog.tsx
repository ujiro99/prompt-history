import { useState, useEffect } from "react"
import type { SaveDialogProps, SaveDialogData } from "../types/prompt"

/**
 * プロンプト保存ダイアログコンポーネント
 */
export const SaveDialog: React.FC<SaveDialogProps> = ({
  initialName = "",
  initialContent,
  isOverwriteAvailable,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [saveMode, setSaveMode] = useState<"new" | "overwrite">("new")
  const [isLoading, setIsLoading] = useState(false)

  // 初期値の更新
  useEffect(() => {
    setName(initialName)
    setContent(initialContent)
  }, [initialName, initialContent])

  /**
   * 保存処理
   */
  const handleSave = async () => {
    if (!name.trim()) {
      return // 名前が空の場合は何もしない
    }

    setIsLoading(true)

    try {
      const saveData: SaveDialogData = {
        name: name.trim(),
        content: content.trim(),
        saveMode,
      }

      await onSave(saveData)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * キーボードイベント処理
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSave()
    } else if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
    }
  }

  /**
   * バックドロップクリック処理
   */
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }

  return (
    <div
      className="save-dialog-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="save-dialog">
        <div className="save-dialog-header">
          <h3>Save Prompt</h3>
          <button
            className="save-dialog-close"
            onClick={onCancel}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="save-dialog-content">
          {/* プロンプト名入力 */}
          <div className="save-dialog-field">
            <label htmlFor="prompt-name">Name</label>
            <input
              id="prompt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prompt name..."
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* プロンプト内容入力 */}
          <div className="save-dialog-field">
            <label htmlFor="prompt-content">Content</label>
            <textarea
              id="prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter prompt content..."
              disabled={isLoading}
              rows={6}
            />
          </div>

          {/* 保存モード選択 */}
          {isOverwriteAvailable && (
            <div className="save-dialog-field">
              <label>Save Mode</label>
              <div className="save-dialog-radio-group">
                <label className="save-dialog-radio">
                  <input
                    type="radio"
                    value="new"
                    checked={saveMode === "new"}
                    onChange={(e) =>
                      setSaveMode(e.target.value as "new" | "overwrite")
                    }
                    disabled={isLoading}
                  />
                  <span>Save as new prompt</span>
                </label>
                <label className="save-dialog-radio">
                  <input
                    type="radio"
                    value="overwrite"
                    checked={saveMode === "overwrite"}
                    onChange={(e) =>
                      setSaveMode(e.target.value as "new" | "overwrite")
                    }
                    disabled={isLoading}
                  />
                  <span>Overwrite current prompt</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="save-dialog-footer">
          <button
            className="save-dialog-button save-dialog-button-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="save-dialog-button save-dialog-button-primary"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !content.trim()}
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <style>{`
        .save-dialog-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(2px);
        }

        .save-dialog {
          background: white;
          border-radius: 12px;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .save-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .save-dialog-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .save-dialog-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .save-dialog-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .save-dialog-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-dialog-content {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
        }

        .save-dialog-field {
          margin-bottom: 20px;
        }

        .save-dialog-field:last-child {
          margin-bottom: 0;
        }

        .save-dialog-field label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .save-dialog-field input,
        .save-dialog-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #111827;
          background: white;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .save-dialog-field input:focus,
        .save-dialog-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .save-dialog-field input:disabled,
        .save-dialog-field textarea:disabled {
          background: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }

        .save-dialog-field textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .save-dialog-radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .save-dialog-radio {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .save-dialog-radio input[type="radio"] {
          width: auto;
          margin: 0;
        }

        .save-dialog-radio input[type="radio"]:disabled + span {
          color: #6b7280;
          cursor: not-allowed;
        }

        .save-dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .save-dialog-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 80px;
        }

        .save-dialog-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-dialog-button-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .save-dialog-button-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .save-dialog-button-primary {
          background: #3b82f6;
          color: white;
        }

        .save-dialog-button-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        /* ダークモード対応 */
        @media (prefers-color-scheme: dark) {
          .save-dialog {
            background: #1f2937;
            color: #f9fafb;
          }

          .save-dialog-header {
            border-bottom-color: #374151;
          }

          .save-dialog-header h3 {
            color: #f9fafb;
          }

          .save-dialog-close {
            color: #9ca3af;
          }

          .save-dialog-close:hover {
            background: #374151;
            color: #d1d5db;
          }

          .save-dialog-field label {
            color: #d1d5db;
          }

          .save-dialog-field input,
          .save-dialog-field textarea {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }

          .save-dialog-field input:focus,
          .save-dialog-field textarea:focus {
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
          }

          .save-dialog-field input:disabled,
          .save-dialog-field textarea:disabled {
            background: #1f2937;
            color: #6b7280;
          }

          .save-dialog-footer {
            background: #111827;
            border-top-color: #374151;
          }

          .save-dialog-button-secondary {
            background: #374151;
            color: #d1d5db;
            border-color: #4b5563;
          }

          .save-dialog-button-secondary:hover:not(:disabled) {
            background: #4b5563;
            border-color: #6b7280;
          }
        }
      `}</style>
    </div>
  )
}
