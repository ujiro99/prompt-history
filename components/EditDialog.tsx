import { useState, useEffect } from "react"
import type { SaveDialogData } from "../types/prompt"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * Props for prompt edit dialog
 */
interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Initial prompt name (when editing) */
  initialName?: string
  /** Initial prompt content */
  initialContent: string
  /** Whether overwrite save is available */
  isOverwriteAvailable: boolean
  /** Callback on save */
  onSave: (data: SaveDialogData) => Promise<void>
}

/**
 * Prompt save/edit dialog component
 */
export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  initialName = "",
  initialContent,
  isOverwriteAvailable,
  onSave,
}) => {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [saveMode, setSaveMode] = useState<"new" | "overwrite">("new")
  const [isLoading, setIsLoading] = useState(false)

  // Update initial values
  useEffect(() => {
    setName(initialName)
    setContent(initialContent)
  }, [initialName, initialContent])

  /**
   * Save processing
   */
  const handleSave = async () => {
    if (!name.trim()) {
      return // Do nothing if name is empty
    }

    setIsLoading(true)

    try {
      const saveData: SaveDialogData = {
        name: name.trim(),
        content: content.trim(),
        saveMode,
      }

      await onSave(saveData)
    } finally {
      setIsLoading(false)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  /**
   * Keyboard event handling
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt name input */}
          <div className="space-y-2">
            <label
              htmlFor="prompt-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="prompt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prompt name..."
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Prompt content input */}
          <div className="space-y-2">
            <label
              htmlFor="prompt-content"
              className="text-sm font-medium text-foreground"
            >
              Content
            </label>
            <Textarea
              id="prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter prompt content..."
              disabled={isLoading}
              rows={6}
            />
          </div>

          {/* Save mode selection */}
          {isOverwriteAvailable && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Save Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="new"
                    checked={saveMode === "new"}
                    onChange={(e) =>
                      setSaveMode(e.target.value as "new" | "overwrite")
                    }
                    disabled={isLoading}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Save as new prompt</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="overwrite"
                    checked={saveMode === "overwrite"}
                    onChange={(e) =>
                      setSaveMode(e.target.value as "new" | "overwrite")
                    }
                    disabled={isLoading}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Overwrite current prompt</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !content.trim()}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
