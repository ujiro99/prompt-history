import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "../../services/autoComplete/autoCompleteManager"
import { useCaretNode } from "../../hooks/useCaretNode"
import type { AutoCompleteMatch } from "../../services/autoComplete/types"
import type { Prompt, VariableConfig, VariableValues } from "../../types/prompt"
import { expandPrompt } from "@/utils/variables/variableFormatter"

const serviceFacade = PromptServiceFacade.getInstance()

interface UseAutoCompleteOptions {
  prompts: Prompt[]
}

export const useAutoComplete = ({ prompts }: UseAutoCompleteOptions) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ x: 0, y: 0, height: 0 })
  const [variableInputData, setVariableInputData] = useState<{
    promptId: string
    variables: VariableConfig[]
    content: string
    match: AutoCompleteMatch
    nodeAtCaret: Node | null
  } | null>(null)
  const managerRef = useRef<AutoCompleteManager | null>(null)
  const { nodeAtCaret } = useCaretNode()

  console.log("1", nodeAtCaret)

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
        try {
          // Get prompt to check for variables
          const prompt = await serviceFacade.getPrompt(match.id)

          // Check if prompt has variables that need user input
          const hasVariables = prompt.variables && prompt.variables.length > 0
          const hasInputVariables =
            hasVariables && prompt.variables!.some((v) => v.type !== "exclude")

          if (hasInputVariables) {
            // Show variable input dialog
            setVariableInputData({
              promptId: match.id,
              variables: prompt.variables!,
              content: prompt.content,
              match,
              nodeAtCaret,
            })
          } else {
            // Execute directly if no variables
            await serviceFacade.executePrompt(match.id, nodeAtCaret, match)

            // Refocus the text input after executing the prompt
            const textInput = serviceFacade.getTextInput() as HTMLElement
            if (textInput) {
              textInput.focus()
            }

            setMatches([])
            managerRef.current?.selectReset()
          }
        } catch (error) {
          console.error("Execute failed:", error)
        }
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

  const handleVariableSubmit = useCallback(
    async (values: VariableValues) => {
      if (!variableInputData) return

      try {
        const { promptId, content, match, nodeAtCaret } = variableInputData

        // Expand prompt with variable values
        const expandedContent = expandPrompt(content, values)

        // Create a modified match object with expanded content
        const expandedMatch = {
          ...match,
          content: expandedContent,
        }

        // Execute the prompt with expanded content
        await serviceFacade.executePrompt(promptId, nodeAtCaret, expandedMatch)

        // Refocus the text input after executing the prompt
        const textInput = serviceFacade.getTextInput() as HTMLElement
        if (textInput) {
          textInput.focus()
        }

        // Close the variable input dialog and autocomplete
        setVariableInputData(null)
        setMatches([])
        managerRef.current?.selectReset()
      } catch (error) {
        console.error("Variable expansion failed:", error)
      }
    },
    [variableInputData],
  )

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
    setVariableInputData,
    handleVariableSubmit,
  }
}
