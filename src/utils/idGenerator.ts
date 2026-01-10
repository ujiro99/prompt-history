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

/**
 * Generate unique ID for category item
 */
export function generateCategoryId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "category_" + crypto.randomUUID()
  }
  return `category_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate unique ID for variable item
 */
export function generateVariableId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "variable_" + crypto.randomUUID()
  }
  return `variable_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate unique ID for dictionary item
 */
export function generateDictItemId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "dictItem_" + crypto.randomUUID()
  }
  return `dictItem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
