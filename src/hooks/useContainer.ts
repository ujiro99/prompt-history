import { useContext } from "react"
import { ContainerContext } from "@/contexts/ContainerContext"

export const useContainer = () => {
  const context = useContext(ContainerContext)

  if (context === undefined) {
    throw new Error("useCaretNode must be used within a CaretProvider")
  }

  return context
}
