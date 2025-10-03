import { vi } from "vitest"
import "@testing-library/jest-dom"

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

// Simple Port implementation
function createFakePort(name = "test-port") {
  const listeners: Array<(msg: unknown) => void> = []
  return {
    name,
    disconnect: vi.fn(),
    onMessage: { addListener: (fn: (msg: unknown) => void) => listeners.push(fn) },
    postMessage: vi.fn((msg: unknown) => {
      for (const l of listeners) l(msg)
    }),
  }
}

const BrowserMock = {
  runtime: {
    connect: vi.fn((_extId?: string, _info?: { name?: string }) => {
      return createFakePort(_info?.name)
    }),
  },
}
vi.stubGlobal("Browser", BrowserMock)

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)
