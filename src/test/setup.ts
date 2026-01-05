import { vi } from "vitest"
import "@testing-library/jest-dom"

// Mock Browser.i18n.getMessage to support @wxt-dev/i18n
const globalAny = globalThis as any
if (!globalAny.Browser) {
  globalAny.Browser = {}
}
if (!globalAny.Browser.i18n) {
  globalAny.Browser.i18n = {}
}
globalAny.Browser.i18n.getMessage = vi.fn((key: string) => key)

// Mock @wxt-dev/analytics to prevent Browser.runtime.connect errors
vi.mock("@wxt-dev/analytics", () => ({
  createAnalytics: () => ({
    track: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock("@wxt-dev/i18n", () => {
  return {
    createI18n: () => ({
      t: (key: string, _countOrSubs?: unknown, _subs?: unknown) => key,
    }),
    i18n: {
      t: (key: string, _countOrSubs?: unknown, _subs?: unknown) => key,
    },
  }
})

// JSDom + Vitest don't play well with each other. Long story short - default
// TextEncoder produces Uint8Array objects that are _different_ from the global
// Uint8Array objects, so some functions that compare their types explode.
// https://github.com/vitest-dev/vitest/issues/4043#issuecomment-1905172846

class CompatibleTextEncoder extends TextEncoder {
  constructor() {
    super()
  }
  encode(input: string) {
    if (typeof input !== "string") {
      throw new TypeError("`input` must be a string")
    }

    const decodedURI = decodeURIComponent(encodeURIComponent(input))
    const arr = new Uint8Array(decodedURI.length)
    const chars = decodedURI.split("")
    for (let i = 0; i < chars.length; i++) {
      arr[i] = decodedURI[i].charCodeAt(0)
    }
    return arr
  }
}

type BufferSource = ArrayBufferView | ArrayBuffer
class CompatibleTextDecoder {
  private label: string
  private options: { fatal?: boolean; ignoreBOM?: boolean }

  constructor(
    label = "utf-8",
    options: { fatal?: boolean; ignoreBOM?: boolean } = {},
  ) {
    this.label = label
    this.options = options
  }

  decode(input?: BufferSource): string {
    return new TextDecoder(this.label, this.options).decode(input)
  }

  get encoding(): string {
    return this.label
  }

  get fatal(): boolean {
    return this.options.fatal || false
  }

  get ignoreBOM(): boolean {
    return this.options.ignoreBOM || false
  }
}

vi.stubGlobal("TextEncoder", CompatibleTextEncoder)
vi.stubGlobal("TextDecoder", CompatibleTextDecoder)

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)

// Polyfill for Pointer Capture API (used by Radix UI components)
// jsdom doesn't support hasPointerCapture, setPointerCapture, releasePointerCapture
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function () {
      return false
    }
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {
      // no-op
    }
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {
      // no-op
    }
  }
  // jsdom doesn't fully support scrollIntoView
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {
      // no-op
    }
  }
}
