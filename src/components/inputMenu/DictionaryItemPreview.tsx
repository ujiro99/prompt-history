import { useState, useEffect } from "react"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverPortal,
} from "@/components/ui/popover"
import { ScrollAreaWithGradient } from "./ScrollAreaWithGradient"
import { BridgeArea } from "./BridgeArea"
import type { DictionaryItem } from "@/types/prompt"
import { TestIds } from "@/components/const"
import { stopPropagation } from "@/utils/dom"
import { useContainer } from "@/hooks/useContainer"

interface VariableDetailProps {
  open: boolean
  anchorElm: HTMLElement | null
  dictionaryItem: DictionaryItem
}

const noFocus = (e: Event) => e.preventDefault()

/**
 * Dictionary Item Preview component
 */
export const DictionaryItemPreview = ({
  open,
  anchorElm,
  dictionaryItem,
}: VariableDetailProps) => {
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const { container } = useContainer()

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

  if (!anchorElm) {
    return null
  }

  return (
    <Popover open={open}>
      <PopoverAnchor virtualRef={{ current: anchorElm }} />
      <PopoverPortal container={container}>
        {shouldRender && (
          <PopoverContent
            ref={setContent}
            className="relative px-3 pt-1 pb-2 max-w-md"
            side={"right"}
            align={"end"}
            sideOffset={8}
            onOpenAutoFocus={noFocus}
            data-testid={TestIds.inputPopup.variablePreview}
            {...stopPropagation()}
          >
            <div className="text-foreground">
              <label className="text-xs font-semibold text-muted-foreground/80">
                {i18n.t("variablePresets.itemContent")}
              </label>
              <ScrollAreaWithGradient
                className="max-h-100"
                gradientHeight={"2rem"}
              >
                <p className="font-mono break-all text-sm whitespace-pre-line text-foreground/80">
                  {dictionaryItem?.content}
                </p>
              </ScrollAreaWithGradient>
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
DictionaryItemPreview.displayName = "DictionaryItemPreview"
