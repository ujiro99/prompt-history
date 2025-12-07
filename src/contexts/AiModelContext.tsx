import React, { createContext, useEffect, useState } from "react"
import { getGenaiApiKey } from "@/services/storage/genaiApiKey"
import { genaiApiKeyStorage } from "@/services/storage/definitions"
import { GeminiClient } from "@/services/genai/GeminiClient"

interface ContextType {
  genaiApiKey: string | null
}

export const AiModelContext = createContext<ContextType | undefined>(undefined)

interface Props {
  children: React.ReactNode
}

export const AiModelContextProvider: React.FC<Props> = ({ children }) => {
  const [genaiApiKey, setGenaiApiKey] = useState<string | null>(null)

  useEffect(() => {
    const fetchApiKey = async () => {
      const apiKey = await getGenaiApiKey()
      setGenaiApiKey(apiKey)
      console.log("GenAI API Key:", apiKey)

      // Initialize GeminiClient with the API key
      if (apiKey) {
        const geminiClient = GeminiClient.getInstance()
        geminiClient.initialize(apiKey)
        console.log("GeminiClient initialized")
      }
    }
    fetchApiKey()

    // Watch for changes in API key
    return genaiApiKeyStorage.watch((newApiKey) => {
      setGenaiApiKey(newApiKey || null)
      console.log("GenAI API Key updated:", newApiKey)

      // Re-initialize GeminiClient when API key changes
      if (newApiKey) {
        const geminiClient = GeminiClient.getInstance()
        geminiClient.initialize(newApiKey)
        console.log("GeminiClient re-initialized")
      }
    })
  }, [])

  const value: ContextType = {
    genaiApiKey,
  }

  return (
    <AiModelContext.Provider value={value}>{children}</AiModelContext.Provider>
  )
}
