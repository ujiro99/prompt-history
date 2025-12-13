import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { SelectField } from "@/components/inputMenu/controller/SelectField"
import type {
  VariableConfig,
  VariableType,
  VariablePreset,
} from "@/types/prompt"
import { getVariablePresets } from "@/services/storage/variablePresetStorage"
import { i18n } from "#imports"

const VariableTypeOptions: { label: string; value: VariableType }[] = [
  { label: i18n.t("variableTypes.text"), value: "text" },
  { label: i18n.t("variableTypes.textarea"), value: "textarea" },
  { label: i18n.t("variableTypes.select"), value: "select" },
  { label: i18n.t("variableTypes.exclude"), value: "exclude" },
  { label: i18n.t("variableTypes.preset"), value: "preset" },
]

/**
 * Props for variable configuration field
 */
interface VariableConfigFieldProps {
  /** Variable configuration */
  variable: VariableConfig
  /** Initial variable configuration (for restoring options) */
  initialVariable?: VariableConfig
  /** Callback when configuration changes */
  onChange: (config: VariableConfig) => void
}

/**
 * Variable configuration field component
 * Allows configuring a single variable's type, default value, and options
 */
export const VariableConfigField: React.FC<VariableConfigFieldProps> = ({
  variable,
  initialVariable,
  onChange,
}) => {
  const [presets, setPresets] = useState<VariablePreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<VariablePreset | null>(
    null,
  )

  /**
   * Load presets on mount
   */
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const loadedPresets = await getVariablePresets()
        setPresets(loadedPresets)

        // Find and set selected preset if variable has presetId
        if (variable.presetId) {
          const preset = loadedPresets.find((p) => p.id === variable.presetId)
          setSelectedPreset(preset || null)
        }
      } catch (error) {
        console.error("Failed to load presets:", error)
      }
    }
    loadPresets()
  }, [variable.presetId])

  /**
   * Handle variable type change
   */
  const handleTypeChange = (type: VariableType) => {
    const updatedConfig: VariableConfig = {
      ...variable,
      type,
    }

    // Clear type-specific fields
    delete updatedConfig.selectOptions
    delete updatedConfig.presetId

    if (type === "select") {
      // If type is 'select', ensure selectOptions exists or restore if empty
      if (
        initialVariable?.type === "select" &&
        initialVariable.selectOptions?.options
      ) {
        updatedConfig.selectOptions = initialVariable.selectOptions
      } else {
        updatedConfig.selectOptions = {
          options: [],
        }
      }
    } else if (type === "preset") {
      // If type is 'preset', restore presetId if available
      if (initialVariable?.type === "preset" && initialVariable.presetId) {
        updatedConfig.presetId = initialVariable.presetId
      }
    }

    // Clear selected preset if type is not 'preset'
    if (type !== "preset") {
      setSelectedPreset(null)
    }

    onChange(updatedConfig)
  }

  /**
   * Handle preset selection change
   */
  const handlePresetChange = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    setSelectedPreset(preset || null)

    onChange({
      ...variable,
      presetId,
    })
  }

  /**
   * Handle default value change
   */
  const handleDefaultValueChange = (value: string) => {
    onChange({
      ...variable,
      defaultValue: value,
    })
  }

  /**
   * Handle options change (for select type)
   */
  const handleOptionsBlur = (value: string) => {
    // Parse comma-separated options
    const options = value
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0)

    // If default value is not in options, adds it
    if (options.length > 0 && variable.defaultValue) {
      if (!options.includes(variable.defaultValue)) {
        options.push(variable.defaultValue)
      }
    }

    // Unique options
    const uniqueOptions = Array.from(new Set(options))

    onChange({
      ...variable,
      selectOptions: {
        options: uniqueOptions,
      },
    })
  }

  /**
   * Get options string from selectOptions
   */
  const getOptionsString = (): string => {
    return variable.selectOptions?.options.join(", ") || ""
  }

  return (
    <div className="space-y-1 border-b-1 px-3 py-4 bg-muted/30">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Variable name (read-only) */}
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">
            {i18n.t("common.name")}:{" "}
          </label>
          <code className="text-sm block py-2 min-w-[5rem]">
            &#123;&#123;{variable.name}&#125;&#125;
          </code>
        </div>

        {/* Variable type selector */}
        <div className="space-y-1">
          <label
            htmlFor={`var-type-${variable.name}`}
            className="block text-xs text-muted-foreground"
          >
            {i18n.t("common.variableType")}
          </label>
          <SelectField
            options={VariableTypeOptions}
            name="variable-type"
            value={variable.type}
            onValueChange={(_, v) => handleTypeChange(v as VariableType)}
            className="bg-white"
          />
        </div>

        {/* Default value input (only for text, textarea) */}
        {!["select", "exclude", "preset"].includes(variable.type) && (
          <div className="space-y-1 flex-1">
            <label
              htmlFor={`var-default-${variable.name}`}
              className="block text-xs text-muted-foreground"
            >
              {i18n.t("common.defaultValue")}
            </label>
            <Input
              id={`var-default-${variable.name}`}
              type="text"
              value={variable.defaultValue || ""}
              onChange={(e) => handleDefaultValueChange(e.target.value)}
              placeholder={i18n.t("placeholders.enterValue")}
              className="bg-white"
            />
          </div>
        )}

        {/* Options input (only for select type) */}
        {variable.type === "select" && (
          <div className="space-y-1 flex-1">
            <label
              htmlFor={`var-options-${variable.name}`}
              className="block text-xs text-muted-foreground"
            >
              {i18n.t("common.options")}
            </label>
            <Input
              id={`var-options-${variable.name}`}
              type="text"
              defaultValue={getOptionsString()}
              onBlur={(e) => handleOptionsBlur(e.target.value)}
              placeholder={i18n.t("placeholders.enterOptions")}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">
              {i18n.t("common.commaSeparatedValues")}
            </p>
          </div>
        )}

        {/* Preset selector (only for preset type) */}
        {variable.type === "preset" && (
          <div className="space-y-1 flex-1">
            <label
              htmlFor={`var-preset-${variable.name}`}
              className="block text-xs text-muted-foreground"
            >
              {i18n.t("variableTypes.preset")}
            </label>
            <SelectField
              options={presets.map((p) => ({ label: p.name, value: p.id }))}
              name="preset-select"
              value={variable.presetId || ""}
              onValueChange={(_, v) => handlePresetChange(v)}
              className="bg-white h-auto! py-[0.4rem] whitespace-normal wrap-break-word text-left"
            />
            {selectedPreset && (
              <p className="ml-2 text-xs text-muted-foreground">
                {i18n.t("variableTypes.type", [
                  i18n.t(`variableTypes.${selectedPreset.type}`),
                ])}
                {selectedPreset.description &&
                  ` - ${selectedPreset.description}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
