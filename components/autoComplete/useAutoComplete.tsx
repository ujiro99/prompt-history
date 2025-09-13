import { useEffect, useState, useRef, useMemo } from "react"
import { DomManager } from "../../services/chatgpt/domManager"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "../../services/autoComplete/autoCompleteManager"
import { useCaretNode } from "../../hooks/useCaretNode"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import type { Prompt } from "../../types/prompt"

const serviceFacade = PromptServiceFacade.getInstance()

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
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const managerRef = useRef<AutoCompleteManager | null>(null)
  const { nodeAtCaret } = useCaretNode()

  const callbacks = useMemo(
    () => ({
      onShow: () => {
        if (managerRef.current) {
          setMatches(managerRef.current.getMatches())
          setPosition(managerRef.current.getPopupPosition())
          setIsVisible(true)
        }
      },
      onHide: () => {
        setIsVisible(false)
        setMatches([])
        managerRef.current?.selectReset()
      },
      onSelect: async (match: AutoCompleteMatch) => {
        await serviceFacade.executePrompt(match.id, nodeAtCaret, match)
        setIsVisible(false)
        setMatches([])
        managerRef.current?.selectReset()
      },
      onSelectChange: (index: number) => {
        setSelectedIndex(index)
      },
    }),
    [nodeAtCaret],
  )

  useEffect(() => {
    managerRef.current = new AutoCompleteManager()
  }, [])

  useEffect(() => {
    managerRef.current?.setElement(domManager.getTextInput())

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
  }, [domManager])

  useEffect(() => {
    managerRef.current?.setPrompts(prompts)
  }, [prompts])

  useEffect(() => {
    managerRef.current?.setCallbacks(callbacks)
  }, [callbacks])

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

  const selectIndex = (index: number) => {
    managerRef.current?.selectIndex(index)
  }

  const selectNext = () => {
    managerRef.current?.selectNext()
  }

  const selectPrevious = () => {
    managerRef.current?.selectPrevious()
  }

  return {
    isVisible,
    matches,
    selectedIndex,
    position,
    handleSelect,
    handleClose,
    selectIndex,
    selectNext,
    selectPrevious,
  }
}
