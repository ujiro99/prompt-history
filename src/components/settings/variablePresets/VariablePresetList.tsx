import { useRef, useEffect } from "react"
import { Plus, MoveUp, MoveDown } from "lucide-react"
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
  onReorder: (fromIndex: number, toIndex: number) => void
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
  onReorder,
}) => {
  const selectedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Auto-scroll to selected item in the list
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      })
    }
  }, [selectedId])

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header with add button */}
      <div className="mb-4 p-1 pr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="w-full group"
        >
          <Plus
            className={cn(
              "size-4 transition",
              "group-hover:scale-120 group-hover:stroke-blue-500",
            )}
          />
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
            presets.map((preset, index) => (
              <div
                key={preset.id}
                className="relative flex group"
                ref={selectedId === preset.id ? selectedRef : null}
              >
                <button
                  onClick={() => onSelect(preset)}
                  className={cn(
                    "flex-1 rounded-md border p-3 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedId === preset.id &&
                      "ring-2 ring-blue-300 bg-accent text-accent-foreground",
                  )}
                >
                  <div className="font-medium break-all">{preset.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground break-all">
                    {i18n.t("variableTypes.type", [
                      i18n.t(`variableTypes.${preset.type}`),
                    ])}
                    {preset.description && ` - ${preset.description}`}
                  </div>
                </button>
                <ListItemController
                  index={index}
                  moveUpDisabled={index === 0}
                  moveDownDisabled={index === presets.length - 1}
                  onReorder={onReorder}
                  className="absolute top-[50%] right-1 -translate-y-1/2"
                />
              </div>
            ))
          )}
        </div>
      </ScrollAreaWithGradient>
    </div>
  )
}

interface PresetItemControllerProps {
  index: number
  moveUpDisabled: boolean
  moveDownDisabled: boolean
  onReorder: (fromIndex: number, toIndex: number) => void
  className?: string
}

/* Move up/down buttons */
const ListItemController: React.FC<PresetItemControllerProps> = ({
  index,
  moveUpDisabled,
  moveDownDisabled,
  onReorder,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-row opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      {/* Move up buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReorder(index, index - 1)}
        disabled={moveUpDisabled}
        className="size-7 p-1.5 group/button transition bg-background/50 backdrop-blur-xs hover:bg-background/80"
        title={i18n.t("variablePresets.moveUp")}
      >
        <MoveUp
          className={cn(
            "size-4 stroke-neutral-500 transition",
            "group-hover/button:scale-120",
          )}
        />
      </Button>
      {/* Move down buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReorder(index, index + 1)}
        disabled={moveDownDisabled}
        className="-ml-2 size-7 p-1.5 group/button transition bg-background/50 backdrop-blur-xs hover:bg-background/80"
        title={i18n.t("variablePresets.moveDown")}
      >
        <MoveDown
          className={cn(
            "size-4 stroke-neutral-500 transition",
            "group-hover/button:scale-120",
          )}
        />
      </Button>
    </div>
  )
}
