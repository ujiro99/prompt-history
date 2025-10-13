export default {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-replace": {
      pattern: /(--tw-|--color-|--radius|--font-|--spacing-|--breakpoint-|--chart-|--sidebar|:root)/g,
      data: {
        // Prefix internal Tailwind variables
        "--tw-": "--ph-tw-",
        // Prefix custom color variables
        "--color-": "--ph-color-",
        // Prefix custom theme variables
        "--radius": "--ph-radius",
        "--font-": "--ph-font-",
        "--spacing-": "--ph-spacing-",
        "--breakpoint-": "--ph-breakpoint-",
        "--chart-": "--ph-chart-",
        "--sidebar": "--ph-sidebar",
        // Add :host selector for Shadow DOM compatibility
        ":root": ":root, :host",
      },
    },
  },
}
