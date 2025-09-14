import { defineConfig } from "wxt"
import tailwindcss from "@tailwindcss/vite"
import removeConsole from "vite-plugin-remove-console"

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
  vite: (configEnv) => ({
    plugins: [
      tailwindcss(),
      configEnv.mode === "production"
        ? removeConsole({
            includes: ["log", "debug"],
          })
        : null,
    ],
  }),
})
