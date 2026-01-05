import { useState } from "react"
import { Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenuField,
  MenuOption,
} from "@/components/inputMenu/controller/DropdownMenuField"
import { SelectField } from "@/components/inputMenu/controller/SelectField"
import { DictionaryItemPreview } from "@/components/inputMenu/DictionaryItemPreview"
import type {
  VariableConfig,
  VariableType,
  DictionaryItem,
} from "@/types/prompt"
import { Textarea } from "@/components/ui/textarea"
import { useVariablePresets } from "@/hooks/useVariablePresets"
import { i18n } from "#imports"

const VariableTypeOptions: { label: string; value: VariableType }[] = [
  { label: i18n.t("variableTypes.text"), value: "text" },
  { label: i18n.t("variableTypes.select"), value: "select" },
  { label: i18n.t("variableTypes.preset"), value: "preset" },
  { label: i18n.t("variableTypes.exclude"), value: "exclude" },
]

type VariableTypeOption = VariableType | `preset.${string}`

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
  /** Callback when editing preset */
  onClickPresetEdit?: (presetId: string) => void
}

/**
 * Variable configuration field component
 * Allows configuring a single variable's type, default value, and options
 */
export const VariableConfigField: React.FC<VariableConfigFieldProps> = ({
  variable,
  initialVariable,
  onChange,
  onClickPresetEdit,
}) => {
  // For preview of dictionary items
  const [selectElm, setSelectElm] = useState<HTMLElement | null>(null)
  const [previewItem, setPreviewItem] = useState<DictionaryItem | null>(null)

  // Watch all presets for dropdown
  const { presets } = useVariablePresets()

  // Watch selected preset for details display
  const { preset: selectedPreset } = useVariablePresets({
    presetId: variable.presetOptions?.presetId,
  })

  /**
   * Handle variable type change
   */
  const handleTypeChange = (option: VariableTypeOption) => {
    // Determine new type and presetId
    let type: VariableType
    let presetId: string | undefined = undefined
    if (option.startsWith("preset.")) {
      type = "preset"
      presetId = option.split(".")[1]
    } else {
      type = option as VariableType
    }

    const updatedConfig: VariableConfig = {
      ...variable,
      type,
    }

    // Clear type-specific fields
    delete updatedConfig.selectOptions
    delete updatedConfig.presetOptions

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
      if (presetId) {
        updatedConfig.presetOptions = {
          presetId,
        }
      } else if (
        initialVariable?.type === "preset" &&
        initialVariable.presetOptions
      ) {
        // If type is 'preset', restore presetId if available
        updatedConfig.presetOptions = initialVariable.presetOptions
      }
    }

    onChange(updatedConfig)
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
   * Handle preset default change (for preset type)
   * @param optionOrId - Select option value or dictionary item ID
   */
  const handlePresetDefaultChange = (optionOrId: string) => {
    onChange({
      ...variable,
      presetOptions: {
        ...variable.presetOptions,
        default: optionOrId,
      },
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

  /**
   * Variable types for hierarchical menu
   */
  const getVariableTypeOptions = () => {
    // Presets options for submenu
    const presetOptions =
      presets
        ?.filter((p) => p.name)
        .map((preset) => ({
          label: preset.name,
          value: `preset.${preset.id}`,
        })) ?? []

    // Convert to menu options format
    const options: Array<MenuOption> = []
    VariableTypeOptions.forEach((type) => {
      if (type.value === "preset") {
        options.push({
          label: type.label,
          children: presetOptions,
        })
        return
      }
      options.push(type)
    })

    return options
  }

  const getVariableTypeValue = () => {
    if (variable.type === "preset" && variable.presetOptions?.presetId) {
      return `preset.${variable.presetOptions.presetId}`
    }
    return variable.type
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
          <DropdownMenuField
            name="variable-type"
            options={getVariableTypeOptions()}
            value={getVariableTypeValue()}
            onValueChange={(_, v) => handleTypeChange(v as VariableTypeOption)}
            className="bg-white"
          />
          {variable.type === "preset" && selectedPreset && (
            <p className="ml-2 text-xs text-muted-foreground break-all">
              {i18n.t("variableTypes.type", [
                i18n.t(`variableTypes.${selectedPreset.type}`),
              ])}
              {selectedPreset.description && ` - ${selectedPreset.description}`}
            </p>
          )}
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
            <Textarea
              id={`var-default-${variable.name}`}
              value={variable.defaultValue || ""}
              onChange={(e) => handleDefaultValueChange(e.target.value)}
              placeholder={i18n.t("placeholders.enterValue")}
              rows={1}
              className="py-1.5 min-h-9 max-h-60 break-all bg-white"
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
            <div className="flex items-center justify-between">
              <label
                htmlFor={`var-preset-${variable.name}`}
                className="block text-xs text-muted-foreground"
              >
                {i18n.t("common.defaultValue")}
              </label>
              {selectedPreset && onClickPresetEdit && (
                <button
                  onClick={() => onClickPresetEdit(selectedPreset.id)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors whitespace-nowrap cursor-pointer"
                  aria-label={i18n.t("dialogs.edit.presetEditLink")}
                >
                  <Pencil className="size-3.5" />
                  {i18n.t("dialogs.edit.presetEdit")}
                </button>
              )}
            </div>
            {selectedPreset &&
              (selectedPreset.type === "select" &&
              selectedPreset.selectOptions ? (
                <SelectField
                  options={selectedPreset.selectOptions.map((opt) => ({
                    label: opt,
                    value: opt,
                  }))}
                  name={variable.name}
                  value={variable.presetOptions?.default || ""}
                  onValueChange={(_, val) => handlePresetDefaultChange(val)}
                  className="bg-white w-full"
                />
              ) : selectedPreset.type === "dictionary" &&
                selectedPreset.dictionaryItems ? (
                <>
                  <SelectField
                    options={selectedPreset.dictionaryItems.map((item) => ({
                      label: item.name,
                      value: item.id,
                    }))}
                    name={variable.name}
                    value={variable.presetOptions?.default || ""}
                    onValueChange={(_, id) => handlePresetDefaultChange(id)}
                    onHover={(value) => {
                      const item = selectedPreset.dictionaryItems?.find(
                        (i) => i.id === value,
                      )
                      setPreviewItem(item || null)
                    }}
                    hoveredRef={setSelectElm}
                    className="bg-white w-full"
                  />
                  {previewItem && (
                    <DictionaryItemPreview
                      open={previewItem != null}
                      anchorElm={selectElm}
                      dictionaryItem={previewItem}
                    />
                  )}
                </>
              ) : null)}
          </div>
        )}

        {variable.type === "exclude" && (
          <div className="pb-3 flex items-end">
            <p className="text-xs text-muted-foreground">
              {i18n.t("dialogs.edit.excludeExpansion")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
