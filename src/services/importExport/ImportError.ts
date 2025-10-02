export class ImportError extends Error {
  errors: number
  errorMessages: string[]

  constructor(errors: number, errorMessages: string[]) {
    super(`Import failed with ${errors} errors.`)
    this.name = "ImportError"
    this.errors = errors
    this.errorMessages = errorMessages
    this.message = ImportError.toMessage(errors, errorMessages)
  }

  static toMessage(errors: number, errorMessages: string[]): string {
    let msg = ""

    if (errors > 0) {
      msg += `${errors} errors occurred during import.\n`
    }

    if (errorMessages.length > 0) {
      msg += errorMessages.map((e) => `  - ${e}`).join("\n")
    }

    return msg
  }
}
