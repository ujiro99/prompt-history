import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { usePresetValidation } from "../usePresetValidation"
import type { VariablePreset } from "@/types/prompt"

// Mock validation schema
vi.mock("@/schemas/variablePreset", () => ({
  validateField: vi.fn((preset, fieldKey, allPresets) => {
    // Empty name error
    if (fieldKey === "name" && (!preset?.name || preset.name === "")) {
      return "変数名は必須です"
    }

    // Duplicate name error
    if (
      fieldKey === "name" &&
      preset?.name &&
      allPresets?.some(
        (p: VariablePreset) => p.id !== preset.id && p.name === preset.name,
      )
    ) {
      return "この変数名は既に使用されています"
    }

    // Dictionary item name errors
    if (fieldKey.startsWith("dictionaryItems.") && fieldKey.endsWith(".name")) {
      const match = fieldKey.match(/dictionaryItems\.(\d+)\.name/)
      if (match) {
        const index = parseInt(match[1], 10)
        const item = preset?.dictionaryItems?.[index]

        if (!item?.name || item.name === "") {
          return "項目名は必須です"
        }

        // Check for duplicate within the same preset
        const isDuplicate = preset?.dictionaryItems?.some(
          (otherItem: any, otherIndex: number) =>
            otherIndex !== index && otherItem.name === item.name,
        )
        if (isDuplicate) {
          return "この項目名は既に使用されています"
        }
      }
    }

    // Dictionary item content errors
    if (
      fieldKey.startsWith("dictionaryItems.") &&
      fieldKey.endsWith(".content")
    ) {
      const match = fieldKey.match(/dictionaryItems\.(\d+)\.content/)
      if (match) {
        const index = parseInt(match[1], 10)
        const item = preset?.dictionaryItems?.[index]

        if (!item?.content || item.content === "") {
          return "項目内容は必須です"
        }
      }
    }

    return null
  }),
}))

describe("usePresetValidation", () => {
  const createMockPreset = (
    overrides: Partial<VariablePreset> = {},
  ): VariablePreset => ({
    id: "preset-1",
    name: "Test Preset",
    type: "text",
    description: "Test description",
    textContent: "Test content",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe("initialization", () => {
    it("should initialize with empty errors", () => {
      const preset = createMockPreset()
      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      expect(result.current.errors).toEqual({})
      expect(result.current.hasErrors).toBe(false)
    })

    it("should clear errors when preset changes", () => {
      const preset1 = createMockPreset({ id: "preset-1" })
      const preset2 = createMockPreset({ id: "preset-2" })

      const { result, rerender } = renderHook(
        ({ preset, allPresets }) => usePresetValidation(preset, allPresets),
        {
          initialProps: { preset: preset1, allPresets: [preset1, preset2] },
        },
      )

      // Set an error manually
      act(() => {
        result.current.setErrors({ name: "Error" })
      })

      expect(result.current.errors).toEqual({ name: "Error" })

      // Change preset
      rerender({ preset: preset2, allPresets: [preset1, preset2] })

      // Errors should be cleared
      expect(result.current.errors).toEqual({})
    })
  })

  describe("onValidationChange callback", () => {
    it("should call onValidationChange when errors change", () => {
      const preset = createMockPreset()
      const onValidationChange = vi.fn()

      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset], onValidationChange),
      )

      // Initially no errors
      expect(onValidationChange).toHaveBeenCalledWith(false)

      // Add an error
      act(() => {
        result.current.setErrors({ name: "Error" })
      })

      // Should be called with true
      expect(onValidationChange).toHaveBeenCalledWith(true)
    })

    it("should not call onValidationChange when preset is null", () => {
      const onValidationChange = vi.fn()

      renderHook(() => usePresetValidation(null, [], onValidationChange))

      // Should be called with false
      expect(onValidationChange).toHaveBeenCalledWith(false)
    })
  })

  describe("createFieldHandler", () => {
    it("should return a field handler with onChange, onBlur, and error", () => {
      const preset = createMockPreset()
      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      const handler = result.current.createFieldHandler("name")

      expect(handler).toHaveProperty("onChange")
      expect(handler).toHaveProperty("onBlur")
      expect(handler).toHaveProperty("error")
      expect(typeof handler.onChange).toBe("function")
      expect(typeof handler.onBlur).toBe("function")
    })

    it("should set error on blur when field is invalid", () => {
      const preset = createMockPreset({ name: "" }) // Empty name is invalid
      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      const handler = result.current.createFieldHandler("name")

      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors.name).toBeDefined()
      expect(result.current.hasErrors).toBe(true)
    })

    it("should clear error on blur when field becomes valid", () => {
      const preset = createMockPreset({ name: "Valid Name" })
      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      // Set an error manually
      act(() => {
        result.current.setErrors({ name: "Error" })
      })

      const handler = result.current.createFieldHandler("name")

      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors.name).toBeUndefined()
      expect(result.current.hasErrors).toBe(false)
    })

    it("should only validate on change if there is an existing error", () => {
      const preset = createMockPreset({ name: "" }) // Start with empty name
      const { result, rerender } = renderHook(
        ({ preset, allPresets }) => usePresetValidation(preset, allPresets),
        {
          initialProps: { preset, allPresets: [preset] },
        },
      )

      const handler = result.current.createFieldHandler("name")

      // No existing error, onChange should not add error
      act(() => {
        handler.onChange("")
      })

      expect(result.current.errors.name).toBeUndefined()

      // Set an error via onBlur
      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors.name).toBeDefined()

      // Update preset to have a valid name
      const updatedPreset = createMockPreset({ name: "Valid Name" })
      rerender({ preset: updatedPreset, allPresets: [updatedPreset] })

      // Get new handler after rerender
      const newHandler = result.current.createFieldHandler("name")

      // Now onChange should clear the error
      act(() => {
        newHandler.onChange("Valid Name")
      })

      expect(result.current.errors.name).toBeUndefined()
    })
  })

  describe("duplicate name validation", () => {
    it("should detect duplicate preset names", () => {
      const preset1 = createMockPreset({ id: "preset-1", name: "Duplicate" })
      const preset2 = createMockPreset({ id: "preset-2", name: "Duplicate" })

      const { result } = renderHook(() =>
        usePresetValidation(preset1, [preset1, preset2]),
      )

      const handler = result.current.createFieldHandler("name")

      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors.name).toBeDefined()
      expect(result.current.errors.name).toContain("使用されています") // Japanese error message
    })

    it("should not detect duplicate when comparing with itself", () => {
      const preset = createMockPreset({ name: "Unique Name" })

      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      const handler = result.current.createFieldHandler("name")

      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors.name).toBeUndefined()
    })
  })

  describe("dictionary item validation", () => {
    it("should detect duplicate dictionary item names", () => {
      const preset = createMockPreset({
        type: "dictionary",
        dictionaryItems: [
          { id: "item-1", name: "Duplicate", content: "Content 1" },
          { id: "item-2", name: "Duplicate", content: "Content 2" },
        ],
      })

      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      const handler = result.current.createFieldHandler("dictionaryItems.0.name")

      act(() => {
        handler.onBlur()
      })

      expect(result.current.errors["dictionaryItems.0.name"]).toBeDefined()
      expect(result.current.errors["dictionaryItems.0.name"]).toContain(
        "使用されています",
      ) // Japanese error message
    })

    it("should validate required fields in dictionary items", () => {
      const preset = createMockPreset({
        type: "dictionary",
        dictionaryItems: [{ id: "item-1", name: "", content: "" }],
      })

      const { result } = renderHook(() =>
        usePresetValidation(preset, [preset]),
      )

      const nameHandler = result.current.createFieldHandler(
        "dictionaryItems.0.name",
      )
      const contentHandler = result.current.createFieldHandler(
        "dictionaryItems.0.content",
      )

      act(() => {
        nameHandler.onBlur()
        contentHandler.onBlur()
      })

      expect(result.current.errors["dictionaryItems.0.name"]).toBeDefined()
      expect(result.current.errors["dictionaryItems.0.content"]).toBeDefined()
    })
  })
})
