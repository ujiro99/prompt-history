import { useState } from "react"
import type { Prompt, PromptFilter } from "../types/prompt"

interface PromptListProps {
  prompts: Prompt[]
  pinnedPrompts: Prompt[]
  currentSessionPromptId?: string | null
  onExecutePrompt: (promptId: string) => void
  onDeletePrompt: (promptId: string) => void
  onTogglePin: (promptId: string, isPinned: boolean) => void
}

/**
 * プロンプト一覧コンポーネント
 */
export const PromptList: React.FC<PromptListProps> = ({
  prompts,
  pinnedPrompts,
  currentSessionPromptId,
  onExecutePrompt,
  onDeletePrompt,
  onTogglePin,
}) => {
  const [filter, setFilter] = useState<PromptFilter>({})
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set())

  /**
   * フィルタリング処理
   */
  const filteredPrompts = prompts.filter((prompt) => {
    // キーワード検索
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      const nameMatch = prompt.name.toLowerCase().includes(keyword)
      const contentMatch = prompt.content.toLowerCase().includes(keyword)
      if (!nameMatch && !contentMatch) {
        return false
      }
    }

    // ピン留めフィルタ
    if (filter.pinnedOnly && !prompt.isPinned) {
      return false
    }

    return true
  })

  /**
   * プロンプト展開/折りたたみ
   */
  const toggleExpanded = (promptId: string) => {
    const newExpanded = new Set(expandedPrompts)
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId)
    } else {
      newExpanded.add(promptId)
    }
    setExpandedPrompts(newExpanded)
  }

  /**
   * プロンプト内容の短縮表示
   */
  const truncateContent = (
    content: string,
    maxLength: number = 100,
  ): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  /**
   * 相対時間の表示
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  /**
   * プロンプトアイテムコンポーネント
   */
  const PromptItem: React.FC<{ prompt: Prompt; isPinned?: boolean }> = ({
    prompt,
    isPinned = false,
  }) => {
    const isExpanded = expandedPrompts.has(prompt.id)
    const isCurrentSession = currentSessionPromptId === prompt.id

    return (
      <div
        className={`prompt-item ${isCurrentSession ? "prompt-item-active" : ""}`}
      >
        <div className="prompt-item-header">
          <div className="prompt-item-info">
            <div className="prompt-item-title">
              <span className="prompt-item-name">{prompt.name}</span>
              {isPinned && (
                <span className="prompt-item-badge prompt-item-badge-pinned">
                  📌
                </span>
              )}
              {isCurrentSession && (
                <span className="prompt-item-badge prompt-item-badge-active">
                  Active
                </span>
              )}
            </div>
            <div className="prompt-item-meta">
              <span>Used {prompt.executionCount} times</span>
              <span>•</span>
              <span>{formatRelativeTime(prompt.lastExecutedAt)}</span>
            </div>
          </div>
          <div className="prompt-item-actions">
            <button
              className="prompt-item-action"
              onClick={() => onExecutePrompt(prompt.id)}
              title="Execute prompt"
            >
              ▶️
            </button>
            <button
              className="prompt-item-action"
              onClick={() => onTogglePin(prompt.id, !prompt.isPinned)}
              title={prompt.isPinned ? "Unpin" : "Pin"}
            >
              {prompt.isPinned ? "📌" : "📍"}
            </button>
            <button
              className="prompt-item-action"
              onClick={() => toggleExpanded(prompt.id)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "🔼" : "🔽"}
            </button>
            <button
              className="prompt-item-action prompt-item-action-danger"
              onClick={() => onDeletePrompt(prompt.id)}
              title="Delete prompt"
            >
              🗑️
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="prompt-item-content">
            <pre>{prompt.content}</pre>
          </div>
        )}

        {!isExpanded && (
          <div className="prompt-item-preview">
            {truncateContent(prompt.content)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="prompt-list">
      {/* 検索・フィルタUI */}
      <div className="prompt-list-filters">
        <div className="prompt-list-search">
          <input
            type="text"
            placeholder="Search prompts..."
            value={filter.keyword || ""}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
          />
        </div>
        <div className="prompt-list-filter-options">
          <label className="prompt-list-checkbox">
            <input
              type="checkbox"
              checked={filter.pinnedOnly || false}
              onChange={(e) =>
                setFilter({ ...filter, pinnedOnly: e.target.checked })
              }
            />
            <span>Pinned only</span>
          </label>
        </div>
      </div>

      {/* ピン留めプロンプト */}
      {pinnedPrompts.length > 0 && !filter.keyword && (
        <div className="prompt-list-section">
          <h4 className="prompt-list-section-title">Pinned Prompts</h4>
          <div className="prompt-list-items">
            {pinnedPrompts.map((prompt) => (
              <PromptItem
                key={`pinned-${prompt.id}`}
                prompt={prompt}
                isPinned
              />
            ))}
          </div>
        </div>
      )}

      {/* すべてのプロンプト */}
      <div className="prompt-list-section">
        <h4 className="prompt-list-section-title">
          {filter.keyword ? "Search Results" : "All Prompts"}
          <span className="prompt-list-count">({filteredPrompts.length})</span>
        </h4>
        <div className="prompt-list-items">
          {filteredPrompts.length === 0 ? (
            <div className="prompt-list-empty">
              {filter.keyword || filter.pinnedOnly
                ? "No prompts match your filters."
                : "No prompts saved yet."}
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <PromptItem key={prompt.id} prompt={prompt} />
            ))
          )}
        </div>
      </div>

      <style>{`
        .prompt-list {
          background: white;
          border-radius: 8px;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .prompt-list-filters {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .prompt-list-search {
          margin-bottom: 12px;
        }

        .prompt-list-search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .prompt-list-search input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .prompt-list-filter-options {
          display: flex;
          gap: 16px;
        }

        .prompt-list-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .prompt-list-section {
          border-bottom: 1px solid #e5e7eb;
        }

        .prompt-list-section:last-child {
          border-bottom: none;
        }

        .prompt-list-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 16px 8px;
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .prompt-list-count {
          font-size: 14px;
          font-weight: 400;
          color: #6b7280;
        }

        .prompt-list-items {
          padding: 0 16px 16px;
        }

        .prompt-list-empty {
          text-align: center;
          padding: 32px 16px;
          color: #6b7280;
          font-style: italic;
        }

        .prompt-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
          transition: all 0.15s ease;
          background: white;
        }

        .prompt-item:last-child {
          margin-bottom: 0;
        }

        .prompt-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .prompt-item-active {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }

        .prompt-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px;
        }

        .prompt-item-info {
          flex: 1;
          min-width: 0;
        }

        .prompt-item-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .prompt-item-name {
          font-weight: 500;
          color: #111827;
          word-break: break-word;
        }

        .prompt-item-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .prompt-item-badge-pinned {
          background: transparent;
        }

        .prompt-item-badge-active {
          background: #dbeafe;
          color: #1e40af;
        }

        .prompt-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
        }

        .prompt-item-actions {
          display: flex;
          gap: 4px;
          margin-left: 12px;
        }

        .prompt-item-action {
          background: none;
          border: none;
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
        }

        .prompt-item-action:hover {
          background: #f3f4f6;
        }

        .prompt-item-action-danger:hover {
          background: #fef2f2;
        }

        .prompt-item-preview {
          padding: 0 12px 12px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        .prompt-item-content {
          padding: 0 12px 12px;
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 12px;
        }

        .prompt-item-content pre {
          margin: 0;
          font-family:
            ui-monospace, SFMono-Regular, "SF Mono", Consolas,
            "Liberation Mono", Menlo, monospace;
          font-size: 13px;
          color: #111827;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* ダークモード対応 */
        @media (prefers-color-scheme: dark) {
          .prompt-list {
            background: #1f2937;
          }

          .prompt-list-filters {
            background: #111827;
            border-bottom-color: #374151;
          }

          .prompt-list-search input {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }

          .prompt-list-search input:focus {
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
          }

          .prompt-list-checkbox {
            color: #d1d5db;
          }

          .prompt-list-section {
            border-bottom-color: #374151;
          }

          .prompt-list-section-title {
            color: #d1d5db;
          }

          .prompt-list-count {
            color: #9ca3af;
          }

          .prompt-list-empty {
            color: #9ca3af;
          }

          .prompt-item {
            background: #374151;
            border-color: #4b5563;
          }

          .prompt-item:hover {
            border-color: #6b7280;
          }

          .prompt-item-active {
            border-color: #60a5fa;
            box-shadow: 0 0 0 1px #60a5fa;
          }

          .prompt-item-name {
            color: #f9fafb;
          }

          .prompt-item-meta {
            color: #9ca3af;
          }

          .prompt-item-action:hover {
            background: #4b5563;
          }

          .prompt-item-action-danger:hover {
            background: #7f1d1d;
          }

          .prompt-item-preview {
            color: #9ca3af;
          }

          .prompt-item-content {
            border-top-color: #4b5563;
          }

          .prompt-item-content pre {
            color: #f9fafb;
          }
        }
      `}</style>
    </div>
  )
}
