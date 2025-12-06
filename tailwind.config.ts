import type { Config } from "tailwindcss"

export default {
  content: ["./entrypoints/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
      },
    },
  },
} satisfies Config
