import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sleeps for a specified number of milliseconds
 */
export function sleep(msec: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, msec))
}

/**
 * Check if a string is empty (null, undefined, or only whitespace)
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str == null || str.trim().length === 0
}

/**
 * Generate a UUID (version 4)
 */
export function uuid(): string {
  return crypto.randomUUID()
}

/**
 * Format token count with K suffix for thousands
 */
export const formatTokenCount = (tokens: number | undefined): string => {
  if (!tokens) return "0"
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}
