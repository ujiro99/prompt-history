import { FullConfig } from "@playwright/test"

async function globalTeardown(_config: FullConfig) {
  console.log("🧹 Starting global teardown...")

  // Cleanup process
  // Clean up temporary files and data for testing as needed

  console.log("✅ Global teardown completed")
}

export default globalTeardown
