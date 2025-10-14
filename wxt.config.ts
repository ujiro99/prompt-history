import { defineConfig } from "wxt"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import removeConsole from "vite-plugin-remove-console"

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  alias: {
    "@": resolve("src"),
  },
  modules: [
    "@wxt-dev/module-react",
    "@wxt-dev/i18n/module",
    "@wxt-dev/analytics/module",
  ],
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
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
    build: {
      minify: configEnv.mode === "production" ? true : false,
    },
  }),
  dev: {
    server: {
      port: 3005,
    },
  },
})
