import React, { createContext, useState, useEffect } from "react"

interface CaretContextType {
  nodeAtCaret: Node | null
}

const CaretContext = createContext<CaretContextType | undefined>(undefined)

interface CaretProviderProps {
  children: React.ReactNode
}

export const CaretProvider: React.FC<CaretProviderProps> = ({ children }) => {
  const [nodeAtCaret, setNodeAtCaret] = useState<Node | null>(null)

  useEffect(() => {
    const updateNode = () => {
      const selection = document.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        setNodeAtCaret(range.startContainer)
      }
    }

    document.addEventListener("selectionchange", updateNode)

    return () => {
      document.removeEventListener("selectionchange", updateNode)
    }
  }, [])

  const value: CaretContextType = {
    nodeAtCaret,
  }

  return <CaretContext.Provider value={value}>{children}</CaretContext.Provider>
}

export { CaretContext }
