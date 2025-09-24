import { BaseAIService } from "../base/BaseAIService"
import { GEMINI_CONFIG } from "./geminiConfig"

export const supportHosts = ["gemini.google.com"]

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  constructor() {
    super(GEMINI_CONFIG, supportHosts)
  }
}
