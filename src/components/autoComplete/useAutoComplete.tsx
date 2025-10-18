import { useEffect, useState, useRef, useMemo } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "../../services/autoComplete/autoCompleteManager"
import { useCaretNode } from "../../hooks/useCaretNode"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import type { Prompt } from "../../types/prompt"

const serviceFacade = PromptServiceFacade.getInstance()

interface UseAutoCompleteOptions {
  prompts: Prompt[]
}

export const useAutoComplete = ({ prompts }: UseAutoCompleteOptions) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ x: 0, y: 0, height: 0 })
  const managerRef = useRef<AutoCompleteManager | null>(null)
  const { nodeAtCaret } = useCaretNode()

  const {
    variableInputData,
    executePrompt,
    handleVariableSubmit,
    clearVariableInputData,
  } = usePromptExecution({
    nodeAtCaret,
    onExecuteComplete: () => {
      // Refocus the text input after executing the prompt
      const textInput = serviceFacade.getTextInput() as HTMLElement
      if (textInput) {
        textInput.focus()
      }

      // Reset autocomplete state
      setMatches([])
      managerRef.current?.selectReset()
    },
  })

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
        setMatches([])
        managerRef.current?.selectReset()
        setIsVisible(false)
      },
      onExecute: async (match: AutoCompleteMatch) => {
        // Execute prompt (with variable check)
        await executePrompt(match.id, match)
      },
      onSelectChange: (index: number) => {
        setSelectedIndex(index)
      },
    }),
    [executePrompt],
  )

  useEffect(() => {
    managerRef.current = new AutoCompleteManager()
  }, [])

  useEffect(() => {
    managerRef.current?.setElement(serviceFacade.getTextInput())

    // Listen for element changes from DomManager
    const handleElementChange = (textInput: Element | null) => {
      if (managerRef.current) {
        managerRef.current.setElement(textInput)
      }
    }
    const offElementChange = serviceFacade.onElementChange(handleElementChange)

    // Listen for content changes from DomManager
    const handleContentChange = (content: string) => {
      if (managerRef.current) {
        managerRef.current.handleContentChange(content)
      }
    }
    const offContentChange = serviceFacade.onContentChange(handleContentChange)

    return () => {
      offElementChange()
      offContentChange()
      if (managerRef.current) {
        managerRef.current.destroy()
        managerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    managerRef.current?.setPrompts(prompts)
  }, [prompts])

  useEffect(() => {
    managerRef.current?.setCallbacks(callbacks)
  }, [callbacks])

  const handleExecute = (_match: AutoCompleteMatch) => {
    if (managerRef.current) {
      managerRef.current.execute()
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
    handleExecute,
    handleClose,
    selectIndex,
    selectNext,
    selectPrevious,
    variableInputData,
    clearVariableInputData,
    handleVariableSubmit,
  }
}
