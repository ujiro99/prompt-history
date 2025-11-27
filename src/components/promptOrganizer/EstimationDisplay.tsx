/**
 * Estimation Display Component
 * Shows token usage and context estimation for prompt organization
 */

import { i18n } from "#imports"
import { Progress } from "@/components/ui/progress"
import type { OrganizerExecutionEstimate } from "@/types/promptOrganizer"

interface EstimationDisplayProps {
  estimate: OrganizerExecutionEstimate | null
  hideWhenNoEstimate?: boolean
}

const MAX_TOKENS = 1000000 // Gemini 1.5 Flash context window

/**
 * Calculate context usage percentage
 */
const calculateContextUsagePercentage = (
  estimate: OrganizerExecutionEstimate | null,
): number => {
  if (!estimate) return 0
  return (estimate.estimatedInputTokens / MAX_TOKENS) * 100
}

export const EstimationDisplay: React.FC<EstimationDisplayProps> = ({
  estimate,
  hideWhenNoEstimate = false,
}) => {
  if (!estimate && hideWhenNoEstimate) {
    return null
  }

  const contextUsagePercent = calculateContextUsagePercentage(estimate)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        {i18n.t("promptOrganizer.estimate.title")}
      </h3>

      <div className="rounded-lg bg-muted p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-foreground">
              {i18n.t("promptOrganizer.estimate.targetPrompts")}
            </span>
            <span className="font-mono">
              {estimate?.targetPromptCount ?? 0}
            </span>
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
    </div>
  )
}
