import type React from "react"
import NextImage from "next/image"
import { cn } from "@/lib/utils"

import nextConfig from "../../next.config"
const BASE_PATH = nextConfig.basePath || ""

type Props = {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  loading?: "lazy" | "eager"
  priority?: boolean
}

function Image(props: Props): React.JSX.Element {
  let { src } = props
  if (src.startsWith("/")) {
    src = `${BASE_PATH}${props.src}`
    return (
      <NextImage
        {...props}
        className={cn("dark:invert", props.className)}
        src={src}
        width={`${props.width ?? 20}`}
        height={`${props.height ?? 20}`}
      />
    )
  }
  return (
    <NextImage
      className={props.className}
      src={src}
      alt={props.alt}
      width={props.width ?? 20}
      height={props.height ?? 20}
      style={props.style}
      unoptimized
    />
  )
}

export { Image }
