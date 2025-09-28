import { useMemo, useState, useEffect, useDeferredValue } from "react"
import { Search, Settings2 } from "lucide-react"
import type { Prompt, SortOrder } from "@/types/prompt"
import { cn, isEmpty } from "@/lib/utils"
import { ScrollAreaWithGradient } from "./ScrollAreaWithGradient"
import { MenuItem } from "./MenuItem"
import { GroupHeader } from "./GroupHeader"
import { Input } from "@/components/ui/input"
import { TestIds } from "@/components/const"
import { StorageService } from "@/services/storage"
import { groupPrompts } from "@/utils/promptSorting"
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
import { useContainer } from "@/hooks/useContainer"

const storage = StorageService.getInstance()
const orders: SortOrder[] = ["recent", "execution", "name", "composite"]

interface PromptListProps {
  menuType?: "history" | "pinned"
  prompts: Prompt[]
  sideFlipped: boolean
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
  sideFlipped,
  onClick,
  onHover,
  onLeave,
  onEdit,
  onRemove,
  onCopy,
  onTogglePin,
}: PromptListProps) => {
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [sortOrder, setSortOrder] = useState<SortOrder>("composite")
  const [viewportElm, setViewportElm] = useState<HTMLElement | null>(null)
  const [loading, setLoading] = useState(false)

  const { filteredGroups, totalCount } = useMemo(() => {
    if (loading) {
      return { filteredGroups: [], totalCount: 0 }
    }

    const query = deferredSearchQuery.toLowerCase()

    // First filter prompts by search query
    const filtered = [...prompts].filter(
      (p) =>
        p.content.toLowerCase().includes(query) ||
        p.name?.toLowerCase().includes(query),
    )

    // Group the filtered prompts
    const groups = groupPrompts(filtered, sortOrder)

    // Apply sideFlipped transformation if needed
    const transformedGroups = sideFlipped ? groups : groups.reverse()

    // Calculate total count
    const count = transformedGroups.reduce(
      (acc, group) => acc + group.prompts.length,
      0,
    )

    return {
      filteredGroups: transformedGroups,
      totalCount: count,
    }
  }, [loading, prompts, sideFlipped, deferredSearchQuery, sortOrder])

  const isListEmpty = totalCount === 0

  const testId =
    menuType === "pinned"
      ? TestIds.inputPopup.pinnedItem
      : TestIds.inputPopup.historyItem

  const emptyMessage =
    menuType === "pinned"
      ? i18n.t("messages.pinnedEmpty")
      : i18n.t("messages.historyEmpty")

  const handleHover = (
    promptId: string,
    element: HTMLElement,
    menuType: "history" | "pinned",
  ) => {
    setHoveredPromptId(promptId)
    onHover(promptId, element, menuType)
  }

  const handleLeave = () => {
    setHoveredPromptId(null)
    onLeave()
  }

  useEffect(() => {
    const updateSettings = async () => {
      setLoading(true)
      const settings = await storage.getSettings()
      setSortOrder(settings?.sortOrder || "composite")
      setLoading(false)
    }
    updateSettings()
    return storage.watchSettings((newSettings) => {
      setSortOrder(newSettings?.sortOrder || "composite")
    })
  }, [])

  useEffect(() => {
    if (hoveredPromptId) {
      // Check if the hovered prompt exists in any of the filtered groups
      const promptExists = filteredGroups.some((group) =>
        group.prompts.find((p) => p.id === hoveredPromptId),
      )

      if (!promptExists) {
        // If the currently hovered prompt is filtered out, clear the hover state
        setHoveredPromptId(null)
        onLeave()
      }
    }
  }, [filteredGroups, hoveredPromptId, onLeave])

  useEffect(() => {
    if (viewportElm && !sideFlipped && sortOrder !== "name") {
      // Scroll to bottom when prompts change (e.g., after search)
      viewportElm.scrollTop = viewportElm.scrollHeight
    }
  }, [loading, viewportElm, sideFlipped, sortOrder])

  return (
    <>
      {isListEmpty && isEmpty(searchQuery) ? null : (
        <div className="flex items-center py-0.5 pl-3 pr-1 border-b">
          <Search size={20} className="stroke-gray-400" />
          <Input
            type="text"
            placeholder={i18n.t("placeholders.searchPrompts")}
            aria-label={i18n.t("placeholders.searchPrompts")}
            className="px-2 text-sm border-none shadow-none focus-visible:ring-0 focus-visible:border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SortOrderSelect sortOrder={sortOrder} className="px-1.5 py-0" />
        </div>
      )}
      <ScrollAreaWithGradient
        className={cn("min-w-[220px] p-1", totalCount > 8 && "h-80")}
        ref={setViewportElm}
      >
        {isListEmpty ? (
          <div className="px-3 py-2 text-xs text-gray-500">
            {searchQuery.length > 0
              ? i18n.t("messages.notFound")
              : emptyMessage}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={`group-${group.order}`}>
              <GroupHeader
                labelKey={group.label}
                count={group.prompts.length}
              />
              {group.prompts.map((prompt) => (
                <MenuItem
                  menuType={menuType}
                  value={prompt.id}
                  key={prompt.id}
                  isPinned={prompt.isPinned}
                  onHover={handleHover}
                  onLeave={handleLeave}
                  onClick={onClick}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onCopy={onCopy}
                  onTogglePin={onTogglePin}
                  testId={testId}
                >
                  {prompt.name}
                </MenuItem>
              ))}
            </div>
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
  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    storage.setSettings({ sortOrder: newSortOrder })
  }
  const { container } = useContainer()

  return (
    <Tooltip>
      <Select onValueChange={handleSortOrderChange} value={sortOrder}>
        <TooltipTrigger asChild>
          <SelectTrigger
            className={cn("transition hover:bg-gray-100", className)}
            size="sm"
          >
            <Settings2 className="size-4" />
          </SelectTrigger>
        </TooltipTrigger>
        <SelectContent className="bg-white" container={container}>
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
