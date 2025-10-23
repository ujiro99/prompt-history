import { Input } from "@/components/ui/input"
import { SelectField } from "@/components/inputMenu/controller/SelectField"
import type { VariableConfig, VariableType } from "@/types/prompt"
import { i18n } from "#imports"

const VariableTypeOptions: { label: string; value: VariableType }[] = [
  { label: i18n.t("variableTypes.text"), value: "text" },
  { label: i18n.t("variableTypes.textarea"), value: "textarea" },
  { label: i18n.t("variableTypes.select"), value: "select" },
  { label: i18n.t("variableTypes.exclude"), value: "exclude" },
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
  /**
   * Handle variable type change
   */
  const handleTypeChange = (type: VariableType) => {
    const updatedConfig: VariableConfig = {
      ...variable,
      type,
    }

    // Clear selectOptions if type is not 'select'
    if (type !== "select") {
      delete updatedConfig.selectOptions
    } else {
      // If type is 'select', ensure selectOptions exists or restore if empty
      if (
        !updatedConfig.selectOptions ||
        updatedConfig.selectOptions.options.length === 0
      ) {
        // Try to restore from initialVariable, otherwise initialize empty
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
        {!["select", "exclude"].includes(variable.type) && (
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
      </div>
    </div>
  )
}
