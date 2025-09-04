import { describe, it, expect } from "vitest"

describe("Example utility tests", () => {
  it("should demonstrate basic testing setup", () => {
    const sum = (a: number, b: number) => a + b
    expect(sum(2, 3)).toBe(5)
  })

  it("should test string operations", () => {
    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1)
    expect(capitalize("hello")).toBe("Hello")
  })

  it("should test array operations", () => {
    const numbers = [1, 2, 3, 4, 5]
    const doubled = numbers.map((n) => n * 2)
    expect(doubled).toEqual([2, 4, 6, 8, 10])
  })

  it("should test async operations", async () => {
    const asyncSum = async (a: number, b: number): Promise<number> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(a + b), 10)
      })
    }

    const result = await asyncSum(5, 7)
    expect(result).toBe(12)
  })
})
