import React, { createContext, useState, useEffect } from "react"

interface CaretContextType {
  nodeAtCaret: Node | null
}

const CaretContext = createContext<CaretContextType | undefined>(undefined)

interface CaretProviderProps {
  inputElement: Element | null
  children: React.ReactNode
}

export const CaretProvider: React.FC<CaretProviderProps> = ({
  inputElement,
  children,
}) => {
  const [nodeAtCaret, setNodeAtCaret] = useState<Node | null>(null)

  useEffect(() => {
    const updateNode = () => {
      const selection = document.getSelection()
      if (!selection || selection.rangeCount === 0) {
        return
      }
      const range = selection.getRangeAt(0)
      if (inputElement && inputElement.contains(range.startContainer)) {
        setNodeAtCaret(range.startContainer)
      }
    }

    document.addEventListener("selectionchange", updateNode)
    return () => {
      document.removeEventListener("selectionchange", updateNode)
    }
  }, [inputElement])

  const value: CaretContextType = {
    nodeAtCaret,
  }

  return <CaretContext.Provider value={value}>{children}</CaretContext.Provider>
}

export { CaretContext }
