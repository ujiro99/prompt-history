import { useState, useEffect, useCallback } from "react"
import { CircleCheck, CircleOff, CircleAlert } from "lucide-react"
import type { NotificationData } from "../types/prompt"

interface NotificationProps {
  notification: NotificationData | null
  onDismiss: () => void
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

  const dismissNotification = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 500) // wait for animation to finish
  }, [onDismiss])

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsAnimating(true)

      // Auto-dismiss timer
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          dismissNotification()
        }, notification.duration)

        return () => clearTimeout(timer)
      }
    } else {
      dismissNotification()
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
      className={`sm:left-auto sm:w-auto w-[calc(100%-1.25rem)] transition-all duration-500 ease-out ${
        isAnimating
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-1/2 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-gray-800 dark:text-gray-200">
        <span className="flex-shrink-0 text-base">
          {getIcon(notification.type)}
        </span>
        <span className="text-sm break-words leading-5">
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
  onDismiss: (index: number) => void
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-10 right-8 opacity-60 pointer-events-none select-none space-y-2 z-[10001]">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="sm:left-auto sm:w-auto w-[calc(100%-1.25rem)]"
        >
          <Notification
            notification={notification}
            onDismiss={() => onDismiss(index)}
          />
        </div>
      ))}
    </div>
  )
}
