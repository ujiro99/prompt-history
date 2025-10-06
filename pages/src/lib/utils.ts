import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import nextConfig from "../../next.config.mjs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBasePath() {
  return nextConfig.basePath || ""
}
