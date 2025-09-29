/**
 * Generate unique ID for prompts
 */
export function generatePromptId(): string {
  // Use native crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "prompt_" + crypto.randomUUID()
  }
  // Fallback for older browsers or environments without crypto.randomUUID()
  return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
