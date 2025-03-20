// Simple fallback to localStorage for now to ensure the app works
// This avoids the IndexedDB errors while still providing data persistence

export interface Contribution {
  wallet: string
  amount: number
  timestamp: number
  signature: string
  tokensSent?: boolean
  tokenTxSignature?: string
}

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Store a contribution
export async function addContribution(contribution: Contribution): Promise<void> {
  if (!isBrowser) return

  try {
    // Get existing contributions
    const existingContributions = await getAllContributions()

    // Add the new contribution
    existingContributions.push(contribution)

    // Save back to localStorage
    localStorage.setItem("duckinhell_contributions", JSON.stringify(existingContributions))

    // Update total raised
    const total = existingContributions.reduce((sum, c) => sum + c.amount, 0)
    localStorage.setItem("duckinhell_total_raised", total.toString())

    // Dispatch event to notify other components
    window.dispatchEvent(new Event("contributionAdded"))

    // Force a storage event for cross-tab communication
    localStorage.setItem("duckinhell_last_update", Date.now().toString())
  } catch (error) {
    console.error("Error adding contribution:", error)
  }
}

// Get total raised
export async function getTotalRaised(): Promise<number> {
  if (!isBrowser) return 0

  try {
    // First try to get from localStorage
    const totalStr = localStorage.getItem("duckinhell_total_raised")
    if (totalStr) {
      return Number.parseFloat(totalStr)
    }

    // If not available, calculate from contributions
    const contributions = await getAllContributions()
    const total = contributions.reduce((sum, c) => sum + c.amount, 0)

    // Save for future use
    localStorage.setItem("duckinhell_total_raised", total.toString())

    return total
  } catch (error) {
    console.error("Error getting total raised:", error)
    return 0
  }
}

// Get all contributions
export async function getAllContributions(): Promise<Contribution[]> {
  if (!isBrowser) return []

  try {
    const contributionsStr = localStorage.getItem("duckinhell_contributions")
    if (contributionsStr) {
      return JSON.parse(contributionsStr)
    }
    return []
  } catch (error) {
    console.error("Error getting contributions:", error)
    return []
  }
}

// Initialize from existing localStorage data
export async function initializeFromLocalStorage(): Promise<void> {
  if (!isBrowser) return

  // No need to do anything special since we're using localStorage directly
  // Just make sure the total raised is calculated correctly
  try {
    const contributions = await getAllContributions()
    const total = contributions.reduce((sum, c) => sum + c.amount, 0)
    localStorage.setItem("duckinhell_total_raised", total.toString())
  } catch (error) {
    console.error("Error initializing from localStorage:", error)
  }
}

// Update a contribution (e.g., mark as tokens sent)
export async function updateContribution(signature: string, updates: Partial<Contribution>): Promise<void> {
  if (!isBrowser) return

  try {
    const contributions = await getAllContributions()
    const index = contributions.findIndex((c) => c.signature === signature)

    if (index !== -1) {
      contributions[index] = { ...contributions[index], ...updates }
      localStorage.setItem("duckinhell_contributions", JSON.stringify(contributions))

      // Dispatch event to notify other components
      window.dispatchEvent(new Event("contributionUpdated"))

      // Force a storage event for cross-tab communication
      localStorage.setItem("duckinhell_last_update", Date.now().toString())
    }
  } catch (error) {
    console.error("Error updating contribution:", error)
  }
}

