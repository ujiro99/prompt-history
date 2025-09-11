import { useEffect, useState, useRef } from "react"
import { DomManager } from "../../services/chatgpt/domManager"
import { AutoCompleteManager } from "../../services/autoComplete/autoCompleteManager"
import { replaceTextAtCaret } from "../../services/dom/textReplacement"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import type { Prompt } from "../../types/prompt"

interface UseAutoCompleteOptions {
  domManager: DomManager
  prompts: Prompt[]
}

export const useAutoComplete = ({
  domManager,
  prompts,
}: UseAutoCompleteOptions) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const managerRef = useRef<AutoCompleteManager | null>(null)

  useEffect(() => {
    // Create AutoCompleteManager instance
    managerRef.current = new AutoCompleteManager({
      onShow: () => {
        if (managerRef.current) {
          setMatches(managerRef.current.getMatches())
          setSelectedIndex(managerRef.current.getSelectedIndex())
          setPosition(managerRef.current.getPopupPosition())
          setIsVisible(true)
        }
      },
      onHide: () => {
        setIsVisible(false)
        setMatches([])
        setSelectedIndex(0)
      },
      onSelect: (match: AutoCompleteMatch) => {
        const textInput = domManager.getTextInput()
        if (textInput) {
          replaceTextAtCaret(textInput, match)
        }
        setIsVisible(false)
        setMatches([])
        setSelectedIndex(0)
      },
    })

    // Set initial prompts and element
    managerRef.current.setPrompts(prompts)
    managerRef.current.setElement(domManager.getTextInput())

    // Listen for element changes from DomManager
    const handleElementChange = (textInput: Element | null) => {
      if (managerRef.current) {
        managerRef.current.setElement(textInput)
      }
    }
    domManager.onElementChange(handleElementChange)

    // Listen for content changes from DomManager
    const handleContentChange = (content: string) => {
      if (managerRef.current) {
        managerRef.current.handleContentChange(content)
      }
    }
    domManager.onContentChange(handleContentChange)

    return () => {
      domManager.offElementChange(handleElementChange)
      domManager.offContentChange(handleContentChange)
      if (managerRef.current) {
        managerRef.current.destroy()
        managerRef.current = null
      }
    }
  }, [domManager, prompts])

  const handleSelect = (_match: AutoCompleteMatch) => {
    if (managerRef.current) {
      managerRef.current.selectCurrent()
    }
  }

  const handleClose = () => {
    if (managerRef.current) {
      managerRef.current.forceHide()
    }
  }

  const handleSelectionChange = (index: number) => {
    setSelectedIndex(index)
    if (managerRef.current) {
      // Sync with AutoCompleteManager's internal state
      const currentIndex = managerRef.current.getSelectedIndex()
      if (index > currentIndex) {
        for (let i = currentIndex; i < index; i++) {
          managerRef.current.selectNext()
        }
      } else if (index < currentIndex) {
        for (let i = currentIndex; i > index; i--) {
          managerRef.current.selectPrevious()
        }
      }
    }
  }

  return {
    isVisible,
    matches,
    selectedIndex,
    position,
    handleSelect,
    handleClose,
    handleSelectionChange,
  }
}
