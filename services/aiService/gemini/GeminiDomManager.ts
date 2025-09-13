import { BaseDomManager } from "../base/BaseDomManager"
import { GEMINI_CONFIG } from "./geminiConfig"

/**
 * Gemini-specific DOM manager implementation
 */
export class GeminiDomManager extends BaseDomManager {
  constructor() {
    super(GEMINI_CONFIG)
  }
}
