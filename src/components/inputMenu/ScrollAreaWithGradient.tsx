import React, { useEffect, useState, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import "./ScrollAreaWithGradient.css"
import { cn } from "@/lib/utils"

type ScrollAreaWithGradientProps = {
  className?: string
  rootClassName?: string
  children: React.ReactNode
  indicatorVisible?: boolean
  gradientHeight?: number | string
  ref?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
}

export function ScrollAreaWithGradient({
  className,
  rootClassName,
  children,
  indicatorVisible = true,
  gradientHeight,
  ref,
  style,
}: ScrollAreaWithGradientProps): React.ReactElement {
  const [isScrollable, setIsScrollable] = useState(false)
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null)

  const checkScrollable = useCallback(() => {
    if (!viewport) return
    const { scrollHeight, clientHeight } = viewport
    const scrollable = scrollHeight > clientHeight
    setIsScrollable(scrollable)
  }, [viewport])

  useEffect(() => {
    // Update external ref.
    if (typeof ref === "function") {
      ref(viewport)
    } else if (ref) {
      ;(ref as React.RefObject<HTMLDivElement | null>).current = viewport
    }
  }, [ref, viewport])

  useEffect(() => {
    if (children) {
      // Check scrollability when children change
      checkScrollable()
    }
  }, [children, checkScrollable])

  return (
    <ScrollArea
      className={cn("scroll-gradient-container", rootClassName)}
      scrollbarClassName="scrollbar"
      viewportRef={setViewport}
      viewportClassName={cn("scroll-viewport-timeline", className)}
      data-scrollable={isScrollable}
      style={style}
    >
      {/* Top gradient cover */}
      <div
        className="scroll-gradient-top flex items-start justify-center"
        style={{ height: gradientHeight }}
      >
        {indicatorVisible && (
          <ChevronDown className="size-4 stroke-neutral-400 rotate-180 mt-1" />
        )}
      </div>
      {children}
      {/* Bottom gradient cover */}
      <div
        className="scroll-gradient-bottom flex items-end justify-center"
        style={{ height: gradientHeight }}
      >
        {indicatorVisible && (
          <ChevronDown className="size-4 stroke-neutral-400 mb-1" />
        )}
      </div>
    </ScrollArea>
  )
}
