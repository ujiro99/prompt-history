import type { VariableConfig } from "@/types/prompt"

/**
 * Regular expression to match variables in format {{variableName}}
 * Matches alphanumeric characters and underscores
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

/**
 * Extract variable names from prompt content
 * @param content - Prompt content
 * @returns Array of variable names (duplicates removed)
 */
export function parseVariables(content: string): string[] {
  const matches = content.matchAll(VARIABLE_PATTERN)
  const variables = new Set<string>()

  for (const match of matches) {
    const variableName = match[1]
    if (isValidVariableName(variableName)) {
      variables.add(variableName)
    }
  }

  return Array.from(variables)
}

/**
 * Check if variable name is valid
 * Valid names: start with letter or underscore, followed by alphanumeric or underscore
 * @param name - Variable name
 * @returns True if valid
 */
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) {
    return false
  }

  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  return validPattern.test(name)
}

/**
 * Merge variable configs with actual variables in content
 * - Existing configs are preserved for variables still in content
 * - New variables get default config (type: 'text')
 * - Configs for removed variables are excluded
 * @param content - Prompt content
 * @param configs - Existing variable configs
 * @returns Merged variable configs
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
  const processedVars = new Set<string>()

  // First, add existing configs that are still present in content
  if (configs) {
    for (const config of configs) {
      if (variableNames.includes(config.name)) {
        result.push(config)
        processedVars.add(config.name)
      }
    }
  }

  // Then, add new variables with default config
  for (const varName of variableNames) {
    if (!processedVars.has(varName)) {
      result.push({
        name: varName,
        type: "text",
      })
    }
  }

  return result
}
