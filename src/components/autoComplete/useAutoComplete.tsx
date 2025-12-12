import { useEffect, useState, useRef, useMemo } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "@/services/autoComplete/autoCompleteManager"
import { useCaretNode } from "@/hooks/useCaretNode"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import type { Prompt, VariablePreset } from "@/types/prompt"
import { setCaretPosition } from "@/services/dom/caretUtils"

const serviceFacade = PromptServiceFacade.getInstance()

interface UseAutoCompleteOptions {
  prompts: Prompt[]
  presets?: VariablePreset[]
}

export const useAutoComplete = ({ prompts, presets = [] }: UseAutoCompleteOptions) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ x: 0, y: 0, height: 0 })
  const managerRef = useRef<AutoCompleteManager | null>(null)
  const { nodeAtCaret } = useCaretNode()

  const {
    variableInputData,
    insertPrompt,
    handleVariableSubmit,
    clearVariableInputData,
  } = usePromptExecution({
    nodeAtCaret,
    onExecuteComplete: () => {
      // Refocus the text input after inserting the prompt
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
        if (match.matchType === "prompt") {
          // Insert prompt (with variable check)
          await insertPrompt(match.id, match)
        } else {
          // For preset or preset-item, insert content directly as text
          const textInput = serviceFacade.getTextInput() as HTMLElement
          if (textInput && nodeAtCaret) {
            // Replace the search term with the matched content
            const textContent = nodeAtCaret.textContent || ""
            const newContent =
              textContent.substring(0, match.matchStart) +
              match.content +
              textContent.substring(match.matchEnd)

            // Update the text node
            nodeAtCaret.textContent = newContent

            // Set caret position after the inserted content
            const newCaretPosition = match.matchStart + match.content.length
            setCaretPosition(textInput, newCaretPosition, match.newlineCount)

            // Refocus the text input
            textInput.focus()
          }
        }
      },
      onSelectChange: (index: number) => {
        setSelectedIndex(index)
      },
    }),
    [insertPrompt, nodeAtCaret],
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
    managerRef.current?.setPresets(presets)
  }, [presets])

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
