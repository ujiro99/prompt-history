"use client"

import { Image } from "@/components/Image"
import { StoreUrl } from "@/const"
import { cn } from "@/lib/utils"
import styles from "./Header.module.css"

export function Header() {
  return (
    <div>
      <a
        href={`${StoreUrl}&utm_medium=link&utm_campaign=floating_cta`}
        target="_blank"
        className={cn(
          "hidden sm:block sm:fixed",
          "top-2 right-2 bg-white border border-stone-200 rounded-lg shadow-md transition duration-200 hover:shadow-lg z-10",
        )}
        data-gtm-click="chrome-web-store"
        rel="noreferrer"
      >
        <Image
          src="https://ujiro99.github.io/selection-command/chrome_web_store.png"
          alt="Chrome Web Store"
          width={200}
          height={64}
          priority={true}
          className={`${styles.headerLinkImage} object-cover object-left`}
        />
      </a>
    </div>
  )
}
