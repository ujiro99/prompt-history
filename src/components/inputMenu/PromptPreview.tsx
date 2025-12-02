import { useState, useEffect } from "react"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverPortal,
} from "@/components/ui/popover"
import { ScrollAreaWithGradient } from "./ScrollAreaWithGradient"
import { BridgeArea } from "../BridgeArea"
import type { Prompt } from "@/types/prompt"
import { i18n } from "#imports"
import { TestIds } from "@/components/const"
import { stopPropagation } from "@/utils/dom"

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
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    if (open) {
      // Delay rendering to avoid flicker on quick open/close
      timeout = setTimeout(() => setShouldRender(true), 50)
    } else {
      setShouldRender(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [open, anchorElm])

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
      <PopoverPortal container={anchorElm}>
        {shouldRender && (
          <PopoverContent
            ref={setContent}
            className="relative pt-4 pb-3 pl-4 pr-2 max-w-lg"
            side={"right"}
            align={"end"}
            sideOffset={8}
            onOpenAutoFocus={noFocus}
            data-testid={TestIds.inputPopup.promptPreview}
            {...stopPropagation()}
          >
            <div className="space-y-2 text-foreground">
              <ScrollAreaWithGradient
                className="max-h-100"
                gradientHeight={"3.5rem"}
              >
                <p className="font-mono break-all text-sm whitespace-pre-line text-foreground/80 pr-3">
                  {prompt.content}
                </p>
              </ScrollAreaWithGradient>
              <hr />
              <div className="flex items-center justify-end gap-1.5 text-xs pr-2">
                <span>
                  {i18n.t("preview.usedTimes", [`${prompt.executionCount}`])}
                </span>
                <span>•</span>
                <span>{formatRelativeTime(prompt.lastExecutedAt)}</span>
              </div>
            </div>
            {content && (
              <BridgeArea
                fromElm={anchorElm}
                toElm={content}
                isHorizontal={true}
                className="size-auto" // workaround for MenuItem's css
              />
            )}
          </PopoverContent>
        )}
      </PopoverPortal>
    </Popover>
  )
}
PromptPreview.displayName = "PromptPreview"
