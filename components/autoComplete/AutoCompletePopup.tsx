import React, { useEffect, useRef, useState } from "react"
import { AutoCompleteItem } from "./AutoCompleteItem"
import { useAutoComplete } from "./useAutoComplete"
import { DomManager } from "../../services/chatgpt/domManager"
import type { Prompt } from "../../types/prompt"

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
    handleSelectionChange,
  } = useAutoComplete({ domManager, prompts })
  const popupRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

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
            handleSelectionChange(Math.max(0, selectedIndex - 1))
            break
          case "ArrowDown":
            event.preventDefault()
            handleSelectionChange(
              Math.min(matches.length - 1, selectedIndex + 1),
            )
            break
          case "Enter":
            event.preventDefault()
            event.stopPropagation()
            if (matches[selectedIndex]) {
              handleSelect(matches[selectedIndex])
            }
            break
        }
      }

      // Allwais listen for Ctrl+N/P and Escape
      if (event.ctrlKey && event.key === "n") {
        event.preventDefault()
        handleSelectionChange(Math.min(matches.length - 1, selectedIndex + 1))
        setUserInteracted(true)
      } else if (event.ctrlKey && event.key === "p") {
        event.preventDefault()
        handleSelectionChange(Math.max(0, selectedIndex - 1))
        setUserInteracted(true)
      } else if (event.key === "Escape") {
        event.preventDefault()
        handleClose()
        setUserInteracted(false)
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath()
      const actualTarget = path[0]
      if (
        popupRef.current &&
        !popupRef.current.contains(actualTarget as Node)
      ) {
        console.log("Click outside detected", actualTarget)
        handleClose()
      }
    }

    const handleDocumentSelectionChange = () => {
      // Hide popup when caret moves or text is selected
      handleClose()
      setUserInteracted(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("selectionchange", handleDocumentSelectionChange)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener(
        "selectionchange",
        handleDocumentSelectionChange,
      )
    }
  }, [
    isVisible,
    isFocused,
    userInteracted,
    matches,
    selectedIndex,
    handleSelect,
    handleClose,
    handleSelectionChange,
  ])

  // Adjust position if popup would go outside viewport
  const adjustedPosition = React.useMemo(() => {
    if (!popupRef.current) return position

    const rect = popupRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = position

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = Math.max(0, viewportWidth - rect.width - 10)
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = Math.max(0, y - rect.height - 40) // Position above input
    }

    return { x, y }
  }, [position])

  if (!isVisible || matches.length === 0) {
    return null
  }

  return (
    <div
      ref={popupRef}
      tabIndex={-1}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-md w-80 max-h-60 overflow-y-auto"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {matches.map((match, index) => (
        <AutoCompleteItem
          key={`${match.name}-${index}`}
          match={match}
          isSelected={index === selectedIndex}
          onClick={handleSelect}
          onMouseEnter={() => handleSelectionChange(index)}
        />
      ))}
    </div>
  )
}
