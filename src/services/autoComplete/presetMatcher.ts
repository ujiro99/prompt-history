import type { VariablePreset } from "@/types/prompt"
import type { AutoCompleteMatch } from "./types"

/**
 * Parse dot notation and extract preset name and item query.
 * Example: "role.customer" -> { presetName: "role", itemQuery: "customer" }
 *
 * @param searchTerm - The search term to parse
 * @returns Object with presetName and itemQuery, or null if not dot notation
 */
export function parseDotNotation(searchTerm: string): {
  presetName: string
  itemQuery: string
} | null {
  const dotIndex = searchTerm.indexOf(".")
  if (dotIndex === -1 || dotIndex === 0 || dotIndex === searchTerm.length - 1) {
    return null
  }

  const presetName = searchTerm.substring(0, dotIndex)
  const itemQuery = searchTerm.substring(dotIndex + 1)

  return {
    presetName,
    itemQuery,
  }
}

/**
 * Find matching variable presets based on search term.
 *
 * @param searchTerm - The search term to match against preset names
 * @param presets - List of available variable presets
 * @param maxMatches - Maximum number of matches to return
 * @returns List of autocomplete matches for presets
 */
export function matchPresets(
  searchTerm: string,
  presets: VariablePreset[],
  maxMatches: number,
): AutoCompleteMatch[] {
  if (!searchTerm || presets.length === 0) {
    return []
  }

  const lowerSearchTerm = searchTerm.toLowerCase()

  // Filter presets by case-insensitive partial match
  const matches = presets
    .filter((preset) => preset.name.toLowerCase().includes(lowerSearchTerm))
    .slice(0, maxMatches)
    .map((preset) => {
      // Determine content based on preset type
      let content = ""
      switch (preset.type) {
        case "text":
          content = preset.textContent || ""
          break
        case "select":
          content = preset.selectOptions?.join(", ") || ""
          break
        case "dictionary":
          content = preset.dictionaryItems?.map((item) => item.name).join(", ") || ""
          break
      }

      return {
        id: preset.id,
        name: preset.name,
        content,
        isPinned: false,
        matchStart: 0,
        matchEnd: searchTerm.length,
        newlineCount: 0,
        searchTerm,
        matchType: "preset" as const,
        presetType: preset.type,
      }
    })

  return matches
}

/**
 * Find matching preset items using dot notation.
 * Example: "role.customer" will match items in the "role" preset
 *
 * @param searchTerm - The search term in dot notation
 * @param presets - List of available variable presets
 * @param maxMatches - Maximum number of matches to return
 * @returns List of autocomplete matches for preset items
 */
export function matchPresetItems(
  searchTerm: string,
  presets: VariablePreset[],
  maxMatches: number,
): AutoCompleteMatch[] {
  const parsed = parseDotNotation(searchTerm)
  if (!parsed) {
    return []
  }

  const { presetName, itemQuery } = parsed
  const lowerPresetName = presetName.toLowerCase()
  const lowerItemQuery = itemQuery.toLowerCase()

  // Find the preset by name
  const preset = presets.find(
    (p) => p.name.toLowerCase() === lowerPresetName,
  )

  if (!preset) {
    return []
  }

  // Handle different preset types
  if (preset.type === "dictionary" && preset.dictionaryItems) {
    // For dictionary type, match against item names
    const matches = preset.dictionaryItems
      .filter((item) => item.name.toLowerCase().includes(lowerItemQuery))
      .slice(0, maxMatches)
      .map((item) => ({
        id: item.id,
        name: item.name,
        content: item.content,
        isPinned: false,
        matchStart: 0,
        matchEnd: searchTerm.length,
        newlineCount: 0,
        searchTerm,
        matchType: "preset-item" as const,
        presetType: preset.type,
        parentPresetId: preset.id,
      }))

    return matches
  }

  if (preset.type === "select" && preset.selectOptions) {
    // For select type, match against options
    const matches = preset.selectOptions
      .filter((option) => option.toLowerCase().includes(lowerItemQuery))
      .slice(0, maxMatches)
      .map((option, index) => ({
        id: `${preset.id}-option-${index}`,
        name: option,
        content: option,
        isPinned: false,
        matchStart: 0,
        matchEnd: searchTerm.length,
        newlineCount: 0,
        searchTerm,
        matchType: "preset-item" as const,
        presetType: preset.type,
        parentPresetId: preset.id,
      }))

    return matches
  }

  // For text type, no items to match
  return []
}
