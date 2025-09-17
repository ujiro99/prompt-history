import { FullConfig } from "@playwright/test"

async function globalTeardown(_config: FullConfig) {
  console.log("🧹 Starting global teardown...")

  // クリーンアップ処理
  // 必要に応じて、テスト用の一時ファイルやデータのクリーンアップを行う

  console.log("✅ Global teardown completed")
}

export default globalTeardown
