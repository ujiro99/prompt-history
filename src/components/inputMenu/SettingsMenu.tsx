import React, { useCallback } from "react"
import { EllipsisVertical, Download, Upload } from "lucide-react"
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
import {
  promptExportService,
  promptImportService,
} from "@/services/importExport"
import { MENU, TestIds } from "@/components/const"
import type { AppSettings } from "@/types/prompt"

type Props = {
  onMouseEnter: () => void
}

type MenuTriggerProps = React.ComponentProps<typeof MenubarTrigger>

function MenuTrigger(props: MenuTriggerProps): React.ReactElement {
  return (
    <MenubarTrigger
      className={cn(
        "p-1.5 text-xs gap-0.5 font-normal font-sans text-gray-700 cursor-pointer",
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
  const handleImport = useCallback(async () => {
    try {
      const result = await promptImportService.importFromCSV()
      console.log(
        `Import completed: ${result.imported} imported, ${result.duplicates} duplicates, ${result.errors} errors`,
      )

      if (result.errors > 0) {
        console.warn("Import errors:", result.errorMessages)
      }
    } catch (error) {
      console.error("Import failed:", error)
    }
  }, [])

  return (
    <MenubarMenu value={MENU.Settings}>
      <MenuTrigger
        onMouseEnter={onMouseEnter}
        data-testid={TestIds.inputPopup.settingsTrigger}
      >
        <EllipsisVertical size={16} className="stroke-gray-600" />
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
              {i18n.t("settings.groups.inportExport")}
            </MenubarLabel>
            <MenubarItem onClick={handleExport}>
              <Download size={16} />
              {i18n.t("settings.export")}
            </MenubarItem>

            <MenubarItem onClick={handleImport}>
              <Upload size={16} />
              {i18n.t("settings.import")}
            </MenubarItem>
          </>
        )}
      </MenubarContent>
    </MenubarMenu>
  )
}
