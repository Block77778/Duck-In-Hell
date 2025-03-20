import { Connection, PublicKey, type ParsedTransactionWithMeta, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getTreasuryWalletAddress } from "@/lib/security"

// Get the treasury wallet address
const TREASURY_WALLET_ADDRESS = getTreasuryWalletAddress()

// Interface for blockchain-based contribution
export interface BlockchainContribution {
  signature: string
  amount: number
  sender: string
  timestamp: number
  tokensSent?: boolean
  tokenTxSignature?: string
}

// Cache mechanism with longer duration to avoid excessive RPC calls
let contributionsCache: BlockchainContribution[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache (reduced from 60 minutes)

// Cache for treasury balance to reduce RPC calls
let treasuryBalanceCache: number | null = null
let lastTreasuryBalanceFetchTime = 0
const TREASURY_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes (reduced from 60 minutes)

// Local storage keys
const LS_CONTRIBUTIONS_KEY = "duckinhell_blockchain_contributions"
const LS_TREASURY_BALANCE_KEY = "duckinhell_treasury_balance"
const LS_LAST_FETCH_TIME_KEY = "duckinhell_last_fetch_time"

// Initialize from localStorage on module load
function initFromLocalStorage() {
  try {
    // Load contributions cache
    const storedContributions = localStorage.getItem(LS_CONTRIBUTIONS_KEY)
    const storedLastFetchTime = localStorage.getItem(LS_LAST_FETCH_TIME_KEY)

    if (storedContributions && storedLastFetchTime) {
      contributionsCache = JSON.parse(storedContributions)
      lastFetchTime = Number.parseInt(storedLastFetchTime)
    }

    // Load treasury balance cache
    const storedTreasuryBalance = localStorage.getItem(LS_TREASURY_BALANCE_KEY)
    if (storedTreasuryBalance) {
      const [balance, timestamp] = storedTreasuryBalance.split("|")
      treasuryBalanceCache = Number.parseFloat(balance)
      lastTreasuryBalanceFetchTime = Number.parseInt(timestamp)
    }
  } catch (error) {
    console.error("Error initializing from localStorage:", error)
  }
}

// Call initialization
if (typeof window !== "undefined") {
  initFromLocalStorage()
}

// Function to get RPC connection with optimized settings
export function getConnection(): Connection {
  return new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: false, // Let the library handle retries
    fetch: (url, init) => {
      // Add a custom fetch function that adds a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 20000) // 20 second timeout
      })

      return Promise.race([fetch(url, init), timeoutPromise])
    },
  })
}

// Function to fetch all contributions from blockchain with improved performance
export async function fetchContributionsFromBlockchain(): Promise<BlockchainContribution[]> {
  try {
    console.log("Fetching contributions from blockchain...")
    const connection = getConnection()
    const treasuryPublicKey = new PublicKey(TREASURY_WALLET_ADDRESS)

    // Get signatures of transactions involving the treasury wallet
    let signatures
    try {
      signatures = await connection.getSignaturesForAddress(
        treasuryPublicKey,
        { limit: 10 }, // Fetch 10 transactions
        "confirmed",
      )
    } catch (error) {
      console.error("Error fetching signatures:", error)
      throw error
    }

    console.log(`Found ${signatures.length} transactions for treasury wallet`)

    // Process each transaction to extract contribution data
    const contributions: BlockchainContribution[] = []

    // Process in smaller batches with longer delays between batches
    const batchSize = 2 // Process two at a time for better performance
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize)

      // Get transaction details for this batch
      const transactions = await Promise.all(
        batch.map(async (sig) => {
          try {
            const transaction = await connection.getParsedTransaction(sig.signature, "confirmed")
            return {
              signature: sig.signature,
              transaction,
              blockTime: sig.blockTime,
            }
          } catch (error) {
            console.error(`Error fetching transaction ${sig.signature}:`, error)
            return null
          }
        }),
      )

      // Process each transaction in the batch
      for (const item of transactions) {
        if (!item || !item.transaction) continue

        const { signature, transaction, blockTime } = item

        // Check if this is a SOL transfer to the treasury
        const contribution = extractContributionFromTransaction(signature, transaction, treasuryPublicKey, blockTime)
        if (contribution) {
          contributions.push(contribution)
        }
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < signatures.length) {
        await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms between batches
      }
    }

    console.log(`Extracted ${contributions.length} contributions from blockchain data`)

    // Sort by timestamp (newest first)
    const sortedContributions = contributions.sort((a, b) => b.timestamp - a.timestamp)

    // Save to localStorage for future use
    localStorage.setItem(LS_CONTRIBUTIONS_KEY, JSON.stringify(sortedContributions))
    localStorage.setItem(LS_LAST_FETCH_TIME_KEY, Date.now().toString())

    return sortedContributions
  } catch (error) {
    console.error("Error fetching contributions from blockchain:", error)
    throw error
  }
}

// Update the extractContributionFromTransaction function to use the blockTime parameter
function extractContributionFromTransaction(
  signature: string,
  transaction: ParsedTransactionWithMeta,
  treasuryPublicKey: PublicKey,
  blockTime?: number | null,
): BlockchainContribution | null {
  try {
    // Check if transaction was successful
    if (!transaction.meta || transaction.meta.err) {
      return null
    }

    // Get the timestamp
    const timestamp = blockTime ? blockTime * 1000 : transaction.blockTime ? transaction.blockTime * 1000 : Date.now()

    // Look for SOL transfers to the treasury wallet
    const instructions = transaction.transaction.message.instructions

    // Find the sender (first account that's not the treasury)
    let sender = ""
    let amount = 0

    // Check if this is a system transfer
    for (const instruction of instructions) {
      // Check if it's a parsed instruction
      if ("parsed" in instruction) {
        const parsed = instruction.parsed

        // Check if it's a transfer
        if (parsed.type === "transfer") {
          const info = parsed.info

          // Check if the destination is the treasury wallet
          if (info.destination === TREASURY_WALLET_ADDRESS) {
            sender = info.source
            amount = info.lamports / 1_000_000_000 // Convert lamports to SOL

            // Valid contribution found
            return {
              signature,
              amount,
              sender,
              timestamp,
              tokensSent: false,
            }
          }
        }
      }
    }

    // No valid contribution found in this transaction
    return null
  } catch (error) {
    console.error(`Error processing transaction ${signature}:`, error)
    return null
  }
}

// Function to calculate total raised from blockchain data
export async function getTotalRaisedFromBlockchain(): Promise<number> {
  try {
    const contributions = await getCachedContributions()
    return contributions.reduce((total, contribution) => total + contribution.amount, 0)
  } catch (error) {
    console.error("Error calculating total raised from blockchain:", error)
    return 0
  }
}

// Function to get unique contributors count
export async function getUniqueContributorsCount(): Promise<number> {
  try {
    const contributions = await getCachedContributions()
    const uniqueWallets = new Set(contributions.map((c) => c.sender))
    return uniqueWallets.size
  } catch (error) {
    console.error("Error calculating unique contributors:", error)
    return 0
  }
}

// Function to get contributions with caching
export async function getCachedContributions(forceRefresh = false): Promise<BlockchainContribution[]> {
  const now = Date.now()

  // If cache is valid and we're not forcing a refresh, return it
  if (contributionsCache && now - lastFetchTime < CACHE_DURATION && !forceRefresh) {
    return contributionsCache
  }

  try {
    // Try to fetch fresh data
    try {
      const freshContributions = await fetchContributionsFromBlockchain()
      if (freshContributions.length > 0) {
        contributionsCache = freshContributions
        lastFetchTime = now

        // Save to localStorage
        localStorage.setItem(LS_CONTRIBUTIONS_KEY, JSON.stringify(freshContributions))
        localStorage.setItem(LS_LAST_FETCH_TIME_KEY, lastFetchTime.toString())

        return freshContributions
      }
    } catch (error) {
      console.error("Error fetching fresh contributions:", error)
      // Continue to fallback mechanisms
    }

    // Return existing cache if available, even if it's expired
    if (contributionsCache && contributionsCache.length > 0) {
      console.log("Using cached contributions data")
      return contributionsCache
    }

    // Try to load from localStorage as a last resort
    const storedContributions = localStorage.getItem(LS_CONTRIBUTIONS_KEY)
    if (storedContributions) {
      console.log("Loading contributions from localStorage")
      const parsedContributions = JSON.parse(storedContributions)
      contributionsCache = parsedContributions
      return parsedContributions
    }

    // If all else fails, return empty array
    return []
  } catch (error) {
    console.error("Error in getCachedContributions:", error)

    // Return existing cache if available, even if it's expired
    if (contributionsCache) {
      console.log("Returning stale cache due to error")
      return contributionsCache
    }

    // Try localStorage as a last resort
    try {
      const storedContributions = localStorage.getItem(LS_CONTRIBUTIONS_KEY)
      if (storedContributions) {
        return JSON.parse(storedContributions)
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e)
    }

    return []
  }
}

// Add a function to directly check the treasury balance
export async function getTreasuryBalance(): Promise<number> {
  const now = Date.now()

  // Return cached balance if available and not expired
  if (treasuryBalanceCache !== null && now - lastTreasuryBalanceFetchTime < TREASURY_CACHE_DURATION) {
    return treasuryBalanceCache
  }

  try {
    const connection = getConnection()
    const treasuryPublicKey = new PublicKey(TREASURY_WALLET_ADDRESS)

    const balance = await connection.getBalance(treasuryPublicKey)

    const balanceInSol = balance / LAMPORTS_PER_SOL

    // Update cache
    treasuryBalanceCache = balanceInSol
    lastTreasuryBalanceFetchTime = now

    // Save to localStorage
    localStorage.setItem(LS_TREASURY_BALANCE_KEY, `${balanceInSol}|${now}`)

    return balanceInSol
  } catch (error) {
    console.error("Error getting treasury balance:", error)

    // Return cached value if available, even if expired
    if (treasuryBalanceCache !== null) {
      return treasuryBalanceCache
    }

    // Try to get from localStorage
    const storedBalance = localStorage.getItem(LS_TREASURY_BALANCE_KEY)
    if (storedBalance) {
      const [balance] = storedBalance.split("|")
      return Number.parseFloat(balance)
    }

    // If no cached data, estimate from contributions
    const contributions = await getCachedContributions()
    return contributions.reduce((total, contribution) => total + contribution.amount, 0)
  }
}

// Update the getCachedTotalRaised function to also check the treasury balance
export async function getCachedTotalRaised(): Promise<number> {
  try {
    // First try to get the total from contributions
    const contributions = await getCachedContributions()
    const totalFromContributions = contributions.reduce((total, contribution) => total + contribution.amount, 0)

    // Also get the direct treasury balance
    const treasuryBalance = await getTreasuryBalance()

    console.log(`Total from contributions: ${totalFromContributions.toFixed(4)} SOL`)
    console.log(`Treasury balance: ${treasuryBalance.toFixed(4)} SOL`)

    // Use the higher of the two values
    return Math.max(totalFromContributions, treasuryBalance)
  } catch (error) {
    console.error("Error calculating total raised:", error)

    // Fallback to just using contributions
    try {
      const contributions = await getCachedContributions()
      return contributions.reduce((total, contribution) => total + contribution.amount, 0)
    } catch (e) {
      console.error("Error calculating fallback total:", e)
      return 0
    }
  }
}

// Function to force refresh the cache
export function invalidateCache(): void {
  contributionsCache = null
  lastFetchTime = 0
  treasuryBalanceCache = null
  lastTreasuryBalanceFetchTime = 0
}

// Add this to the global Window interface
declare global {
  interface Window {
    _fetchingContributions?: boolean
  }
}

