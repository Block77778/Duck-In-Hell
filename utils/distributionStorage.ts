import type { BlockchainContribution } from "./blockchainData"

// Interface for token distribution records
interface DistributionRecord {
  signature: string // Original transaction signature
  tokensSent: boolean // Whether tokens have been sent
  tokenTxSignature?: string // Token transaction signature
  distributedAt?: number // Timestamp when tokens were distributed
  amount?: number // Amount of SOL contributed
  sender?: string // Sender wallet address
  timestamp: number // When this record was created/updated
}

// Local storage key
const DISTRIBUTION_STORAGE_KEY = "duckinhell_token_distribution"

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Save distribution status for a contribution
export function saveDistributionStatus(
  contribution: BlockchainContribution,
  tokensSent: boolean,
  tokenTxSignature?: string,
): void {
  if (!isBrowser) return

  try {
    console.log(`Saving distribution status for ${contribution.signature}:`, { tokensSent, tokenTxSignature })

    // Get existing records
    const records = getDistributionRecords()

    // Update or add the record
    records[contribution.signature] = {
      signature: contribution.signature,
      tokensSent,
      tokenTxSignature,
      distributedAt: tokensSent ? Date.now() : undefined,
      amount: contribution.amount,
      sender: contribution.sender,
      timestamp: Date.now(),
    }

    // Save back to localStorage
    localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(records))

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent("distributionUpdated"))

    console.log(`Distribution status updated for transaction ${contribution.signature}`)
  } catch (error) {
    console.error("Error saving distribution status:", error)
  }
}

// Get all distribution records
export function getDistributionRecords(): Record<string, DistributionRecord> {
  if (!isBrowser) return {}

  try {
    const recordsJson = localStorage.getItem(DISTRIBUTION_STORAGE_KEY)
    if (!recordsJson) return {}

    return JSON.parse(recordsJson)
  } catch (error) {
    console.error("Error getting distribution records:", error)
    return {}
  }
}

// Check if a contribution has had tokens distributed
export function hasTokensDistributed(signature: string): boolean {
  if (!isBrowser) return false

  const records = getDistributionRecords()
  return records[signature]?.tokensSent || false
}

// Get token transaction signature for a contribution
export function getTokenTransactionSignature(signature: string): string | undefined {
  if (!isBrowser) return undefined

  const records = getDistributionRecords()
  return records[signature]?.tokenTxSignature
}

// Apply distribution status to contributions
export function applyDistributionStatus(contributions: BlockchainContribution[]): BlockchainContribution[] {
  if (!isBrowser) return contributions

  const records = getDistributionRecords()
  console.log("Distribution records:", records)
  console.log("Applying distribution status to", contributions.length, "contributions")

  return contributions.map((contribution) => {
    const record = records[contribution.signature]
    if (record) {
      console.log(`Found distribution record for ${contribution.signature}:`, record)
      return {
        ...contribution,
        tokensSent: record.tokensSent,
        tokenTxSignature: record.tokenTxSignature,
      }
    }
    return contribution
  })
}

// Clear all distribution records (for testing)
export function clearDistributionRecords(): void {
  if (!isBrowser) return

  localStorage.removeItem(DISTRIBUTION_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent("distributionUpdated"))
}

// Export distribution records as CSV
export function exportDistributionRecordsAsCsv(): string {
  if (!isBrowser) return ""

  const records = getDistributionRecords()
  const headers = ["Transaction Signature", "Tokens Sent", "Token Transaction Signature", "Distributed At"]

  const rows = Object.values(records).map((record) => [
    record.signature,
    record.tokensSent ? "Yes" : "No",
    record.tokenTxSignature || "",
    record.distributedAt ? new Date(record.distributedAt).toISOString() : "",
  ])

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
}

