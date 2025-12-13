import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VariablePreset } from "@/types/prompt"
import { i18n } from "#imports"
import { ScrollAreaWithGradient } from "@/components/inputMenu/ScrollAreaWithGradient"

/**
 * Props for VariablePresetList
 */
interface VariablePresetListProps {
  presets: VariablePreset[]
  selectedId: string | null
  onSelect: (preset: VariablePreset) => void
  onAdd: () => void
}

/**
 * Variable Preset List Component
 * Displays list of variable presets with add button
 */
export const VariablePresetList: React.FC<VariablePresetListProps> = ({
  presets,
  selectedId,
  onSelect,
  onAdd,
}) => {
  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header with add button */}
      <div className="mb-4 p-1 pr-4">
        <Button variant="outline" size="sm" onClick={onAdd} className="w-full">
          <Plus className="size-4 mr-1" />
          {i18n.t("variablePresets.addVariable")}
        </Button>
      </div>

      {/* Preset list */}
      <ScrollAreaWithGradient
        indicatorVisible={false}
        className="p-1 pr-4"
        rootClassName="min-h-0"
      >
        <div className="flex-1 space-y-2">
          {presets.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {i18n.t("variablePresets.noPresets")}
            </div>
          ) : (
            presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedId === preset.id &&
                    "ring-2 ring-blue-300 bg-accent text-accent-foreground",
                )}
              >
                <div className="font-medium">{preset.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {i18n.t("variableTypes.type", [
                    i18n.t(`variableTypes.${preset.type}`),
                  ])}
                  {preset.description && ` - ${preset.description}`}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollAreaWithGradient>
    </div>
  )
}
