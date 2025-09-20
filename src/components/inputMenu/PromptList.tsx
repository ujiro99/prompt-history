import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { Prompt } from "@/types/prompt"
import { cn } from "@/lib/utils"
import { ScrollAreaWithGradient } from "./ScrollAreaWithGradient"
import { MenuItem } from "./MenuItem"
import { Input } from "@/components/ui/input"
import { TestIds } from "@/components/const"

interface PromptListProps {
  menuType?: "history" | "pinned"
  prompts: Prompt[]
  onClick: (promptId: string) => void
  onHover: (
    promptId: string,
    element: HTMLElement,
    menuType: "history" | "pinned",
  ) => void
  onLeave: () => void
  onEdit: (promptId: string) => void
  onRemove: (promptId: string) => void
  onCopy: (promptId: string) => void
  onTogglePin: (promptId: string, isPinned: boolean) => void
}

/**
 * Prompt List component
 */
export const PromptList = ({
  menuType,
  prompts,
  onClick,
  onHover,
  onLeave,
  onEdit,
  onRemove,
  onCopy,
  onTogglePin,
}: PromptListProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("")

  const reversePrompts = useMemo(() => {
    return [...prompts].filter((p) => p.content.includes(searchQuery)).reverse()
  }, [prompts, searchQuery])

  const isEmpty = reversePrompts.length === 0

  const dataTestId =
    menuType === "pinned"
      ? TestIds.inputPopup.pinnedItem
      : TestIds.inputPopup.historyItem

  const emptyMessage =
    menuType === "pinned"
      ? i18n.t("messages.pinnedEmpty")
      : i18n.t("messages.historyEmpty")

  return (
    <>
      <div className="relative border-b">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 stroke-gray-400"
        />
        <Input
          type="text"
          placeholder={i18n.t("placeholders.searchPrompts")}
          className="pl-9 border-none shadow-none focus-visible:ring-0 focus-visible:border-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <ScrollAreaWithGradient
        className={cn("min-w-[220px] p-1", reversePrompts.length > 8 && "h-80")}
      >
        {isEmpty ? (
          <div className="px-3 py-2 text-xs text-gray-500">
            {searchQuery.length > 0
              ? i18n.t("messages.notFound")
              : emptyMessage}
          </div>
        ) : (
          reversePrompts.map((prompt) => (
            <MenuItem
              menuType={menuType}
              value={prompt.id}
              key={prompt.id}
              isPinned={prompt.isPinned}
              onHover={onHover}
              onLeave={onLeave}
              onClick={onClick}
              onEdit={onEdit}
              onRemove={onRemove}
              onCopy={onCopy}
              onTogglePin={onTogglePin}
              dataTestId={dataTestId}
            >
              {prompt.name}
            </MenuItem>
          ))
        )}
      </ScrollAreaWithGradient>
    </>
  )
}
