import type { VariableValues } from "@/types/prompt"

/**
 * Format a value with appropriate quotes
 * - Single-line values use double quotes: "value"
 * - Multi-line values use triple quotes: """value"""
 * @param value - Value to format
 * @returns Formatted value
 */
export function formatValue(value: string): string {
  const hasNewline = value.includes("\n")

  if (hasNewline) {
    return `"""\n${value}\n"""`
  }

  return `"${value}"`
}

/**
 * Format variable section for prompt expansion
 * Format:
 * # variables:
 * {{var1}}: "value1"
 * {{var2}}: """
 * multiline
 * value
 * """
 * @param values - Variable input values
 * @returns Formatted variable section (empty string if no values)
 */
export function formatVariableSection(values: VariableValues): string {
  // Filter out empty values
  const nonEmptyEntries = Object.entries(values).filter(
    ([, value]) => value.trim() !== "",
  )

  if (nonEmptyEntries.length === 0) {
    return ""
  }

  const lines = ["# variables:"]

  for (const [name, value] of nonEmptyEntries) {
    const formattedValue = formatValue(value)
    lines.push(`{{${name}}}: ${formattedValue}`)
  }

  return lines.join("\n")
}

/**
 * Expand prompt with variable section
 * Appends variable section to the end of prompt content
 * @param content - Original prompt content
 * @param values - Variable input values
 * @returns Expanded prompt (original if no values)
 */
export function expandPrompt(content: string, values: VariableValues): string {
  const variableSection = formatVariableSection(values)

  if (!variableSection) {
    return content
  }

  return `${content}\n\n${variableSection}`
}
