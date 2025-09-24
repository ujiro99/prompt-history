/**
 * AI Service exports
 */

import {
  TestPageService,
  supportHosts as testPageSupportHosts,
} from "./testPage/TestPageService"
import {
  ChatGptService,
  supportHosts as chatGptSupportHosts,
} from "./chatgpt/ChatGptService"
import {
  GeminiService,
  supportHosts as geminiSupporHosts,
} from "./gemini/GeminiService"
import {
  PerplexityService,
  supportHosts as perplexitySupportHosts,
} from "./perplexity/PerplexityService"
import {
  ClaudeService,
  supportHosts as claudeSupportHosts,
} from "./claude/ClaudeService"

export const supportHosts = [
  ...testPageSupportHosts,
  ...chatGptSupportHosts,
  ...geminiSupporHosts,
  ...perplexitySupportHosts,
  ...claudeSupportHosts,
]

export const getAiServices = () => [
  new TestPageService(),
  new ChatGptService(),
  new GeminiService(),
  new PerplexityService(),
  new ClaudeService(),
]
