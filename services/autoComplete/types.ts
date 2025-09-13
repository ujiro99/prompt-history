export interface AutoCompleteMatch {
  // Prompt id
  id: string
  // Prompt name
  name: string
  // Content of prompt to insert when selected
  content: string
  // Indices of the match within the name
  matchStart: number
  matchEnd: number
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
}

export interface AutoCompleteCallbacks {
  onShow: () => void
  onHide: () => void
  onSelect: (match: AutoCompleteMatch) => Promise<void>
  onSelectChange: (index: number) => void
}
