import { useState, useEffect, useCallback, useRef } from "react"
import { CircleCheck, CircleOff, CircleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/useSettings"
import type { NotificationData } from "../types/prompt"

interface NotificationProps {
  notification: NotificationData
  onDismiss: (id: string) => void
}

/**
 * Notification component
 */
export const Notification: React.FC<NotificationProps> = ({
  notification,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const dismissTORef = useRef<number | null>(null)

  const dismissNotification = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss(notification.id)
    }, 500) // wait for animation to finish
  }, [onDismiss, notification.id])

  useEffect(() => {
    if (notification && dismissTORef.current == null) {
      setIsVisible(true)
      setIsAnimating(true)

      // Auto-dismiss timer
      if (notification.duration && notification.duration > 0) {
        dismissTORef.current = window.setTimeout(() => {
          dismissNotification()
        }, notification.duration)
      }
    }

    return () => {
      if (dismissTORef.current) {
        clearTimeout(dismissTORef.current)
        dismissTORef.current = null
      }
    }
  }, [notification, dismissNotification])

  if (!isVisible || !notification) {
    return null
  }

  const getIcon = (
    type: NotificationData["type"],
    size = 14,
  ): React.ReactElement => {
    switch (type) {
      case "success":
        return <CircleCheck size={size} />
      case "error":
        return <CircleOff size={size} />
      case "warning":
        return <CircleAlert size={size} />
      case "info":
      default:
        return <></>
    }
  }

  return (
    <div
      className={cn(
        "sm:left-auto sm:w-64 w-[calc(100%-1.25rem)] transition-all duration-500 ease-out",
        isAnimating
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-1/2 opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-end gap-1 flex-1 min-w-0 text-gray-800 dark:text-gray-200">
        <span className="mt-1 flex-shrink-0 text-base">
          {getIcon(notification.type)}
        </span>
        <span className="text-sm leading-5 text-right truncate">
          {notification.message}
        </span>
      </div>
    </div>
  )
}

/**
 * Multiple notification management component
 */
interface NotificationManagerProps {
  notifications: NotificationData[]
  onDismiss: (id: string) => void
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onDismiss,
}) => {
  const {
    settings: { showNotifications },
  } = useSettings()

  if (!showNotifications) {
    notifications.forEach((n) => onDismiss(n.id))
    return null
  }

  return (
    <div className="fixed bottom-10 right-4 opacity-60 pointer-events-none select-none space-y-2 z-[10001]">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="sm:left-auto sm:w-64 w-[calc(100%-1.25rem)]"
        >
          <Notification notification={notification} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
