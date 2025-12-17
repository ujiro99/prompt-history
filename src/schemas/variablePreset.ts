import { z } from "zod"
import type { VariablePreset, DictionaryItem } from "@/types/prompt"
import { i18n } from "#imports"

/**
 * Dictionary item schema for dictionary-type presets
 */
const dictionaryItemSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, { message: i18n.t("variablePresets.errors.itemNameRequired") })
    .max(20, { message: i18n.t("variablePresets.errors.itemNameMaxLength") }),
  content: z
    .string()
    .min(1, { message: i18n.t("variablePresets.errors.itemContentRequired") }),
})

/**
 * Base fields common to all preset types
 */
const baseFieldsSchema = z.object({
  name: z
    .string()
    .min(1, { message: i18n.t("variablePresets.errors.nameRequired") })
    .max(40, { message: i18n.t("variablePresets.errors.nameMaxLength") }),
  description: z
    .string()
    .max(80, {
      message: i18n.t("variablePresets.errors.descriptionMaxLength"),
    })
    .optional(),
})

/**
 * Variable preset schema with discriminated union for type-specific validation
 */
export const variablePresetSchema = z.discriminatedUnion("type", [
  // Text type: textContent is optional
  z.object({
    ...baseFieldsSchema.shape,
    type: z.literal("text"),
    textContent: z.string().optional(),
  }),

  // Select type: at least one option required
  z.object({
    ...baseFieldsSchema.shape,
    type: z.literal("select"),
    selectOptions: z
      .array(z.string())
      .min(1, {
        message: i18n.t("variablePresets.errors.selectOptionsRequired"),
      })
      .optional(),
  }),

  // Dictionary type: at least one item required
  z.object({
    ...baseFieldsSchema.shape,
    type: z.literal("dictionary"),
    dictionaryItems: z
      .array(dictionaryItemSchema)
      .min(1, {
        message: i18n.t("variablePresets.errors.dictionaryItemsRequired"),
      })
      .optional(),
  }),
])

/**
 * Type exports for TypeScript
 */
export type VariablePresetSchema = z.infer<typeof variablePresetSchema>
export type DictionaryItemSchema = z.infer<typeof dictionaryItemSchema>

/**
 * Field errors type
 */
export interface FieldErrors {
  name?: string
  description?: string
  textContent?: string
  selectOptions?: string
  dictionaryItems?: string
  [key: string]: string | undefined
}

/**
 * Validate a specific field of the preset
 * Used for onBlur validation
 *
 * @param preset - Partial preset object
 * @param field - Field name to validate
 * @returns Error message or null if valid
 */
export const validateField = (
  preset: Partial<VariablePreset>,
  field: string,
): string | null => {
  try {
    switch (field) {
      case "name":
        baseFieldsSchema.shape.name.parse(preset.name)
        break

      case "description":
        if (preset.description !== undefined) {
          baseFieldsSchema.shape.description.parse(preset.description)
        }
        break

      case "textContent":
        // Text content is always valid (optional)
        break

      case "selectOptions":
        if (preset.type === "select") {
          // Validate only if selectOptions exists (for existing presets)
          if (preset.selectOptions !== undefined) {
            z.array(z.string())
              .min(1, {
                message: i18n.t("variablePresets.errors.selectOptionsRequired"),
              })
              .parse(preset.selectOptions)
          } else {
            // If selectOptions is undefined, require it
            return i18n.t("variablePresets.errors.selectOptionsRequired")
          }
        }
        break

      case "dictionaryItems":
        if (preset.type === "dictionary") {
          // Validate only if dictionaryItems exists
          if (preset.dictionaryItems !== undefined) {
            z.array(dictionaryItemSchema)
              .min(1, {
                message: i18n.t(
                  "variablePresets.errors.dictionaryItemsRequired",
                ),
              })
              .parse(preset.dictionaryItems)
          } else {
            // If dictionaryItems is undefined, require it
            return i18n.t("variablePresets.errors.dictionaryItemsRequired")
          }
        }
        break

      default:
        // For dictionary item fields like "dictionaryItems.0.name"
        if (field.startsWith("dictionaryItems.")) {
          const parts = field.split(".")
          if (parts.length === 3 && preset.dictionaryItems) {
            const index = parseInt(parts[1], 10)
            const itemField = parts[2]
            const item = preset.dictionaryItems[index]

            if (item) {
              if (itemField === "name") {
                dictionaryItemSchema.shape.name.parse(item.name)
              } else if (itemField === "content") {
                dictionaryItemSchema.shape.content.parse(item.content)
              }
            }
          }
        }
        break
    }
    return null
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || null
    }
    return null
  }
}

/**
 * Validate entire preset
 * Used for determining if Complete button should be disabled
 *
 * @param preset - Partial preset object
 * @returns Record of field errors
 */
export const validateVariablePreset = (
  preset: Partial<VariablePreset>,
): FieldErrors => {
  const errors: FieldErrors = {}

  // Validate base fields
  const nameError = validateField(preset, "name")
  if (nameError) errors.name = nameError

  const descError = validateField(preset, "description")
  if (descError) errors.description = descError

  // Validate type-specific fields
  if (preset.type === "select") {
    const selectError = validateField(preset, "selectOptions")
    if (selectError) errors.selectOptions = selectError
  } else if (preset.type === "dictionary") {
    const dictError = validateField(preset, "dictionaryItems")
    if (dictError) errors.dictionaryItems = dictError

    // Validate each dictionary item
    if (preset.dictionaryItems) {
      preset.dictionaryItems.forEach((item, index) => {
        const nameError = validateField(preset, `dictionaryItems.${index}.name`)
        if (nameError) errors[`dictionaryItems.${index}.name`] = nameError

        const contentError = validateField(
          preset,
          `dictionaryItems.${index}.content`,
        )
        if (contentError) errors[`dictionaryItems.${index}.content`] = contentError
      })
    }
  }

  return errors
}

/**
 * Validate a single dictionary item
 *
 * @param item - Partial dictionary item
 * @returns Record of field errors
 */
export const validateDictionaryItem = (
  item: Partial<DictionaryItem>,
): Record<string, string> => {
  const errors: Record<string, string> = {}

  try {
    dictionaryItemSchema.parse(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        const path = err.path.join(".")
        errors[path] = err.message
      })
    }
  }

  return errors
}
