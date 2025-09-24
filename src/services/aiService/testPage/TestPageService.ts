import { BaseAIService } from "../base/BaseAIService"
import { SelectorDebugger } from "../base/selectorDebugger"
import { TESTPAGE_CONFIG } from "./testPageConfig"
import { DEFINITIONS } from "./testPageDefinitions"

/**
 * TestPage service implementation
 */
export class TestPageService extends BaseAIService {
  private debugger: SelectorDebugger

  constructor() {
    super(TESTPAGE_CONFIG)
    this.debugger = new SelectorDebugger({
      serviceName: "TestPage",
      textInputSelectors: DEFINITIONS.selectors.textInput,
      sendButtonSelectors: DEFINITIONS.selectors.sendButton,
    })
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
