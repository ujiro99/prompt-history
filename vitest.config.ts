import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".output", "coverage"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "#i18n": path.resolve(__dirname, "./.wxt/i18n.ts"),
    },
  },
})
