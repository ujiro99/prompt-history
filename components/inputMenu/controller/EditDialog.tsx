import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { SaveMode } from "@/types/prompt"
import type { SaveDialogData } from "@/types/prompt"
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
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
  /** Dialog display mode */
  displayMode: SaveMode
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
  displayMode,
  onSave,
}) => {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = displayMode === SaveMode.Overwrite
  const isCopy = displayMode === SaveMode.Copy

  // Update initial values
  useEffect(() => {
    setName(initialName)
    setContent(initialContent)
  }, [initialName, initialContent])

  /**
   * Save processing
   */
  const handleSave = async (saveMode: SaveMode) => {
    if (!name.trim()) {
      return // Do nothing if name is empty
    }

    setIsLoading(true)

    try {
      const saveData: SaveDialogData = {
        name: name.trim(),
        content: content.trim(),
        saveMode: saveMode,
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
      handleSave(displayMode)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Prompt" : isCopy ? "Copy Prompt" : "New Prompt"}
          </DialogTitle>
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
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <ButtonGroup>
            <Button
              onClick={() =>
                handleSave(
                  isEdit
                    ? SaveMode.Overwrite
                    : isCopy
                      ? SaveMode.Copy
                      : SaveMode.New,
                )
              }
              disabled={isLoading || !name.trim() || !content.trim()}
            >
              {isEdit
                ? isLoading
                  ? "Updating..."
                  : "Update"
                : isCopy
                  ? isLoading
                    ? "Saving..."
                    : "Save as Copy"
                  : isLoading
                    ? "Saving..."
                    : "Save"}
            </Button>
            {isEdit && !isCopy && (
              <SaveAsNew
                disabled={isLoading || !name.trim() || !content.trim()}
                onSaveAsNew={() => handleSave(SaveMode.New)}
                className="w-6"
              />
            )}
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SaveAsNewProps extends React.ComponentProps<"button"> {
  onSaveAsNew?: () => void
}

export function SaveAsNew(props: SaveAsNewProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger {...props} asChild>
        <Button>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuItem onClick={props.onSaveAsNew}>
          Save as new prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
