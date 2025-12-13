import { useEffect, useState, useCallback, useRef } from "react"
import { Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  VariablePreset,
  PresetVariableType,
  DictionaryItem,
} from "@/types/prompt"
import { useContainer } from "@/hooks/useContainer"
import { i18n } from "#imports"

/**
 * Props for VariablePresetEditor
 */
interface VariablePresetEditorProps {
  preset: VariablePreset | null
  onChange: (preset: VariablePreset) => void
  onDuplicate: () => void
  onDelete: () => void
}

/**
 * Variable Preset Editor Component
 * Displays editing form for a single variable preset
 */
export const VariablePresetEditor: React.FC<VariablePresetEditorProps> = ({
  preset,
  onChange,
  onDuplicate,
  onDelete,
}) => {
  const [localPreset, setLocalPreset] = useState<VariablePreset | null>(preset)
  const { container } = useContainer()
  const selectOptionsRef = useRef<HTMLInputElement>(null)

  // Update local state when preset prop changes
  useEffect(() => {
    setLocalPreset(preset)
    if (selectOptionsRef.current && preset?.type === "select") {
      selectOptionsRef.current.value = preset.selectOptions
        ? preset.selectOptions.join(", ")
        : ""
    }
  }, [preset])

  /**
   * Handle field change with debounce
   */
  const handleFieldChange = useCallback(
    <K extends keyof VariablePreset>(field: K, value: VariablePreset[K]) => {
      if (!localPreset) return

      const updatedPreset = {
        ...localPreset,
        [field]: value,
      }
      setLocalPreset(updatedPreset)
      onChange(updatedPreset)
    },
    [localPreset, onChange],
  )

  /**
   * Handle type change
   */
  const handleTypeChange = (type: PresetVariableType) => {
    handleFieldChange("type", type)
  }

  /**
   * Handle options change (for select type)
   */
  const handleSelectOptionsChange = (value: string) => {
    // Parse comma-separated options
    const options = value
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0)

    // Unique options
    const uniqueOptions = Array.from(new Set(options))

    handleFieldChange("selectOptions", uniqueOptions)
  }

  /**
   * Handle dictionary item change
   */
  const handleDictionaryItemChange = (
    index: number,
    field: keyof DictionaryItem,
    value: string,
  ) => {
    if (!localPreset?.dictionaryItems) return

    const updatedItems = [...localPreset.dictionaryItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }
    handleFieldChange("dictionaryItems", updatedItems)
  }

  /**
   * Add new dictionary item
   */
  const handleAddDictionaryItem = () => {
    if (!localPreset) return

    const newItem: DictionaryItem = {
      id: crypto.randomUUID(),
      name: "",
      content: "",
    }
    const updatedItems = [...(localPreset.dictionaryItems || []), newItem]
    handleFieldChange("dictionaryItems", updatedItems)
  }

  /**
   * Delete dictionary item
   */
  const handleDeleteDictionaryItem = (index: number) => {
    if (!localPreset?.dictionaryItems) return

    const updatedItems = localPreset.dictionaryItems.filter(
      (_, i) => i !== index,
    )
    handleFieldChange("dictionaryItems", updatedItems)
  }

  if (!localPreset) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {i18n.t("variablePresets.selectPreset")}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col min-h-0 pl-4">
      {/* Header with actions */}
      <div className="mb-4 flex items-center justify-between pl-1 pr-6">
        <h3 className="text-lg font-semibold">{i18n.t("common.edit")}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="size-4 mr-1" />
            {i18n.t("variablePresets.duplicate")}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="size-4 mr-1" />
            {i18n.t("variablePresets.delete")}
          </Button>
        </div>
      </div>

      {/* Form fields */}
      <ScrollArea className="overflow-hidden">
        <div className="space-y-4 pl-1 pr-6 py-1">
          {/* Preset Name */}
          <Field className="flex-1">
            <FieldLabel htmlFor="preset-name">
              {i18n.t("variablePresets.name")}
            </FieldLabel>
            <FieldDescription>
              {i18n.t("variablePresets.nameDescription")}
            </FieldDescription>
            <div className="relative">
              <Input
                id="preset-name"
                value={localPreset.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder={i18n.t("variablePresets.enterName")}
                maxLength={40}
                minLength={1}
                required
              />
              <span className="absolute text-xs text-muted-foreground right-3 -top-5">
                {i18n.t("common.characterCount", [
                  40 - localPreset.name.length,
                ])}
              </span>
            </div>
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel htmlFor="preset-description">
              {i18n.t("variablePresets.description_label")}
            </FieldLabel>
            <FieldDescription>
              {i18n.t("variablePresets.description_description")}
            </FieldDescription>
            <div className="relative">
              <Input
                id="preset-description"
                value={localPreset.description || ""}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                placeholder={i18n.t("variablePresets.enterDescription")}
                maxLength={80}
              />
              <span className="absolute text-xs text-muted-foreground right-3 -top-5">
                {i18n.t("common.characterCount", [
                  80 - (localPreset.description?.length ?? 0),
                ])}
              </span>
            </div>
          </Field>

          {/* Preset Type */}
          <Field className="w-48">
            <FieldLabel htmlFor="preset-type">
              {i18n.t("variablePresets.type")}
            </FieldLabel>
            <FieldDescription>
              {i18n.t("variablePresets.presetTypeDescription")}
            </FieldDescription>
            <Select value={localPreset.type} onValueChange={handleTypeChange}>
              <SelectTrigger id="preset-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={container}>
                <SelectItem value="text">
                  {i18n.t("variableTypes.text")}
                </SelectItem>
                <SelectItem value="select">
                  {i18n.t("variableTypes.select")}
                </SelectItem>
                <SelectItem value="dictionary">
                  {i18n.t("variableTypes.dictionary")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Type-specific fields */}
          {localPreset.type === "text" && (
            <Field>
              <FieldLabel htmlFor="text-content">
                {i18n.t("variablePresets.textContent")}
              </FieldLabel>
              <FieldDescription>
                {i18n.t("variablePresets.textContentDescription")}
              </FieldDescription>
              <Textarea
                id="text-content"
                value={localPreset.textContent || ""}
                onChange={(e) =>
                  handleFieldChange("textContent", e.target.value)
                }
                placeholder={i18n.t("variablePresets.enterTextContent")}
                rows={6}
              />
            </Field>
          )}

          {localPreset.type === "select" && (
            <Field>
              <FieldLabel htmlFor="select-options">
                {i18n.t("variablePresets.selectOptions")}
              </FieldLabel>
              <FieldDescription>
                {i18n.t("variablePresets.selectOptionsDescription")}
              </FieldDescription>
              <Input
                id="select-options"
                defaultValue={localPreset.selectOptions?.join(", ") || ""}
                onBlur={(e) => handleSelectOptionsChange(e.target.value)}
                placeholder={i18n.t("variablePresets.enterSelectOptions")}
                ref={selectOptionsRef}
              />
            </Field>
          )}

          {localPreset.type === "dictionary" && (
            <Field>
              <FieldLabel>
                {i18n.t("variablePresets.dictionaryItems")}
              </FieldLabel>
              <div className="space-y-3">
                {localPreset.dictionaryItems?.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-md border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          handleDictionaryItemChange(
                            index,
                            "name",
                            e.target.value,
                          )
                        }
                        placeholder={i18n.t("variablePresets.enterItemName")}
                        className="flex-1 mr-2"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDictionaryItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={item.content}
                      onChange={(e) =>
                        handleDictionaryItemChange(
                          index,
                          "content",
                          e.target.value,
                        )
                      }
                      placeholder={i18n.t("variablePresets.enterItemContent")}
                      rows={3}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDictionaryItem}
                  className="w-full"
                >
                  {i18n.t("variablePresets.addItem")}
                </Button>
              </div>
            </Field>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
