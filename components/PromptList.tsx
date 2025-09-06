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
  const filteredPrompts =
    prompts?.filter((prompt) => {
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
    }) ?? []

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
    if (!date) return "---"
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
        className={`border border-gray-200 dark:border-gray-600 rounded-md mb-2 last:mb-0 transition-all duration-150 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm ${
          isCurrentSession
            ? "border-blue-500 dark:border-blue-400 shadow-[0_0_0_1px_rgb(59_130_246)]"
            : ""
        }`}
      >
        <div className="flex justify-between items-start p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-gray-100 break-words">
                {prompt.name}
              </span>
              {isPinned && <span>📌</span>}
              {isCurrentSession && (
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>Used {prompt.executionCount} times</span>
              <span>•</span>
              <span>{formatRelativeTime(prompt.lastExecutedAt)}</span>
            </div>
          </div>
          <div className="flex gap-1 ml-3">
            <button
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center min-w-[24px] h-6 text-sm"
              onClick={() => onExecutePrompt(prompt.id)}
              title="Execute prompt"
            >
              ▶️
            </button>
            <button
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center min-w-[24px] h-6 text-sm"
              onClick={() => onTogglePin(prompt.id, !prompt.isPinned)}
              title={prompt.isPinned ? "Unpin" : "Pin"}
            >
              {prompt.isPinned ? "📌" : "📍"}
            </button>
            <button
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center min-w-[24px] h-6 text-sm"
              onClick={() => toggleExpanded(prompt.id)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "🔼" : "🔽"}
            </button>
            <button
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors flex items-center justify-center min-w-[24px] h-6 text-sm"
              onClick={() => onDeletePrompt(prompt.id)}
              title="Delete prompt"
            >
              🗑️
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-600 mt-2 pt-3">
            <pre className="m-0 font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
              {prompt.content}
            </pre>
          </div>
        )}

        {!isExpanded && (
          <div className="px-3 pb-3 text-sm text-gray-500 dark:text-gray-400 leading-5">
            {truncateContent(prompt.content)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* 検索・フィルタUI */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search prompts..."
            value={filter.keyword || ""}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 box-border"
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={filter.pinnedOnly || false}
              onChange={(e) =>
                setFilter({ ...filter, pinnedOnly: e.target.checked })
              }
              className="rounded"
            />
            <span>Pinned only</span>
          </label>
        </div>
      </div>

      {/* ピン留めプロンプト */}
      {pinnedPrompts.length > 0 && !filter.keyword && (
        <div className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
          <h4 className="flex items-center gap-2 px-4 pt-4 pb-2 m-0 text-base font-semibold text-gray-700 dark:text-gray-300">
            Pinned Prompts
          </h4>
          <div className="px-4 pb-4">
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
      <div className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
        <h4 className="flex items-center gap-2 px-4 pt-4 pb-2 m-0 text-base font-semibold text-gray-700 dark:text-gray-300">
          {filter.keyword ? "Search Results" : "All Prompts"}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({filteredPrompts.length})
          </span>
        </h4>
        <div className="px-4 pb-4">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400 italic">
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
    </div>
  )
}
