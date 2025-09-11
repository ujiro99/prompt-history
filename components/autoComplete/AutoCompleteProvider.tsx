import React, { useEffect, useState, useRef } from "react"
import { AutoCompletePopup } from "./AutoCompletePopup"
import { DomManager } from "../../services/chatgpt/domManager"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import type { Prompt } from "../../types/prompt"

interface AutoCompleteProviderProps {
  domManager: DomManager
  prompts: Prompt[]
}

export const AutoCompleteProvider: React.FC<AutoCompleteProviderProps> = ({
  domManager,
  prompts,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) {
      return
    }
    mountedRef.current = true

    // Setup autocomplete functionality
    domManager.setupAutoComplete(prompts, {
      onShow: () => {
        const autoCompleteManager = domManager.getAutoCompleteManager()
        if (autoCompleteManager) {
          setMatches(autoCompleteManager.getMatches())
          setSelectedIndex(autoCompleteManager.getSelectedIndex())
          setPosition(autoCompleteManager.getPopupPosition())
          setIsVisible(true)
        }
      },
      onHide: () => {
        setIsVisible(false)
        setMatches([])
        setSelectedIndex(0)
      },
      onSelect: (match: AutoCompleteMatch) => {
        console.log("AutoComplete selected:", match.name)
        setIsVisible(false)
        setMatches([])
        setSelectedIndex(0)
      },
      onSelectionChange: (index: number) => {
        setSelectedIndex(index)
        const autoCompleteManager = domManager.getAutoCompleteManager()
        if (autoCompleteManager) {
          // Update internal state of AutoCompleteManager
          if (index < autoCompleteManager.getMatches().length) {
            for (
              let i = autoCompleteManager.getSelectedIndex();
              i < index;
              i++
            ) {
              autoCompleteManager.selectNext()
            }
            for (
              let i = autoCompleteManager.getSelectedIndex();
              i > index;
              i--
            ) {
              autoCompleteManager.selectPrevious()
            }
          }
        }
      },
    })

    return () => {
      // Cleanup handled by domManager.destroy()
    }
  }, [domManager, prompts])

  // Update prompts when they change
  useEffect(() => {
    domManager.updateAutoCompletePrompts(prompts)
  }, [domManager, prompts])

  const handleSelect = (match: AutoCompleteMatch) => {
    const autoCompleteManager = domManager.getAutoCompleteManager()
    if (autoCompleteManager) {
      autoCompleteManager.selectCurrent()
    }
  }

  const handleClose = () => {
    const autoCompleteManager = domManager.getAutoCompleteManager()
    if (autoCompleteManager) {
      autoCompleteManager.forceHide()
    }
  }

  const handleSelectionChange = (index: number) => {
    setSelectedIndex(index)
    const autoCompleteManager = domManager.getAutoCompleteManager()
    if (autoCompleteManager) {
      // Sync with AutoCompleteManager's internal state
      const currentIndex = autoCompleteManager.getSelectedIndex()
      if (index > currentIndex) {
        for (let i = currentIndex; i < index; i++) {
          autoCompleteManager.selectNext()
        }
      } else if (index < currentIndex) {
        for (let i = currentIndex; i > index; i--) {
          autoCompleteManager.selectPrevious()
        }
      }
    }
  }

  if (!isVisible || matches.length === 0) {
    return null
  }

  return (
    <AutoCompletePopup
      matches={matches}
      selectedIndex={selectedIndex}
      position={position}
      onSelect={handleSelect}
      onClose={handleClose}
      onSelectionChange={handleSelectionChange}
    />
  )
}
