import { useContext } from "react"
import { CaretContext } from "../contexts/CaretContext"

export const useCaretNode = () => {
  const context = useContext(CaretContext)

  if (context === undefined) {
    throw new Error("useCaretNode must be used within a CaretProvider")
  }

  return context
}
