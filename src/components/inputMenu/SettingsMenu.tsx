import React, { useCallback, useState } from "react"
import {
  EllipsisVertical,
  Download,
  Upload,
  Brain,
  Sparkles,
  NotebookPen,
} from "lucide-react"
import {
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
} from "@/components/ui/menubar"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/useSettings"
import { useContainer } from "@/hooks/useContainer"
import { promptExportService } from "@/services/importExport"
import { ImportDialog } from "./ImportDialog"
import { ModelSettingsDialog } from "@/components/settings/ModelSettingsDialog"
import { PromptImproverSettingsDialog } from "@/components/settings/PromptImproverSettingsDialog"
import { OrganizerSettingsDialog } from "@/components/promptOrganizer/OrganizerSettingsDialog"
import { OrganizerSummaryDialog } from "@/components/promptOrganizer/OrganizerSummaryDialog"
import { OrganizerPreviewDialog } from "@/components/promptOrganizer/OrganizerPreviewDialog"
import { MENU, TestIds } from "@/components/const"
import type { AppSettings, Prompt } from "@/types/prompt"
import type { ImportResult } from "@/services/importExport/types"
import type { PromptOrganizerResult } from "@/types/promptOrganizer"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"
import { i18n } from "#imports"

type Props = {
  onMouseEnter: () => void
  prompts?: Prompt[]
}

type MenuTriggerProps = React.ComponentProps<typeof MenubarTrigger>

function MenuTrigger(props: MenuTriggerProps): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-foreground cursor-pointer",
        props.disabled && "opacity-50 pointer-events-none",
      )}
      {...props}
    >
      {props.children}
    </MenubarTrigger>
  )
}

export function SettingsMenu({ onMouseEnter }: Props): React.ReactElement {
  const { settings, update } = useSettings()
  const { container } = useContainer()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false)
  const [promptImproverSettingsOpen, setPromptImproverSettingsOpen] =
    useState(false)
  const [organizerSettingsOpen, setOrganizerSettingsOpen] = useState(false)
  const [organizerSummaryOpen, setOrganizerSummaryOpen] = useState(false)
  const [organizerPreviewOpen, setOrganizerPreviewOpen] = useState(false)
  const [organizerResult, setOrganizerResult] =
    useState<PromptOrganizerResult | null>(null)

  /**
   * Handle settings change
   */
  const handleSettingChange = useCallback(
    async (key: keyof AppSettings, value: boolean | string) => {
      try {
        const updatedSettings = { [key]: value }
        await update(updatedSettings)
      } catch (error) {
        console.error("Settings update failed:", error)
      }
    },
    [update],
  )

  /**
   * Prevent menu from closing when settings items are clicked
   */
  const handleMenuItemClick = useCallback((event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  /**
   * Handle export prompts
   */
  const handleExport = useCallback(async () => {
    try {
      await promptExportService.exportToCSV()
      console.log("Export completed successfully")
    } catch (error) {
      console.error("Export failed:", error)
    }
  }, [])

  /**
   * Handle import prompts
   */
  const handleImport = useCallback(() => {
    setImportDialogOpen(true)
  }, [])

  /**
   * Handle import completion
   */
  const handleImportComplete = useCallback((result: ImportResult) => {
    console.log(
      `Import completed: ${result.imported} imported, ${result.duplicates} duplicates`,
    )
  }, [])

  /**
   * Handle open prompt improver settings
   */
  const handleOpenPromptImproverSettings = useCallback(() => {
    setPromptImproverSettingsOpen(true)
  }, [])

  /**
   * Handle open prompt organizer settings
   */
  const handleOpenPromptOrganizer = useCallback(() => {
    setOrganizerSettingsOpen(true)
  }, [])

  /**
   * Handle preview templates
   */
  const handlePreviewTemplates = useCallback(() => {
    setOrganizerSummaryOpen(false)
    setOrganizerPreviewOpen(true)
  }, [])

  /**
   * Handle save all templates
   */
  const handleSaveAllTemplates = useCallback(async () => {
    if (!organizerResult) return
    try {
      await promptOrganizerService.saveTemplates(organizerResult.templates)
      setOrganizerSummaryOpen(false)
      setOrganizerResult(null)
    } catch (error) {
      console.error("Save failed:", error)
    }
  }, [organizerResult])

  /**
   * Handle save templates from preview
   */
  const handleSaveTemplatesFromPreview = useCallback(async (templates) => {
    try {
      await promptOrganizerService.saveTemplates(templates)
      setOrganizerPreviewOpen(false)
      setOrganizerResult(null)
    } catch (error) {
      console.error("Save failed:", error)
    }
  }, [])

  return (
    <MenubarMenu value={MENU.Settings}>
      <MenuTrigger
        onMouseEnter={onMouseEnter}
        data-testid={TestIds.inputPopup.settingsTrigger}
      >
        <EllipsisVertical size={16} className="stroke-neutral-600" />
      </MenuTrigger>
      <MenubarContent
        side="top"
        className="max-w-64"
        data-testid={TestIds.inputPopup.settingsContent}
        container={container}
      >
        {settings && (
          <>
            {/* ON/OFF Settings Group */}
            <MenubarLabel className="text-xs font-medium text-muted-foreground">
              {i18n.t("settings.groups.feature")}
            </MenubarLabel>
            <MenubarCheckboxItem
              checked={settings.autoSaveEnabled}
              onCheckedChange={(checked) =>
                handleSettingChange("autoSaveEnabled", checked)
              }
              onSelect={handleMenuItemClick}
            >
              {i18n.t("settings.autoSave")}
            </MenubarCheckboxItem>

            <MenubarCheckboxItem
              checked={settings.autoCompleteEnabled ?? true}
              onCheckedChange={(checked) =>
                handleSettingChange("autoCompleteEnabled", checked)
              }
              onSelect={handleMenuItemClick}
            >
              {i18n.t("settings.autoComplete")}
            </MenubarCheckboxItem>

            <MenubarCheckboxItem
              checked={settings.showNotifications}
              onCheckedChange={(checked) =>
                handleSettingChange("showNotifications", checked)
              }
              onSelect={handleMenuItemClick}
            >
              {i18n.t("settings.notifications")}
            </MenubarCheckboxItem>

            <MenubarCheckboxItem
              checked={settings.variableExpansionEnabled ?? true}
              onCheckedChange={(checked) =>
                handleSettingChange("variableExpansionEnabled", checked)
              }
              onSelect={handleMenuItemClick}
            >
              {i18n.t("settings.variableExpansion")}
            </MenubarCheckboxItem>

            <MenubarSeparator />

            {/* Selection Settings Group */}
            <MenubarLabel className="text-xs font-medium text-muted-foreground">
              {i18n.t("settings.groups.autocompleteTarget")}
            </MenubarLabel>
            <MenubarRadioGroup
              value={settings.autoCompleteTarget ?? "all"}
              onValueChange={(value) =>
                handleSettingChange("autoCompleteTarget", value)
              }
            >
              <MenubarRadioItem value="all" onSelect={handleMenuItemClick}>
                {i18n.t("settings.autoCompleteTarget.all")}
              </MenubarRadioItem>
              <MenubarRadioItem value="pinned" onSelect={handleMenuItemClick}>
                {i18n.t("settings.autoCompleteTarget.pinned")}
              </MenubarRadioItem>
            </MenubarRadioGroup>

            <MenubarSeparator />

            {/* Action Settings Group */}
            <MenubarLabel className="text-xs font-medium text-muted-foreground">
              {i18n.t("settings.groups.importExport")}
            </MenubarLabel>
            <MenubarItem
              onClick={handleExport}
              data-testid={TestIds.settingsMenu.export}
            >
              <Download size={16} />
              {i18n.t("settings.export")}
            </MenubarItem>

            <MenubarItem
              onClick={handleImport}
              data-testid={TestIds.settingsMenu.import}
            >
              <Upload size={16} />
              {i18n.t("settings.import")}
            </MenubarItem>

            <MenubarSeparator />

            {/* Prompt Generation Group */}
            <MenubarLabel className="text-xs font-medium text-muted-foreground">
              {i18n.t("settings.groups.promptGeneration")}
            </MenubarLabel>
            <MenubarItem onClick={() => setModelSettingsOpen(true)}>
              <Brain size={16} />
              {i18n.t("settings.modelSettings")}
            </MenubarItem>
            <MenubarItem onClick={handleOpenPromptImproverSettings}>
              <Sparkles size={16} />
              {i18n.t("settings.promptImproverSettings")}
            </MenubarItem>
            <MenubarItem onClick={handleOpenPromptOrganizer}>
              <NotebookPen size={16} />
              {i18n.t("settings.promptOrganizerSettings")}
            </MenubarItem>
          </>
        )}
      </MenubarContent>

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />

      {/* Model Settings Dialog */}
      <ModelSettingsDialog
        open={modelSettingsOpen}
        onOpenChange={setModelSettingsOpen}
      />

      {/* Prompt Improver Settings Dialog */}
      <PromptImproverSettingsDialog
        open={promptImproverSettingsOpen}
        onOpenChange={setPromptImproverSettingsOpen}
      />

      {/* Organizer Settings Dialog */}
      <OrganizerSettingsDialog
        open={organizerSettingsOpen}
        onOpenChange={setOrganizerSettingsOpen}
      />

      {/* Organizer Summary Dialog */}
      <OrganizerSummaryDialog
        open={organizerSummaryOpen}
        onOpenChange={setOrganizerSummaryOpen}
        result={organizerResult}
        onPreview={handlePreviewTemplates}
        onSaveAll={handleSaveAllTemplates}
      />

      {/* Organizer Preview Dialog */}
      <OrganizerPreviewDialog
        open={organizerPreviewOpen}
        onOpenChange={setOrganizerPreviewOpen}
        templates={organizerResult?.templates || []}
        onSave={handleSaveTemplatesFromPreview}
      />
    </MenubarMenu>
  )
}
