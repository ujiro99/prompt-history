import { useState, useEffect, useCallback } from "react"
import { PromptServiceFacade } from "../services/promptServiceFacade"
import { NotificationManager } from "./Notification"
import { InputPopup } from "./inputMenu/InputPopup"
import { AutoCompletePopup } from "./autoComplete/AutoCompletePopup"
import { CaretProvider } from "@/contexts/CaretContext"
import { isEmpty, uuid } from "@/lib/utils"
import type { Prompt, NotificationData, PromptError } from "../types/prompt"
import { TestIds } from "@/components/const"

// Singleton instance for compatibility
const serviceFacade = PromptServiceFacade.getInstance()

/**
 * Main widget for prompt history management
 */
export const PromptHistoryWidget: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [pinnedPrompts, setPinnedPrompts] = useState<Prompt[]>([])
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [promptContent, setPromptContent] = useState<string>("")

  /**
   * Add notification
   */
  const addNotification = useCallback((notification: NotificationData) => {
    setNotifications((prev) => [...prev, notification])
  }, [])

  /**
   * Remove notification
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  /**
   * Load prompt list
   */
  const loadPrompts = useCallback(async () => {
    try {
      const [allPrompts, pinned] = await Promise.all([
        serviceFacade.getPrompts(),
        serviceFacade.getPinnedPrompts(),
      ])
      setPrompts(allPrompts)
      setPinnedPrompts(pinned)
    } catch (error) {
      console.error("Failed to load prompts:", error)
      addNotification({
        id: uuid(),
        type: "error",
        message: i18n.t("status.failedToLoadPrompts"),
        duration: 3000,
      })
    }
  }, [addNotification])

  /**
   * Initialization process
   */
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        await serviceFacade.initialize()

        if (mounted) {
          // Load initial data
          loadPrompts()
          setTargetElement(serviceFacade.getTextInput())
          serviceFacade.onElementChange(setTargetElement)
          serviceFacade.onContentChange(setPromptContent)

          setIsInitializing(false)
        }
      } catch (error) {
        if (mounted) {
          setInitError(
            error instanceof Error
              ? error.message
              : i18n.t("status.initializationFailed"),
          )
          setIsInitializing(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      serviceFacade.destroy()
    }
  }, [loadPrompts])

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const handlePromptChange = () => {
      loadPrompts() // Update prompt list
    }

    const handleNotification = (notification: NotificationData) => {
      addNotification(notification)
    }

    const handleError = (error: PromptError) => {
      console.error("SessionManager error:", error)
    }

    // Register callbacks
    serviceFacade.onPromptOrPinChange(handlePromptChange)
    serviceFacade.onNotification(handleNotification)
    serviceFacade.onError(handleError)
  }, [loadPrompts, addNotification])

  // Display during initialization
  if (isInitializing) {
    return (
      <div
        className="flex items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        data-testid={TestIds.widget.loading}
      >
        <div className="text-gray-500 dark:text-gray-300 text-sm">
          {i18n.t("status.loading")}
        </div>
      </div>
    )
  }

  // Display initialization error
  if (initError) {
    return (
      <div
        className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200"
        data-testid={TestIds.widget.error}
      >
        <div className="flex items-center gap-2 text-sm">
          <span>❌</span>
          <span>Failed to initialize: {initError}</span>
        </div>
      </div>
    )
  }

  return (
    <CaretProvider inputElement={targetElement}>
      <InputPopup
        targetElm={targetElement}
        prompts={prompts}
        pinnedPrompts={pinnedPrompts}
        saveEnabled={!isEmpty(promptContent)}
      />

      {/* Notification system */}
      <NotificationManager
        notifications={notifications}
        onDismiss={removeNotification}
      />

      {/* AutoComplete functionality */}
      <AutoCompletePopup prompts={prompts} />
    </CaretProvider>
  )
}
