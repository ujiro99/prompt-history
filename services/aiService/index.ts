/**
 * AI Service exports
 */

import { ChatGptService } from "./chatgpt/ChatGptService"
import { GeminiService } from "./gemini/GeminiService"

export const AiServices = [new ChatGptService(), new GeminiService()]
