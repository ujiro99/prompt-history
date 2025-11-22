/**
 * Gemini API Pricing Constants
 * Source: https://ai.google.dev/gemini-api/docs/pricing?hl=ja#gemini-2.5-flash
 * Last updated: 2025-11-22
 */

/**
 * Gemini 2.5 Flash pricing (Standard, per-request)
 * All prices in USD per 1 million tokens
 */
export const GEMINI_PRICING = {
  /** Input token cost per 1M tokens (text, image, video) */
  inputTokenPer1M: 0.3, // $0.30 per 1M input tokens
  /** Output token cost per 1M tokens (includes thinking tokens) */
  outputTokenPer1M: 2.5, // $2.50 per 1M output tokens
  /** USD to JPY conversion rate (approximate) */
  usdToJpy: 150,
} as const

/**
 * Gemini 2.5 Flash context limit (tokens)
 */
export const GEMINI_CONTEXT_LIMIT = 1_000_000
