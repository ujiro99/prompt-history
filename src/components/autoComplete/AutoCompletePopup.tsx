import React, { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteItem } from "./AutoCompleteItem"
import { useAutoComplete } from "./useAutoComplete"
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover"
import { TestIds } from "@/components/const"
import { Key } from "@/components/Key"
import type { Prompt } from "../../types/prompt"

const serviceFacade = PromptServiceFacade.getInstance()

const noFocus = (e: Event) => e.preventDefault()

interface AutoCompletePopupProps {
  prompts: Prompt[]
}

export const AutoCompletePopup: React.FC<AutoCompletePopupProps> = ({
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
  } = useAutoComplete({ prompts })
  const inputRef = useRef<HTMLElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

  const isSingleMatch = matches.length === 1

  // Close popup and reset states
  const handlePopupClose = useCallback(() => {
    handleClose()
    setUserInteracted(false)
    setIsFocused(false)
  }, [handleClose])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handlePopupClose()
    },
    [handlePopupClose],
  )

  // When Escape is pressed, close popup and return focus to input.
  const handleEscapeDown = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    inputRef.current = serviceFacade.getTextInput() as HTMLElement
    return serviceFacade.onElementChange((textInput: Element | null) => {
      inputRef.current = textInput as HTMLElement
    })
  }, [])

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
          case "Enter":
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

    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
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
    if (!isVisible) {
      setIsFocused(false)
      setUserInteracted(false)
    }
    if (anchorRef.current && isVisible) {
      anchorRef.current.style.left = `${position.x}px`
      anchorRef.current.style.top = `${position.y}px`
    }
  }, [position, isVisible])

  if (!isVisible || matches.length === 0) {
    return null
  }

  return (
    <Popover open={isVisible} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
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
          "min-w-64 max-w-md p-0 border border-gray-200 shadow-lg overflow-hidden",
          "focus-visible:ring-1 focus-visible:ring-gray-400",
        )}
        align="start"
        side="bottom"
        sideOffset={5}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onEscapeKeyDown={handleEscapeDown}
        onOpenAutoFocus={noFocus}
        data-testid={TestIds.autocomplete.popup}
      >
        <div>
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
        <div className="flex justify-end p-2 py-1.5 text-xs text-gray-500 border-t gap-1 empty:hidden">
          {(!isFocused && !userInteracted) || (!isFocused && isSingleMatch) ? (
            <p className="inline">
              <Key className="text-[10px]">Tab</Key> <span>to focus</span>
              {!isSingleMatch ? <span>,</span> : null}
            </p>
          ) : null}
          {isSingleMatch ? null : (
            <p className="inline">
              <Key className="text-[10px]">Ctrl + P</Key>
              <span className="mx-0.5">/</span>
              <Key className="text-[10px]">Ctrl + N</Key>
              {isFocused && (
                <>
                  <span className="mx-0.5">/</span>
                  <Key className="text-[10px]">↑</Key>
                  <span className="mx-0.5">/</span>
                  <Key className="text-[10px]">↓</Key>
                </>
              )}{" "}
              to move
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
