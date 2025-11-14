import React, { useCallback, useState } from "react"
import { EllipsisVertical, Download, Upload, RefreshCw } from "lucide-react"
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
import { MENU, TestIds } from "@/components/const"
import type { AppSettings } from "@/types/prompt"
import type { ImportResult } from "@/services/importExport/types"
import { i18n } from "#imports"
import { StorageService } from "@/services/storage"

type Props = {
  onMouseEnter: () => void
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
  const storageService = StorageService.getInstance()

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
   * Handle refresh improve prompt cache
   */
  const handleRefreshImprovePromptCache = useCallback(async () => {
    try {
      // Clear the cache to force refresh
      await storageService.clearImprovePromptCache()
      console.log("Improve prompt cache cleared for refresh")
    } catch (error) {
      console.error("Failed to refresh improve prompt cache:", error)
    }
  }, [storageService])

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

            {/* Cache Management Group */}
            <MenubarLabel className="text-xs font-medium text-muted-foreground">
              {i18n.t("settings.groups.cacheManagement")}
            </MenubarLabel>
            <MenubarItem onClick={handleRefreshImprovePromptCache}>
              <RefreshCw size={16} />
              {i18n.t("settings.refreshImprovePromptCache")}
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
    </MenubarMenu>
  )
}
