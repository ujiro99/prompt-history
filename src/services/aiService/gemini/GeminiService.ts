import { BaseAIService } from "../base/BaseAIService"
import { GEMINI_DEFINITIONS } from "./geminiDefinitions"

export const supportHosts = ["gemini.google.com"]

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  constructor() {
    const config = {
      serviceName: "Gemini",
      selectors: GEMINI_DEFINITIONS.selectors,
      popupPlacement: GEMINI_DEFINITIONS.popupPlacement,
      debounceTime: 100,
    }
    super(config, supportHosts)
  }
}
