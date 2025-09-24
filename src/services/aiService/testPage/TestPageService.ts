import { BaseAIService } from "../base/BaseAIService"
import { TESTPAGE_CONFIG } from "./testPageConfig"

/**
 * TestPage service implementation
 */
export class TestPageService extends BaseAIService {
  constructor() {
    super(TESTPAGE_CONFIG)
  }
}
