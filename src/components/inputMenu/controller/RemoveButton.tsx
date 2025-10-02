import { Trash } from "lucide-react"
import { cn } from "@/lib/utils"
import { i18n } from "#imports"

type RemoveButtonProps = {
  onClick: () => void
  className?: string
  size?: number
}

export const RemoveButton = ({
  onClick,
  className,
  size = 16,
}: RemoveButtonProps) => {
  const handleClick = (e: React.SyntheticEvent) => {
    onClick()
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <button
      type="button"
      className={cn(
        "outline-gray-200 px-2 py-1.5 rounded-md transition group/remove-button hover:bg-gray-100 cursor-pointer",
        "flex items-center gap-2",
        className,
      )}
      onClick={handleClick}
    >
      <Trash
        className={cn(
          "stroke-gray-400 transition",
          "group-hover/remove-button:scale-120 group-hover/remove-button:stroke-red-500",
        )}
        size={size}
      />
      {i18n.t("buttons.delete")}
    </button>
  )
}
