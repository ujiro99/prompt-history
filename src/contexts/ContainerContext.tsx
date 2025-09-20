import React, { createContext } from "react"

interface ContainerContextType {
  container: HTMLElement | null
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
  const value: ContainerContextType = {
    container,
  }

  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  )
}
