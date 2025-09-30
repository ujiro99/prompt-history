import React, { createContext } from "react"
import { useEffect, useState } from "react"
import { StorageService } from "@/services/storage"
import type { AppSettings } from "@/types/prompt"

const storage = StorageService.getInstance()

interface SettingsContextType {
  settings: AppSettings
  isLoaded: boolean
  update: (updates: Partial<AppSettings>) => Promise<void>
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
)

interface ProviderProps {
  children: React.ReactNode
}

export const SettingsProvider: React.FC<ProviderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({} as AppSettings)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const loadedSettings = await storage.getSettings()
        setSettings(loadedSettings)
        setIsLoaded(true)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
    fetchSettings()
    return storage.watchSettings((newSettings) => {
      setSettings(newSettings)
    })
  }, [])

  const update = async (updates: Partial<AppSettings>) => {
    return await storage.setSettings(updates)
  }

  const value = { settings, isLoaded, update }
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
