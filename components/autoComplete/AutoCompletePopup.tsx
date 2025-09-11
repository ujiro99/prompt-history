import React, { useEffect, useRef } from "react"
import { AutoCompleteItem } from "./AutoCompleteItem"
import type {
  AutoCompleteMatch,
  AutoCompletePosition,
} from "../../services/autoComplete/types"

interface AutoCompletePopupProps {
  matches: AutoCompleteMatch[]
  selectedIndex: number
  position: AutoCompletePosition
  onSelect: (match: AutoCompleteMatch) => void
  onClose: () => void
  onSelectionChange: (index: number) => void
}

export const AutoCompletePopup: React.FC<AutoCompletePopupProps> = ({
  matches,
  selectedIndex,
  position,
  onSelect,
  onClose,
  onSelectionChange,
}) => {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          onSelectionChange(Math.max(0, selectedIndex - 1))
          break
        case "ArrowDown":
          event.preventDefault()
          onSelectionChange(Math.min(matches.length - 1, selectedIndex + 1))
          break
        case "Enter":
          event.preventDefault()
          if (matches[selectedIndex]) {
            onSelect(matches[selectedIndex])
          }
          break
        case "Escape":
          event.preventDefault()
          onClose()
          break
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [matches, selectedIndex, onSelect, onClose, onSelectionChange])

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

  if (matches.length === 0) {
    return null
  }

  return (
    <div
      ref={popupRef}
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
          onClick={onSelect}
          onMouseEnter={() => onSelectionChange(index)}
        />
      ))}
    </div>
  )
}
