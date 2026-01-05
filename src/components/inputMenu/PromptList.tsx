import {
  useMemo,
  useState,
  useEffect,
  useDeferredValue,
  useCallback,
} from "react"
import { Search } from "lucide-react"
import type { Prompt } from "@/types/prompt"
import { cn, isEmpty } from "@/lib/utils"
import { ScrollAreaWithGradient } from "@/components/shared/ScrollAreaWithGradient"
import { MenuItem } from "./MenuItem"
import { GroupHeader } from "./GroupHeader"
import { Input } from "@/components/ui/input"
import { TestIds } from "@/components/const"
import { useSettings } from "@/hooks/useSettings"
import { groupPrompts } from "@/utils/promptSorting"
import { i18n } from "#imports"
import { ListOptions } from "./ListOptions"

interface PromptListProps {
  menuType: "history" | "pinned"
  prompts: Prompt[]
  sideFlipped: boolean
  onClick: (promptId: string) => void
  onHover: (
    promptId: string | null,
    element: HTMLElement | null,
    menuType: "history" | "pinned",
  ) => void
  onEdit: (promptId: string) => void
  onRemove: (promptId: string) => void
  onCopy: (promptId: string) => void
  onTogglePin: (promptId: string, isPinned: boolean) => void
  onLockChange: (isLocked: boolean) => void
  onConfirmTemplate?: (promptId: string) => void
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
  onEdit,
  onRemove,
  onCopy,
  onTogglePin,
  onLockChange,
  onConfirmTemplate,
}: PromptListProps) => {
  const [containerElm, setContainerElm] = useState<HTMLElement | null>(null)
  const [hoveredElm, setHoveredElm] = useState<HTMLElement | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const { settings, isLoaded } = useSettings()
  const [viewportElm, setViewportElm] = useState<HTMLElement | null>(null)

  // Get menuType-specific settings or fall back to default
  const menuSettings =
    menuType === "history" ? settings.historySettings : settings.pinnedSettings
  const defaultSortOrder = menuType === "history" ? "recent" : "composite"
  const sortOrder = menuSettings?.sortOrder ?? defaultSortOrder
  const hideOrganizerExcluded = menuSettings?.hideOrganizerExcluded ?? true

  const { filteredGroups, totalCount, aiTemplateGroups } = useMemo(() => {
    if (!isLoaded) {
      return { filteredGroups: [], totalCount: 0, aiTemplateGroups: [] }
    }

    const query = deferredSearchQuery.toLowerCase()

    // First filter prompts by search query
    let filtered = [...prompts].filter(
      (p) =>
        p.content.toLowerCase().includes(query) ||
        p.name?.toLowerCase().includes(query),
    )

    // Filter out prompts excluded from organizer if setting is enabled
    if (hideOrganizerExcluded) {
      filtered = filtered.filter(
        (p) => !(p.excludeFromOrganizer === true && !p.isAIGenerated),
      )
    }

    // For pinned menu, separate user pinned and AI templates
    if (menuType === "pinned") {
      // Section A: User pinned prompts (not AI-generated)
      const userPinned = filtered.filter((p) => !p.isAIGenerated)
      const userGroups = groupPrompts(userPinned, sortOrder, sideFlipped)

      // Section B: AI generated templates
      const aiTemplates = filtered.filter((p) => p.isAIGenerated)
      const aiGroups = groupPrompts(aiTemplates, sortOrder, sideFlipped)

      const count =
        userGroups.reduce((acc, group) => acc + group.prompts.length, 0) +
        aiGroups.reduce((acc, group) => acc + group.prompts.length, 0)

      return {
        filteredGroups: userGroups,
        aiTemplateGroups: aiGroups,
        totalCount: count,
      }
    }

    // For history menu, show all
    const groups = groupPrompts(filtered, sortOrder, sideFlipped)

    // Calculate total count
    const count = groups.reduce((acc, group) => acc + group.prompts.length, 0)

    return {
      filteredGroups: groups,
      aiTemplateGroups: [],
      totalCount: count,
    }
  }, [
    isLoaded,
    prompts,
    sideFlipped,
    deferredSearchQuery,
    sortOrder,
    menuType,
    hideOrganizerExcluded,
  ])

  const isListEmpty = totalCount === 0

  const testId =
    menuType === "pinned"
      ? TestIds.inputPopup.pinnedItem
      : TestIds.inputPopup.historyItem

  const emptyMessage =
    menuType === "pinned"
      ? i18n.t("messages.pinnedEmpty")
      : i18n.t("messages.historyEmpty")

  const handleEnter = useCallback(
    (promptId: string, element: HTMLElement) => {
      setHoveredElm(element)
      onHover(promptId, element, menuType)
    },
    [onHover, menuType],
  )

  const handleLeave = useCallback(
    (e: React.MouseEvent | null) => {
      if (e && e.relatedTarget instanceof Node) {
        // If moving to a child element, do not trigger leave
        if (containerElm?.contains(e.relatedTarget)) {
          return
        }
      }
      setHoveredElm(null)
      onHover(null, null, menuType)
    },
    [containerElm, onHover, menuType],
  )

  useEffect(() => {
    if (!hoveredElm) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When the element goes out of List, trigger leave
          if (entry.intersectionRatio < 1) {
            handleLeave(null)
          }
        })
      },
      {
        root: containerElm,
        // Set root margin to detect only when completely off-screen
        rootMargin: "0px",
        threshold: [0, 1],
      },
    )
    observer.observe(hoveredElm)
    return () => {
      observer.disconnect()
    }
  }, [containerElm, hoveredElm, handleLeave])

  useEffect(() => {
    if (viewportElm && !sideFlipped && sortOrder !== "name") {
      // Scroll to bottom when prompts change (e.g., after search)
      viewportElm.scrollTop = viewportElm.scrollHeight
    }
  }, [isLoaded, viewportElm, sideFlipped, sortOrder])

  const isQueryEmpty = isEmpty(searchQuery)

  useEffect(() => {
    // Notify parent about lock state based on search query.
    // During list lock, changes to the InputMenu and shifts in its display position are prevented.
    onLockChange(!isQueryEmpty)
  }, [onLockChange, isQueryEmpty])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onLockChange(false)
    }
  }, [onLockChange])

  return (
    <div onMouseLeave={handleLeave} ref={setContainerElm}>
      {isListEmpty && isEmpty(searchQuery) ? null : (
        <div className="flex items-center py-0.5 pl-3 pr-1 border-b">
          <Search size={20} className="stroke-neutral-400" />
          <Input
            type="text"
            placeholder={i18n.t("placeholders.searchPrompts")}
            aria-label={i18n.t("placeholders.searchPrompts")}
            className="px-2 text-sm border-none shadow-none focus-visible:ring-0 focus-visible:border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <ListOptions
            menuType={menuType}
            sortOrder={sortOrder}
            hideOrganizerExcluded={hideOrganizerExcluded}
          />
        </div>
      )}
      <ScrollAreaWithGradient
        className={cn("min-w-[220px] p-1", totalCount > 8 && "h-80")}
        ref={setViewportElm}
      >
        {isListEmpty ? (
          <div className="px-3 py-2 text-xs text-foreground">
            {searchQuery.length > 0
              ? i18n.t("messages.notFound")
              : emptyMessage}
          </div>
        ) : (
          <>
            {/* Section A: User Pinned Prompts */}
            {filteredGroups.map((group) => (
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
                    onEnter={handleEnter}
                    onClick={onClick}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    onCopy={onCopy}
                    onTogglePin={onTogglePin}
                    testId={testId}
                    name={prompt.name}
                    isAIGenerated={prompt.isAIGenerated}
                    isUnconfirmed={
                      prompt.isAIGenerated &&
                      prompt.aiMetadata?.confirmed === false
                    }
                    onConfirm={onConfirmTemplate}
                  >
                    {prompt.name}
                  </MenuItem>
                ))}
              </div>
            ))}

            {/* Section B: AI Recommended Templates (only for pinned menu) */}
            {menuType === "pinned" && aiTemplateGroups.length > 0 && (
              <>
                <div className="border-t my-1" />
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {i18n.t("promptOrganizer.aiTemplates.title")}
                </div>
                {aiTemplateGroups.map((group) => (
                  <div key={`ai-group-${group.order}`}>
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
                        onEnter={handleEnter}
                        onClick={onClick}
                        onEdit={onEdit}
                        onRemove={onRemove}
                        onCopy={onCopy}
                        onTogglePin={onTogglePin}
                        testId={testId}
                        name={prompt.name}
                        isAIGenerated={prompt.isAIGenerated}
                        isUnconfirmed={
                          prompt.isAIGenerated &&
                          prompt.aiMetadata?.confirmed === false
                        }
                        onConfirm={onConfirmTemplate}
                      >
                        {prompt.name}
                      </MenuItem>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </ScrollAreaWithGradient>
    </div>
  )
}
