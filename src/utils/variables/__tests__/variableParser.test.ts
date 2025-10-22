import { describe, it, expect } from "vitest"
import {
  parseVariables,
  isValidVariableName,
  mergeVariableConfigs,
  extractPromptTemplate,
} from "../variableParser"
import type { VariableConfig } from "@/types/prompt"

describe("parseVariables", () => {
  it("should extract variable names from prompt content", () => {
    const content = "Hello {{name}}, today's weather is {{weather}}."
    const result = parseVariables(content)
    expect(result).toEqual(["name", "weather"])
  })

  it("should remove duplicate variable names", () => {
    const content =
      "{{name}} is a developer. {{name}} loves coding. The weather is {{weather}}."
    const result = parseVariables(content)
    expect(result).toEqual(["name", "weather"])
  })

  it("should return empty array when no variables", () => {
    const content = "This is a regular prompt without variables."
    const result = parseVariables(content)
    expect(result).toEqual([])
  })

  it("should ignore invalid variable formats", () => {
    const content = "Invalid: {name} {{}} {{ name }} {{name-invalid}}"
    const result = parseVariables(content)
    expect(result).toEqual([])
  })

  it("should handle variables with underscores and numbers", () => {
    const content = "{{user_name}} {{item_1}} {{value2}}"
    const result = parseVariables(content)
    expect(result).toEqual(["user_name", "item_1", "value2"])
  })

  it("should handle multiline content", () => {
    const content = `Line 1: {{var1}}
    Line 2: {{var2}}
    Line 3: {{var3}}`
    const result = parseVariables(content)
    expect(result).toEqual(["var1", "var2", "var3"])
  })

  it("should handle Japanese variable names (hiragana, katakana, kanji)", () => {
    const content = "{{なまえ}} {{ユーザー名}} {{値1}}"
    const result = parseVariables(content)
    expect(result).toEqual(["なまえ", "ユーザー名", "値1"])
  })

  it("should handle Chinese variable names (simplified and traditional)", () => {
    const content = "{{名字}} {{用户名}} {{數值}}"
    const result = parseVariables(content)
    expect(result).toEqual(["名字", "用户名", "數值"])
  })

  it("should handle Korean variable names (Hangul)", () => {
    const content = "{{이름}} {{사용자}} {{값1}}"
    const result = parseVariables(content)
    expect(result).toEqual(["이름", "사용자", "값1"])
  })

  it("should handle European language variable names with accents", () => {
    const content = "{{café}} {{naïve}} {{Müller}}"
    const result = parseVariables(content)
    expect(result).toEqual(["café", "naïve", "Müller"])
  })

  it("should handle mixed language variable names", () => {
    const content = "{{user_名前}} {{usuario_1}} {{사용자_name}}"
    const result = parseVariables(content)
    expect(result).toEqual(["user_名前", "usuario_1", "사용자_name"])
  })

  it("should exclude control characters and invisible characters", () => {
    const content = "{{name\u200B}} {{user\u00AD}} {{value\u200D}}"
    const result = parseVariables(content)
    expect(result).toEqual([])
  })

  it("should normalize Unicode variable names (NFC normalization)", () => {
    // é as composed (U+00E9) vs decomposed (U+0065 U+0301)
    const composed = "{{café}}"
    const decomposed = "{{café}}" // This uses decomposed é
    const resultComposed = parseVariables(composed)
    const resultDecomposed = parseVariables(decomposed)

    // Both should produce the same normalized result
    expect(resultComposed).toEqual(["café"])
    expect(resultDecomposed).toEqual(["café"])
    expect(resultComposed).toEqual(resultDecomposed)
  })

  it("should handle emoji variable names", () => {
    // Emoji are technically allowed in the permissive approach
    const content = "{{😀_value}} {{test_🎉}}"
    const result = parseVariables(content)
    // Emoji don't match \p{L} or \p{N}, so they should be excluded
    expect(result).toEqual([])
  })
})

describe("isValidVariableName", () => {
  it("should return true for valid variable names", () => {
    expect(isValidVariableName("name")).toBe(true)
    expect(isValidVariableName("user_name")).toBe(true)
    expect(isValidVariableName("value1")).toBe(true)
    expect(isValidVariableName("userName")).toBe(true)
  })

  it("should return false for empty string", () => {
    expect(isValidVariableName("")).toBe(false)
  })

  it("should return false for names with special characters", () => {
    expect(isValidVariableName("name-invalid")).toBe(false)
    expect(isValidVariableName("name invalid")).toBe(false)
    expect(isValidVariableName("name@test")).toBe(false)
    expect(isValidVariableName("name!")).toBe(false)
  })

  it("should return false for names starting with numbers", () => {
    expect(isValidVariableName("1name")).toBe(false)
  })

  it("should return true for Unicode variable names", () => {
    expect(isValidVariableName("なまえ")).toBe(true)
    expect(isValidVariableName("名字")).toBe(true)
    expect(isValidVariableName("이름")).toBe(true)
    expect(isValidVariableName("café")).toBe(true)
    expect(isValidVariableName("user_名前")).toBe(true)
  })

  it("should return false for names with control characters", () => {
    expect(isValidVariableName("name\u200B")).toBe(false) // Zero Width Space
    expect(isValidVariableName("user\u00AD")).toBe(false) // Soft Hyphen
    expect(isValidVariableName("value\u200D")).toBe(false) // Zero Width Joiner
  })

  it("should normalize Unicode names before validation", () => {
    // Composed vs decomposed é
    const composed = "café"
    const decomposed = "café" // Uses decomposed é
    expect(isValidVariableName(composed)).toBe(true)
    expect(isValidVariableName(decomposed)).toBe(true)
  })
})

describe("mergeVariableConfigs", () => {
  it("should create new configs for newly detected variables", () => {
    const content = "Hello {{name}}, weather is {{weather}}"
    const result = mergeVariableConfigs(content, undefined)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      name: "name",
      type: "text",
    })
    expect(result[1]).toEqual({
      name: "weather",
      type: "text",
    })
  })

  it("should merge existing configs with new variables", () => {
    const content = "Hello {{name}}, weather is {{weather}}, time is {{time}}"
    const existingConfigs: VariableConfig[] = [
      {
        name: "name",
        type: "text",
        defaultValue: "John",
      },
      {
        name: "weather",
        type: "select",
        selectOptions: {
          options: ["sunny", "cloudy", "rainy"],
        },
      },
    ]

    const result = mergeVariableConfigs(content, existingConfigs)

    expect(result).toHaveLength(3)
    // Existing configs should be preserved
    expect(result[0]).toEqual(existingConfigs[0])
    expect(result[1]).toEqual(existingConfigs[1])
    // New variable should be added with default type
    expect(result[2]).toEqual({
      name: "time",
      type: "text",
    })
  })

  it("should remove configs for variables no longer in content", () => {
    const content = "Hello {{name}}"
    const existingConfigs: VariableConfig[] = [
      {
        name: "name",
        type: "text",
      },
      {
        name: "weather",
        type: "text",
      },
      {
        name: "oldVar",
        type: "text",
      },
    ]

    const result = mergeVariableConfigs(content, existingConfigs)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("name")
  })

  it("should return empty array when no variables", () => {
    const content = "No variables here"
    const result = mergeVariableConfigs(content, undefined)
    expect(result).toEqual([])
  })

  it("should maintain order: variables appear in the order they appear in content", () => {
    const content = "{{new1}} {{old1}} {{new2}} {{old2}}"
    const existingConfigs: VariableConfig[] = [
      { name: "old1", type: "text" },
      { name: "old2", type: "text" },
    ]

    const result = mergeVariableConfigs(content, existingConfigs)

    expect(result).toHaveLength(4)
    expect(result[0].name).toBe("new1")
    expect(result[1].name).toBe("old1")
    expect(result[2].name).toBe("new2")
    expect(result[3].name).toBe("old2")
  })
})

describe("extractPromptTemplate", () => {
  it("should extract template from prompt with variable section", () => {
    const content = `Hello {{name}}, how are you?

# variables:
{{name}}: "John"`
    const result = extractPromptTemplate(content)
    expect(result).toBe("Hello {{name}}, how are you?")
  })

  it("should return original content when no variable section", () => {
    const content = "Hello {{name}}, how are you?"
    const result = extractPromptTemplate(content)
    expect(result).toBe(content)
  })

  it("should handle multi-line template with variable section", () => {
    const content = `Hello {{name}},
How are you today?
The weather is {{weather}}.

# variables:
{{name}}: "John"
{{weather}}: "sunny"`
    const result = extractPromptTemplate(content)
    expect(result).toBe(`Hello {{name}},
How are you today?
The weather is {{weather}}.`)
  })

  it("should handle multi-line variables in variable section", () => {
    const content = `Analyze this: {{text}}

# variables:
{{text}}: """
This is a long text.
It spans multiple lines.
"""`
    const result = extractPromptTemplate(content)
    expect(result).toBe("Analyze this: {{text}}")
  })

  it("should trim trailing whitespace from template", () => {
    const content = `Hello {{name}}

# variables:
{{name}}: "John"`
    const result = extractPromptTemplate(content)
    expect(result).toBe("Hello {{name}}")
  })

  it("should handle content without variables", () => {
    const content = "This is a regular prompt without variables."
    const result = extractPromptTemplate(content)
    expect(result).toBe(content)
  })

  it("should handle empty content", () => {
    const content = ""
    const result = extractPromptTemplate(content)
    expect(result).toBe("")
  })
})
