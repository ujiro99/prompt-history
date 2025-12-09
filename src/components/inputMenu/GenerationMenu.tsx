import React, { useCallback, useState } from "react"
import { Sparkles, NotebookPen, WandSparkles } from "lucide-react"
import {
  MenubarMenu,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar"
import { MenuTrigger } from "./MenuTrigger"
import { useCaretNode } from "@/hooks/useCaretNode"
import { useContainer } from "@/hooks/useContainer"
import { usePromptExecution } from "@/hooks/usePromptExecution"
import { usePromptOrganizer } from "@/hooks/usePromptOrganizer"
import { PromptImproveDialog } from "@/components/inputMenu/controller/PromptImproveDialog"
import { OrganizerExecuteDialog } from "@/components/promptOrganizer/OrganizerExecuteDialog"
import { OrganizerResultDialog } from "@/components/promptOrganizer/OrganizerResultDialog"
import { OrganizerPreviewDialog } from "@/components/promptOrganizer/OrganizerPreviewDialog"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { MENU, TestIds } from "@/components/const"
import type { ImprovePromptData } from "@/types/prompt"
import type { TemplateCandidate, UserAction } from "@/types/promptOrganizer"
import { analyticsService, ANALYTICS_EVENTS } from "@/services/analytics"
import { i18n } from "#imports"

const serviceFacade = PromptServiceFacade.getInstance()

type Props = {
  onMouseEnter: () => void
  saveEnabled: boolean
  onInteractOutside: () => void
}

export function GenerationMenu({
  onMouseEnter,
  saveEnabled,
  onInteractOutside,
}: Props): React.ReactElement {
  const { container } = useContainer()
  const { nodeAtCaret } = useCaretNode()
  const { setPrompt } = usePromptExecution({ nodeAtCaret })
  const {
    result,
    pendingTemplates,
    isExecuting,
    isCanceling,
    progress,
    error,
    executeOrganization,
    cancelGeneration,
    saveTemplates,
  } = usePromptOrganizer({})

  const [improvePromptData, setImprovePromptData] =
    useState<ImprovePromptData | null>(null)
  const [organizerExecuteOpen, setOrganizerExecuteOpen] = useState(false)
  const [organizerSummaryOpen, setOrganizerSummaryOpen] = useState(false)
  const [organizerPreviewOpen, setOrganizerPreviewOpen] = useState(false)

  /**
   * Open prompt-improve dialog
   */
  const openImproveDialog = async () => {
    if (!saveEnabled) return
    const content = serviceFacade.extractPromptContent()
    setImprovePromptData({
      content: content ?? "",
    })
  }

  /**
   * Input improved prompt process
   */
  const handleInputPrompt = async (data: ImprovePromptData) => {
    try {
      await setPrompt(data.content)
    } catch (error) {
      console.error("Input improved prompt failed:", error)
    }
  }

  /**
   * Open organizer execute dialog
   */
  const openOrganizerExecuteDialog = useCallback(() => {
    setOrganizerExecuteOpen(true)
    // setOrganizerSummaryOpen(true) // For testing
  }, [])

  /**
   * Execute prompt organization
   */
  const handleExecuteOrganization = useCallback(
    async (count: number) => {
      analyticsService.track(ANALYTICS_EVENTS.ORGANIZER_RUN, {
        value: count,
      })
      const ret = await executeOrganization()
      if (ret) {
        setOrganizerExecuteOpen(false)
        setOrganizerSummaryOpen(true)
      }
    },
    [executeOrganization],
  )

  /**
   * Preview templates
   */
  const handlePreviewTemplates = useCallback((count: number) => {
    setOrganizerSummaryOpen(false)
    setOrganizerPreviewOpen(true)
    analyticsService.track(ANALYTICS_EVENTS.ORGANIZER_REVIEW, {
      value: count,
    })
  }, [])

  /**
   * Save all templates
   */
  const handleSaveAllTemplates = useCallback(async () => {
    if (!result) return
    // Update userAction before saving
    const templates = result.templates.map((template) => ({
      ...template,
      userAction: "save" as UserAction,
    }))
    await saveTemplates(templates)
    if (!error) {
      setOrganizerSummaryOpen(false)
      analyticsService.track(ANALYTICS_EVENTS.ORGANIZER_SAVED, {
        value: templates.length,
      })
    }
  }, [result, saveTemplates, error])

  /**
   * Save templates from preview
   */
  const handleSaveTemplatesFromPreview = useCallback(
    async (templates: TemplateCandidate[]) => {
      await saveTemplates(templates)
      const savedCount = templates.filter(
        (t) => t.userAction === "save" || t.userAction === "save_and_pin",
      ).length
      if (savedCount > 0) {
        analyticsService.track(ANALYTICS_EVENTS.ORGANIZER_SAVED, {
          value: savedCount,
        })
      }
    },
    [saveTemplates],
  )

  return (
    <MenubarMenu value={MENU.Improve}>
      <MenuTrigger
        onMouseEnter={onMouseEnter}
        data-testid={TestIds.inputPopup.improveTrigger}
      >
        <Sparkles size={16} strokeWidth={1.75} className="stroke-neutral-600" />
      </MenuTrigger>
      <MenubarContent
        side="top"
        container={container}
        onInteractOutside={onInteractOutside}
      >
        <MenubarItem onClick={openImproveDialog} disabled={!saveEnabled}>
          <WandSparkles size={16} />
          {i18n.t("dialogs.promptImprove.title")}
        </MenubarItem>
        <MenubarItem onClick={openOrganizerExecuteDialog}>
          <NotebookPen size={16} />
          {i18n.t("promptOrganizer.title")}
        </MenubarItem>
      </MenubarContent>

      {/* Prompt Improve Dialog */}
      {improvePromptData && (
        <PromptImproveDialog
          open={improvePromptData !== null}
          onOpenChange={() => setImprovePromptData(null)}
          initialData={improvePromptData}
          onInput={handleInputPrompt}
        />
      )}

      {/* Organizer Execute Dialog */}
      <OrganizerExecuteDialog
        open={organizerExecuteOpen}
        onOpenChange={setOrganizerExecuteOpen}
        onExecute={handleExecuteOrganization}
        isExecuting={isExecuting}
        isCanceling={isCanceling}
        progress={progress}
        error={error}
        onCancel={cancelGeneration}
        pendingTemplates={pendingTemplates}
        onOpenPreview={() => {
          setOrganizerPreviewOpen(true)
          setOrganizerExecuteOpen(false)
        }}
      />

      {/* Organizer Result Dialog */}
      <OrganizerResultDialog
        open={organizerSummaryOpen}
        onOpenChange={setOrganizerSummaryOpen}
        result={result}
        // result={{
        //   templates: [
        //     {
        //       title: "多言語翻訳テンプレート",
        //       useCase: "テキストを任意の言語に翻訳",
        //     },
        //   ],
        //   sourceCount: 10,
        //   successMessage:
        //     "以前よく使われていた「テキストを任意の言語に翻訳」する作業を、必要な情報を埋めるだけで、よりスムーズに行えるようになりました。",
        //   successMessageGenerated: true,
        // }}
        onPreview={handlePreviewTemplates}
        onSaveAll={handleSaveAllTemplates}
      />

      {/* Organizer Preview Dialog */}
      <OrganizerPreviewDialog
        open={organizerPreviewOpen}
        onOpenChange={setOrganizerPreviewOpen}
        templates={pendingTemplates || []}
        onSave={handleSaveTemplatesFromPreview}
      />
    </MenubarMenu>
  )
}
