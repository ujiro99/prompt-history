import React, { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { AutoCompleteItem } from "./AutoCompleteItem"
import { useAutoComplete } from "./useAutoComplete"
import { useSettings } from "@/hooks/useSettings"
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover"
import { TestIds } from "@/components/const"
import { Key } from "@/components/Key"
import { isWindows } from "@/utils/platform"
import { setCaretPosition } from "@/services/dom/caretUtils"
import { i18n } from "#imports"
import type { Prompt } from "../../types/prompt"
import { VariableInputDialog } from "@/components/inputMenu/controller/VariableInputDialog"

const serviceFacade = PromptServiceFacade.getInstance()

const noFocus = (e: Event) => e.preventDefault()

interface AutoCompletePopupProps {
  prompts: Prompt[]
  pinnedPrompts: Prompt[]
}

export const AutoCompletePopup: React.FC<AutoCompletePopupProps> = (
  props: AutoCompletePopupProps,
) => {
  const {
    settings: { autoCompleteEnabled, autoCompleteTarget },
  } = useSettings()

  // Do not render if auto-complete is disabled
  if (!autoCompleteEnabled) return null

  // Choose prompts based on target setting
  let prompts = props.prompts
  if (autoCompleteTarget === "pinned") {
    prompts = props.pinnedPrompts
  }

  return <AutoCompletePopupInner prompts={prompts} />
}

interface AutoCompletePopupInnerProps {
  prompts: Prompt[]
}

const AutoCompletePopupInner: React.FC<AutoCompletePopupInnerProps> = ({
  prompts,
}) => {
  const {
    isVisible,
    matches,
    selectedIndex,
    position,
    handleExecute,
    handleClose,
    selectIndex,
    selectNext,
    selectPrevious,
    variableInputData,
    clearVariableInputData,
    handleVariableSubmit,
  } = useAutoComplete({ prompts })
  const inputRef = useRef<HTMLElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

  const currentMatch = matches[selectedIndex]
  const isSingleMatch = matches.length === 1

  // Dynamic side calculation to prevent overlap with input
  const POPUP_HEIGHT = popupRef.current?.clientHeight ?? 200 // Expected popup height
  const MARGIN = 20 // Margin from screen edge
  const availableSpaceBelow =
    window.innerHeight - position.y - position.height - MARGIN
  const availableSpaceAbove = position.y - MARGIN
  const shouldShowAbove =
    availableSpaceBelow < POPUP_HEIGHT && availableSpaceAbove > POPUP_HEIGHT

  // Close popup and reset states
  const handlePopupClose = useCallback(() => {
    handleClose()
    setUserInteracted(false)
    setIsFocused(false)
  }, [handleClose])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handlePopupClose()
    },
    [handlePopupClose],
  )

  // When Escape is pressed, close popup and return focus to input.
  const handleEscapeDown = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true })
      if (variableInputData && variableInputData.match) {
        const match = variableInputData.match
        setCaretPosition(inputRef.current, match.matchEnd, match.newlineCount)
      }
    }
  }, [variableInputData])

  useEffect(() => {
    inputRef.current = serviceFacade.getTextInput() as HTMLElement
    return serviceFacade.onElementChange((textInput: Element | null) => {
      inputRef.current = textInput as HTMLElement
    })
  }, [])

  useEffect(() => {
    // Only add event listeners when popup is visible
    if (!isVisible) return
    if (!isFocused && !userInteracted) return

    const handleKeyDownActive = (event: KeyboardEvent) => {
      // When popup is active: Tab key is active.
      switch (event.key) {
        case "Tab":
          event.preventDefault()
          event.stopPropagation()
          if (currentMatch) {
            handleExecute(currentMatch)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDownActive, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDownActive, true)
    }
  }, [isVisible, isFocused, userInteracted, currentMatch, handleExecute])

  useEffect(() => {
    // Only add event listeners when popup is visible
    if (!isVisible || !isFocused) return

    const handleKeyDownFocus = (event: KeyboardEvent) => {
      // When popup is focused: Arrow keys are active
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          selectPrevious()
          break
        case "ArrowDown":
          event.preventDefault()
          selectNext()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDownFocus, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDownFocus, true)
    }
  }, [isVisible, isFocused, selectNext, selectPrevious])

  useEffect(() => {
    if (!isVisible || isFocused) return

    const handleKeyDownNotFocus = (event: KeyboardEvent) => {
      // If popup is visible but not focused,
      // focus it on any key press except modifier keys
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
          handlePopupClose()
          break
        case "Enter":
          if (!event.isComposing) handlePopupClose()
          break
        case "Tab":
          event.preventDefault()
          event.stopPropagation()
          popupRef.current?.focus()
          if (selectedIndex < 0) {
            selectIndex(0)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDownNotFocus, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDownNotFocus, true)
    }
  }, [
    isVisible,
    isFocused,
    selectedIndex,
    handlePopupClose,
    selectIndex,
    selectNext,
    selectPrevious,
  ])

  useEffect(() => {
    if (!isVisible) return

    const handleKeyDownAlways = (event: KeyboardEvent) => {
      // Always listen for Escape
      if (event.key === "Escape") {
        event.preventDefault()
        handlePopupClose()
        return
      }

      // For non-Windows platforms, support Ctrl+N/P for navigation
      if (!isWindows()) {
        if (event.ctrlKey && event.key === "n") {
          event.preventDefault()
          selectNext()
          setUserInteracted(true)
        } else if (event.ctrlKey && event.key === "p") {
          event.preventDefault()
          selectPrevious()
          setUserInteracted(true)
        }
      }
      // Windows users must use Tab to focus first, then use arrow keys
    }
    document.addEventListener("keydown", handleKeyDownAlways, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDownAlways, true)
    }
  }, [isVisible, handlePopupClose, selectNext, selectPrevious])

  // Update anchor position when position changes
  useEffect(() => {
    if (!isVisible) {
      setIsFocused(false)
      setUserInteracted(false)
    }
  }, [position, isVisible])

  return (
    <>
      {isVisible && matches.length > 0 && (
        <Popover open={isVisible} onOpenChange={handleOpenChange}>
          <PopoverAnchor asChild>
            <div
              ref={anchorRef}
              className="fixed w-0 pointer-events-none"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                height: `${position.height}px`,
              }}
            />
          </PopoverAnchor>
          <PopoverContent
            ref={popupRef}
            className={cn(
              "min-w-64 max-w-md p-0 border border-gray-200 shadow-lg overflow-hidden",
              "focus-visible:ring-1 focus-visible:ring-gray-400",
            )}
            align="start"
            side={shouldShowAbove ? "top" : "bottom"}
            sideOffset={5}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onEscapeKeyDown={handleEscapeDown}
            onOpenAutoFocus={noFocus}
            data-testid={TestIds.autocomplete.popup}
          >
            <div>
              {matches.map((match, index) => (
                <AutoCompleteItem
                  key={`${match.name}-${index}`}
                  match={match}
                  isSelected={index === selectedIndex}
                  onClick={handleExecute}
                  onMouseEnter={() => selectIndex(index)}
                />
              ))}
            </div>
            <div className="flex justify-end p-2 py-1.5 text-xs text-gray-500 border-t gap-1 empty:hidden">
              {(!isFocused && !userInteracted) ||
              (!isFocused && isSingleMatch) ? (
                <p className="inline">
                  <Key className="text-[10px]">Tab</Key>{" "}
                  <span>{i18n.t("autocomplete.toFocus")}</span>
                  {!isSingleMatch ? <span>,</span> : null}
                </p>
              ) : null}
              {isSingleMatch ? null : (
                <p className="inline">
                  {!isWindows() ? (
                    <>
                      <Key className="text-[10px]">Ctrl + P</Key>
                      <span className="mx-0.5">/</span>
                      <Key className="text-[10px]">Ctrl + N</Key>
                      {isFocused && (
                        <>
                          <span className="mx-0.5">/</span>
                          <Key className="text-[10px]">↑</Key>
                          <span className="mx-0.5">/</span>
                          <Key className="text-[10px]">↓</Key>
                        </>
                      )}
                    </>
                  ) : (
                    isFocused && (
                      <>
                        <Key className="text-[10px]">↑</Key>
                        <span className="mx-0.5">/</span>
                        <Key className="text-[10px]">↓</Key>
                      </>
                    )
                  )}{" "}
                  {i18n.t("autocomplete.toMove")}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {variableInputData && (
        <VariableInputDialog
          open={!!variableInputData}
          onOpenChange={(open) => {
            if (!open) clearVariableInputData()
          }}
          variables={variableInputData.variables}
          onSubmit={handleVariableSubmit}
          onDismiss={handleEscapeDown}
        />
      )}
    </>
  )
}
