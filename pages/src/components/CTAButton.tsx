import { Image } from "@/components/Image"
import { cn } from "@/lib/utils"

interface CTAButtonProps {
  className?: string
}

export function CTAButton(props: CTAButtonProps) {
  const href =
    "https://chromewebstore.google.com/detail/nfdmafefekbbiahffhaodbdlikficnah?utm_source=github-pages"

  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2 md:max-w-95 px-5 py-4 rounded-lg transition-all duration-200 ease-out bg-white",
        "text-lg font-semibold text-zinc-700 ring-1 ring-zinc-200/80",
        "shadow-lg shadow-zinc-300/80",
        "hover:shadow-zinc-300 hover:bg-zinc-100",
        props.className,
      )}
    >
      <Image
        src="https://ujiro99.github.io/selection-command/chrome_web_store.png"
        alt="Chrome Web Store"
        className="inline-block h-12 md:h-14"
        width={200}
        height={60}
      />
      <p className="inline-block text-base md:text-lg md:break-keep font-semibold text-left text-zinc-600 leading-normal">
        <span className="font-serif tracking-wide mr-1">Prompt history</span>を
        無料インストール
      </p>
    </a>
  )
}
