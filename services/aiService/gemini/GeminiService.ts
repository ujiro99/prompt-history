import { BaseAIService } from "../base/BaseAIService"
import { GeminiDomManager } from "./GeminiDomManager"
import { GeminiDebugger } from "./GeminiDebugger"
import { GEMINI_CONFIG } from "./geminiConfig"

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  private debugger: GeminiDebugger

  constructor() {
    super(new GeminiDomManager(), GEMINI_CONFIG)
    this.debugger = new GeminiDebugger()
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
