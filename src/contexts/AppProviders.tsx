import React from "react"
import { AiModelContextProvider } from "./AiModelContext"
import { SettingsProvider } from "./SettingsContext"
import { ContainerProvider } from "./ContainerContext"
import { CaretProvider } from "./CaretContext"

interface AppProvidersProps {
  container: HTMLDivElement | null
  inputElement: Element | null
  children: React.ReactNode
}

/**
 * Combines all context providers for the application
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  container,
  inputElement,
  children,
}) => {
  return (
    <AiModelContextProvider>
      <SettingsProvider>
        <ContainerProvider container={container}>
          <CaretProvider
            inputElement={inputElement}
            extensionContainer={container}
          >
            {children}
          </CaretProvider>
        </ContainerProvider>
      </SettingsProvider>
    </AiModelContextProvider>
  )
}
