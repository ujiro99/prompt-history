import { useEffect, useState, useCallback, useRef } from "react"
import { Plus, Copy, Trash, MoveUp, MoveDown } from "lucide-react"
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
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from "@/components/ui/field"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"
import { RemoveDialog } from "@/components/inputMenu/controller/RemoveDialog"
import type {
  VariablePreset,
  PresetVariableType,
  DictionaryItem,
} from "@/types/prompt"
import { cn } from "@/lib/utils"
import { movePrev, moveNext } from "@/utils/array"
import { useContainer } from "@/hooks/useContainer"
import { i18n } from "#imports"
import { validateField, type FieldErrors } from "@/schemas/variablePreset"

/**
 * Props for VariablePresetEditor
 */
interface VariablePresetEditorProps {
  preset: VariablePreset | null
  allPresets: VariablePreset[]
  onChange: (preset: VariablePreset) => void
  onDuplicate: () => void
  onDelete: () => void
  onValidationChange?: (hasErrors: boolean) => void
}

/**
 * Variable Preset Editor Component
 * Displays editing form for a single variable preset
 */
export const VariablePresetEditor: React.FC<VariablePresetEditorProps> = ({
  preset,
  allPresets,
  onChange,
  onDuplicate,
  onDelete,
  onValidationChange,
}) => {
  const [localPreset, setLocalPreset] = useState<VariablePreset | null>(preset)
  const { container } = useContainer()
  const selectOptionsRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Validation errors
  const [errors, setErrors] = useState<FieldErrors>({})

  // For remove dialog
  const [removeDictionaryItemIdx, setRemoveDictionaryItemIdx] = useState<
    number | null
  >(null)

  // Update local state when preset prop changes
  useEffect(() => {
    setLocalPreset((prev) => {
      if (prev?.id !== preset?.id) {
        // Clear errors when preset changes
        setErrors({})
      }
      return preset
    })
    if (selectOptionsRef.current && preset?.type === "select") {
      selectOptionsRef.current.value = preset.selectOptions
        ? preset.selectOptions.join(", ")
        : ""
    }
  }, [preset])

  // Notify parent of validation state changes
  useEffect(() => {
    if (!localPreset) {
      onValidationChange?.(false)
      return
    }

    const hasErrors = Object.keys(errors).length > 0
    onValidationChange?.(hasErrors)
  }, [errors, localPreset, onValidationChange])

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

    // Clear type-specific errors when type changes
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.textContent
      delete newErrors.selectOptions
      delete newErrors.dictionaryItems
      // Clear dictionary item errors
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("dictionaryItems.")) {
          delete newErrors[key]
        }
      })
      return newErrors
    })
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

    const uniqueOptions = Array.from(new Set(options))

    // Update options
    handleFieldChange("selectOptions", uniqueOptions)

    // Validate after updating selectOptions
    const error = validateField(
      { ...localPreset, selectOptions: uniqueOptions },
      "selectOptions",
    )
    setErrors((prev) => {
      const next = { ...prev }
      if (error) {
        next.selectOptions = error
      } else {
        delete next.selectOptions
      }
      return next
    })
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
    // Scroll to bottom to show new item
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        })
      }
    }, 100)
  }

  /**
   * Move dictionary item
   */
  const handleMoveUpDictionaryItem = (index: number) => {
    if (!localPreset?.dictionaryItems) return
    const updatedItems = movePrev(localPreset.dictionaryItems, index)
    handleFieldChange("dictionaryItems", updatedItems)
  }

  const handleMoveDownDictionaryItem = (index: number) => {
    if (!localPreset?.dictionaryItems) return
    const updatedItems = moveNext(localPreset.dictionaryItems, index)
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

    // Re-index dictionary item errors after deletion
    setErrors((prev) => {
      const newErrors = { ...prev }

      // Remove errors for deleted item
      delete newErrors[`dictionaryItems.${index}.name`]
      delete newErrors[`dictionaryItems.${index}.content`]

      // Re-index errors for items after the deleted one
      const reindexedErrors: FieldErrors = {}
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("dictionaryItems.")) {
          const match = key.match(/dictionaryItems\.(\d+)\.(.+)/)
          if (match) {
            const errorIndex = parseInt(match[1], 10)
            const field = match[2]
            if (errorIndex > index) {
              // Shift index down by 1
              reindexedErrors[`dictionaryItems.${errorIndex - 1}.${field}`] =
                newErrors[key]
            } else if (errorIndex < index) {
              // Keep the same index
              reindexedErrors[key] = newErrors[key]
            }
          }
        } else {
          // Keep non-dictionary errors as-is
          reindexedErrors[key] = newErrors[key]
        }
      })

      return reindexedErrors
    })
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
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="group"
          >
            <Copy
              className={cn(
                "size-4 stroke-neutral-600 transition",
                "group-hover:scale-110 group-hover:stroke-green-500",
              )}
            />
            {i18n.t("variablePresets.duplicate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="group"
          >
            <Trash
              className={cn(
                "size-4 stroke-neutral-600 transition",
                "group-hover:scale-110 group-hover:stroke-red-500",
              )}
            />

            {i18n.t("variablePresets.delete")}
          </Button>
        </div>
      </div>

      {/* Form fields */}
      <ScrollAreaWithGradient
        rootClassName="min-h-0"
        indicatorVisible={false}
        ref={scrollAreaRef}
      >
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
                onChange={(e) => {
                  handleFieldChange("name", e.target.value)
                  // Clear error if user is typing and field was invalid
                  if (errors.name) {
                    const error = validateField(
                      { ...localPreset, name: e.target.value },
                      "name",
                      allPresets,
                    )
                    if (!error) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.name
                        return next
                      })
                    }
                  }
                }}
                onBlur={(e) => {
                  const error = validateField(
                    { ...localPreset, name: e.target.value },
                    "name",
                    allPresets,
                  )
                  setErrors((prev) => {
                    const next = { ...prev }
                    if (error) {
                      next.name = error
                    } else {
                      delete next.name
                    }
                    return next
                  })
                }}
                placeholder={i18n.t("variablePresets.enterName")}
                maxLength={40}
                minLength={1}
                required
                className={cn(errors.name && "border-destructive")}
              />
              <span className="absolute text-xs text-muted-foreground right-3 -top-5">
                {i18n.t("common.characterCount", [
                  40 - localPreset.name.length,
                ])}
              </span>
            </div>
            <FieldError errors={[{ message: errors.name }]} />
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
                onChange={(e) => {
                  handleFieldChange("description", e.target.value)
                  // Clear error if user is typing and field was invalid
                  if (errors.description) {
                    const error = validateField(
                      { ...localPreset, description: e.target.value },
                      "description",
                      allPresets,
                    )
                    if (!error) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.description
                        return next
                      })
                    }
                  }
                }}
                onBlur={(e) => {
                  const error = validateField(
                    { ...localPreset, description: e.target.value },
                    "description",
                    allPresets,
                  )
                  setErrors((prev) => {
                    const next = { ...prev }
                    if (error) {
                      next.description = error
                    } else {
                      delete next.description
                    }
                    return next
                  })
                }}
                placeholder={i18n.t("variablePresets.enterDescription")}
                maxLength={80}
                className={cn(errors.description && "border-destructive")}
              />
              <span className="absolute text-xs text-muted-foreground right-3 -top-5">
                {i18n.t("common.characterCount", [
                  80 - (localPreset.description?.length ?? 0),
                ])}
              </span>
            </div>
            <FieldError errors={[{ message: errors.description }]} />
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
                className={cn(errors.selectOptions && "border-destructive")}
              />
              <FieldError errors={[{ message: errors.selectOptions }]} />
            </Field>
          )}

          {localPreset.type === "dictionary" && (
            <FieldGroup>
              <FieldLabel>
                {i18n.t("variablePresets.dictionaryItems")}
              </FieldLabel>
              <div>
                {localPreset.dictionaryItems?.map((item, index) => (
                  <div
                    key={item.id}
                    className="space-y-2 first:border-t-1 border-b-1 pl-3 pr-2 py-4 bg-muted/30"
                  >
                    <Field className="flex flex-row gap-1">
                      <FieldLabel
                        htmlFor={`dictionary-item-name-${index}`}
                        className="w-1/6! text-xs text-muted-foreground font-medium"
                      >
                        {i18n.t("variablePresets.itemName")}
                      </FieldLabel>
                      <div className="relative flex-1">
                        <div>
                          <Input
                            id={`dictionary-item-name-${index}`}
                            value={item.name}
                            onChange={(e) => {
                              handleDictionaryItemChange(
                                index,
                                "name",
                                e.target.value,
                              )
                              // Clear error if user is typing and field was invalid
                              const errorKey = `dictionaryItems.${index}.name`
                              if (errors[errorKey]) {
                                const error = validateField(
                                  localPreset,
                                  errorKey,
                                  allPresets,
                                )
                                if (!error) {
                                  setErrors((prev) => {
                                    const next = { ...prev }
                                    delete next[errorKey]
                                    return next
                                  })
                                }
                              }
                            }}
                            onBlur={() => {
                              const errorKey = `dictionaryItems.${index}.name`
                              const error = validateField(localPreset, errorKey, allPresets)
                              setErrors((prev) => {
                                const next = { ...prev }
                                if (error) {
                                  next[errorKey] = error
                                } else {
                                  delete next[errorKey]
                                }
                                return next
                              })
                            }}
                            maxLength={20}
                            placeholder={i18n.t(
                              "variablePresets.enterItemName",
                            )}
                            className={cn(
                              "bg-white w-full",
                              errors[`dictionaryItems.${index}.name`] &&
                                "border-destructive",
                            )}
                          />
                          <span className="absolute text-xs text-muted-foreground/80 right-2 top-2.5">
                            {i18n.t("common.characterCount", [
                              20 - item.name.length,
                            ])}
                          </span>
                        </div>
                        {errors[`dictionaryItems.${index}.name`] && (
                          <FieldError
                            errors={[
                              {
                                message:
                                  errors[`dictionaryItems.${index}.name`],
                              },
                            ]}
                          />
                        )}
                      </div>
                      <DictionaryItemController
                        index={index}
                        className="w-fit! mr-1"
                        onMoveUp={handleMoveUpDictionaryItem}
                        onMoveDown={handleMoveDownDictionaryItem}
                        onDelete={(idx) => setRemoveDictionaryItemIdx(idx)}
                      />
                    </Field>
                    <Field className="flex flex-row gap-1">
                      <FieldLabel
                        htmlFor={`dictionary-item-content-${index}`}
                        className="w-1/6! text-xs text-muted-foreground font-medium"
                      >
                        {i18n.t("variablePresets.itemContent")}
                      </FieldLabel>
                      <div className="flex-1">
                        <Textarea
                          id={`dictionary-item-content-${index}`}
                          value={item.content}
                          onChange={(e) => {
                            handleDictionaryItemChange(
                              index,
                              "content",
                              e.target.value,
                            )
                            // Clear error if user is typing and field was invalid
                            const errorKey = `dictionaryItems.${index}.content`
                            if (errors[errorKey]) {
                              const error = validateField(localPreset, errorKey, allPresets)
                              if (!error) {
                                setErrors((prev) => {
                                  const next = { ...prev }
                                  delete next[errorKey]
                                  return next
                                })
                              }
                            }
                          }}
                          onBlur={() => {
                            const errorKey = `dictionaryItems.${index}.content`
                            const error = validateField(localPreset, errorKey, allPresets)
                            setErrors((prev) => {
                              const next = { ...prev }
                              if (error) {
                                next[errorKey] = error
                              } else {
                                delete next[errorKey]
                              }
                              return next
                            })
                          }}
                          placeholder={i18n.t(
                            "variablePresets.enterItemContent",
                          )}
                          rows={1}
                          className={cn(
                            "py-1.5 min-h-9 max-h-40 break-all bg-white",
                            errors[`dictionaryItems.${index}.content`] &&
                              "border-destructive",
                          )}
                        />
                        {errors[`dictionaryItems.${index}.content`] && (
                          <FieldError
                            errors={[
                              {
                                message:
                                  errors[`dictionaryItems.${index}.content`],
                              },
                            ]}
                          />
                        )}
                      </div>
                    </Field>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDictionaryItem}
                  className="w-full group mt-3 mb-1"
                >
                  <Plus
                    className={cn(
                      "size-4 transition",
                      "group-hover:scale-120 group-hover:stroke-blue-500",
                    )}
                  />
                  {i18n.t("variablePresets.addItem")}
                </Button>
              </div>
            </FieldGroup>
          )}
        </div>
      </ScrollAreaWithGradient>

      {/* Remove Preset Dialog */}
      <RemoveDialog
        open={removeDictionaryItemIdx !== null}
        onOpenChange={(val) =>
          setRemoveDictionaryItemIdx(val ? removeDictionaryItemIdx : null)
        }
        title={i18n.t("variablePresets.dictionalyItem.deleteConfirm.title")}
        description={i18n.t(
          "variablePresets.dictionalyItem.deleteConfirm.message",
        )}
        onRemove={() => handleDeleteDictionaryItem(removeDictionaryItemIdx!)}
      >
        {localPreset.dictionaryItems && removeDictionaryItemIdx !== null && (
          <span className="text-base break-all text-center">
            {localPreset.dictionaryItems[removeDictionaryItemIdx].name}
          </span>
        )}
      </RemoveDialog>
    </div>
  )
}

const DictionaryItemController: React.FC<{
  index: number
  className?: string
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
}> = ({ index, className, onMoveUp, onMoveDown, onDelete }) => {
  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onMoveUp.bind(null, index)}
        className="size-7 p-1.5 group hover:bg-neutral-200/80 transition"
      >
        <MoveUp
          className={cn(
            "size-4 stroke-neutral-500 transition",
            "group-hover:scale-120",
          )}
        />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onMoveDown.bind(null, index)}
        className="size-7 p-1.5 group hover:bg-neutral-200/80 transition"
      >
        <MoveDown
          className={cn(
            "size-4 stroke-neutral-500 transition",
            "group-hover:scale-120",
          )}
        />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete.bind(null, index)}
        className="size-7 p-1.5 group hover:bg-neutral-200/80 transition"
      >
        <Trash
          className={cn(
            "size-4 stroke-neutral-500 transition",
            "group-hover:scale-120 group-hover:stroke-red-500 group-hover:fill-red-200",
          )}
        />
      </Button>
    </div>
  )
}
