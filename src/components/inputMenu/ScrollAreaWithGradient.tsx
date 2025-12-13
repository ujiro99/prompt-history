import React, { useEffect, useRef, useState } from "react"
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
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const viewport = scrollViewportRef.current

  useEffect(() => {
    // Update external ref.
    if (typeof ref === "function") {
      ref(viewport)
    } else if (ref) {
      ;(ref as React.RefObject<HTMLDivElement | null>).current = viewport
    }
  }, [ref, viewport])

  useEffect(() => {
    if (!viewport) return

    const checkScrollable = () => {
      if (!viewport) return
      const { scrollHeight, clientHeight } = viewport
      const scrollable = scrollHeight > clientHeight
      setIsScrollable(scrollable)
    }

    // Initial check
    checkScrollable()

    // Check on content changes (using ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure DOM has updated
      requestAnimationFrame(checkScrollable)
    })

    resizeObserver.observe(viewport)

    return () => {
      resizeObserver.disconnect()
    }
  }, [viewport])

  return (
    <ScrollArea
      className={cn("scroll-gradient-container", rootClassName)}
      scrollbarClassName="scrollbar"
      viewportRef={scrollViewportRef}
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
