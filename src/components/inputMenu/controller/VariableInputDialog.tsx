import { useState, useEffect, useMemo } from "react"
import { CornerDownLeft } from "lucide-react"
import { i18n } from "#imports"
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Key } from "@/components/Key"
import { SelectField } from "@/components/inputMenu/controller/SelectField"
import { useContainer } from "@/hooks/useContainer"
import { useDebounce } from "@/hooks/useDebounce"
import type {
  VariableConfig,
  VariableValues,
  VariablePreset,
  DictionaryItem,
} from "@/types/prompt"
import { TestIds } from "@/components/const"
import { isMac } from "@/utils/platform"
import { expandPrompt } from "@/utils/variables/variableFormatter"
import { stopPropagation } from "@/utils/dom"
import { getVariablePresets } from "@/services/storage/variablePresetStorage"

/**
 * Props for variable input dialog
 */
interface VariableInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variables: VariableConfig[]
  content: string
  onSubmit: (values: VariableValues) => void
  onDismiss?: () => void
}

/**
 * Variable input dialog component
 * Displays input fields for each variable based on their configuration
 */
export const VariableInputDialog: React.FC<VariableInputDialogProps> = ({
  open,
  onOpenChange,
  variables,
  content,
  onSubmit,
  onDismiss,
}) => {
  const [values, setValues] = useState<VariableValues>({})
  const [presets, setPresets] = useState<Map<string, VariablePreset>>(new Map())
  const [selectedDictItems, setSelectedDictItems] = useState<
    Map<string, DictionaryItem | null>
  >(new Map())
  const { container } = useContainer()

  // Debounce values for preview
  const debouncedValues = useDebounce(values, 200)

  // Generate preview with debounced values
  const preview = useMemo(() => {
    return expandPrompt(content, debouncedValues)
  }, [content, debouncedValues])

  // Load presets for preset-type variables
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const allPresets = await getVariablePresets()
        const presetMap = new Map<string, VariablePreset>()

        for (const variable of variables) {
          if (variable.type === "preset" && variable.presetId) {
            const preset = allPresets.find((p) => p.id === variable.presetId)
            if (preset) {
              presetMap.set(variable.name, preset)
            }
          }
        }

        setPresets(presetMap)
      } catch (error) {
        console.error("Failed to load presets:", error)
      }
    }

    if (open) {
      loadPresets()
    }
  }, [open, variables])

  // Initialize values from variable configs and presets
  useEffect(() => {
    const initialValues: VariableValues = {}
    const dictItems = new Map<string, DictionaryItem | null>()

    for (const variable of variables) {
      if (variable.type === "exclude") {
        continue
      }

      if (variable.type === "preset") {
        const preset = presets.get(variable.name)
        if (preset) {
          if (preset.type === "text") {
            initialValues[variable.name] = preset.textContent || ""
          } else if (preset.type === "select" && preset.selectOptions) {
            initialValues[variable.name] = preset.selectOptions[0] || ""
          } else if (preset.type === "dictionary" && preset.dictionaryItems) {
            // Dictionary type: use first item's name as initial value
            const firstItem = preset.dictionaryItems[0]
            if (firstItem) {
              initialValues[variable.name] = firstItem.name
              dictItems.set(variable.name, firstItem)
            }
          }
        } else {
          initialValues[variable.name] = ""
        }
      } else {
        initialValues[variable.name] = variable.defaultValue || ""
      }
    }

    setValues(initialValues)
    setSelectedDictItems(dictItems)
  }, [variables, presets])

  /**
   * Handle value change for a variable
   */
  const handleValueChange = (name: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  /**
   * Handle dictionary item selection
   */
  const handleDictionaryItemChange = (
    variableName: string,
    itemName: string,
  ) => {
    const preset = presets.get(variableName)
    if (!preset || preset.type !== "dictionary" || !preset.dictionaryItems) {
      return
    }

    const item = preset.dictionaryItems.find((i) => i.name === itemName)
    if (item) {
      setSelectedDictItems((prev) => {
        const updated = new Map(prev)
        updated.set(variableName, item)
        return updated
      })
      // For dictionary type, we store the item content as the value
      handleValueChange(variableName, item.content)
    }
  }

  /**
   * Handle submit
   */
  const handleSubmit = () => {
    onSubmit(values)
    onOpenChange(false)
  }

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSubmit()
      return
    }
    if (event.key === "Tab" && !event.shiftKey) {
      const elm = event.target as HTMLElement
      if (elm.dataset.testid === TestIds.variableInputDialog.submit) {
        event.preventDefault()
        handleSubmit()
      }
      return
    }
    event.stopPropagation()
  }

  // Filter out exclude type variables
  const visibleVariables = variables.filter((v) => v.type !== "exclude")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="w-xl sm:max-w-xl max-h-9/10"
        onKeyDown={handleKeyDown}
        onEscapeKeyDown={onDismiss}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("dialogs.variables.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("dialogs.variables.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Preview Section */}
        <section>
          <h3 className="text-sm font-medium text-foreground">
            {i18n.t("dialogs.variables.preview") || "Preview"}
          </h3>
          <div className="mt-1 bg-neutral-50 border border-neutral-200 rounded-md p-3 max-h-48 overflow-y-auto">
            <pre className="text-xs/5 text-neutral-800 whitespace-pre-wrap break-all font-mono">
              {preview}
            </pre>
          </div>
        </section>

        {/* Input Section */}
        <div className="space-y-2">
          {visibleVariables.map((variable) => (
            <div key={variable.name} className="space-y-2">
              <label
                htmlFor={`var-${variable.name}`}
                className="text-sm font-medium text-foreground"
              >
                {variable.name}:
              </label>

              {variable.type === "text" && (
                <Textarea
                  id={`var-${variable.name}`}
                  value={values[variable.name] || ""}
                  onChange={(e) =>
                    handleValueChange(variable.name, e.target.value)
                  }
                  placeholder={i18n.t("placeholders.enterValue")}
                  rows={4}
                  className="max-h-60 break-all"
                />
              )}

              {variable.type === "select" && variable.selectOptions && (
                <SelectField
                  options={variable.selectOptions.options.map((opt) => ({
                    label: opt,
                    value: opt,
                  }))}
                  name={variable.name}
                  value={values[variable.name]}
                  onValueChange={handleValueChange}
                />
              )}

              {variable.type === "preset" &&
                (() => {
                  const preset = presets.get(variable.name)
                  if (!preset) {
                    return (
                      <div className="text-sm text-muted-foreground">
                        {i18n.t("variablePresets.importWarning.missingPresets")}
                      </div>
                    )
                  }

                  // Text preset type
                  if (preset.type === "text") {
                    return (
                      <Textarea
                        id={`var-${variable.name}`}
                        value={values[variable.name] || ""}
                        onChange={(e) =>
                          handleValueChange(variable.name, e.target.value)
                        }
                        placeholder={i18n.t("placeholders.enterValue")}
                        rows={4}
                        className="max-h-60 break-all"
                      />
                    )
                  }

                  // Select preset type
                  if (preset.type === "select" && preset.selectOptions) {
                    return (
                      <SelectField
                        options={preset.selectOptions.map((opt) => ({
                          label: opt,
                          value: opt,
                        }))}
                        name={variable.name}
                        value={values[variable.name]}
                        onValueChange={handleValueChange}
                      />
                    )
                  }

                  // Dictionary preset type
                  if (preset.type === "dictionary" && preset.dictionaryItems) {
                    const selectedItem = selectedDictItems.get(variable.name)
                    return (
                      <div className="space-y-2">
                        <SelectField
                          options={preset.dictionaryItems.map((item) => ({
                            label: item.name,
                            value: item.name,
                          }))}
                          name={variable.name}
                          value={selectedItem?.name || ""}
                          onValueChange={(_, itemName) =>
                            handleDictionaryItemChange(variable.name, itemName)
                          }
                        />
                        {selectedItem && (
                          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 max-h-32 overflow-y-auto">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              {i18n.t("dialogs.variables.preview")}:
                            </div>
                            <pre className="text-xs text-neutral-800 whitespace-pre-wrap break-all">
                              {selectedItem.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    )
                  }

                  return null
                })()}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            className="group gap-1 pr-2"
            onClick={handleSubmit}
            data-testid={TestIds.variableInputDialog.submit}
          >
            {i18n.t("common.execute") || "Execute"}
            <Key className="text-neutral-200 bg-white/20 border border-neutral-200/20 ml-1">
              <span className="group-focus:hidden">
                {isMac() ? "⌘ +" : "Ctrl +"}
              </span>
              <CornerDownLeft className="inline size-3 ml-1 group-focus:ml-0" />
            </Key>
            <span className="hidden group-focus:inline text-neutral-300">
              /
            </span>
            <Key className="text-neutral-200 bg-white/20 border border-neutral-200/20 hidden group-focus:inline">
              <span className="">Tab</span>
            </Key>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
