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
  onExecute: (match: AutoCompleteMatch) => Promise<void>
  onSelectChange: (index: number) => void
}
