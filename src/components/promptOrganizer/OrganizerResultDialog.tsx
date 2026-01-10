/**
 * Organizer Result Dialog Component
 * Displays organization results summary with statistics
 */

import { useState, useEffect } from "react"
import { i18n } from "#imports"
import {
  NotebookPen,
  Save,
  Sparkles,
  BookOpenText,
  MessageCircleMore,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FadeInText } from "@/components/promptOrganizer/FadeInText"
import { useContainer } from "@/hooks/useContainer"
import { stopPropagation } from "@/utils/dom"
import { cn } from "@/lib/utils"
import { categoryService } from "@/services/promptOrganizer/CategoryService"
import type { PromptOrganizerResult } from "@/types/promptOrganizer"

interface OrganizerResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: PromptOrganizerResult | null
  onPreview?: (count: number) => void
  onSaveAll?: () => void
}

/**
 * Calculate the duration of a FadeInText animation
 * @param text - The text to be animated
 * @param stepMs - Delay between each character in milliseconds
 * @returns Total animation duration in milliseconds
 */
const calculateFadeInDuration = (text: string, stepMs: number): number => {
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
  const [category, setCategory] = useState<string>("")

  const templateCount = result?.templates?.length ?? 0
  const exampleTemplate = result?.templates?.[0]

  // Calculate the delay for the preview of prompt and second FadeInText based on the first text's duration
  const firstText =
    result && templateCount > 0
      ? i18n.t("promptOrganizer.summary.summary", [
          result.sourceCount,
          result.templates.length,
        ])
      : ""

  const firstFadeinDuration = calculateFadeInDuration(firstText, 10)

  useEffect(() => {
    // Load default category for organizer results
    categoryService.getAll().then((categories) => {
      if (categories && exampleTemplate) {
        const cat = categories.find((c) => exampleTemplate.categoryId === c.id)
        setCategory(cat ? cat.name : "")
      }
    })
  }, [exampleTemplate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-2xl p-8"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.summary.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {i18n.t("promptOrganizer.summary.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-9 py-5">
          {templateCount === 0 ? (
            <p>{i18n.t("promptOrganizer.summary.noTemplates")}</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="inline-block font-semibold text-base">
                  <Sparkles className="size-5 inline-block mr-1.5 -mt-1 text-amber-400 fill-amber-200" />
                  {i18n.t("promptOrganizer.summary.organizationPerformed")}
                </label>
                <p className="font-serif text-lg tracking-wide">
                  {result && result.successMessageGenerated && (
                    <FadeInText text={firstText} />
                  )}
                </p>
              </div>
              <div className="space-y-4">
                <label className="inline-block font-semibold text-base">
                  <BookOpenText className="size-5 inline-block mr-1.5" />
                  {i18n.t("promptOrganizer.summary.examplePrompts")}
                </label>
                {exampleTemplate && (
                  /* Preview the first prompt */
                  <div
                    className="border-y px-3 py-4 space-y-2 opacity-0 animate-fade-in"
                    style={{
                      animationDelay: `${firstFadeinDuration}ms`,
                      animationDuration: "500ms",
                    }}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">
                        {i18n.t("promptOrganizer.preview.title_label")}:
                      </div>
                      <p className="md:text-3xl font-extrabold h-auto text-foreground/80">
                        <span>{exampleTemplate.title}</span>
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">
                        {i18n.t("promptOrganizer.preview.useCase")}:
                      </p>
                      <p className="text-base font-medium text-muted-foreground">
                        <span>{exampleTemplate.useCase}</span>
                      </p>
                    </div>
                    {category && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">
                          {i18n.t("promptOrganizer.preview.category")}:
                        </p>
                        <p className="border text-xs rounded-lg px-2 py-1 bg-muted/80 font-medium font-mono text-foreground/80">
                          <span>{category}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation message */}
                {result && result.successMessage && (
                  <div
                    className="pt-2 space-y-2  opacity-0 animate-fade-in"
                    style={{
                      animationDelay: `${firstFadeinDuration + 400}ms`,
                      animationDuration: "500ms",
                    }}
                  >
                    <div className="text-sm font-semibold">
                      <MessageCircleMore className="size-4 inline-block mr-1 -mt-1 stroke-fuchsia-400 fill-purple-100" />
                      {i18n.t("promptOrganizer.preview.explanation")}
                    </div>
                    <blockquote className="font-serif border-l-2 px-4 py-3 bg-muted/60 tracking-wide">
                      <FadeInText
                        text={result.successMessage}
                        delay={firstFadeinDuration + 600} // FadeInText animation + Prompt preview animation delay + extra 100ms.
                      />
                    </blockquote>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                {/* Preview button */}
                <Button
                  variant="outline"
                  onClick={() => onPreview?.(templateCount)}
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
