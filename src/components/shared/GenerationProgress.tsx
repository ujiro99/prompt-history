import { useState, useEffect, useRef } from "react"
import { formatTokenCount } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { i18n } from "#imports"
import type { GenerationProgress as GenerationProgressType } from "@/types/promptOrganizer"

interface GenerationProgressProps {
  progress: GenerationProgressType
  accumulatedTextLabel?: string
  showAccumulatedText?: boolean
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  accumulatedTextLabel,
  showAccumulatedText = true,
}) => {
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new data is accumulated
  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport || !progress?.accumulated) return
    viewport.scrollTop = viewport.scrollHeight
  }, [progress?.accumulated])

  return (
    <section className="space-y-2">
      <div className="rounded-lg border p-4 space-y-2 text-xs font-mono text-muted-foreground">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">
              <StatusLabel status={progress.status} />
            </h3>
            <span className="text-muted-foreground">
              {progress.estimatedProgress}%
            </span>
          </div>
          <Progress value={progress.estimatedProgress} className="h-2" />
        </div>

        {/* Token Usage */}
        <div className="flex gap-2">
          <p>
            <span>{i18n.t("promptOrganizer.estimate.thoughtsTokens")}: </span>
            <span className="text-muted-foreground">
              {formatTokenCount(progress.thoughtsTokens) ?? 0} tokens
            </span>
          </p>
          <span>|</span>
          <p>
            <span>{i18n.t("promptOrganizer.estimate.outputTokens")}: </span>
            <span className="text-muted-foreground">
              {formatTokenCount(progress.outputTokens) ?? 0} tokens
            </span>
          </p>
        </div>

        {/* Partial JSON Preview */}
        {showAccumulatedText &&
          progress.accumulated &&
          progress.accumulated.length > 50 && (
            <div className="space-y-1 pt-3">
              <p className="text-foreground">
                {accumulatedTextLabel ||
                  i18n.t("promptOrganizer.execute.receivingPrompts")}
              </p>
              <ScrollArea
                className="h-16 rounded border bg-muted p-2"
                viewportRef={scrollViewportRef}
              >
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {progress.accumulated}
                </pre>
              </ScrollArea>
            </div>
          )}
      </div>
    </section>
  )
}

const StatusLabel: React.FC<{
  status: GenerationProgressType["status"]
}> = ({ status }) => {
  const [dot, setDot] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (status === "complete" || status === "error") return

    let count = 0
    const interval = setInterval(() => {
      count = (count + 1) % 4
      setDot(".".repeat(count))
    }, 500)

    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    const updateThinking = () => {
      let count = 0
      const interval = setInterval(() => {
        count = (count + 1) % 3
        setMessage(i18n.t(`promptOrganizer.status.thinking${count}`))
      }, 500 * 4)
      return () => clearInterval(interval)
    }

    switch (status) {
      case "sending":
        setMessage(i18n.t("promptOrganizer.status.sending"))
        break
      case "thinking":
        setMessage(i18n.t("promptOrganizer.status.thinking0"))
        return updateThinking()
      case "generating":
        setMessage(i18n.t("promptOrganizer.status.generating"))
        break
      case "complete":
        setMessage(i18n.t("promptOrganizer.status.complete"))
        break
      case "error":
        setMessage(i18n.t("promptOrganizer.status.error"))
        break
      default:
        setMessage("Processing")
    }
  }, [status])

  return (
    <span className="font-sans text-foreground">
      ⚡ {message}
      {dot}
    </span>
  )
}
