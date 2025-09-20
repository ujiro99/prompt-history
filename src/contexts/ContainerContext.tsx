import React, { createContext, useState, useEffect } from "react"

interface ContainerContextType {
  container: HTMLElement
}

export const ContainerContext = createContext<ContainerContextType | undefined>(
  undefined,
)

interface ContainerProviderProps {
  container: HTMLElement | null
  children: React.ReactNode
}

export const ContainerProvider: React.FC<ContainerProviderProps> = ({
  container,
  children,
}) => {
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(
    null,
  )

  useEffect(() => {
    setContainerElement(container)
  }, [container])

  const value: ContainerContextType = {
    container: containerElement || document.body,
  }

  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  )
}
