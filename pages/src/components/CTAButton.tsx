import { Image } from "@/components/Image"
import { StoreUrl } from "@/const"
import { getDict } from "@/features/locale"
import { cn } from "@/lib/utils"
import type { LangType } from "@/types/locale"

interface CTAButtonProps {
  className?: string
  lang: LangType
}

export function CTAButton(props: CTAButtonProps) {
  const t = getDict(props.lang).lp

  return (
    <a
      href={`${StoreUrl}&utm_medium=link&utm_campaign=inline_cta`}
      className={cn(
        "inline-flex items-center gap-2 md:max-w-120 px-5 py-4 rounded-lg transition-all duration-200 ease-out bg-white",
        "text-lg font-semibold text-zinc-700 ring-1 ring-zinc-200/80",
        "shadow-lg shadow-zinc-300/80",
        "hover:shadow-zinc-300 hover:bg-zinc-100",
        props.className,
      )}
    >
      <Image
        src="https://ujiro99.github.io/selection-command/chrome_web_store.png"
        alt="Chrome Web Store"
        className="inline-block h-12 md:h-16"
        width={200}
        height={64}
      />
      <p className="inline-block text-base md:text-lg md:break-keep font-semibold text-left text-zinc-600 leading-normal whitespace-pre-line">
        <span className="font-logo tracking-wide mr-1">Prompt Autocraft</span>
        {t.cta.buttonText}
      </p>
    </a>
  )
}
