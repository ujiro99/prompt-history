import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "@/services/autoComplete/autoCompleteManager"
import { useCaretNode } from "@/hooks/useCaretNode"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import type {
  Prompt,
  VariablePreset,
  VariableConfig,
  VariableValues,
} from "@/types/prompt"

const serviceFacade = PromptServiceFacade.getInstance()

interface UseAutoCompleteOptions {
  prompts: Prompt[]
  presets?: VariablePreset[]
}

export const useAutoComplete = ({
  prompts,
  presets = [],
}: UseAutoCompleteOptions) => {
  const [isVisible, setIsVisible] = useState(false)
  const [matches, setMatches] = useState<AutoCompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ x: 0, y: 0, height: 0 })
  const managerRef = useRef<AutoCompleteManager | null>(null)
  const { nodeAtCaret } = useCaretNode()

  const {
    variableInputData,
    setVariableInputData,
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

  /**
   * Convert VariablePreset to VariableConfig
   */
  const createVariableConfigFromPreset = useCallback(
    (preset: VariablePreset): VariableConfig => {
      return {
        name: preset.name,
        type: "preset",
        presetOptions: {
          presetId: preset.id,
          default:
            preset.type === "select"
              ? preset.selectOptions?.[0]
              : preset.type === "dictionary"
                ? preset.dictionaryItems?.[0]?.id
                : undefined,
        },
      }
    },
    [],
  )

  /**
   * Insert preset content directly as text
   */
  const insertPresetDirectly = useCallback(
    async (match: AutoCompleteMatch) => {
      await serviceFacade.replaceText(match, nodeAtCaret)
    },
    [nodeAtCaret],
  )

  /**
   * Handle preset selection that requires user input (select/dictionary types)
   */
  const handlePresetSelection = useCallback(
    (match: AutoCompleteMatch) => {
      // Find the preset
      const preset = presets.find((p) => p.id === match.id)
      if (!preset) {
        console.error("Preset not found:", match.id)
        // Fallback: insert directly
        insertPresetDirectly(match)
        return
      }

      // Validation: check for empty options/items
      if (
        preset.type === "select" &&
        (!preset.selectOptions || preset.selectOptions.length === 0)
      ) {
        console.warn("Select preset has no options")
        insertPresetDirectly(match)
        return
      }
      if (
        preset.type === "dictionary" &&
        (!preset.dictionaryItems || preset.dictionaryItems.length === 0)
      ) {
        console.warn("Dictionary preset has no items")
        insertPresetDirectly(match)
        return
      }

      // Create VariableConfig from preset
      const variableConfig = createVariableConfigFromPreset(preset)

      // Set variable input data to show dialog
      setVariableInputData({
        promptId: "", // Empty string indicates preset mode
        variables: [variableConfig],
        content: "", // Not used for preset
        match,
        nodeAtCaret,
      })
    },
    [
      presets,
      createVariableConfigFromPreset,
      insertPresetDirectly,
      setVariableInputData,
      nodeAtCaret,
    ],
  )

  /**
   * Handle preset variable submission
   */
  const handlePresetVariableSubmit = useCallback(
    async (values: VariableValues) => {
      if (!variableInputData || !variableInputData.match) return

      const match = variableInputData.match
      const presetName = variableInputData.variables[0]?.name
      const selectedValue = values[presetName]

      if (!selectedValue) {
        console.warn("No value selected")
        return
      }

      const node = variableInputData.nodeAtCaret

      // Create a new match with the selected value as content
      const updatedMatch: AutoCompleteMatch = {
        ...match,
        content: selectedValue,
      }

      // Use serviceFacade.replaceText to handle the text replacement with legacyMode support
      await serviceFacade.replaceText(updatedMatch, node ?? null)

      // Clear the dialog
      clearVariableInputData()
    },
    [variableInputData, clearVariableInputData],
  )

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
        } else if (match.matchType === "preset") {
          // Check preset type to determine if dialog is needed
          if (
            match.presetType === "select" ||
            match.presetType === "dictionary"
          ) {
            // Show dialog for select/dictionary presets
            handlePresetSelection(match)
          } else {
            // Insert text presets directly
            insertPresetDirectly(match)
          }
        } else if (match.matchType === "preset-item") {
          // Always insert preset-item directly
          insertPresetDirectly(match)
        }
      },
      onSelectChange: (index: number) => {
        setSelectedIndex(index)
      },
    }),
    [insertPrompt, insertPresetDirectly, handlePresetSelection],
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
    handlePresetVariableSubmit,
  }
}
