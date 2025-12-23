import { useState, useEffect } from "react"
import type { VariableConfig } from "@/types/prompt"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"
import { VariableConfigField } from "@/components/inputMenu/controller/VariableConfigField"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import usePrev from "@/hooks/usePrev"
import { i18n } from "#imports"

const variablesEqual = (a: VariableConfig[], b: VariableConfig[]) => {
  const aStr = JSON.stringify(a)
  const bStr = JSON.stringify(b)
  return aStr === bStr
}

/**
 * Props for variable settings section
 */
interface VariableSettingsSectionProps {
  /** Array of variable configurations */
  variables: VariableConfig[]
  /** Callback when variables change */
  onChange: (variables: VariableConfig[]) => void
  /** Callback when editing preset (optional) */
  onClickPresetEdit?: (presetId: string) => void
  /** Enable auto-detection from content (default: false) */
  enableAutoDetection?: boolean
  autoDetectOptions?: {
    promptId: string
    /** Content to auto-detect variables from */
    content: string
  }
  /** Show section header (default: true) */
  showHeader?: boolean
  /** Custom header text (default: i18n key) */
  headerText?: string
  /** Custom description text (default: i18n key) */
  descriptionText?: string
  /** Additional CSS class names */
  className?: string
  /** CSS class names for header */
  classNameHeader?: string
  /** CSS class names for scroll area */
  scrollAreaClassName?: string
}

/**
 * Variable settings section component
 *
 * Displays and manages variable configurations for prompts.
 * Supports both external (parent-managed) and internal (auto-detected) variable management.
 *
 * @example
 * // External management (EditDialog pattern)
 * <VariableSettingsSection
 *   variables={variables}
 *   onChange={setVariables}
 *   enableAutoDetection={false}
 * />
 *
 * @example
 * // Internal management (OrganizerPreviewDialog pattern)
 * <VariableSettingsSection
 *   variables={variables}
 *   content={content}
 *   onChange={setVariables}
 *   enableAutoDetection={true}
 * />
 */
export const VariableSettingsSection: React.FC<
  VariableSettingsSectionProps
> = ({
  variables: externalVariables,
  onChange,
  onClickPresetEdit,
  enableAutoDetection = false,
  autoDetectOptions: { promptId, content } = { promptId: "", content: "" },
  showHeader = true,
  headerText,
  descriptionText,
  className = "",
  classNameHeader,
  scrollAreaClassName,
}) => {
  // Internal state for auto-detection mode
  const [internalVariables, setInternalVariables] =
    useState<VariableConfig[]>(externalVariables)

  // Use internal or external variables based on enableAutoDetection
  const variables = enableAutoDetection ? internalVariables : externalVariables

  const prevPromptId = usePrev<string>(promptId)
  const prevContent = usePrev<string>(content)
  const prevVariables = usePrev<VariableConfig[]>(variables)

  // Sync external variables to internal state when they change
  useEffect(() => {
    if (enableAutoDetection) {
      setInternalVariables(externalVariables)
    }
  }, [externalVariables, enableAutoDetection])

  // Auto-detect variables from content when enabled
  useEffect(() => {
    if (
      enableAutoDetection &&
      content !== undefined &&
      promptId === prevPromptId
    ) {
      if (
        content === prevContent &&
        variablesEqual(internalVariables, prevVariables)
      ) {
        return
      }

      const detected = mergeVariableConfigs(content, internalVariables)
      setInternalVariables(detected)
      onChange(detected)
    }
  }, [
    promptId,
    content,
    enableAutoDetection,
    internalVariables,
    onChange,
    prevContent,
    prevPromptId,
    prevVariables,
  ])

  /**
   * Handle variable configuration change
   */
  const handleVariableChange = (index: number, config: VariableConfig) => {
    const updatedVariables = [...variables]
    updatedVariables[index] = config

    if (enableAutoDetection) {
      setInternalVariables(updatedVariables)
    }

    onChange(updatedVariables)
  }

  // If no variables, show empty state
  if (variables.length === 0) {
    return null
  }

  const defaultHeaderText = i18n.t("dialogs.edit.variableSettings")
  const defaultDescriptionText = i18n.t(
    "dialogs.edit.variableSettingsDescription",
  )

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div>
          <label
            className={`text-sm font-semibold text-foreground inline-block ${classNameHeader}`}
          >
            {headerText || defaultHeaderText}
          </label>
          <p className={`text-xs text-muted-foreground mt-1`}>
            {descriptionText || defaultDescriptionText}
          </p>
        </div>
      )}

      {/* Scrollable variable list */}
      <ScrollAreaWithGradient
        className={`border-t-1 ${scrollAreaClassName}`}
        gradientHeight={25}
      >
        {variables.map((variable, index) => (
          <VariableConfigField
            key={variable.name}
            variable={variable}
            initialVariable={externalVariables?.[index]}
            onChange={(config) => handleVariableChange(index, config)}
            onClickPresetEdit={onClickPresetEdit}
          />
        ))}
      </ScrollAreaWithGradient>
    </div>
  )
}
