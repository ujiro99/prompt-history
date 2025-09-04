import "@testing-library/jest-dom"

// WXT storage mock
vi.mock("wxt/utils/storage", () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

// Browser API mocks
Object.defineProperty(window, "location", {
  value: {
    href: "https://chatgpt.com/",
    hostname: "chatgpt.com",
  },
  writable: true,
})

Object.defineProperty(window, "chrome", {
  value: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      },
    },
  },
  writable: true,
})

// DOM mocks
Object.defineProperty(document, "querySelector", {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(document, "querySelectorAll", {
  value: vi.fn(),
  writable: true,
})

// CSS-in-JS mock for tests
global.CSS = {
  supports: vi.fn(() => false),
} as any
