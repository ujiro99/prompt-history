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
