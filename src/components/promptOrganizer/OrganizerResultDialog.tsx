/**
 * Organizer Result Dialog Component
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
import { FadeInText } from "@/components/promptOrganizer/FadeInText"
import { useContainer } from "@/hooks/useContainer"
import { stopPropagation } from "@/utils/dom"
import { cn } from "@/lib/utils"
import type { PromptOrganizerResult } from "@/types/promptOrganizer"

interface OrganizerResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: PromptOrganizerResult | null
  onPreview?: () => void
  onSaveAll?: () => void
}

/**
 * Calculate the duration of a FadeInText animation
 * @param text - The text to be animated
 * @param stepMs - Delay between each character in milliseconds
 * @returns Total animation duration in milliseconds
 */
const calculateFadeInDuration = (text: string, stepMs: number = 20): number => {
  return text.length * stepMs + 200 // 200ms is the animation duration from CSS
}

export const OrganizerResultDialog: React.FC<OrganizerResultDialogProps> = ({
  open,
  onOpenChange,
  result,
  onPreview,
  onSaveAll,
}) => {
  const { container } = useContainer()

  const templateCount = result?.templates?.length ?? 0

  // Calculate the delay for the preview of prompt and second FadeInText based on the first text's duration
  const firstText =
    result && templateCount > 0
      ? i18n.t("promptOrganizer.summary.summary", [
          result.sourceCount,
          result.templates.length,
        ])
      : ""

  const firstFadeinDuration = calculateFadeInDuration(firstText)

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

        <div className="space-y-9 py-5">
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
                  {result && result.successMessageGenerated && (
                    <FadeInText text={firstText} />
                  )}
                </p>
              </div>
              <div className="space-y-4">
                <label className="inline-block font-semibold text-base text-foreground/60">
                  <BookOpenText className="size-5 inline-block mr-1.5 -mt-1" />
                  {i18n.t("promptOrganizer.summary.examplePrompts")}
                </label>
                {result && result.templates[0] && (
                  /* Preview the first prompt */
                  <div
                    className="border rounded-md px-3 py-2 bg-neutral-50 opacity-0 animate-fade-in-char"
                    style={{
                      animationDelay: `${firstFadeinDuration}ms`,
                      animationDuration: "500ms",
                    }}
                  >
                    <p className="mb-1 text-base font-semibold text-foreground/80">
                      <span>{result.templates[0].title}</span>
                    </p>
                    <p className="text-sm font-muted-foreground">
                      <span className="mr-2">
                        {i18n.t("promptOrganizer.preview.useCase")}:
                      </span>
                      <span>{result.templates[0].useCase}</span>
                    </p>
                  </div>
                )}
                <p className="font-serif text-base/7 tracking-wide">
                  {result && result.successMessage && (
                    <FadeInText
                      text={result.successMessage}
                      delay={firstFadeinDuration + 600} // FadeInText animation + Prompt preview animation delay + extra 100ms.
                    />
                  )}
                </p>
              </div>
              <div className="flex justify-center">
                {/* Preview button */}
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
          {templateCount === 0 ? (
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="mr-2"
            >
              {i18n.t("common.cancel")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onSaveAll}>
              <Save className="size-4" />
              {i18n.t("promptOrganizer.buttons.saveAll")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
