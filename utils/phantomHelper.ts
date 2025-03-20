// Utility functions for working with Phantom wallet

/**
 * Checks if an error is related to a user rejecting a transaction in Phantom
 */
export function isUserRejectionError(error: unknown): boolean {
  if (!error) return false

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : typeof error === "string" ? error.toLowerCase() : ""

  return (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("cancelled") ||
    errorMessage.includes("rejected") ||
    errorMessage.includes("declined") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("user denied")
  )
}

/**
 * Checks if Phantom wallet is installed and accessible
 */
export function isPhantomInstalled(): boolean {
  // @ts-ignore
  return typeof window !== "undefined" && window.solana && window.solana.isPhantom
}

/**
 * Gets the Phantom wallet version if available
 */
export function getPhantomVersion(): string | null {
  try {
    // @ts-ignore
    if (typeof window !== "undefined" && window.solana && window.solana.isPhantom) {
      // @ts-ignore
      return window.solana.version || "Unknown"
    }
    return null
  } catch (error) {
    console.error("Error getting Phantom version:", error)
    return null
  }
}

/**
 * Checks if the wallet is connected and ready for transactions
 */
export async function isWalletReady(): Promise<boolean> {
  try {
    // @ts-ignore
    if (typeof window !== "undefined" && window.solana && window.solana.isPhantom) {
      // @ts-ignore
      const connected = window.solana.isConnected
      return connected
    }
    return false
  } catch (error) {
    console.error("Error checking if wallet is ready:", error)
    return false
  }
}

/**
 * Attempts to disconnect and reconnect the wallet to reset state
 */
export async function resetWalletConnection(): Promise<boolean> {
  try {
    // @ts-ignore
    if (typeof window !== "undefined" && window.solana && window.solana.isPhantom) {
      try {
        // @ts-ignore
        await window.solana.disconnect()
        await new Promise((resolve) => setTimeout(resolve, 1000))
        // @ts-ignore
        await window.solana.connect()
        return true
      } catch (error) {
        console.error("Error resetting wallet connection:", error)
        return false
      }
    }
    return false
  } catch (error) {
    console.error("Error in resetWalletConnection:", error)
    return false
  }
}

