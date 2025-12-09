/**
 * Analytics event definitions
 */
export const ANALYTICS_EVENTS = {
  /** When user saves edits in EditDialog */
  EDIT_SAVE: "edit-save",
  /** When user improves a prompt using AI */
  IMPROVE_PROMPT: "improve-prompt",
  /** When user inputs an improved prompt */
  INPUT_PROMPT: "input-improved-prompt",
  /** When user inserts a prompt at cursor position */
  INSERT_PROMPT: "insert-prompt",
  /** When user sets entire prompt text */
  SET_PROMPT: "set-prompt",
  /** When user sets API key in settings */
  SET_API_KEY: "set-api-key",
  /** When user executes organizer */
  ORGANIZER_RUN: "organizer-start-run",
  /** When user previews organizer templates */
  ORGANIZER_REVIEW: "organizer-start-review",
  /** When user saves organizer templates */
  ORGANIZER_SAVED: "organizer-saved",
} as const

/**
 * Type for valid analytics event names
 */
export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/**
 * Analytics event parameter
 */
export interface AnalyticsParameters {
  label?: string
  value?: string | number
}
