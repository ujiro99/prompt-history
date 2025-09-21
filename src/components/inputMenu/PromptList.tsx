import { useMemo, useState, useEffect, useDeferredValue } from "react"
import { Search, ArrowUpDown } from "lucide-react"
import type { Prompt, SortOrder } from "@/types/prompt"
import { cn, isEmpty } from "@/lib/utils"
import { ScrollAreaWithGradient } from "./ScrollAreaWithGradient"
import { MenuItem } from "./MenuItem"
import { Input } from "@/components/ui/input"
import { TestIds } from "@/components/const"
import { StorageService } from "@/services/storage"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const storage = StorageService.getInstance()
storage.getSettings()

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
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [sortOrder, setSortOrder] = useState<SortOrder>("composite")

  const filteredPrompts = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase()
    return [...prompts].filter(
      (p) =>
        p.content.toLowerCase().includes(query) ||
        p.name?.toLowerCase().includes(query),
    )
  }, [prompts, deferredSearchQuery])

  const isListEmpty = filteredPrompts.length === 0

  const dataTestId =
    menuType === "pinned"
      ? TestIds.inputPopup.pinnedItem
      : TestIds.inputPopup.historyItem

  const emptyMessage =
    menuType === "pinned"
      ? i18n.t("messages.pinnedEmpty")
      : i18n.t("messages.historyEmpty")

  useEffect(() => {
    const updateSettings = async () => {
      const settings = await storage.getSettings()
      setSortOrder(settings?.sortOrder || "composite")
    }
    updateSettings()
    return storage.watchSettings((newSettings) => {
      setSortOrder(newSettings?.sortOrder || "composite")
    })
  }, [])

  return (
    <>
      {isListEmpty && isEmpty(searchQuery) ? null : (
        <div className="flex items-center py-0.5 pl-3 pr-1 border-b">
          <Search size={20} className="stroke-gray-400" />
          <Input
            type="text"
            placeholder={i18n.t("placeholders.searchPrompts")}
            className="px-2 border-none shadow-none focus-visible:ring-0 focus-visible:border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SortOrderSelect sortOrder={sortOrder} className="px-1.5 py-0" />
        </div>
      )}
      <ScrollAreaWithGradient
        className={cn(
          "min-w-[220px] p-1",
          filteredPrompts.length > 8 && "h-80",
        )}
      >
        {isListEmpty ? (
          <div className="px-3 py-2 text-xs text-gray-500">
            {searchQuery.length > 0
              ? i18n.t("messages.notFound")
              : emptyMessage}
          </div>
        ) : (
          filteredPrompts.map((prompt) => (
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

interface SortOrderSelectProps {
  sortOrder: SortOrder
  className?: string
}

const SortOrderSelect = ({ sortOrder, className }: SortOrderSelectProps) => {
  const orders: SortOrder[] = ["recent", "execution", "name", "composite"]

  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    storage.setSettings({ sortOrder: newSortOrder })
  }

  return (
    <Tooltip>
      <Select onValueChange={handleSortOrderChange} value={sortOrder}>
        <TooltipTrigger asChild>
          <SelectTrigger
            className={cn("transition hover:bg-gray-100", className)}
            size="sm"
          >
            <ArrowUpDown className="size-4" />
          </SelectTrigger>
        </TooltipTrigger>
        <SelectContent>
          {orders.map((order) => (
            <SelectItem key={order} value={order}>
              {i18n.t(`sortOrder.${order}.label`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TooltipContent>{i18n.t(`sortOrder.${sortOrder}.label`)}</TooltipContent>
    </Tooltip>
  )
}
