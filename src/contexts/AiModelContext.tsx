import React, { createContext, useEffect, useState } from "react"
import { getGenaiApiKey } from "@/services/storage/genaiApiKey"
import { genaiApiKeyStorage } from "@/services/storage/definitions"

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
    }
    fetchApiKey()

    // Watch for changes in API key
    return genaiApiKeyStorage.watch((newApiKey) => {
      setGenaiApiKey(newApiKey || null)
      console.log("GenAI API Key updated:", newApiKey)
    })
  }, [])

  const value: ContextType = {
    genaiApiKey,
  }

  return (
    <AiModelContext.Provider value={value}>{children}</AiModelContext.Provider>
  )
}
