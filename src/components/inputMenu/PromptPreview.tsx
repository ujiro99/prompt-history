import { useState } from "react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { BridgeArea } from "../BridgeArea"
import type { Prompt } from "@/types/prompt"
import { i18n } from "#imports"

interface PromptDetailProps {
  open: boolean
  anchorElm: HTMLElement
  prompt: Prompt
}

const noFocus = (e: Event) => e.preventDefault()

/**
 * Prompt Preview component
 */
export const PromptPreview = ({
  open,
  anchorElm,
  prompt,
}: PromptDetailProps) => {
  const [content, setContent] = useState<HTMLDivElement | null>(null)

  /**
   * Display relative time
   */
  const formatRelativeTime = (date: Date): string => {
    if (!date) return i18n.t("time.unknown")
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return i18n.t("time.justNow")
    if (minutes < 60) return i18n.t("time.minutesAgo", [`${minutes}`])
    if (hours < 24) return i18n.t("time.hoursAgo", [`${hours}`])
    if (days < 7) return i18n.t("time.daysAgo", [`${days}`])
    return date.toLocaleDateString()
  }

  return (
    <Popover open={open}>
      <PopoverAnchor virtualRef={{ current: anchorElm }} />
      <PopoverContent
        ref={setContent}
        className="relative z-auto p-4 pb-3 max-w-lg"
        side={"right"}
        align={"end"}
        sideOffset={8}
        onOpenAutoFocus={noFocus}
      >
        <div className="space-y-2 text-foreground">
          <p className="font-mono break-all text-sm whitespace-pre-line text-foreground/80">
            {prompt.content}
          </p>
          <hr />
          <div className="flex items-center justify-end gap-1.5 text-xs">
            <span>
              {i18n.t("preview.usedTimes", [`${prompt.executionCount}`])}
            </span>
            <span>•</span>
            <span>{formatRelativeTime(prompt.lastExecutedAt)}</span>
          </div>
        </div>
        {content && (
          <BridgeArea fromElm={anchorElm} toElm={content} isHorizontal={true} />
        )}
      </PopoverContent>
    </Popover>
  )
}
PromptPreview.displayName = "PromptPreview"
