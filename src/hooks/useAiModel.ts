import { useContext } from "react"
import { AiModelContext } from "@/contexts/AiModelContext"

export const useAiModel = () => {
  const context = useContext(AiModelContext)

  if (context === undefined) {
    throw new Error("useAiModel must be used within an AiModelContextProvider")
  }

  return context
}
