import { LocaleSelector } from "@/components/LocaleSelector"
import { Separator } from "@/components/ui/separator"

export function Footer() {
  return (
    <footer className="w-full mt-8">
      <Separator />
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
