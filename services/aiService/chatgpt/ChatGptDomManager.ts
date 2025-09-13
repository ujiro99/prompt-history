import { BaseDomManager } from "../base/BaseDomManager"
import { CHATGPT_CONFIG } from "./chatGptConfig"

/**
 * ChatGPT-specific DOM manager implementation
 */
export class ChatGptDomManager extends BaseDomManager {
  constructor() {
    super(CHATGPT_CONFIG)
  }
}
