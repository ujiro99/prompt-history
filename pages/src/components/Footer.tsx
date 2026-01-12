import { LocaleSelector } from "@/components/LocaleSelector"

export function Footer() {
  return (
    <footer className="w-full mt-4">
      <div className="flex flex-col gap-4 items-center py-8 text-stone-500">
        <p className="text-center">
          <span>© 2025 Prompt Autocraft</span>
          <br />
        </p>
      </div>
      <LocaleSelector />
    </footer>
  )
}
