/**
 * Organizer Preview Dialog Component
 * Two-column layout for previewing and editing template candidates
 */

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useContainer } from "@/hooks/useContainer"
import { CategorySelector } from "./CategorySelector"
import { TemplateCandidateCard } from "./TemplateCandidateCard"
import { stopPropagation } from "@/utils/dom"
import type { TemplateCandidate } from "@/types/promptOrganizer"

interface OrganizerPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: TemplateCandidate[]
  onSave?: (templates: TemplateCandidate[]) => void
  onClose?: () => void
}

export const OrganizerPreviewDialog: React.FC<OrganizerPreviewDialogProps> = ({
  open,
  onOpenChange,
  templates,
  onSave,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [editedTemplates, setEditedTemplates] = useState([...templates])
  const [showSourcePrompts, setShowSourcePrompts] = useState(false)
  const { container } = useContainer()

  console.log("Edited Templates:", editedTemplates)

  const selectedTemplate = editedTemplates[selectedIndex]

  /**
   * Update selected template
   */
  const updateTemplate = (updates: Partial<TemplateCandidate>) => {
    const updated = [...editedTemplates]
    updated[selectedIndex] = {
      ...updated[selectedIndex],
      ...updates,
    }
    setEditedTemplates(updated)
  }

  /**
   * Highlight variables in content
   */
  const highlightVariables = (content: string): React.ReactElement => {
    const parts = content.split(/(\{\{[^}]+\}\})/g)
    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/\{\{[^}]+\}\}/)) {
            return (
              <span key={index} className="text-primary font-semibold">
                {part}
              </span>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </>
    )
  }

  /**
   * Handle discard action
   */
  const handleDiscard = () => {
    updateTemplate({ userAction: "discard" })
  }

  /**
   * Handle save action
   */
  const handleSave = () => {
    updateTemplate({ userAction: "save" })
  }

  /**
   * Handle save and pin action
   */
  const handleSaveAndPin = () => {
    updateTemplate({ userAction: "save_and_pin" })
  }

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    if (onClose) {
      onClose()
    }
    onOpenChange(false)
  }

  /**
   * Handle finish
   */
  const handleFinish = () => {
    if (onSave) {
      console.log("Saving templates:", editedTemplates)
      onSave(editedTemplates)
    }
    onOpenChange(false)
  }

  useEffect(() => {
    setEditedTemplates(templates)
    setSelectedIndex(0)
  }, [templates])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full sm:max-w-6xl max-h-[80vh] flex flex-col"
        container={container}
        {...stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{i18n.t("promptOrganizer.preview.title")}</DialogTitle>
          <DialogDescription>
            {i18n.t("promptOrganizer.preview.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-4 py-4 flex-1 min-h-0">
          {/* Left Pane: Template List */}
          <div className="col-span-1 flex flex-col min-h-0 gap-2">
            <div className="text-sm font-medium">
              {i18n.t("promptOrganizer.preview.templateList")}
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 p-2">
                {editedTemplates.map((template, index) => (
                  <TemplateCandidateCard
                    key={template.id}
                    candidate={template}
                    isSelected={index === selectedIndex}
                    onClick={() => setSelectedIndex(index)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Pane: Template Detail */}
          <div className="col-span-2 flex flex-col min-h-0 gap-4">
            {!selectedTemplate ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">
                    {i18n.t("promptOrganizer.preview.emptyState")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-4 p-2">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {i18n.t("promptOrganizer.preview.title_label")}
                      </div>
                      <Input
                        value={selectedTemplate.title}
                        onChange={(e) =>
                          updateTemplate({ title: e.target.value })
                        }
                        maxLength={20}
                      />
                    </div>

                    {/* Use Case Input */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {i18n.t("promptOrganizer.preview.useCase")}
                      </div>
                      <Input
                        value={selectedTemplate.useCase}
                        onChange={(e) =>
                          updateTemplate({ useCase: e.target.value })
                        }
                        maxLength={40}
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {i18n.t("promptOrganizer.preview.category")}
                      </div>
                      <CategorySelector
                        value={selectedTemplate.categoryId}
                        onValueChange={(categoryId) =>
                          updateTemplate({ categoryId })
                        }
                      />
                    </div>

                    {/* Content Preview */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {i18n.t("promptOrganizer.preview.content")}
                      </div>
                      <Textarea
                        value={selectedTemplate.content}
                        onChange={(e) =>
                          updateTemplate({ content: e.target.value })
                        }
                        rows={8}
                        className="font-mono text-xs"
                      />
                      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                        {highlightVariables(selectedTemplate.content)}
                      </div>
                    </div>

                    {/* Variables List */}
                    {selectedTemplate.variables.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {i18n.t("promptOrganizer.preview.variables")}
                        </div>
                        <div className="rounded-lg border p-3 space-y-2">
                          {selectedTemplate.variables.map((variable, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="font-mono text-primary">
                                {`{{${variable.name}}}`}
                              </span>
                              <span className="text-muted-foreground">
                                {variable.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Prompts Collapse */}
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSourcePrompts(!showSourcePrompts)}
                        className="w-full justify-between"
                      >
                        <span className="text-sm font-medium">
                          {i18n.t("promptOrganizer.preview.sourcePrompts")} (
                          {selectedTemplate.aiMetadata.sourceCount})
                        </span>
                        <span>{showSourcePrompts ? "▲" : "▼"}</span>
                      </Button>
                      {showSourcePrompts && (
                        <div className="rounded-lg border p-3 space-y-1">
                          {selectedTemplate.aiMetadata.sourcePromptIds.map(
                            (id) => (
                              <div
                                key={id}
                                className="text-xs text-muted-foreground font-mono"
                              >
                                {id}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Template Actions */}
                <div className="flex gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={selectedTemplate.userAction === "discard"}
                  >
                    {i18n.t("promptOrganizer.buttons.discard")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={
                      selectedTemplate.userAction === "save" ||
                      selectedTemplate.userAction === "save_and_pin"
                    }
                  >
                    {i18n.t("promptOrganizer.buttons.save")}
                  </Button>
                  <Button
                    onClick={handleSaveAndPin}
                    disabled={selectedTemplate.userAction === "save_and_pin"}
                  >
                    {i18n.t("promptOrganizer.buttons.saveAndPin")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {i18n.t("common.cancel")}
          </Button>
          <Button onClick={handleFinish}>{i18n.t("buttons.finish")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
