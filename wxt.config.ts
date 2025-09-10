import { defineConfig } from "wxt"
import tailwindcss from "@tailwindcss/vite"

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
  manifest: {
    permissions: ["storage"],
    default_locale: "en",
  },
  webExt: {
    startUrls: ["https://ujiro99.github.io/selection-command/en/test"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
