import { getCaretPosition } from "../dom"
import type { Prompt } from "../../types/prompt"
import type {
  AutoCompleteMatch,
  AutoCompleteOptions,
  AutoCompletePosition,
  AutoCompleteCallbacks,
} from "./types"

export class AutoCompleteManager {
  private element: Element | null = null
  private prompts: Prompt[] = []
  private options: AutoCompleteOptions
  private callbacks: AutoCompleteCallbacks
  private debounceTimeout: number | null = null
  private isVisible = false
  private currentMatches: AutoCompleteMatch[] = []
  private selectedIndex = 0

  constructor(
    callbacks: AutoCompleteCallbacks,
    options: Partial<AutoCompleteOptions> = {},
  ) {
    this.callbacks = callbacks
    this.options = {
      maxMatches: 5,
      debounceMs: 200,
      minSearchLength: 3,
      ...options,
    }
  }

  /**
   * Set the target input element
   */
  setElement(element: Element | null): void {
    console.debug("Setting autocomplete element:", element)
    this.element = element
  }

  /**
   * Set available prompts for autocomplete
   */
  setPrompts(prompts: Prompt[]): void {
    this.prompts = prompts
  }

  /**
   * Handle content change in the input element
   */
  handleContentChange(content: string): void {
    // Clear existing timeout
    if (this.debounceTimeout !== null) {
      clearTimeout(this.debounceTimeout)
    }

    // Set new timeout for debouncing
    this.debounceTimeout = setTimeout(() => {
      this.analyzeInput(content)
      this.debounceTimeout = null
    }, this.options.debounceMs) as unknown as number
  }

  /**
   * Analyze input and show/hide autocomplete
   */
  private analyzeInput(content: string): void {
    console.debug("Analyzing input for autocomplete:", content)
    if (!this.element) {
      this.hide()
      return
    }

    const caretPos = getCaretPosition(this.element)
    const matches = this.findMatches(content, caretPos)

    if (matches.length > 0) {
      this.show(matches)
    } else {
      this.hide()
    }
  }

  /**
   * Find matching prompts based on input and caret position
   */
  private findMatches(input: string, caretPos: number): AutoCompleteMatch[] {
    // Get text before caret
    const textBeforeCaret = input.substring(0, caretPos)

    // Find word boundary using regex
    const wordMatch = textBeforeCaret.match(/(\S+)$/)
    if (!wordMatch) {
      return []
    }

    const searchTerm = wordMatch[1]
    if (searchTerm.length < this.options.minSearchLength) {
      return []
    }

    const matchStart = caretPos - searchTerm.length

    // Filter prompts by case-insensitive partial match
    return this.prompts
      .filter((prompt) =>
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .slice(0, this.options.maxMatches)
      .map((prompt) => ({
        name: prompt.name,
        content: prompt.content,
        matchStart,
        matchEnd: caretPos,
      }))
  }

  /**
   * Show autocomplete popup
   */
  private show(matches: AutoCompleteMatch[]): void {
    console.debug("Showing autocomplete with matches:", matches)
    this.currentMatches = matches
    this.selectedIndex = 0

    if (!this.isVisible) {
      this.isVisible = true
      this.callbacks.onShow()
    }
  }

  /**
   * Hide autocomplete popup
   */
  private hide(): void {
    console.debug("Hiding autocomplete")
    if (this.isVisible) {
      this.isVisible = false
      this.currentMatches = []
      this.selectedIndex = 0
      this.callbacks.onHide()
    }
  }

  /**
   * Get current matches
   */
  getMatches(): AutoCompleteMatch[] {
    return this.currentMatches
  }

  /**
   * Get selected index
   */
  getSelectedIndex(): number {
    return this.selectedIndex
  }

  /**
   * Navigate selection up
   */
  selectPrevious(): void {
    if (this.currentMatches.length === 0) return
    this.selectedIndex = Math.max(0, this.selectedIndex - 1)
  }

  /**
   * Navigate selection down
   */
  selectNext(): void {
    if (this.currentMatches.length === 0) return
    this.selectedIndex = Math.min(
      this.currentMatches.length - 1,
      this.selectedIndex + 1,
    )
  }

  /**
   * Select current highlighted match
   */
  selectCurrent(): void {
    if (
      this.currentMatches.length === 0 ||
      this.selectedIndex >= this.currentMatches.length
    ) {
      return
    }

    const selectedMatch = this.currentMatches[this.selectedIndex]
    this.callbacks.onSelect(selectedMatch)
    this.hide()
  }

  /**
   * Get popup position based on caret position
   */
  getPopupPosition(): AutoCompletePosition {
    if (!this.element) {
      return { x: 0, y: 0 }
    }

    const rect = this.element.getBoundingClientRect()
    const _caretPos = getCaretPosition(this.element)

    // For simple implementation, position below the input element
    // In a more sophisticated implementation, you would calculate
    // the exact caret position within the element
    return {
      x: rect.left,
      y: rect.bottom + 2,
    }
  }

  /**
   * Check if autocomplete is visible
   */
  isAutoCompleteVisible(): boolean {
    return this.isVisible
  }

  /**
   * Force hide autocomplete
   */
  forceHide(): void {
    this.hide()
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.debounceTimeout !== null) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
    this.hide()
    this.element = null
    this.prompts = []
    this.currentMatches = []
  }
}
