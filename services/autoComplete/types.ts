export interface AutoCompleteMatch {
  name: string
  content: string
  matchStart: number
  matchEnd: number
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
}
