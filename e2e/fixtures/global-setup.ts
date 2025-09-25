import { FullConfig } from "@playwright/test"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function globalSetup(_config: FullConfig) {
  console.log("🚀 Starting global setup...")

  // Check extension build
  const extensionPath = path.join(__dirname, "../../.output/chrome-mv3-e2e")

  if (!fs.existsSync(extensionPath)) {
    console.log("📦 Extension not found. Building...")
    try {
      execSync("pnpm build", { stdio: "inherit" })
      console.log("✅ Extension built successfully")
    } catch (error) {
      console.error("❌ Failed to build extension:", error)
      throw error
    }
  } else {
    console.log("✅ Extension found at:", extensionPath)
  }

  // Set environment variables
  process.env.EXTENSION_PATH = extensionPath

  // Fetch and cache AI service configs
  const endpointUrl = process.env.WXT_CONFIG_ENDPOINT as string
  console.log("🌐 Fetching AI service configurations...", endpointUrl)
  const configs = await fetch(endpointUrl).then((res) => res.json())
  process.env.CONFIGS = JSON.stringify(configs)

  console.log("✅ Global setup completed")
}

export default globalSetup
