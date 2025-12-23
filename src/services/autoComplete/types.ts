import type { PresetVariableType } from "@/types/prompt"

/**
 * Type of autocomplete match
 */
export type AutoCompleteMatchType = "prompt" | "preset"

export interface AutoCompleteMatch {
  // Prompt id
  id: string
  // Prompt name
  name: string
  // Content of prompt to insert when selected
  content: string
  /** Pin flag */
  isPinned: boolean
  // Indices of the match within the name
  matchStart: number
  matchEnd: number
  newlineCount: number
  // The term that was matched
  searchTerm: string
  /** Type of match */
  matchType: AutoCompleteMatchType
  /** Preset type (only for matchType "preset") */
  presetType?: PresetVariableType
}

export interface AutoCompleteOptions {
  maxMatches: number
  debounceMs: number
  minSearchLength: number
}

export interface AutoCompletePosition {
  x: number
  y: number
  height: number
}

export interface AutoCompleteCallbacks {
  onShow: () => void
  onHide: () => void
  /**
   * Execute callback for selected match
   * @returns Promise<boolean | void> - Return false to keep popup open, true or void to close popup
   */
  onExecute: (match: AutoCompleteMatch) => Promise<boolean | void>
  onSelectChange: (index: number) => void
}
