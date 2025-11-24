/**
 * Organizer Summary Dialog Component
 * Displays organization results summary with statistics
 */

import { i18n } from "#imports"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useContainer } from "@/hooks/useContainer"
import { stopPropagation } from "@/utils/dom"
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

  if (!result) return null

  /**
   * Get representative template for highlight
   */
  const getRepresentativeTemplate = () => {
    if (result.templates.length === 0) return null
    // Return the template with the most source prompts
    return result.templates.reduce((prev, current) =>
      current.aiMetadata.sourceCount > prev.aiMetadata.sourceCount
        ? current
        : prev,
    )
  }

  /**
   * Format timestamp
   */
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString()
  }

  const representativeTemplate = getRepresentativeTemplate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-xl sm:max-w-2xl"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.summary.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.summary.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Count Badge */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl font-bold text-blue-600">
                {result.templates.length}
              </span>
              <span className="text-lg text-blue-800">
                {i18n.t("promptOrganizer.summary.templatesGenerated")}
              </span>
            </div>
          </div>

          {/* Source Info Card */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.summary.sourceInfo")}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">
                  {i18n.t("promptOrganizer.summary.sourcePrompts")}
                </div>
                <div className="font-semibold text-lg">
                  {result.sourceCount}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {i18n.t("promptOrganizer.summary.period")}
                </div>
                <div className="font-semibold text-lg">
                  {result.periodDays} {i18n.t("promptOrganizer.summary.days")}
                </div>
              </div>
            </div>
          </div>

          {/* Highlight Card - Representative Template */}
          {representativeTemplate && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {i18n.t("promptOrganizer.summary.highlight")}
              </div>
              <div className="space-y-1">
                <div className="font-semibold">
                  {representativeTemplate.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {representativeTemplate.useCase}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {i18n.t("promptOrganizer.summary.basedOn", {
                    count: representativeTemplate.aiMetadata.sourceCount,
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Token Usage and Cost */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.summary.usage")}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {i18n.t("promptOrganizer.estimate.inputTokens")}
                </span>
                <span className="font-mono">
                  {result.inputTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {i18n.t("promptOrganizer.estimate.outputTokens")}
                </span>
                <span className="font-mono">
                  {result.outputTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">
                  {i18n.t("promptOrganizer.summary.actualCost")}
                </span>
                <span className="font-mono font-semibold">
                  ¥{result.estimatedCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Timestamp */}
          <div className="text-xs text-muted-foreground text-center">
            {i18n.t("promptOrganizer.summary.executedAt")}:{" "}
            {formatTimestamp(result.executedAt)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onPreview}>
            {i18n.t("promptOrganizer.buttons.preview")}
          </Button>
          <Button onClick={onSaveAll}>
            {i18n.t("promptOrganizer.buttons.saveAll")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
