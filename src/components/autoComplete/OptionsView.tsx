import React, { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import { DictionaryItemPreview } from "@/components/inputMenu/DictionaryItemPreview"
import { OptionItem } from "./OptionItem"
import type { VariablePreset, DictionaryItem } from "@/types/prompt"

/**
 * Props for OptionsView component
 */
interface OptionsViewProps {
  preset: VariablePreset
  selectedIndex: number
  onSelectAt: (index: number) => void
  onOptionExecute: (option: string | DictionaryItem) => void
}

/**
 * Options view component - displays preset options with scrolling support
 */
export const OptionsView: React.FC<OptionsViewProps> = ({
  preset,
  selectedIndex,
  onSelectAt,
  onOptionExecute,
}) => {
  const [contentElm, setContentElm] = useState<HTMLElement | null>(null)
  const [optionItemElm, setOptionItemElm] = useState<HTMLElement | null>(null)
  const [inAnimation, setInAnimation] = useState<boolean>(true)

  // For tracking hover and movement state to manage auto-scrolling
  const hoveredFlag = useRef<boolean>(false)
  const movedFlag = useRef<boolean>(false)

  // Get options based on preset type
  const options = useMemo(() => {
    return preset.type === "select"
      ? preset.selectOptions || []
      : preset.dictionaryItems || []
  }, [preset.type, preset.selectOptions, preset.dictionaryItems])

  // Get the currently selected option for preview
  const selectedOption = useMemo(() => {
    if (preset.type !== "dictionary") return null
    if (selectedIndex < 0 || selectedIndex >= options.length) return null
    return options[selectedIndex] as DictionaryItem
  }, [preset.type, selectedIndex, options])

  // Handle mouse enter for option items
  const handleMouseEnter = useCallback(
    (index: number, event: React.MouseEvent<HTMLElement>) => {
      // Prevent enter events from occurring when scrolling elements using shortcut keys
      if (!movedFlag.current) return
      onSelectAt(index)
      hoveredFlag.current = true
      if (preset.type === "dictionary") {
        setOptionItemElm(event.currentTarget)
      }
    },
    [preset.type, onSelectAt],
  )

  // Handle mouse leave to clear hover preview
  const handleMouseLeave = useCallback(() => {
    setOptionItemElm(null)
  }, [])

  // Hide preview during the animation so that it does not appear in an odd position.
  useEffect(() => {
    const timer = setTimeout(() => {
      setInAnimation(false)
    }, 200) // animation duration
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    movedFlag.current = false
    if (hoveredFlag.current) {
      // If the user is hovering, do not auto-scroll
      // This prevents jarring scrolls while the user is interacting
      hoveredFlag.current = false
      return
    }
    // Auto-scroll to selected item in the list
    const selectedItem = contentElm?.children[
      selectedIndex
    ] as HTMLElement | null
    if (selectedItem && !inAnimation) {
      selectedItem.scrollIntoView({
        block: "center",
        behavior: "smooth",
      })
    }
  }, [contentElm, selectedIndex, inAnimation])

  return (
    <>
      {/* Scrollable options list */}
      <ScrollAreaWithGradient className="max-h-80" gradientHeight="1.5rem">
        <div
          role="listbox"
          className="max-w-md"
          onMouseMove={() => (movedFlag.current = true)}
          onMouseLeave={handleMouseLeave}
          ref={setContentElm}
        >
          {options.map((option, index) => (
            <OptionItem
              key={index}
              ref={index === selectedIndex ? setOptionItemElm : null}
              option={option}
              presetType={preset.type}
              isSelected={index === selectedIndex}
              onClick={() => onOptionExecute(option)}
              onMouseEnter={(e) => handleMouseEnter(index, e)}
            />
          ))}
        </div>
      </ScrollAreaWithGradient>

      {/* Variable preview for dictionary type */}
      {preset.type === "dictionary" && selectedOption && (
        <DictionaryItemPreview
          open={!!selectedOption && !inAnimation}
          anchorElm={optionItemElm}
          dictionaryItem={selectedOption}
        />
      )}
    </>
  )
}
