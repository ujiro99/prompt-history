import yaml from "js-yaml"
// Import YAML file as raw text at build time (Vite feature)
import ymlContent from "../../src/locales/en.yml?raw"

// Parse YAML content
const translations = yaml.load(ymlContent) as Record<string, unknown>

// Flatten nested object to dot notation keys
function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey),
      )
    } else if (typeof value === "string") {
      result[newKey] = value
    }
  }

  return result
}

// Create flattened translations
const flatTranslations = flattenObject(translations)

// Mock i18n for Storybook
export const i18n = {
  t: (key: string, ...args: unknown[]) => {
    let result = flatTranslations[key] || key

    // Replace placeholders
    args.forEach((arg, index) => {
      result = result.replace(`$${index + 1}`, String(arg))
    })

    return result
  },
}

// Mock analytics
export const analytics = {
  track: () => Promise.resolve(),
  page: () => Promise.resolve(),
  identify: () => Promise.resolve(),
}
