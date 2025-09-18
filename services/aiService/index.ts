/**
 * AI Service exports
 */

import { ChatGptService } from "./chatgpt/ChatGptService"
import { supportHosts as chatGptSupportHosts } from "./chatgpt/chatGptConfig"
import { GeminiService } from "./gemini/GeminiService"
import { supportHosts as geminiSupporHosts } from "./gemini/geminiConfig"
import { PerplexityService } from "./perplexity/PerplexityService"
import { supportHosts as perplexitySupportHosts } from "./perplexity/perplexityConfig"
import { ClaudeService } from "./claude/ClaudeService"
import { supportHosts as claudeSupportHosts } from "./claude/claudeConfig"

export const supportHosts = [
  ...chatGptSupportHosts,
  ...geminiSupporHosts,
  ...perplexitySupportHosts,
  ...claudeSupportHosts,
]

export const getAiServices = () => [
  new ChatGptService(),
  new GeminiService(),
  new PerplexityService(),
  new ClaudeService(),
]
