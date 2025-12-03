/**
 * Organizer Summary Dialog Component
 * Displays organization results summary with statistics
 */

import { i18n } from "#imports"
import { NotebookPen, Save, Sparkles, BookOpenText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useContainer } from "@/hooks/useContainer"
import { stopPropagation } from "@/utils/dom"
import { cn } from "@/lib/utils"
import type { PromptOrganizerResult } from "@/types/promptOrganizer"

interface OrganizerSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: PromptOrganizerResult | null
  onPreview?: () => void
  onSaveAll?: () => void
}

export const OrganizerSummaryDialog: React.FC<OrganizerSummaryDialogProps> = ({
  open,
  onOpenChange,
  result,
  onPreview,
  onSaveAll,
}) => {
  const { container } = useContainer()

  const templateCount = result?.templates?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-2xl p-8"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.summary.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-7 py-5">
          {templateCount === 0 ? (
            <p>{i18n.t("promptOrganizer.summary.noTemplates")}</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="inline-block font-semibold text-base text-foreground/60">
                  <Sparkles className="size-5 inline-block mr-1.5 -mt-1" />
                  {i18n.t("promptOrganizer.summary.organizationPerformed")}
                </label>
                <p className="font-serif text-lg tracking-wide">
                  {result &&
                    result.successMessageGenerated &&
                    i18n.t("promptOrganizer.summary.summary", [
                      result.sourceCount,
                      result.templates.length,
                    ])}
                </p>
              </div>
              <div className="space-y-2">
                <label className="inline-block font-semibold text-base text-foreground/60">
                  <BookOpenText className="size-5 inline-block mr-1.5 -mt-1" />
                  {i18n.t("promptOrganizer.summary.examplePrompts")}
                </label>
                <p className="font-serif text-lg/8">
                  {result && result.successMessage}
                </p>
              </div>
              <div className="flex justify-center tracking-wide">
                <Button
                  variant="outline"
                  onClick={onPreview}
                  className="group"
                  size="lg"
                >
                  <NotebookPen
                    className={cn(
                      "size-4 stroke-neutral-600 fill-neutral-100 transition",
                      "group-hover:scale-120 group-hover:fill-neutral-200",
                    )}
                  />
                  {i18n.t("promptOrganizer.buttons.preview")}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onSaveAll}>
            <Save className="size-4" />
            {i18n.t("promptOrganizer.buttons.saveAll")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
