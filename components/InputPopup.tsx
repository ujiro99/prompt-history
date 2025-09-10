import React, { useState, useRef, useCallback, useMemo } from "react"
import { History, Star, Save } from "lucide-react"
import { Popover, PopoverContent, PopoverAnchor } from "./ui/popover"
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { PromptPreview } from "./PromptPreview"
import { MenuItem } from "./MenuItem"
import { RemoveDialog } from "@/components/RemoveDialog"
import { EditDialog } from "@/components/EditDialog"
import { PromptServiceFacade } from "../services/promptServiceFacade"
import { SaveMode } from "../types/prompt"
import type { Prompt, SaveDialogData } from "../types/prompt"
import { cn, isEmpty } from "@/lib/utils"

const serviceFacade = PromptServiceFacade.getInstance()

enum MENU {
  None = "None",
  History = "History",
  Pinned = "Pinned",
  Save = "Save",
}

type Props = {
  targetElm: Element | null
  prompts: Prompt[]
  pinnedPrompts: Prompt[]
  saveEnabled: boolean
}

type HoveredItem = {
  promptId: string
  element: HTMLElement
  menuType: "history" | "pinned"
} | null

const noFocus = (e: Event) => e.preventDefault()

export function InputPopup(props: Props): React.ReactElement {
  const { targetElm } = props
  if (targetElm == null) return <></>

  return (
    <Popover open={true}>
      <PopoverAnchor virtualRef={{ current: targetElm }} />
      <PopoverContent
        className="z-auto p-0 border-0"
        side={"top"}
        align={"end"}
        sideOffset={8}
        onOpenAutoFocus={noFocus}
      >
        <InputMenu {...props} />
      </PopoverContent>
    </Popover>
  )
}

export function InputMenu(props: Props): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MENU>(MENU.None)
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const [saveDialogData, setSaveDialogData] = useState<SaveDialogData | null>(
    null,
  )

  const handleMenuEnter = (val: MENU) => {
    setSelectedMenu(val)
  }

  const handleItemHover = useCallback(
    (
      promptId: string,
      element: HTMLElement,
      menuType: "history" | "pinned",
    ) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredItem({ promptId, element, menuType })
      }, 100)
    },
    [],
  )

  const handleItemLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredItem(null)
  }, [])

  const handleOverlayEnter = useCallback(() => {
    // Cancel timeout when mouse enters overlay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const handleOverlayLeave = useCallback(() => {
    // Close overlay when mouse leaves
    setHoveredItem(null)
  }, [])

  const handleItemClick = useCallback((promptId: string) => {
    // Clear hoveredItem immediately when item is clicked
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredItem(null)

    try {
      serviceFacade.executePrompt(promptId)
    } catch (error) {
      console.error("Execute failed:", error)
    }
  }, [])

  /**
   * Delete prompt process
   */
  const handleDeletePrompt = async (promptId: string) => {
    try {
      await serviceFacade.deletePrompt(promptId)
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  /**
   * Toggle pin process
   */
  const handleTogglePin = async (promptId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await serviceFacade.pinPrompt(promptId)
      } else {
        await serviceFacade.unpinPrompt(promptId)
      }
    } catch (error) {
      console.error("Pin toggle failed:", error)
    }
  }

  /**
   * Open dialog to save new prompt being entered
   */
  const openEditDialogNew = async () => {
    const data = await serviceFacade.prepareSaveDialogData()
    console.log("Prepared save dialog data:", data)
    setSaveDialogData({
      name: data.initialName ?? "",
      content: data.initialContent,
      saveMode: data.isOverwriteAvailable ? SaveMode.Overwrite : SaveMode.New,
    })
    setEditId("")
  }

  /**
   * Open save dialog
   */
  const openEditDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      name: prompt.name,
      content: prompt.content,
      saveMode: SaveMode.Overwrite,
    })
    setEditId(promptId)
  }

  /**
   * Open dialog to copy prompt
   */
  const openCopyDialog = async (promptId: string) => {
    const prompt = await serviceFacade.getPrompt(promptId)
    setSaveDialogData({
      name: `Copy of ${prompt.name}`,
      content: prompt.content,
      saveMode: SaveMode.Copy,
    })
    setEditId("")
  }

  /**
   * Update prompt & pin it.
   */
  const handleEditPrompt = async (saveData: SaveDialogData) => {
    try {
      if (
        isEmpty(editId) ||
        saveData.saveMode === SaveMode.New ||
        saveData.saveMode === SaveMode.Copy
      ) {
        await serviceFacade.savePromptManually(saveData)
      } else {
        await serviceFacade.updatePrompt(editId!, saveData)
      }
    } catch (error) {
      console.error("Save failed:", error)
    }
  }

  const hoveredPrompt = useMemo(() => {
    if (!hoveredItem) return null
    const prompts =
      hoveredItem.menuType === "history" ? props.prompts : props.pinnedPrompts
    return prompts.find((p) => p.id === hoveredItem.promptId) || null
  }, [hoveredItem, props.prompts, props.pinnedPrompts])

  const removePrompt = useMemo(() => {
    if (!removeId) return null
    return props.prompts.find((p) => p.id === removeId) || null
  }, [removeId, props.prompts])

  return (
    <div className="relative">
      <Menubar
        value={selectedMenu}
        className="gap-0.5"
        onValueChange={(v) => setSelectedMenu(v as MENU)}
      >
        {/* History Menu */}
        <MenubarMenu value={MENU.History}>
          <MenuTrigger onMouseEnter={() => handleMenuEnter(MENU.History)}>
            <History size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent
            className="max-h-80 min-w-[220px] overflow-y-auto"
            side="top"
          >
            {props.prompts.length > 0 ? (
              props.prompts.map((prompt) => (
                <MenuItem
                  menuType="history"
                  value={prompt.id}
                  key={prompt.id}
                  isPinned={prompt.isPinned}
                  onHover={handleItemHover}
                  onLeave={handleItemLeave}
                  onClick={handleItemClick}
                  onEdit={openEditDialog}
                  onRemove={setRemoveId}
                  onCopy={openCopyDialog}
                  onTogglePin={handleTogglePin}
                >
                  {prompt.name}
                </MenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">
                Prompts will be displayed when you send them
              </div>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Pinned Menu */}
        <MenubarMenu value={MENU.Pinned}>
          <MenuTrigger onMouseEnter={() => handleMenuEnter(MENU.Pinned)}>
            <Star size={16} className="stroke-gray-600" />
          </MenuTrigger>
          <MenubarContent side="top">
            {props.pinnedPrompts.length > 0 ? (
              props.pinnedPrompts.map((prompt) => (
                <MenuItem
                  menuType="pinned"
                  value={prompt.id}
                  key={prompt.id}
                  isPinned={prompt.isPinned}
                  onHover={handleItemHover}
                  onLeave={handleItemLeave}
                  onClick={handleItemClick}
                  onEdit={openEditDialog}
                  onRemove={setRemoveId}
                  onCopy={openCopyDialog}
                  onTogglePin={handleTogglePin}
                >
                  {prompt.name}
                </MenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500 min-w-[220px]">
                Will be displayed when you star or manually save
              </div>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Save Menu */}
        <MenubarMenu value={MENU.Save}>
          <MenuTrigger
            disabled={!props.saveEnabled}
            onClick={openEditDialogNew}
          >
            <Save size={16} className="stroke-gray-600" />
          </MenuTrigger>
        </MenubarMenu>
      </Menubar>

      {/* PromptPreview Overlay */}
      {hoveredPrompt && hoveredItem && (
        <PromptPreviewWrapper
          open={!isEmpty(selectedMenu) && hoveredItem.element != null}
          prompt={hoveredPrompt}
          anchorElement={hoveredItem.element}
          onMouseEnter={handleOverlayEnter}
          onMouseLeave={handleOverlayLeave}
        />
      )}

      {/* Edit Prompt Dialog */}
      {saveDialogData && (
        <EditDialog
          open={editId !== null}
          onOpenChange={(val) => setEditId(val ? editId : null)}
          initialName={saveDialogData.name}
          initialContent={saveDialogData.content}
          displayMode={saveDialogData.saveMode}
          onSave={handleEditPrompt}
        />
      )}

      {/* Remove Prompt Dialog */}
      <RemoveDialog
        open={removeId !== null}
        onOpenChange={(val) => setRemoveId(val ? removeId : null)}
        description={`Are you sure you want to remove? This action cannot be undone.`}
        onRemove={() => handleDeletePrompt(removeId!)}
      >
        <span className="text-base truncate">{removePrompt?.name}</span>
      </RemoveDialog>
    </div>
  )
}

function MenuTrigger(
  props: React.ComponentProps<typeof MenubarTrigger>,
): React.ReactElement {
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

type PromptDetailWrapperProps = {
  open: boolean
  prompt: Prompt
  anchorElement: HTMLElement
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const PromptPreviewWrapper = (props: PromptDetailWrapperProps) => {
  const { open, prompt, anchorElement, onMouseEnter, onMouseLeave } = props

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <PromptPreview open={open} anchorElm={anchorElement} prompt={prompt} />
    </div>
  )
}
PromptPreviewWrapper.displayName = "PromptPreviewWrapper"
