import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { i18n } from "#imports"

interface ApiKeyWarningBannerProps {
  onOpenSettings: () => void
  variant?: "warning" | "destructive"
  className?: string
}

/**
 * API Key Warning Banner Component
 * Displays a warning when API key is not configured with a button to open settings
 */
export const ApiKeyWarningBanner: React.FC<ApiKeyWarningBannerProps> = ({
  onOpenSettings,
  variant = "destructive",
  className,
}) => {
  const colorClasses =
    variant === "warning"
      ? {
          bg: "bg-warning",
          border: "border-warning-foreground/20",
          text: "text-warning-foreground",
        }
      : {
          bg: "bg-destructive-foreground",
          border: "border-destructive/40",
          text: "text-destructive",
        }

  return (
    <div
      className={`p-3 mb-4 ${colorClasses.bg} border ${colorClasses.border} rounded-md ${className || ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <AlertCircle className={`size-6 ${colorClasses.text}`} />
          <span className={`text-sm ${colorClasses.text}`}>
            {i18n.t("common.apiKeyNotConfigured")}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          {i18n.t("common.openSettings")}
        </Button>
      </div>
    </div>
  )
}
