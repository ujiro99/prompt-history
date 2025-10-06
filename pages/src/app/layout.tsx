import { GoogleTagManager } from "@next/third-parties/google"
import type { Metadata } from "next"
import {
  Geist_Mono,
  Noto_Sans,
  Noto_Serif_Display,
  Oranienbaum,
} from "next/font/google"
import { LocaleProvider } from "@/components/LocaleProvider"
import { cn } from "@/lib/utils"
import "./globals.css"

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const oranienbaumSans = Oranienbaum({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-oranienbaum",
})

const notoSans = Noto_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans",
})

const notoSerifDisplay = Noto_Serif_Display({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-display",
})

export const metadata: Metadata = {
  title: "Prompt History",
  description:
    "Enable saving and recalling prompt history passed to the generative AI.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManager gtmId="GTM-W7PKB5DT" />
      </head>
      <body
        className={cn(
          geistMono.variable,
          oranienbaumSans.variable,
          notoSans.variable,
          notoSerifDisplay.variable,
          "font-sans bg-background-light text-primary-text antialiased",
        )}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  )
}
