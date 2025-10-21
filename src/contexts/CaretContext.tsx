import React, { createContext, useState, useEffect } from "react"

interface CaretContextType {
  nodeAtCaret: Node | null
}

const CaretContext = createContext<CaretContextType | undefined>(undefined)

interface CaretProviderProps {
  inputElement: Element | null
  extensionContainer: HTMLElement | null
  children: React.ReactNode
}

export const CaretProvider: React.FC<CaretProviderProps> = ({
  inputElement,
  extensionContainer,
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
      const startContainer = range.startContainer

      // Skip update if selection is within extension container
      if (
        extensionContainer?.contains(startContainer) ||
        startContainer === document.body
      ) {
        return
      }

      if (inputElement && inputElement.contains(startContainer)) {
        setNodeAtCaret(startContainer)
      } else {
        setNodeAtCaret(null)
      }
    }

    document.addEventListener("selectionchange", updateNode)
    return () => {
      document.removeEventListener("selectionchange", updateNode)
    }
  }, [inputElement, extensionContainer])

  const value: CaretContextType = {
    nodeAtCaret,
  }

  return <CaretContext.Provider value={value}>{children}</CaretContext.Provider>
}

export { CaretContext }
