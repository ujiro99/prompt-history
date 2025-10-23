import type { VariableConfig } from "@/types/prompt"

/**
 * Header for the variable section in prompt content
 */
export const VARIABLE_SECTION_HEADER = "# variables:"

/**
 * Regular expression to match variables in format {{variableName}}
 * Matches Unicode letters, numbers, and underscores
 * Uses Unicode property escapes:
 * - \p{L}: Unicode Letter (any language)
 * - \p{N}: Unicode Number (any language)
 * - _: Underscore
 * The 'u' flag enables Unicode mode
 */
const VARIABLE_PATTERN = /\{\{([\p{L}_][\p{L}\p{N}_]*)\}\}/gu

/**
 * Extract variable names from prompt content
 * Variable names are normalized to NFC (Canonical Composition) form
 * @param content - Prompt content
 * @returns Array of variable names (duplicates removed, normalized)
 */
export function parseVariables(content: string): string[] {
  const matches = content.matchAll(VARIABLE_PATTERN)
  const variables = new Set<string>()

  for (const match of matches) {
    const variableName = match[1]
    if (isValidVariableName(variableName)) {
      // Normalize to NFC form to ensure consistent representation
      const normalized = variableName.normalize("NFC")
      variables.add(normalized)
    }
  }

  return Array.from(variables)
}

/**
 * Check if variable name is valid
 * Valid names: start with Unicode letter or underscore, followed by Unicode letters, numbers, or underscores
 * Control characters and invisible characters are excluded for security
 * The name is normalized to NFC form before validation
 * @param name - Variable name
 * @returns True if valid
 */
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) {
    return false
  }

  // Normalize to NFC (Canonical Composition) form
  const normalized = name.normalize("NFC")

  // Basic pattern: Unicode Letter or underscore at start,
  // followed by Unicode Letters, Numbers, or underscores
  const validPattern = /^[\p{L}_][\p{L}\p{N}_]*$/u
  if (!validPattern.test(normalized)) {
    return false
  }

  // Exclude control characters (invisible characters, formatting characters, etc.)
  // \p{C} matches all control characters in Unicode
  if (/\p{C}/u.test(normalized)) {
    return false
  }

  return true
}

/**
 * Merge variable configs with actual variables in content
 * - Existing configs are preserved for variables still in content
 * - New variables get default config (type: 'text')
 * - Configs for removed variables are excluded
 * - Order follows the order variables appear in content
 * @param content - Prompt content
 * @param configs - Existing variable configs
 * @returns Merged variable configs in content order
 */
export function mergeVariableConfigs(
  content: string,
  configs?: VariableConfig[],
): VariableConfig[] {
  const variableNames = parseVariables(content)

  if (variableNames.length === 0) {
    return []
  }

  const configMap = new Map<string, VariableConfig>()

  // Build map from existing configs
  if (configs) {
    for (const config of configs) {
      configMap.set(config.name, config)
    }
  }

  const result: VariableConfig[] = []

  // Add variables in the order they appear in content
  for (const varName of variableNames) {
    const existingConfig = configMap.get(varName)
    if (existingConfig) {
      result.push(existingConfig)
    } else {
      result.push({
        name: varName,
        type: "text",
      })
    }
  }

  return result
}

/**
 * Extract prompt template by removing variable section
 * Removes variable section and everything after it
 * @param content - Prompt content (may include variable section)
 * @returns Prompt template without variable section
 */
export function extractPromptTemplate(content: string): string {
  // Split by variable section header and take the first part
  const pattern = new RegExp(`\\n\\n${VARIABLE_SECTION_HEADER}\\n`)
  const parts = content.split(pattern)
  return parts[0].trim()
}
