import { BaseAIService } from "../base/BaseAIService"
import { TESTPAGE_CONFIG } from "./testPageConfig"

export const supportHosts: string[] = ["ujiro99.github.io"]

/**
 * TestPage service implementation
 */
export class TestPageService extends BaseAIService {
  constructor() {
    super(TESTPAGE_CONFIG, supportHosts)
  }
}
