import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteManager } from "@/services/autoComplete/autoCompleteManager"
import { useCaretNode } from "@/hooks/useCaretNode"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import type { Prompt, VariablePreset, VariableValues } from "@/types/prompt"

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

  // View mode state: matches list or preset options list
  const [viewMode, setViewMode] = useState<"matches" | "preset-options">(
    "matches",
  )
  const [selectedPreset, setSelectedPreset] = useState<VariablePreset | null>(
    null,
  )
  const [selectedPresetMatch, setSelectedPresetMatch] =
    useState<AutoCompleteMatch | null>(null)

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
   * Handle showing preset options inline in the autocomplete popup
   */
  const handlePresetOptionView = useCallback(
    (match: AutoCompleteMatch) => {
      console.log("handlePresetOptionView called", {
        matchId: match.id,
        matchName: match.name,
        matchType: match.matchType,
        presetType: match.presetType,
        presetsCount: presets.length,
        presetIds: presets.map((p) => p.id),
      })

      // Find the preset
      const preset = presets.find((p) => p.id === match.id)
      if (!preset) {
        console.error(
          "Preset not found:",
          match.id,
          "Available presets:",
          presets,
        )
        // Fallback: insert directly
        insertPresetDirectly(match)
        return
      }

      console.log("Preset found:", preset)

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

      // Set view mode to preset-options
      console.log(
        "Setting view mode to preset-options and selectedPreset to:",
        preset,
      )
      setViewMode("preset-options")
      setSelectedPreset(preset)
      setSelectedPresetMatch(match)
      // Reset selection to first option
      setSelectedIndex(0)
    },
    [presets, insertPresetDirectly],
  )

  /**
   * Handle option selection from preset options view
   */
  const handleOptionExecute = useCallback(
    async (option: string | { name: string; content: string; id: string }) => {
      if (!selectedPresetMatch) {
        console.error("No preset match selected")
        return
      }

      // Get content from option
      const content = typeof option === "string" ? option : option.content

      // Create updated match with selected content
      const updatedMatch: AutoCompleteMatch = {
        ...selectedPresetMatch,
        content,
      }

      // Insert the text
      await serviceFacade.replaceText(updatedMatch, nodeAtCaret ?? null)

      // Reset state and close popup
      handleClose()
      setViewMode("matches")
      setSelectedPreset(null)
      setSelectedPresetMatch(null)
    },
    [selectedPresetMatch, nodeAtCaret],
  )

  /**
   * Get options list from preset based on type
   */
  const getOptionsFromPreset = useCallback(
    (
      preset: VariablePreset,
    ): (string | { name: string; content: string; id: string })[] => {
      if (preset.type === "select") {
        return preset.selectOptions || []
      }
      if (preset.type === "dictionary") {
        return preset.dictionaryItems || []
      }
      return []
    },
    [],
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
        console.log("onHide called - resetting all state")
        setMatches([])
        managerRef.current?.selectReset()
        setIsVisible(false)
        // Reset view mode when hiding
        setViewMode("matches")
        setSelectedPreset(null)
        setSelectedPresetMatch(null)
      },
      onExecute: async (match: AutoCompleteMatch): Promise<boolean | void> => {
        console.log("onExecute called", {
          matchType: match.matchType,
          presetType: match.presetType,
          matchId: match.id,
          matchName: match.name,
        })

        if (match.matchType === "prompt") {
          // Insert prompt (with variable check)
          await insertPrompt(match.id, match)
          // Close popup after inserting prompt
          return true
        } else if (match.matchType === "preset") {
          // Check preset type to determine if inline options should be shown
          if (
            match.presetType === "select" ||
            match.presetType === "dictionary"
          ) {
            console.log("Calling handlePresetOptionView for", match.presetType)
            // Show inline preset options view
            handlePresetOptionView(match)
            // Keep popup open to show options
            return false
          } else {
            console.log("Inserting text preset directly")
            // Insert text presets directly
            insertPresetDirectly(match)
            // Close popup after inserting
            return true
          }
        } else if (match.matchType === "preset-item") {
          // Always insert preset-item directly
          insertPresetDirectly(match)
          // Close popup after inserting
          return true
        }
      },
      onSelectChange: (index: number) => {
        setSelectedIndex(index)
      },
    }),
    [insertPrompt, insertPresetDirectly, handlePresetOptionView],
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
    // Reset view mode state
    setViewMode("matches")
    setSelectedPreset(null)
    setSelectedPresetMatch(null)
  }

  const selectAt = (index: number) => {
    if (viewMode === "preset-options" && selectedPreset) {
      // In options view: directly set selectedIndex
      const options = getOptionsFromPreset(selectedPreset)
      if (index >= 0 && index < options.length) {
        setSelectedIndex(index)
      }
    } else {
      // In matches view: use AutoCompleteManager
      managerRef.current?.selectAt(index)
    }
  }

  const selectNext = () => {
    if (viewMode === "preset-options" && selectedPreset) {
      // In options view: cycle through options
      const options = getOptionsFromPreset(selectedPreset)
      setSelectedIndex((prev) => (prev + 1) % options.length)
    } else {
      // In matches view: use AutoCompleteManager
      managerRef.current?.selectNext()
    }
  }

  const selectPrevious = () => {
    if (viewMode === "preset-options" && selectedPreset) {
      // In options view: cycle through options (backwards)
      const options = getOptionsFromPreset(selectedPreset)
      setSelectedIndex((prev) => (prev - 1 + options.length) % options.length)
    } else {
      // In matches view: use AutoCompleteManager
      managerRef.current?.selectPrevious()
    }
  }

  return {
    isVisible,
    matches,
    selectedIndex,
    position,
    handleExecute,
    handleClose,
    selectAt,
    selectNext,
    selectPrevious,
    variableInputData,
    clearVariableInputData,
    handleVariableSubmit,
    handlePresetVariableSubmit,
    // New state and functions for preset options view
    viewMode,
    selectedPreset,
    handleOptionExecute,
    getOptionsFromPreset,
  }
}
