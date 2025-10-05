"use client"

import { useEffect } from "react"
import { useLocale } from "@/hooks/useLocale"

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLocale()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return <>{children}</>
}
