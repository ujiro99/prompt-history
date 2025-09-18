import { getCaretPosition, getCaretCoordinates } from "../dom"
import type { Prompt } from "../../types/prompt"
import type {
  AutoCompleteMatch,
  AutoCompleteOptions,
  AutoCompletePosition,
  AutoCompleteCallbacks,
} from "./types"

const NO_SELECTED_INDEX = -1

export class AutoCompleteManager {
  private element: Element | null = null
  private prompts: Prompt[] = []
  private options: AutoCompleteOptions
  private callbacks: AutoCompleteCallbacks = {} as AutoCompleteCallbacks
  private debounceTimeout: number | null = null
  private isVisible = false
  private currentMatches: AutoCompleteMatch[] = []
  private selectedIndex = NO_SELECTED_INDEX

  constructor(options: Partial<AutoCompleteOptions> = {}) {
    this.options = {
      maxMatches: 5,
      debounceMs: 100,
      minSearchLength: 3,
      ...options,
    }
  }

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: AutoCompleteCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Set the target input element
   */
  setElement(element: Element | null): void {
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

    // Calculate the position of the search term in the input
    const inputMatchStart = caretPos - searchTerm.length

    // Filter prompts by case-insensitive partial match
    return this.prompts
      .filter((prompt) =>
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .slice(0, this.options.maxMatches)
      .map((prompt) => {
        return {
          id: prompt.id,
          name: prompt.name,
          content: prompt.content,
          matchStart: inputMatchStart,
          matchEnd: caretPos,
          searchTerm,
        }
      })
  }

  /**
   * Show autocomplete popup
   */
  private show(matches: AutoCompleteMatch[]): void {
    this.currentMatches = matches
    this.selectedIndex = NO_SELECTED_INDEX
    this.notifySelectChange()
    this.isVisible = true
    this.callbacks.onShow()
  }

  /**
   * Hide autocomplete popup
   */
  private hide(): void {
    if (this.isVisible) {
      this.currentMatches = []
      this.selectedIndex = NO_SELECTED_INDEX
      this.notifySelectChange()
      this.isVisible = false
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
    this.notifySelectChange()
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
    this.notifySelectChange()
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
   * Reset selection index
   */
  selectReset(): void {
    this.selectedIndex = NO_SELECTED_INDEX
    this.notifySelectChange()
  }

  /**
   * Select specific index
   */
  selectIndex(index: number): void {
    if (index < 0 || index >= this.currentMatches.length) {
      console.warn("Index out of bounds:", index)
      return
    }
    this.selectedIndex = index
    this.notifySelectChange()
  }

  /**
   * Notify selection change
   */
  notifySelectChange(): void {
    this.callbacks.onSelectChange(this.selectedIndex)
  }

  /**
   * Get popup position based on caret position
   */
  getPopupPosition(): AutoCompletePosition {
    if (!this.element) {
      return { x: 0, y: 0 }
    }

    // Try to get precise caret coordinates
    const coords = getCaretCoordinates(this.element)
    if (coords) {
      // Position popup below the caret with a small offset
      return {
        x: coords.x,
        y: coords.y + coords.height + 4,
      }
    }

    // Fallback to positioning below the input element
    const rect = this.element.getBoundingClientRect()
    return {
      x: rect.left,
      y: rect.bottom + 2,
    }
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
    this.callbacks = {} as AutoCompleteCallbacks
    this.element = null
    this.prompts = []
    this.currentMatches = []
  }
}
