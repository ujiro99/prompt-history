import React, { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import "./ScrollAreaWithGradient.css"

type ScrollAreaWithGradientProps = {
  className?: string
  children: React.ReactNode
}

export function ScrollAreaWithGradient({
  className,
  children,
}: ScrollAreaWithGradientProps): React.ReactElement {
  const [isScrollable, setIsScrollable] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  const checkScrollable = () => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const { scrollHeight, clientHeight } = viewport
    const scrollable = scrollHeight > clientHeight
    setIsScrollable(scrollable)
  }

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

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
  }, [])

  return (
    <div
      className="relative scroll-gradient-container"
      data-scrollable={isScrollable}
    >
      <ScrollArea
        className={className}
        viewportRef={scrollViewportRef}
        viewportClassName="scroll-viewport-timeline"
      >
        {/* Top gradient cover */}
        <div className="scroll-gradient-top" />
        {children}
        {/* Bottom gradient cover */}
        <div className="scroll-gradient-bottom" />
      </ScrollArea>
    </div>
  )
}
