declare global {
  interface Window {
    __mockFile?: File
    __importResult?: any
    __exportedContent?: string
  }
}

export {}