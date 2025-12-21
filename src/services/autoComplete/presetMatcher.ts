import type { VariablePreset } from "@/types/prompt"
import type { AutoCompleteMatch } from "./types"

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
