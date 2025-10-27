import { useState } from "react"
import { i18n } from "#imports"
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useContainer } from "@/hooks/useContainer"

/**
 * Props for variable expansion info dialog
 */
interface VariableExpansionInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Variable expansion information dialog component
 * Displays a video demonstration and explanatory text about variable expansion feature
 */
export const VariableExpansionInfoDialog: React.FC<
  VariableExpansionInfoDialogProps
> = ({ open, onOpenChange }) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const { container } = useContainer()

  const handleVideoLoad = () => {
    setIsVideoLoaded(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="w-xl sm:max-w-xl max-h-9/10"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {i18n.t("dialogs.edit.variableExpansionInfo.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video demonstration section */}
          <div className="relative w-full mx-auto aspect-4/3 border border-neutral-200 bg-neutral-100 rounded-md overflow-hidden">
            {!isVideoLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <video
              className="w-full h-full object-contain"
              autoPlay
              controls
              muted
              loop
              playsInline
              onLoadedData={handleVideoLoad}
              style={{ display: isVideoLoaded ? "block" : "none" }}
            >
              <source
                src="https://ujiro99.github.io/prompt-history/variable-expansion-insert.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          {/* Description section */}
          <ul className="space-y-2 text-sm text-foreground list-disc list-inside marker:text-primary marker:font-semibold -indent-3 ml-3">
            <li>{i18n.t("dialogs.edit.variableExpansionInfo.description1")}</li>
            <li>{i18n.t("dialogs.edit.variableExpansionInfo.description2")}</li>
            <li>{i18n.t("dialogs.edit.variableExpansionInfo.description3")}</li>
          </ul>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{i18n.t("common.ok")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
