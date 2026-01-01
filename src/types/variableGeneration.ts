/**
 * Variable Generation Estimation types
 */

/**
 * Variable generation execution estimate
 */
export interface VariableGenerationEstimate {
  /** Number of prompt history items used */
  promptHistoryCount: number
  /** Estimated input tokens */
  estimatedInputTokens: number
  /** Context usage rate (0.0 - 1.0) */
  contextUsageRate: number
  /** Model name */
  model: string
  /** Context limit (tokens) */
  contextLimit: number
}
