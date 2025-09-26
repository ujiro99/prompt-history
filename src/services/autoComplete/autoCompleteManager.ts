import { getCaretPosition, getCaretCoordinates } from "../dom"
import type { Prompt } from "../../types/prompt"
import type {
  AutoCompleteMatch,
  AutoCompleteOptions,
  AutoCompletePosition,
  AutoCompleteCallbacks,
} from "./types"

const NO_SELECTED_INDEX = -1
const MAX_WORD_COUNT = 3
const MIN_WORD_COUNT = 1

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
   * Supports matching 1-3 words, prioritizing longer matches
   */
  private findMatches(input: string, caretPos: number): AutoCompleteMatch[] {
    const textBeforeCaret = input.substring(0, caretPos)

    // Collect matches from all word counts
    const allMatches: (AutoCompleteMatch & { wordCount: number })[] = []

    // Search for matches with all word counts (3, 2, 1)
    for (
      let wordCount = MAX_WORD_COUNT;
      wordCount >= MIN_WORD_COUNT;
      wordCount--
    ) {
      const matches = this.tryMatchWithWordCount(
        textBeforeCaret,
        wordCount,
        caretPos,
      )

      // Add word count information for prioritization
      matches.forEach((match) => {
        allMatches.push({ ...match, wordCount })
      })
    }

    // Sort by word count (descending)
    allMatches.sort((a, b) => {
      if (a.wordCount !== b.wordCount) {
        return b.wordCount - a.wordCount // Higher word count first
      }
      return 0
    })

    // Remove duplicates (same prompt matched by different word counts)
    const seenPromptIds = new Set<string>()
    const uniqueMatches = allMatches.filter((match) => {
      if (seenPromptIds.has(match.id)) {
        return false
      }
      seenPromptIds.add(match.id)
      return true
    })

    // Apply max matches limit and remove wordCount property
    return (
      uniqueMatches
        .slice(0, this.options.maxMatches)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ wordCount, ...match }) => match)
    )
  }

  /**
   * Try to find matches with a specific number of words
   */
  private tryMatchWithWordCount(
    textBeforeCaret: string,
    wordCount: number,
    caretPos: number,
  ): AutoCompleteMatch[] {
    // Create regex pattern for specified number of words
    // Pattern matches wordCount number of words separated by whitespace
    const pattern =
      wordCount === 1
        ? /(\S+)$/
        : new RegExp(`(\\S+(?:\\s+\\S+){${wordCount - 1}})$`)

    const wordMatch = textBeforeCaret.match(pattern)
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
          isPinned: prompt.isPinned || false,
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
   * Execute current highlighted match
   */
  execute(): void {
    if (
      this.currentMatches.length === 0 ||
      this.selectedIndex >= this.currentMatches.length
    ) {
      return
    }

    const selectedMatch = this.currentMatches[this.selectedIndex]
    this.callbacks.onExecute(selectedMatch)
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
      return { x: 0, y: 0, height: 0 }
    }

    // Try to get precise caret coordinates
    const coords = getCaretCoordinates(this.element)
    if (coords) {
      // Position popup below the caret
      return {
        x: coords.x,
        y: coords.y,
        height: coords.height,
      }
    }

    // Fallback to positioning below the input element
    const rect = this.element.getBoundingClientRect()
    return {
      x: rect.left,
      y: rect.bottom + 2,
      height: rect.height,
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
