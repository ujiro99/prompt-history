/**
 * AI Service exports
 */

import { ChatGptService } from "./chatgpt/chatGptService"
import { GeminiService } from "./gemini/geminiService"

export const AiServices = [new ChatGptService(), new GeminiService()]
