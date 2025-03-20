// This file is now simplified to always return false for offline mode
// and to not set offline mode at all

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

/**
 * Set the application to offline mode (no blockchain calls)
 * This is now disabled - always sets to false
 */
export function setOfflineMode(enabled: boolean): void {
  // Do nothing - we're disabling offline mode
  console.log("Offline mode disabled by configuration")
}

/**
 * Check if the application is in offline mode
 * Always returns false now
 */
export function isOfflineMode(): boolean {
  return false
}

/**
 * Set the application as rate limited
 * This is now disabled
 */
export function setRateLimited(duration = 0): void {
  // Do nothing - we're disabling rate limiting
  console.log("Rate limiting disabled by configuration")
}

/**
 * Check if the application is currently rate limited
 * Always returns false now
 */
export function isRateLimited(): boolean {
  return false
}

/**
 * Clear the rate limit status
 */
export function clearRateLimit(): void {
  // Nothing to clear since we're not using rate limiting
}

/**
 * Get the timestamp when the rate limit will expire
 * Always returns null now
 */
export function getRateLimitExpiry(): number | null {
  return null
}

/**
 * Detect rate limiting from an error message
 * Always returns false now
 */
export function isRateLimitError(error: any): boolean {
  return false
}

/**
 * Reset all offline mode and rate limit states
 * This is now simplified to just clear any legacy localStorage items
 */
export function resetOfflineState(): void {
  if (!isBrowser) return

  // Clear any legacy localStorage items that might exist
  localStorage.removeItem("duckinhell_offline_mode")
  localStorage.removeItem("duckinhell_rate_limited")
  localStorage.removeItem("duckinhell_rate_limit_until")

  console.log("Offline state reset (though offline mode is disabled)")
}

