import { describe, it, expect } from "vitest"
import {
  parseVariables,
  isValidVariableName,
  mergeVariableConfigs,
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

  it("should maintain order: existing configs first, then new variables", () => {
    const content = "{{new1}} {{old1}} {{new2}} {{old2}}"
    const existingConfigs: VariableConfig[] = [
      { name: "old1", type: "text" },
      { name: "old2", type: "text" },
    ]

    const result = mergeVariableConfigs(content, existingConfigs)

    expect(result).toHaveLength(4)
    expect(result[0].name).toBe("old1")
    expect(result[1].name).toBe("old2")
    expect(result[2].name).toBe("new1")
    expect(result[3].name).toBe("new2")
  })
})
