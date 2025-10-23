import { describe, it, expect } from "vitest"
import {
  formatValue,
  formatVariableSection,
  expandPrompt,
} from "../variableFormatter"
import type { VariableValues } from "@/types/prompt"

describe("formatValue", () => {
  it("should format single-line value with double quotes", () => {
    const value = "Hello World"
    const result = formatValue(value)
    expect(result).toBe('"Hello World"')
  })

  it("should format multi-line value with triple quotes", () => {
    const value = `Line 1
Line 2
Line 3`
    const result = formatValue(value)
    expect(result).toBe(`"""
Line 1
Line 2
Line 3
"""`)
  })

  it("should handle empty string", () => {
    const value = ""
    const result = formatValue(value)
    expect(result).toBe('""')
  })

  it("should handle value with only newlines as multi-line", () => {
    const value = "\n\n"
    const result = formatValue(value)
    expect(result).toBe(`"""
\n\n
"""`)
  })

  it("should escape double quotes in single-line value", () => {
    const value = 'Hello "World"'
    const result = formatValue(value)
    expect(result).toBe('"Hello \\"World\\""')
  })

  it("should escape backslashes in single-line value", () => {
    const value = 'C:\\Users\\test'
    const result = formatValue(value)
    expect(result).toBe('"C:\\\\Users\\\\test"')
  })

  it("should escape both backslashes and double quotes", () => {
    const value = 'Path: "C:\\Users\\test"'
    const result = formatValue(value)
    expect(result).toBe('"Path: \\"C:\\\\Users\\\\test\\""')
  })

  it("should handle multiple double quotes", () => {
    const value = 'He said "Hello" and "Goodbye"'
    const result = formatValue(value)
    expect(result).toBe('"He said \\"Hello\\" and \\"Goodbye\\""')
  })

  it("should preserve literal escape sequences", () => {
    const value = 'Line 1\\nLine 2'
    const result = formatValue(value)
    expect(result).toBe('"Line 1\\\\nLine 2"')
  })

  it("should escape triple quotes in multi-line value", () => {
    const value = 'Line 1\nTriple quotes: """\nLine 3'
    const result = formatValue(value)
    // When triple quotes are found in multi-line value, escape them
    expect(result).toBe('"""\nLine 1\nTriple quotes: \\"\\"\\"\nLine 3\n"""')
  })

  it("should handle backslashes in multi-line value", () => {
    const value = 'Line 1\nC:\\Users\\test\nLine 3'
    const result = formatValue(value)
    expect(result).toBe('"""\nLine 1\nC:\\Users\\test\nLine 3\n"""')
  })
})

describe("formatVariableSection", () => {
  it("should format single-line variables", () => {
    const values: VariableValues = {
      name: "John",
      age: "30",
    }
    const result = formatVariableSection(values)
    expect(result).toBe(`# variables:
{{name}}: "John"
{{age}}: "30"`)
  })

  it("should format multi-line variables", () => {
    const values: VariableValues = {
      description: `This is a long description.
It spans multiple lines.
Each line provides more details.`,
    }
    const result = formatVariableSection(values)
    expect(result).toBe(`# variables:
{{description}}: """
This is a long description.
It spans multiple lines.
Each line provides more details.
"""`)
  })

  it("should format mixed single-line and multi-line variables", () => {
    const values: VariableValues = {
      name: "John",
      bio: `John is a developer.
He loves coding.`,
    }
    const result = formatVariableSection(values)
    expect(result).toBe(`# variables:
{{name}}: "John"
{{bio}}: """
John is a developer.
He loves coding.
"""`)
  })

  it("should skip empty values", () => {
    const values: VariableValues = {
      name: "John",
      age: "",
      city: "Tokyo",
    }
    const result = formatVariableSection(values)
    expect(result).toBe(`# variables:
{{name}}: "John"
{{city}}: "Tokyo"`)
  })

  it("should return empty string when all values are empty", () => {
    const values: VariableValues = {
      name: "",
      age: "",
    }
    const result = formatVariableSection(values)
    expect(result).toBe("")
  })

  it("should return empty string when no values", () => {
    const values: VariableValues = {}
    const result = formatVariableSection(values)
    expect(result).toBe("")
  })
})

describe("expandPrompt", () => {
  it("should append variable section to prompt", () => {
    const content = "Hello {{name}}, how are you?"
    const values: VariableValues = {
      name: "John",
    }
    const result = expandPrompt(content, values)
    expect(result).toBe(`Hello {{name}}, how are you?

# variables:
{{name}}: "John"`)
  })

  it("should return original content when no values", () => {
    const content = "Hello {{name}}, how are you?"
    const values: VariableValues = {}
    const result = expandPrompt(content, values)
    expect(result).toBe(content)
  })

  it("should return original content when all values are empty", () => {
    const content = "Hello {{name}}, how are you?"
    const values: VariableValues = {
      name: "",
    }
    const result = expandPrompt(content, values)
    expect(result).toBe(content)
  })

  it("should handle multi-line content and variables", () => {
    const content = `Hello {{name}},
How are you today?
The weather is {{weather}}.`
    const values: VariableValues = {
      name: "John",
      weather: "sunny",
    }
    const result = expandPrompt(content, values)
    expect(result).toBe(`Hello {{name}},
How are you today?
The weather is {{weather}}.

# variables:
{{name}}: "John"
{{weather}}: "sunny"`)
  })

  it("should handle content that already ends with newlines", () => {
    const content = "Hello {{name}}.\n\n"
    const values: VariableValues = {
      name: "John",
    }
    const result = expandPrompt(content, values)
    // Content ends with \n\n, and we add \n\n, so we get 4 newlines total
    expect(result).toBe(`Hello {{name}}.



# variables:
{{name}}: "John"`)
  })
})
