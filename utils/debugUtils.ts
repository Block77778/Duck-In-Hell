"use client"

// Debug utility functions

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

export function debugLocalStorage(): void {
  if (!isBrowser) return

  console.log("--- DEBUG: localStorage contents ---")

  // List all keys in localStorage
  const keys = Object.keys(localStorage)
  console.log(`Total localStorage keys: ${keys.length}`)

  // Print each key and its value
  keys.forEach((key) => {
    try {
      const value = localStorage.getItem(key)
      const valuePreview = value && value.length > 100 ? `${value.substring(0, 100)}...` : value
      console.log(`${key}: ${valuePreview}`)

      // Try to parse JSON values
      if (value && (value.startsWith("{") || value.startsWith("["))) {
        try {
          const parsed = JSON.parse(value)
          console.log(`Parsed ${key}:`, parsed)
        } catch (e) {
          console.log(`Could not parse ${key} as JSON`)
        }
      }
    } catch (e) {
      console.error(`Error accessing localStorage key ${key}:`, e)
    }
  })

  console.log("--- END DEBUG ---")
}

export function debugDistributionStatus(): void {
  if (!isBrowser) return

  console.log("--- DEBUG: Distribution Status ---")

  try {
    const distributionData = localStorage.getItem("duckinhell_token_distribution")
    if (distributionData) {
      const parsed = JSON.parse(distributionData)
      console.log("Distribution records:", parsed)
      console.log(`Total records: ${Object.keys(parsed).length}`)

      // Count distributed vs pending
      const distributed = Object.values(parsed).filter((record: any) => record.tokensSent).length
      console.log(`Distributed: ${distributed}, Pending: ${Object.keys(parsed).length - distributed}`)
    } else {
      console.log("No distribution data found")
    }
  } catch (e) {
    console.error("Error debugging distribution status:", e)
  }

  console.log("--- END DEBUG ---")
}

// Create a function that returns the props for a debug button instead of JSX
export function getDebugButtonProps(onClick: () => void): {
  onClick: () => void
  className: string
  children: string
} {
  return {
    onClick,
    className: "px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700",
    children: "Debug",
  }
}

