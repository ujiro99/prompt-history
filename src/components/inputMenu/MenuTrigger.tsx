import { MenubarTrigger } from "@/components/ui/menubar"
import { cn } from "@/lib/utils"

export function MenuTrigger(
  props: React.ComponentProps<typeof MenubarTrigger>,
): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-foreground cursor-pointer",
        props.disabled && "opacity-50",
      )}
      {...props}
    >
      {props.children}
    </MenubarTrigger>
  )
}
