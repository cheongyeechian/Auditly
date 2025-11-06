import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAddress, isAddress } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates and checksums an Ethereum address
 * @param address - The address to validate and checksum
 * @returns Checksummed address if valid
 * @throws Error if address is invalid
 */
export function validateAndChecksumAddress(address: string | null | undefined): string {
  if (!address) {
    throw new Error("Address is required")
  }

  if (!isAddress(address)) {
    throw new Error("Invalid Ethereum address format")
  }

  return getAddress(address)
}

/**
 * Safely validates and checksums an address, returns null if invalid
 * @param address - The address to validate and checksum
 * @returns Checksummed address if valid, null if invalid
 */
export function safeChecksumAddress(address: string | null | undefined): string | null {
  try {
    return validateAndChecksumAddress(address)
  } catch {
    return null
  }
}
