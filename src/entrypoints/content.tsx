import ReactDOM from "react-dom/client"
import App from "./content/App.tsx"
import "./content/App.css"
import { supportHosts } from "@/services/aiService"
import { analytics } from "#imports"

let _supportHosts = [...supportHosts]

// Exclude development host from production. However, include it for E2E tests
if (import.meta.env.MODE === "production" && !import.meta.env.WXT_E2E) {
  _supportHosts = supportHosts.filter((host) => host !== "ujiro99.github.io")
}

const matches = _supportHosts.map((hostname) => `https://${hostname}/*`)

export default defineContentScript({
  matches,
  cssInjectionMode: "ui",
  runAt: "document_end",

  async main(ctx) {
    // Wait until the ChatGPT page is fully loaded
    await new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve(void 0)
      } else {
        window.addEventListener("load", () => resolve(void 0))
      }
    })

    // Wait additional time for ChatGPT UI to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const ui = await createShadowRootUi(ctx, {
      name: "prompt-history-ui",
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        analytics.autoTrack(container)
        const app = document.createElement("div")
        container.append(app)
        const root = ReactDOM.createRoot(app)
        root.render(<App />)
        return root
      },
      onRemove: (root) => {
        root?.unmount()
      },
    })

    ui.mount()
  },
})
