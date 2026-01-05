/**
 * Estimation Display Component
 * Shows token usage and context estimation for prompt organization
 */

import { ChevronsUpDown } from "lucide-react"
import { i18n } from "#imports"
import { cn, formatTokenCount } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrganizerExecutionEstimate } from "@/types/promptOrganizer"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import "@/components/ui/collapsible.css"
import { GEMINI_CONTEXT_LIMIT } from "@/services/genai/constants"

interface EstimationDisplayProps {
  estimate: OrganizerExecutionEstimate | null
  hideWhenNoEstimate?: boolean
  collapsible?: boolean
}

/**
 * Calculate context usage percentage
 */
const calculateContextUsagePercentage = (
  estimate: OrganizerExecutionEstimate | null,
): number => {
  if (!estimate) return 0
  return (estimate.estimatedInputTokens / GEMINI_CONTEXT_LIMIT) * 100
}

export const EstimationDisplay: React.FC<EstimationDisplayProps> = ({
  estimate,
  hideWhenNoEstimate = false,
  collapsible = false,
}) => {
  if (!estimate && hideWhenNoEstimate) {
    return null
  }
  return (
    <>
      {collapsible ? (
        <Collapsible className="flex flex-col items-end">
          <CollapsibleTrigger
            className={cn(
              "flex items-center gap-2 hover:bg-muted transition rounded-md px-2 py-1.5",
              !estimate && "p-0",
            )}
            disabled={!estimate}
          >
            <h3 className="text-sm cursor-pointer">
              {i18n.t("promptOrganizer.estimate.inputTokens")}
            </h3>
            {estimate ? (
              <span className="text-xs text-foreground/70 font-mono">
                {formatTokenCount(estimate.estimatedInputTokens)} tokens
              </span>
            ) : (
              <Skeleton className="h-6 w-24" />
            )}
            <ChevronsUpDown size={16} />
          </CollapsibleTrigger>
          <CollapsibleContent className="CollapsibleContent w-full pt-0.5">
            <EstimationDisplayContent estimate={estimate} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {i18n.t("promptOrganizer.estimate.title")}
          </h3>
          <EstimationDisplayContent estimate={estimate} />
        </div>
      )}
    </>
  )
}

const EstimationDisplayContent: React.FC<EstimationDisplayProps> = ({
  estimate,
}) => {
  const contextUsagePercent = calculateContextUsagePercentage(estimate)

  return (
    <div className="rounded-lg bg-muted border border-neutral-200 p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-foreground">
            {i18n.t("promptOrganizer.estimate.targetPrompts")}
          </span>
          <span className="font-mono">{estimate?.targetPromptCount ?? 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-foreground">
            {i18n.t("promptOrganizer.estimate.inputTokens")}
          </span>
          <span className="font-mono">
            {estimate?.estimatedInputTokens.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-foreground">
            {i18n.t("promptOrganizer.estimate.contextUsage")}
          </span>
          <span className="font-mono">{contextUsagePercent.toFixed(1)}%</span>
        </div>
        <Progress value={contextUsagePercent} className="h-2" />
      </div>
    </div>
  )
}
