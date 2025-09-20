import React, { useEffect, useRef, useState } from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

type ScrollAreaWithGradientProps = {
  className?: string
  children: React.ReactNode
}

export function ScrollAreaWithGradient({
  className,
  children,
}: ScrollAreaWithGradientProps): React.ReactElement {
  const [showTopGradient, setShowTopGradient] = useState(false)
  const [showBottomGradient, setShowBottomGradient] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  const checkScrollable = () => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const { scrollTop, scrollHeight, clientHeight } = viewport

    // Check if scrollable upward
    setShowTopGradient(scrollTop > 0)

    // Check if scrollable downward
    setShowBottomGradient(scrollTop + clientHeight < scrollHeight)
  }

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    // Initial check
    checkScrollable()

    // Add scroll event listener
    viewport.addEventListener("scroll", checkScrollable)

    // Check on content changes (using ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure DOM has updated
      setTimeout(checkScrollable, 0)
    })

    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener("scroll", checkScrollable)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="relative">
      <ScrollAreaPrimitive.Root
        data-slot="scroll-area"
        className={cn("relative", className)}
      >
        <ScrollAreaPrimitive.Viewport
          ref={scrollViewportRef}
          data-slot="scroll-area-viewport"
          className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.ScrollAreaScrollbar
          data-slot="scroll-area-scrollbar"
          orientation="vertical"
          className="flex touch-none p-px transition-colors select-none h-full w-2.5 border-l border-l-transparent"
        >
          <ScrollAreaPrimitive.ScrollAreaThumb
            data-slot="scroll-area-thumb"
            className="bg-border relative flex-1 rounded-full"
          />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>

      {/* Top gradient cover */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-10 pointer-events-none z-10 transition-opacity duration-200",
          "bg-gradient-to-b from-white to-transparent",
          showTopGradient ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Bottom gradient cover */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10 transition-opacity duration-200",
          "bg-gradient-to-t from-white to-transparent",
          showBottomGradient ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
}
