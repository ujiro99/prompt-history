import React, { useEffect, useRef, useState, useCallback } from "react"
import { AutoCompleteItem } from "./AutoCompleteItem"
import { useAutoComplete } from "./useAutoComplete"
import { DomManager } from "../../services/chatgpt/domManager"
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover"
import { cn } from "@/lib/utils"
import type { Prompt } from "../../types/prompt"

const noFocus = (e: Event) => e.preventDefault()

interface AutoCompletePopupProps {
  domManager: DomManager
  prompts: Prompt[]
}

export const AutoCompletePopup: React.FC<AutoCompletePopupProps> = ({
  domManager,
  prompts,
}) => {
  const {
    isVisible,
    matches,
    selectedIndex,
    position,
    handleSelect,
    handleClose,
    selectIndex,
    selectNext,
    selectPrevious,
  } = useAutoComplete({ domManager, prompts })
  const popupRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

  const handlePopupClose = useCallback(() => {
    handleClose()
    setUserInteracted(false)
    setIsFocused(false)
  }, [handleClose])

  useEffect(() => {
    // Only add event listeners when popup is visible
    if (!isVisible) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFocused || userInteracted) {
        // When popup is focused: Arrow keys, Enter, and Escape are active
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault()
            selectPrevious()
            break
          case "ArrowDown":
            event.preventDefault()
            selectNext()
            break
          case "Tab":
            event.preventDefault()
            event.stopPropagation()
            if (matches[selectedIndex]) {
              handleSelect(matches[selectedIndex])
            }
            break
        }
      }

      // If popup is visible but not focused, focus it on any key press except modifier keys
      if (isVisible && !isFocused) {
        switch (event.key) {
          case "ArrowUp":
          case "ArrowDown":
          case "ArrowLeft":
          case "ArrowRight":
            handlePopupClose()
            break
          case "Tab":
            event.preventDefault()
            event.stopPropagation()
            popupRef.current?.focus()
            selectNext()
            break
        }
      }

      // Allwais listen for Ctrl+N/P and Escape
      if (event.ctrlKey && event.key === "n") {
        event.preventDefault()
        selectNext()
        setUserInteracted(true)
      } else if (event.ctrlKey && event.key === "p") {
        event.preventDefault()
        selectPrevious()
        setUserInteracted(true)
      } else if (event.key === "Escape") {
        event.preventDefault()
        handlePopupClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    isVisible,
    isFocused,
    userInteracted,
    matches,
    selectedIndex,
    handleSelect,
    handlePopupClose,
    selectNext,
    selectPrevious,
  ])

  // Update anchor position when position changes
  useEffect(() => {
    if (anchorRef.current && isVisible) {
      anchorRef.current.style.left = `${position.x}px`
      anchorRef.current.style.top = `${position.y}px`
    }
  }, [position, isVisible])

  if (!isVisible || matches.length === 0) {
    return null
  }

  return (
    <>
      {/* Invisible anchor element positioned at the desired location */}
      <div
        ref={anchorRef}
        className="fixed w-0 h-0 pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: -1,
        }}
      />

      <Popover open={isVisible}>
        <PopoverAnchor asChild>
          <div
            className="fixed w-0 h-0 pointer-events-none"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          ref={popupRef}
          className={cn(
            "min-w-60 max-w-md p-0 border border-gray-200 shadow-lg overflow-hidden",
            isFocused && "ring-2 ring-blue-500",
          )}
          align="start"
          side="bottom"
          sideOffset={5}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onEscapeKeyDown={handlePopupClose}
          onOpenAutoFocus={noFocus}
          tabIndex={0}
        >
          <div className="max-h-60 overflow-y-auto">
            {matches.map((match, index) => (
              <AutoCompleteItem
                key={`${match.name}-${index}`}
                match={match}
                isSelected={index === selectedIndex}
                onClick={handleSelect}
                onMouseEnter={() => selectIndex(index)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
