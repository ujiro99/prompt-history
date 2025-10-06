import NextImage from "next/image"
import type React from "react"
import { cn, getBasePath } from "@/lib/utils"

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
    src = `${getBasePath()}${props.src}`
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
