import { useContext } from "react"
import { ContainerContext } from "@/contexts/ContainerContext"

export const useContainer = () => {
  const context = useContext(ContainerContext)

  if (context === undefined) {
    throw new Error("useContainer must be used within a ContainerProvider")
  }

  return context
}
