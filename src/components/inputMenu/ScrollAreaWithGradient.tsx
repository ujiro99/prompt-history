import React, { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import "./ScrollAreaWithGradient.css"
import { cn } from "@/lib/utils"

type ScrollAreaWithGradientProps = {
  className?: string
  children: React.ReactNode
  gradientHeight?: number | string
  ref?: React.Ref<HTMLDivElement>
}

export function ScrollAreaWithGradient({
  className,
  children,
  gradientHeight,
  ref,
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
      className="scroll-gradient-container"
      scrollbarClassName="scrollbar"
      viewportRef={scrollViewportRef}
      viewportClassName={cn("scroll-viewport-timeline", className)}
      data-scrollable={isScrollable}
    >
      {/* Top gradient cover */}
      <div className="scroll-gradient-top" style={{ height: gradientHeight }} />
      {children}
      {/* Bottom gradient cover */}
      <div
        className="scroll-gradient-bottom"
        style={{ height: gradientHeight }}
      />
    </ScrollArea>
  )
}
