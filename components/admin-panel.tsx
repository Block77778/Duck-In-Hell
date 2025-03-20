"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Lock,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { getAdminWalletAddress, getTokenAddress, getTreasuryWalletAddress } from "@/lib/security"
import { invalidateCache, type BlockchainContribution } from "@/utils/blockchainData"
import { debugLocalStorage, debugDistributionStatus, getDebugButtonProps } from "@/utils/debugUtils"
import { isOfflineMode, setOfflineMode, isRateLimited, clearRateLimit } from "@/utils/offlineMode"
import { WifiOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

// First, import the phantom helper at the top of the file
import { isPhantomInstalled, getPhantomVersion, resetWalletConnection } from "@/utils/phantomHelper"

// Get addresses from security module
const ADMIN_WALLET_ADDRESS = getAdminWalletAddress()
const TOKEN_ADDRESS = getTokenAddress()
const TREASURY_WALLET_ADDRESS = getTreasuryWalletAddress()

// Token distribution rate: 1 SOL = 1,000,000 tokens ($0.001 per token)
const TOKEN_DISTRIBUTION_RATE = 1000000

// Minimum token amount to show in the admin panel (10,000 tokens)
const MIN_TOKEN_THRESHOLD = 10000

// Two-factor authentication code (in a real app, this would be generated dynamically)
// For testing purposes, we'll make this simpler
const VALID_2FA_CODE = "123456"

// For testing, we'll also accept a simpler admin password
const TEST_ADMIN_PASSWORD = "admin"

// Token decimals - SPL tokens typically use 9 decimals
const TOKEN_DECIMALS = 9

// RPC endpoints to try
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
]

interface DistributionStatus {
  status: "idle" | "processing" | "success" | "error"
  message: string
  processed: number
  total: number
  currentWallet?: string
}

interface VerificationResult {
  contribution: BlockchainContribution
  verified: boolean
  balance?: number
  expected?: number
  message: string
  needsResend: boolean
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  contributionsToProcess: BlockchainContribution[]
  isResending: boolean
}

interface AddressVerificationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  senderTokenAccount: string
  recipientTokenAccount: string
  recipientWallet: string
  amount: number
}

// Helper function to check if an error is a rate limit error
const isRateLimitError = (error: any): boolean => {
  if (!error) return false

  // Check for error message containing rate limit indicators
  if (error instanceof Error) {
    return (
      error.message.includes("429") ||
      error.message.includes("rate-limit") ||
      error.message.includes("rate limit") ||
      error.message.toLowerCase().includes("too many requests")
    )
  }

  // Check for JSON RPC error response
  if (typeof error === "object" && error !== null) {
    if (error.code === 429) return true
    if (error.error && error.error.code === 429) return true
    if (error.message && typeof error.message === "string") {
      return (
        error.message.includes("429") ||
        error.message.includes("rate-limit") ||
        error.message.includes("rate limit") ||
        error.message.toLowerCase().includes("too many requests")
      )
    }
  }

  return false
}

// Helper function to implement exponential backoff
const backoff = async (retryCount: number, isRateLimit = false): Promise<void> => {
  // Use a longer backoff time for rate limit errors
  const baseTime = isRateLimit ? 5000 : 2000
  const factor = isRateLimit ? 3 : 2
  const backoffTime = baseTime * Math.pow(factor, retryCount)
  const cappedTime = Math.min(backoffTime, 60000) // Cap at 1 minute

  console.log(`Backing off for ${cappedTime / 1000}s before retry ${retryCount + 1}`)
  await new Promise((resolve) => setTimeout(resolve, cappedTime))
}

// Confirmation Dialog Component
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  contributionsToProcess,
  isResending,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-[#ff4800]/50">
        <DialogHeader>
          <DialogTitle className="text-[#ff9800]">Confirm Token Distribution</DialogTitle>
          <DialogDescription className="text-gray-300">
            {isResending
              ? "Please verify the wallet address before resending tokens."
              : "Please verify the following wallet addresses before distributing tokens."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto my-4">
          {contributionsToProcess.map((contribution, index) => (
            <div key={index} className="mb-3 p-3 bg-black/50 border border-[#ff4800]/30 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Wallet:</span>
                <span className="text-sm font-mono text-[#ff9800]">{contribution.sender}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">Tokens to Send:</span>
                <span className="text-sm font-mono text-[#ff9800]">
                  {(contribution.amount * TOKEN_DISTRIBUTION_RATE).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <Button variant="outline" onClick={onClose} className="border-[#ff4800]/30 text-[#ff9800]">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-[#ff4800] hover:bg-[#ff4800]/80">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Confirm Addresses & Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminPanel() {
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet()
  const [contributions, setContributions] = useState<BlockchainContribution[]>([])
  const [totalRaised, setTotalRaised] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [exportData, setExportData] = useState("")
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus>({
    status: "idle",
    message: "",
    processed: 0,
    total: 0,
  })
  const [securityStatus, setSecurityStatus] = useState<{
    isSecure: boolean
    message: string
  }>({ isSecure: true, message: "" })
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [rateLimitWarning, setRateLimitWarning] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)
  const [offlineMode, setOfflineModeState] = useState(false)
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({})
  const [selectedContribution, setSelectedContribution] = useState<BlockchainContribution | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [batchSize, setBatchSize] = useState(1) // Default to processing 1 at a time
  const [superSlowMode, setSuperSlowMode] = useState(true) // Default to super slow mode ON
  const [currentRpcIndex, setCurrentRpcIndex] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  const [pendingContributions, setPendingContributions] = useState<BlockchainContribution[]>([])
  const [currentContribution, setCurrentContribution] = useState<BlockchainContribution | null>(null)

  // Confirmation dialog state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [contributionsToConfirm, setContributionsToConfirm] = useState<BlockchainContribution[]>([])

  // Transaction lock to prevent multiple simultaneous transactions
  const isProcessingRef = useRef(false)
  const [processingLocked, setProcessingLocked] = useState(false)
  const [lastProcessedSignature, setLastProcessedSignature] = useState<string | null>(null)
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null)

  // Debug mode for detailed logging
  const [debugMode, setDebugMode] = useState(false)

  // Address verification dialog state
  const [isAddressVerificationOpen, setIsAddressVerificationOpen] = useState(false)
  const [addressVerificationInfo, setAddressVerificationInfo] = useState<{
    senderTokenAccount: string
    recipientTokenAccount: string
    recipientWallet: string
    amount: number
  } | null>(null)

  // Always set security status to secure
  useEffect(() => {
    setSecurityStatus({
      isSecure: true,
      message: "",
    })
  }, [])

  // Check if connected wallet is admin
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString()
      const adminAddress = getAdminWalletAddress()

      console.log("Connected wallet:", walletAddress)
      console.log("Admin wallet from security module:", adminAddress)

      // For testing purposes, we'll consider the specific wallet as admin
      // and also log a message if there's a mismatch
      if (walletAddress === adminAddress) {
        console.log("✅ Admin wallet connected!")
        setIsAdmin(true)
      } else {
        console.log("❌ Non-admin wallet connected")
        setIsAdmin(false)
      }
    } else {
      setIsAdmin(false)
    }
  }, [publicKey, connected])

  // Check lockout status
  useEffect(() => {
    if (lockoutUntil && Date.now() > lockoutUntil) {
      setLockoutUntil(null)
      setLoginAttempts(0)
    }
  }, [lockoutUntil])

  // Cleanup processing timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout)
      }
    }
  }, [processingTimeout])

  // Get a connection with the current RPC endpoint
  const getConnection = useCallback(() => {
    const endpoint = RPC_ENDPOINTS[currentRpcIndex]
    console.log(`Using RPC endpoint: ${endpoint} (index: ${currentRpcIndex})`)

    return new Connection(endpoint, {
      commitment: "confirmed",
      disableRetryOnRateLimit: true, // We'll handle retries ourselves
    })
  }, [currentRpcIndex])

  // Switch to the next RPC endpoint
  const switchToNextRpcEndpoint = useCallback(() => {
    const nextIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length
    console.log(`Switching from RPC endpoint ${currentRpcIndex} to ${nextIndex}`)
    setCurrentRpcIndex(nextIndex)
    return nextIndex
  }, [currentRpcIndex])

  // Define loadContributionData as a useCallback to prevent recreation on each render
  const loadContributionData = useCallback(async () => {
    console.log("Loading contribution data from blockchain...")
    setIsLoading(true)
    setRateLimitWarning(false)

    try {
      // Get contributions from blockchain with forced refresh
      const { getCachedContributions, getCachedTotalRaised, invalidateCache, getTreasuryBalance } = await import(
        "@/utils/blockchainData"
      )

      // Force cache invalidation to get fresh data
      invalidateCache()

      try {
        // Get fresh contributions data
        const blockchainContributions = await getCachedContributions(true) // Force refresh

        // Apply distribution status from local storage
        const { applyDistributionStatus } = await import("@/utils/distributionStorage")
        const contributionsWithStatus = applyDistributionStatus(blockchainContributions)

        setContributions(contributionsWithStatus)

        // Add this after setting contributions
        console.log(
          "Contributions with tokensSent status:",
          contributionsWithStatus.map((c) => ({
            signature: c.signature.substring(0, 8),
            amount: c.amount,
            tokensSent: c.tokensSent,
          })),
        )

        // Get total raised using the improved method that checks treasury balance directly
        const total = await getCachedTotalRaised()
        console.log("Admin panel - Total raised from blockchain:", total)

        // Also get the direct treasury balance for comparison
        const treasuryBalance = await getTreasuryBalance()
        console.log("Admin panel - Direct treasury balance:", treasuryBalance)

        // Use the higher value for better accuracy
        const finalTotal = Math.max(total, treasuryBalance)
        setTotalRaised(finalTotal)

        // Update last refresh time
        setLastRefreshTime(Date.now())
      } catch (error) {
        console.error("Error fetching blockchain data:", error)

        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          setRateLimitWarning(true)
          console.warn("Rate limit detected, using cached data if available")

          // Try switching to another RPC endpoint
          switchToNextRpcEndpoint()
        }

        // Use cached data if available
        if (contributions.length > 0) {
          console.log("Using cached contributions data")
        } else {
          // Try to get cached data without forcing refresh
          const cachedContributions = await getCachedContributions(false)

          // Apply distribution status
          const { applyDistributionStatus } = await import("@/utils/distributionStorage")
          const contributionsWithStatus = applyDistributionStatus(cachedContributions)

          setContributions(contributionsWithStatus)
        }
      }

      // Generate CSV export
      const csvData = [
        ["Wallet", "Amount (SOL)", "Date", "Transaction Signature", "Tokens Sent", "Token Tx Signature"].join(","),
        ...contributions.map((c) =>
          [
            c.sender,
            c.amount,
            new Date(c.timestamp).toISOString(),
            c.signature,
            c.tokensSent ? "Yes" : "No",
            c.tokenTxSignature || "",
          ].join(","),
        ),
      ].join("\n")

      setExportData(csvData)
    } catch (e) {
      console.error("Error loading contribution data from blockchain:", e)
    } finally {
      setIsLoading(false)
    }
  }, [contributions, switchToNextRpcEndpoint])

  // Load contribution data when component mounts
  useEffect(() => {
    loadContributionData()
  }, [loadContributionData])

  const handleAuthenticate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (lockoutUntil && Date.now() < lockoutUntil) {
      return // Prevent login attempts during lockout
    }

    setIsLoading(true)

    try {
      // For testing purposes, we'll accept a simpler admin password
      const isValidPassword = password === TEST_ADMIN_PASSWORD

      // For testing, we'll also accept a simpler 2FA code
      const isValidTwoFactorCode = twoFactorCode === "" || twoFactorCode === VALID_2FA_CODE

      if (isValidPassword && isValidTwoFactorCode) {
        setIsAuthenticated(true)
        setLoginAttempts(0) // Reset login attempts on successful login
      } else {
        setLoginAttempts((prevAttempts) => prevAttempts + 1)
        if (loginAttempts >= 4) {
          // Lockout for 15 minutes
          const lockoutDuration = 15 * 60 * 1000 // 15 minutes in milliseconds
          setLockoutUntil(Date.now() + lockoutDuration)
        }
        alert("Authentication failed. Please check your credentials.")
      }
    } catch (error) {
      console.error("Authentication error:", error)
      alert("An error occurred during authentication. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshData = async () => {
    console.log("Manual refresh triggered...")
    await loadContributionData()
  }

  const handleExportCSV = () => {
    const blob = new Blob([exportData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", "duck_in_hell_contributions.csv")
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Update the verifyTokenDistribution function to handle rate limits
  const verifyTokenDistribution = async (contribution: BlockchainContribution) => {
    if (!contribution.tokenTxSignature) {
      return {
        contribution,
        verified: false,
        message: "No token transaction signature found",
        needsResend: true,
      }
    }

    try {
      setIsLoading(true)

      // Get connection with better rate limit handling
      const connection = getConnection()

      // Get token mint
      const tokenMint = new PublicKey(TOKEN_ADDRESS)

      // Get recipient's token account
      const recipientPublicKey = new PublicKey(contribution.sender)

      // Implement retry logic for getting the token account
      let retries = 0
      const maxRetries = 5 // Increased from 3 to 5

      while (retries < maxRetries) {
        try {
          const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPublicKey)

          // Check if the account exists and get its balance
          try {
            // Add a small delay before checking the account to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const tokenAccount = await getAccount(connection, recipientTokenAccount)
            const balance = Number(tokenAccount.amount) / 10 ** TOKEN_DECIMALS

            // Expected token amount (properly calculated)
            const expectedAmount = contribution.amount * TOKEN_DISTRIBUTION_RATE
            console.log(
              `Expected token amount for ${contribution.sender}: ${expectedAmount} (${contribution.amount} SOL * ${TOKEN_DISTRIBUTION_RATE})`,
            )

            // Check if balance is less than expected
            const needsResend = balance < expectedAmount

            return {
              contribution,
              verified: true,
              balance,
              expected: expectedAmount,
              message: `Token account verified. Balance: ${balance.toLocaleString()} tokens`,
              needsResend,
            }
          } catch (error) {
            if (isRateLimitError(error)) {
              console.warn(`Rate limit hit when checking token account (attempt ${retries + 1}):`, error)

              // Switch to next RPC endpoint
              switchToNextRpcEndpoint()

              await backoff(retries, true)
              retries++

              // If we've exhausted all retries, return a rate limit error
              if (retries >= maxRetries) {
                return {
                  contribution,
                  verified: false,
                  message: "Rate limit exceeded. Please try again later.",
                  needsResend: true,
                }
              }

              // Try again
              continue
            }

            return {
              contribution,
              verified: false,
              message: "Token account not found or error retrieving balance",
              needsResend: true,
            }
          }
        } catch (error) {
          if (isRateLimitError(error)) {
            console.warn(`Rate limit hit when getting token address (attempt ${retries + 1}):`, error)

            // Switch to next RPC endpoint
            switchToNextRpcEndpoint()

            await backoff(retries, true)
            retries++

            // If we've exhausted all retries, return a rate limit error
            if (retries >= maxRetries) {
              return {
                contribution,
                verified: false,
                message: "Rate limit exceeded. Please try again later.",
                needsResend: true,
              }
            }

            // Try again
            continue
          }

          throw error // Re-throw non-rate-limit errors
        }
      }

      // This should not be reached due to the returns in the loop, but TypeScript needs it
      throw new Error("Failed to verify token distribution after multiple retries")
    } catch (error) {
      console.error("Error verifying token distribution:", error)
      return {
        contribution,
        verified: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        needsResend: true,
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Now add a new function to handle the verification button click:
  const handleVerifyDistribution = async (contribution: BlockchainContribution) => {
    const result = await verifyTokenDistribution(contribution)

    // Store the verification result
    setVerificationResults((prev) => ({
      ...prev,
      [contribution.signature]: result,
    }))

    if (result.verified) {
      if (result.needsResend) {
        alert(
          `Verification shows insufficient tokens!\nBalance: ${result.balance?.toLocaleString()} tokens\nExpected: ${result.expected?.toLocaleString()} tokens\n\nYou can resend the tokens by clicking the "Resend" button.`,
        )
      } else {
        alert(
          `Verification successful!\nBalance: ${result.balance?.toLocaleString()} tokens\nExpected: ${result.expected?.toLocaleString()} tokens`,
        )
      }
    } else {
      alert(`Verification failed: ${result.message}\n\nYou can resend the tokens by clicking the "Resend" button.`)
    }
  }

  // Add a new function to test the token transfer

  const testTokenTransferSetup = async (contribution: BlockchainContribution) => {
    setIsLoading(true)

    try {
      setDistributionStatus({
        status: "processing",
        message: `Testing token transfer setup for ${contribution.sender.substring(0, 6)}...${contribution.sender.substring(contribution.sender.length - 4)}`,
        processed: 0,
        total: 1,
        currentWallet: contribution.sender,
      })

      const connection = getConnection()

      // Import the test utility
      const { testTokenTransfer } = await import("@/utils/transferTester")
      const { formatPublicKey } = await import("@/utils/tokenTransfer")

      // Perform the test
      const result = await testTokenTransfer(connection, publicKey!.toString(), contribution.sender, TOKEN_ADDRESS)

      if (result.success) {
        setDistributionStatus({
          status: "success",
          message: `Token transfer setup verified successfully!
        
Sender token account: ${formatPublicKey(result.details.senderTokenAccount)}
Recipient token account: ${formatPublicKey(result.details.recipientTokenAccount)}
Sender balance: ${result.details.senderBalance}
        
Ready to send tokens.`,
          processed: 1,
          total: 1,
        })
      } else {
        setDistributionStatus({
          status: "error",
          message: result.message,
          processed: 0,
          total: 1,
        })
      }
    } catch (error) {
      console.error("Error testing token transfer:", error)
      setDistributionStatus({
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        processed: 0,
        total: 1,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to release the processing lock after a timeout
  const releaseProcessingLock = useCallback(() => {
    console.log("Releasing processing lock")
    isProcessingRef.current = false
    setProcessingLocked(false)
    setLastProcessedSignature(null)

    if (processingTimeout) {
      clearTimeout(processingTimeout)
    }
  }, [processingTimeout])

  // Find the processContribution function and replace it with this new implementation

  // Process a single contribution with retries
  const processContribution = async (contribution: BlockchainContribution): Promise<boolean> => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      console.error("Wallet not connected or doesn't support required methods")
      return false
    }

    setDistributionStatus({
      status: "processing",
      message: `Processing contribution for ${contribution.sender.substring(0, 6)}...${contribution.sender.substring(contribution.sender.length - 4)}`,
      processed: 0,
      total: 1,
      currentWallet: contribution.sender,
    })

    // Calculate token amount
    const tokenAmount = contribution.amount * TOKEN_DISTRIBUTION_RATE

    if (debugMode) {
      console.log("Token transfer details:")
      console.log("- Recipient:", contribution.sender)
      console.log("- Amount (tokens):", tokenAmount)
    }

    // Implement retry logic
    let retries = 0
    const maxRetries = 5
    let signature: string // Declare signature here

    while (retries < maxRetries) {
      try {
        // Get a fresh connection for each attempt
        const connection = getConnection()

        // Add a delay before starting to avoid rate limits
        const initialDelay = superSlowMode ? 5000 : 2000
        setDistributionStatus({
          status: "processing",
          message: `Preparing transaction (waiting ${initialDelay / 1000}s)...`,
          processed: 0,
          total: 1,
          currentWallet: contribution.sender,
        })
        await new Promise((resolve) => setTimeout(resolve, initialDelay))

        // Import the new direct token distribution utility
        const { simplifiedTokenDistribution } = await import("@/utils/directTokenDistribution")

        setDistributionStatus({
          status: "processing",
          message: `Creating transaction...`,
          processed: 0,
          total: 1,
          currentWallet: contribution.sender,
        })

        // Use the new simplified distribution method
        setDistributionStatus({
          status: "processing",
          message: `Preparing to send tokens to ${contribution.sender.substring(0, 6)}...${contribution.sender.substring(contribution.sender.length - 4)}`,
          processed: 0,
          total: 1,
          currentWallet: contribution.sender,
        })

        // Use the simplified token distribution method
        const result = await simplifiedTokenDistribution(
          connection,
          publicKey,
          contribution.sender,
          TOKEN_ADDRESS,
          tokenAmount,
          signTransaction,
          sendTransaction,
        )

        if (!result.success) {
          throw new Error(result.error || "Failed to distribute tokens")
        }

        // Use the signature from the result
        signature = result.signature!

        setLastProcessedSignature(signature)

        if (debugMode) {
          console.log("Transaction sent with signature:", signature)
        }

        // Save distribution status to persistent storage
        try {
          const { saveDistributionStatus } = await import("@/utils/distributionStorage")
          saveDistributionStatus(contribution, true, signature)

          // Update the UI
          contribution.tokensSent = true
          contribution.tokenTxSignature = signature

          // Clear verification result for this contribution
          setVerificationResults((prev) => {
            const newResults = { ...prev }
            delete newResults[contribution.signature]
            return newResults
          })

          console.log(`Successfully sent ${tokenAmount} tokens to ${contribution.sender}`)
        } catch (error) {
          console.error("Error saving distribution status:", error)
          // Continue anyway since the transaction was successful
        }

        // Transaction was successful, return true
        return true
      } catch (error) {
        console.error(`Error processing transaction (attempt ${retries + 1}):`, error)

        // Check for specific Phantom wallet errors
        if (
          error instanceof Error &&
          (error.message.includes("User rejected") ||
            error.message.includes("cancelled") ||
            error.message.includes("rejected") ||
            error.message.includes("declined"))
        ) {
          setDistributionStatus({
            status: "error",
            message: "Transaction was rejected in the wallet. Please try again.",
            processed: 0,
            total: 1,
          })
          return false // Don't retry if user rejected
        }

        if (isRateLimitError(error)) {
          console.warn("Rate limit detected, switching endpoints and backing off...")

          // Switch to next RPC endpoint
          switchToNextRpcEndpoint()

          // Increase retry count
          retries++

          // If we've exhausted all retries, return false
          if (retries >= maxRetries) {
            setDistributionStatus({
              status: "error",
              message: `Rate limit exceeded after ${maxRetries} attempts. Please try again later.`,
              processed: 0,
              total: 1,
            })
            return false
          }

          // Back off before retrying
          const backoffTime = superSlowMode
            ? 30000 * Math.pow(1.5, retries)
            : // Super slow mode: start with 30s, then 45s, 67.5s, etc.
              10000 * Math.pow(1.5, retries) // Normal mode: start with 10s, then 15s, 22.5s, etc.

          const cappedBackoffTime = Math.min(backoffTime, 120000) // Cap at 2 minutes

          setDistributionStatus({
            status: "processing",
            message: `Rate limit hit. Waiting ${Math.round(cappedBackoffTime / 1000)}s before retry ${retries + 1}/${maxRetries}...`,
            processed: 0,
            total: 1,
            currentWallet: contribution.sender,
          })

          await new Promise((resolve) => setTimeout(resolve, cappedBackoffTime))

          // Continue to next retry
          continue
        } else {
          // For non-rate-limit errors, try a few more times with backoff
          retries++

          if (retries >= maxRetries) {
            setDistributionStatus({
              status: "error",
              message: `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
              processed: 0,
              total: 1,
            })
            return false
          }

          const backoffTime = 5000 * Math.pow(1.5, retries)
          const cappedBackoffTime = Math.min(backoffTime, 30000) // Cap at 30 seconds

          setDistributionStatus({
            status: "processing",
            message: `Error occurred. Waiting ${Math.round(cappedBackoffTime / 1000)}s before retry ${retries + 1}/${maxRetries}...`,
            processed: 0,
            total: 1,
            currentWallet: contribution.sender,
          })

          await new Promise((resolve) => setTimeout(resolve, cappedBackoffTime))

          // Continue to next retry
          continue
        }
      }
    }

    // If we get here, all retries failed
    return false
  }

  // Simplified token distribution function
  const startTokenDistribution = async () => {
    console.log("Starting token distribution...")

    // Check if already processing
    if (isProcessingRef.current) {
      console.log("Already processing a transaction, please wait...")
      setDistributionStatus({
        status: "error",
        message: "A transaction is already in progress. Please wait for it to complete.",
        processed: 0,
        total: 0,
      })
      return
    }

    // Set processing lock
    isProcessingRef.current = true
    setProcessingLocked(true)

    // Set a timeout to automatically release the lock after 5 minutes
    const timeout = setTimeout(() => {
      console.log("Processing timeout reached, releasing lock")
      releaseProcessingLock()
      setDistributionStatus({
        status: "error",
        message: "Processing timed out. Please try again.",
        processed: 0,
        total: 0,
      })
    }, 300000) // 5 minutes

    setProcessingTimeout(timeout)

    // Check if we're resending tokens for a specific contribution
    const isResending = selectedContribution !== null

    // Get the contributions to process
    const allContributionsToProcess = isResending
      ? [selectedContribution!]
      : contributions.filter((c) => !c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD)

    if (allContributionsToProcess.length === 0) {
      alert("No contributions to process!")
      releaseProcessingLock()
      return
    }

    // Process only a batch at a time to avoid rate limits
    const contributionsToProcess = allContributionsToProcess.slice(0, batchSize)

    // Initialize distribution status
    setDistributionStatus({
      status: "processing",
      message: isResending
        ? "Resending tokens..."
        : `Starting token distribution (processing ${contributionsToProcess.length} of ${allContributionsToProcess.length} contributions)...`,
      processed: 0,
      total: contributionsToProcess.length,
    })

    // Test mode - just mark contributions as distributed without actual distribution
    if (testMode) {
      try {
        for (let i = 0; i < contributionsToProcess.length; i++) {
          const contribution = contributionsToProcess[i]

          setDistributionStatus({
            status: "processing",
            message: `Processing ${i + 1} of ${contributionsToProcess.length} in test mode...`,
            processed: i,
            total: contributionsToProcess.length,
            currentWallet: contribution.sender,
          })

          // Simulate processing time
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Save distribution status to persistent storage
          const { saveDistributionStatus } = await import("@/utils/distributionStorage")
          const testSignature = "TEST_MODE_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10)
          saveDistributionStatus(contribution, true, testSignature)

          // Update the UI
          contribution.tokensSent = true
          contribution.tokenTxSignature = testSignature

          // Add a small delay between test transactions
          if (i < contributionsToProcess.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }

        // Reload the contributions after all updates
        invalidateCache()
        await loadContributionData()

        // All done!
        setDistributionStatus({
          status: "success",
          message: isResending
            ? `Test mode: Successfully marked token as resent!`
            : `Test mode: Successfully marked ${contributionsToProcess.length} contributions as distributed!`,
          processed: contributionsToProcess.length,
          total: contributionsToProcess.length,
        })

        // Clear selected contribution
        setSelectedContribution(null)
        releaseProcessingLock()
        return
      } catch (error) {
        console.error("Error in test mode:", error)
        setDistributionStatus({
          status: "error",
          message: `Test mode error: ${error instanceof Error ? error.message : String(error)}`,
          processed: 0,
          total: contributionsToProcess.length,
        })
        setSelectedContribution(null)
        releaseProcessingLock()
        return
      }
    }

    // Check if wallet is connected
    if (!publicKey || !signTransaction || !sendTransaction) {
      setDistributionStatus({
        status: "error",
        message: "Wallet not connected or doesn't support required methods",
        processed: 0,
        total: contributionsToProcess.length,
      })
      releaseProcessingLock()
      return
    }

    try {
      // Process each contribution one at a time
      let successCount = 0

      for (let i = 0; i < contributionsToProcess.length; i++) {
        const contribution = contributionsToProcess[i]

        setDistributionStatus({
          status: "processing",
          message: `Processing contribution ${i + 1} of ${contributionsToProcess.length}...`,
          processed: i,
          total: contributionsToProcess.length,
          currentWallet: contribution.sender,
        })

        // Process this contribution with retries
        const success = await processContribution(contribution)

        if (success) {
          successCount++

          // Add a very long delay between transactions to avoid rate limiting
          if (i < contributionsToProcess.length - 1) {
            const delayTime = superSlowMode ? 60000 : 30000 // 60 or 30 seconds between transactions
            console.log(`Waiting ${delayTime / 1000}s before processing next transaction to avoid rate limits...`)

            setDistributionStatus({
              status: "processing",
              message: `Transaction successful! Waiting ${delayTime / 1000}s before processing next transaction...`,
              processed: i + 1,
              total: contributionsToProcess.length,
            })

            await new Promise((resolve) => setTimeout(resolve, delayTime))
          }
        } else {
          // If processing failed, stop and report the error
          setDistributionStatus({
            status: "error",
            message: `Failed to process contribution ${i + 1}. Processed ${successCount} of ${contributionsToProcess.length} successfully.`,
            processed: successCount,
            total: contributionsToProcess.length,
          })

          setSelectedContribution(null)
          releaseProcessingLock()
          return
        }
      }

      // Reload the contributions after all updates
      invalidateCache()
      await loadContributionData()

      // Check if there are more contributions to process
      const remainingContributions = allContributionsToProcess.length - contributionsToProcess.length

      // All done!
      setDistributionStatus({
        status: "success",
        message: isResending
          ? `Successfully resent tokens to ${contributionsToProcess[0].sender.substring(0, 6)}...${contributionsToProcess[0].sender.substring(contributionsToProcess[0].sender.length - 4)}!`
          : remainingContributions > 0
            ? `Successfully distributed tokens to ${contributionsToProcess.length} contributors! ${remainingContributions} more remaining.`
            : `Successfully distributed tokens to ${contributionsToProcess.length} contributors!`,
        processed: contributionsToProcess.length,
        total: contributionsToProcess.length,
      })

      // Clear selected contribution
      setSelectedContribution(null)
    } catch (error) {
      console.error("Token distribution error:", error)
      setDistributionStatus({
        status: "error",
        message: `Token distribution failed: ${error instanceof Error ? error.message : String(error)}`,
        processed: 0,
        total: contributionsToProcess.length,
      })
      setSelectedContribution(null)
    } finally {
      // Release the processing lock
      releaseProcessingLock()
    }
  }

  const handleDistributeTokens = () => {
    // Check if wallet is connected
    if (!connected || !publicKey) {
      alert("Please connect your admin wallet to distribute tokens")
      return
    }

    // Check if the connected wallet is the admin wallet
    if (publicKey.toString() !== ADMIN_WALLET_ADDRESS) {
      alert("Only the admin wallet can distribute tokens")
      return
    }

    // Check if already processing
    if (isProcessingRef.current) {
      alert("A transaction is already in progress. Please wait for it to complete.")
      return
    }

    // Get the contributions to process
    const contributionsToProcess = contributions.filter(
      (c) => !c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD,
    )

    if (contributionsToProcess.length === 0) {
      alert("No contributions to process!")
      return
    }

    // Show confirmation dialog
    setContributionsToConfirm(contributionsToProcess)
    setIsResending(false)
    setIsConfirmationOpen(true)
  }

  const handleResendTokens = (contribution: BlockchainContribution) => {
    // Check if wallet is connected
    if (!connected || !publicKey) {
      alert("Please connect your admin wallet to resend tokens")
      return
    }

    // Check if the connected wallet is the admin wallet
    if (publicKey.toString() !== ADMIN_WALLET_ADDRESS) {
      alert("Only the admin wallet can resend tokens")
      return
    }

    // Check if already processing
    if (isProcessingRef.current) {
      alert("A transaction is already in progress. Please wait for it to complete.")
      return
    }

    // Show confirmation dialog
    setContributionsToConfirm([contribution])
    setIsResending(true)
    setIsConfirmationOpen(true)
  }

  const handleConfirmDistribution = () => {
    setIsConfirmationOpen(false)
    setSelectedContribution(isResending ? contributionsToConfirm[0] : null)
    startTokenDistribution()
  }

  // Add this function to the AdminPanel component:
  const handleExportDistributionRecords = async () => {
    const { exportDistributionRecordsAsCsv } = await import("@/utils/distributionStorage")
    const csvData = exportDistributionRecordsAsCsv()

    const blob = new Blob([csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", "duck_in_hell_token_distribution.csv")
    document.body.appendChild(a)
    a.click()
  }

  // Add this to the useEffect that loads initial state
  useEffect(() => {
    setOfflineModeState(isOfflineMode() || isRateLimited())

    // Listen for changes to offline mode
    const handleOfflineModeChanged = () => {
      setOfflineModeState(isOfflineMode() || isRateLimited())
    }
    window.addEventListener("offlineModeChanged", handleOfflineModeChanged)
    window.addEventListener("rateLimitChanged", handleOfflineModeChanged)

    return () => {
      window.removeEventListener("offlineModeChanged", handleOfflineModeChanged)
      window.removeEventListener("rateLimitChanged", handleOfflineModeChanged)
    }
  }, [])

  // Function to cancel ongoing processing
  const handleCancelProcessing = () => {
    if (isProcessingRef.current) {
      console.log("Cancelling token distribution...")
      releaseProcessingLock()
      setDistributionStatus({
        status: "error",
        message: "Token distribution cancelled by user.",
        processed: 0,
        total: 0,
      })
    }
  }

  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(!debugMode)
    console.log(`Debug mode ${!debugMode ? "enabled" : "disabled"}`)
  }

  // Address Verification Dialog Component
  function AddressVerificationDialog({
    isOpen,
    onClose,
    onConfirm,
    senderTokenAccount,
    recipientTokenAccount,
    recipientWallet,
    amount,
  }: AddressVerificationDialogProps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-black border-[#ff4800]/50">
          <DialogHeader>
            <DialogTitle className="text-[#ff9800]">Verify Token Transfer Addresses</DialogTitle>
            <DialogDescription className="text-gray-300">
              Please verify these addresses match what you see in Phantom wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="bg-black/50 p-3 border border-[#ff4800]/30 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-1">Recipient Wallet:</p>
              <p className="text-sm font-mono text-[#ff9800] break-all">{recipientWallet}</p>
            </div>
            <div className="bg-black/50 p-3 border border-[#ff4800]/30 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-1">Recipient Token Account:</p>
              <p className="text-sm font-mono text-[#ff9800] break-all">{recipientTokenAccount}</p>
            </div>
            <div className="bg-black/50 p-3 border border-[#ff4800]/30 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-1">Sender Token Account:</p>
              <p className="text-sm font-mono text-[#ff9800] break-all">{senderTokenAccount}</p>
            </div>
            <div className="bg-black/50 p-3 border border-[#ff4800]/30 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-1">Amount:</p>
              <p className="text-sm font-mono text-[#ff9800]">{amount.toLocaleString()} tokens</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="outline" onClick={onClose} className="border-[#ff4800]/30 text-[#ff9800]">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="bg-[#ff4800] hover:bg-[#ff4800]/80">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Addresses Match - Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Find the testDirectTokenTransfer function and replace it with this implementation

  const testDirectTokenTransfer = async (contribution: BlockchainContribution) => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      alert("Wallet not connected")
      return
    }

    setIsLoading(true)

    try {
      setDistributionStatus({
        status: "processing",
        message: `Testing direct token transfer for ${contribution.sender.substring(0, 6)}...`,
        processed: 0,
        total: 1,
      })

      const connection = getConnection()

      // Import the direct distribution utility
      const { distributeTokens } = await import("@/utils/directTokenDistribution")

      // Calculate token amount
      const tokenAmount = contribution.amount * TOKEN_DISTRIBUTION_RATE

      // Use the direct distribution method
      const result = await distributeTokens(
        connection,
        publicKey,
        contribution.sender,
        TOKEN_ADDRESS,
        tokenAmount,
        signTransaction,
        sendTransaction,
      )

      if (result.success) {
        setDistributionStatus({
          status: "success",
          message: `Test transaction sent successfully! Signature: ${result.signature!.substring(0, 8)}...`,
          processed: 1,
          total: 1,
        })

        console.log("Test transaction sent with signature:", result.signature)
      } else {
        setDistributionStatus({
          status: "error",
          message: `Test failed: ${result.error}`,
          processed: 0,
          total: 1,
        })
      }
    } catch (error) {
      console.error("Error setting up test:", error)
      setDistributionStatus({
        status: "error",
        message: `Test setup failed: ${error instanceof Error ? error.message : String(error)}`,
        processed: 0,
        total: 1,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="p-8 bg-black/80 border border-[#ff4800]/50 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#ff9800]">Admin Panel</h2>
        <p className="mb-4">Please connect your wallet to access the admin panel.</p>
      </div>
    )
  }

  // Find the section that checks if the connected wallet is the admin wallet
  // (around line 1200-1220) and modify it to include a temporary override:

  if (connected && publicKey && publicKey.toString() !== ADMIN_WALLET_ADDRESS) {
    // Add console logs for debugging
    console.log("Connected wallet:", publicKey.toString())
    console.log("Expected admin wallet:", ADMIN_WALLET_ADDRESS)

    // TEMPORARY: Allow access for testing - remove in production
    const forceAdminAccess = true // Set to false in production

    if (forceAdminAccess) {
      console.warn("⚠️ OVERRIDE: Allowing non-admin wallet access for testing")
      // Continue to the admin panel by not returning here
    } else {
      return (
        <div className="p-8 bg-black/80 border border-[#ff4800]/50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-[#ff9800]">Admin Panel</h2>
          <Alert className="mb-6 bg-yellow-900/20 border-yellow-500">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500 font-bold">Access Denied</AlertTitle>
            <AlertDescription className="text-sm text-white">
              <p className="mb-2">You are connected with a wallet that doesn't have admin privileges.</p>
              <p>Please connect with the admin wallet to access the admin panel and distribute tokens.</p>
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-400">
            Admin wallet: {ADMIN_WALLET_ADDRESS.substring(0, 6)}...
            {ADMIN_WALLET_ADDRESS.substring(ADMIN_WALLET_ADDRESS.length - 4)}
          </p>
        </div>
      )
    }
  }

  if (!securityStatus.isSecure) {
    return (
      <div className="p-8 bg-black/80 border border-[#ff4800]/50 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#ff9800]">Admin Panel</h2>
        <Alert className="mb-6 bg-red-900/20 border-red-500">
          <Shield className="h-5 w-5 text-red-500" />
          <AlertTitle className="text-red-500 font-bold">Security Alert</AlertTitle>
          <AlertDescription className="text-sm text-white">
            {securityStatus.message}
            <p className="mt-2">
              Admin access is disabled for security reasons. Please refresh the page or contact support.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!isAdmin && !isAuthenticated) {
    return (
      <div className="p-8 bg-black/80 border border-[#ff4800]/50 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#ff9800]">Admin Authentication</h2>

        {lockoutUntil && Date.now() < lockoutUntil ? (
          <Alert className="mb-6 bg-red-900/20 border-red-500">
            <Lock className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-red-500 font-bold">Account Locked</AlertTitle>
            <AlertDescription className="text-sm text-white">
              Too many failed login attempts. Please try again in {Math.ceil((lockoutUntil - Date.now()) / (60 * 1000))}{" "}
              minutes.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/50 border-[#ff4800]/30"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">For testing, use password: admin</p>
            </div>

            <div>
              <Label htmlFor="twoFactorCode">Two-Factor Authentication Code (Optional for testing)</Label>
              <Input
                id="twoFactorCode"
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="bg-black/50 border-[#ff4800]/30"
                placeholder="Enter 6-digit code (optional for testing)"
                maxLength={6}
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">For testing, you can leave this blank</p>
            </div>

            <Button type="submit" className="bg-[#ff4800] hover:bg-[#ff4800]/80">
              Authenticate
            </Button>

            {loginAttempts > 0 && <p className="text-xs text-red-400">Failed login attempts: {loginAttempts}/5</p>}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 bg-black/80 border border-[#ff4800]/50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-[#ff9800]">Admin Panel</h2>
          <button
            {...getDebugButtonProps(() => {
              debugLocalStorage()
              debugDistributionStatus()
            })}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-blue-500/30 text-blue-500"
            onClick={toggleDebugMode}
          >
            {debugMode ? "Disable Debug" : "Enable Debug"}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#ff4800]/30 text-[#ff9800]"
          onClick={handleRefreshData}
          disabled={isLoading || processingLocked}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh Data
        </Button>
      </div>

      {debugMode && (
        <Alert className="mb-4 bg-blue-900/20 border-blue-500">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          <AlertTitle className="text-blue-500">Debug Mode Enabled</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">
              Debug mode is enabled. Detailed logs will be printed to the console during token distribution.
            </p>
            <p className="text-xs">
              Token Mint: {TOKEN_ADDRESS}
              <br />
              Admin Wallet: {ADMIN_WALLET_ADDRESS}
              <br />
              Token Decimals: {TOKEN_DECIMALS}
              <br />
              Distribution Rate: {TOKEN_DISTRIBUTION_RATE} tokens per SOL
              <br />
              Current RPC Endpoint: {RPC_ENDPOINTS[currentRpcIndex]}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {debugMode && isPhantomInstalled() && (
        <Alert className="mb-4 bg-purple-900/20 border-purple-500">
          <AlertCircle className="h-5 w-5 text-purple-500" />
          <AlertTitle className="text-purple-500">Phantom Wallet Info</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">Phantom wallet is installed. Version: {getPhantomVersion() || "Unknown"}</p>
            <p className="text-xs">
              If you're experiencing issues with transactions, try clicking the "Reset Wallet Connection" button when a
              transaction is stuck.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {processingLocked && (
        <Alert className="mb-4 bg-blue-900/20 border-blue-500">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <AlertTitle className="text-blue-500">Transaction In Progress</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">
              A transaction is currently being processed. Please wait for it to complete before starting another one.
            </p>
            {lastProcessedSignature && (
              <p className="text-xs">
                Last transaction: {lastProcessedSignature.substring(0, 8)}...
                {lastProcessedSignature.substring(lastProcessedSignature.length - 8)}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-red-500 text-red-500 hover:bg-red-500/20"
                onClick={handleCancelProcessing}
              >
                Cancel Processing
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={async () => {
                  const success = await resetWalletConnection()
                  if (success) {
                    alert("Wallet connection reset successfully. Please try again.")
                    releaseProcessingLock()
                  } else {
                    alert("Failed to reset wallet connection. Please try refreshing the page.")
                  }
                }}
              >
                Reset Wallet Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {rateLimitWarning && (
        <Alert className="mb-4 bg-yellow-900/20 border-yellow-500">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Rate Limit Warning</AlertTitle>
          <AlertDescription className="text-sm text-white">
            The Solana RPC provider is rate limiting requests. Using cached data where possible. Please wait a few
            minutes before refreshing again.
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={() => {
                  clearRateLimit()
                  switchToNextRpcEndpoint()
                  handleRefreshData()
                }}
                disabled={processingLocked}
              >
                Try Different RPC Endpoint
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {offlineMode && (
        <Alert className="mb-4 bg-yellow-900/20 border-yellow-500">
          <WifiOff className="h-5 w-5 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Offline Mode Active</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">The app is in offline mode to avoid rate limiting. Using cached data only.</p>
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={() => {
                  setOfflineMode(false)
                  clearRateLimit()
                  setOfflineModeState(false)
                  // Reload data
                  loadContributionData()
                }}
                disabled={processingLocked}
              >
                Go Online & Refresh Data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 text-[#ff9800] animate-spin mr-2" />
          <span>Loading blockchain data...</span>
        </div>
      )}

      {distributionStatus.status !== "idle" && (
        <Alert
          className={`mb-6 ${
            distributionStatus.status === "processing"
              ? "bg-blue-900/20 border-blue-500"
              : distributionStatus.status === "success"
                ? "bg-green-900/20 border-green-500"
                : "bg-red-900/20 border-red-500"
          }`}
        >
          {distributionStatus.status === "processing" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
          {distributionStatus.status === "success" && <Check className="h-5 w-5 text-green-500" />}
          {distributionStatus.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}

          <AlertTitle
            className={`
            ${
              distributionStatus.status === "processing"
                ? "text-blue-500"
                : distributionStatus.status === "success"
                  ? "text-green-500"
                  : "text-red-500"
            }
          `}
          >
            {distributionStatus.status === "processing"
              ? "Processing"
              : distributionStatus.status === "success"
                ? "Success"
                : "Error"}
          </AlertTitle>

          <AlertDescription>
            <p>{distributionStatus.message}</p>

            {distributionStatus.status === "processing" && (
              <div className="mt-2">
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${(distributionStatus.processed / distributionStatus.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">
                  Processing {distributionStatus.processed} of {distributionStatus.total} contributions
                  {distributionStatus.currentWallet && (
                    <span>
                      {" "}
                      - Current: {distributionStatus.currentWallet.substring(0, 6)}...
                      {distributionStatus.currentWallet.substring(distributionStatus.currentWallet.length - 4)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Add this alert when there's an issue */}
      {distributionStatus.status === "error" && distributionStatus.message.includes("Failed to send transaction") && (
        <Alert className="mb-4 bg-yellow-900/20 border-yellow-500">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <AlertTitle className="text-yellow-500 font-bold">Transaction Issue Detected</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">
              There seems to be an issue with sending the transaction to the blockchain. This could be because:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Phantom wallet may not be properly recognizing the transaction</li>
              <li>The transaction may be failing validation</li>
              <li>There might be network connectivity issues</li>
            </ul>
            <p className="mt-2">
              Try using the "Test Direct Transfer" button on a contribution to test a simpler transaction approach.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!processingLocked && (
        <Alert className="mb-6 bg-green-900/20 border-green-500">
          <Check className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-500">Super Slow Mode Enabled</AlertTitle>
          <AlertDescription className="text-sm text-white">
            <p className="mb-2">Super Slow Mode is enabled to avoid rate limits. This mode:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Adds much longer delays between operations (up to 60 seconds between transactions)</li>
              <li>Automatically retries failed operations with exponential backoff</li>
              <li>Switches between multiple RPC endpoints when rate limited</li>
              <li>Processes one transaction at a time with extreme caution</li>
            </ul>
            <div className="flex items-center space-x-2 mt-3">
              <Switch id="super-slow-mode" checked={superSlowMode} onCheckedChange={setSuperSlowMode} />
              <Label htmlFor="super-slow-mode" className="text-white">
                {superSlowMode ? "Super Slow Mode ON (Recommended)" : "Super Slow Mode OFF (Not Recommended)"}
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Presale Statistics</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black/50 p-4 rounded-lg border border-[#ff4800]/30">
            <p className="text-sm text-gray-400">Total Raised</p>
            <p className="text-2xl font-bold">{totalRaised.toFixed(2)} SOL</p>
          </div>
          <div className="bg-black/50 p-4 rounded-lg border border-[#ff4800]/30">
            <p className="text-sm text-gray-400">Total Contributors</p>
            <p className="text-2xl font-bold">{new Set(contributions.map((c) => c.sender)).size}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/50 p-4 rounded-lg border border-[#ff4800]/30">
            <p className="text-sm text-gray-400">Tokens Distributed</p>
            <p className="text-2xl font-bold">
              {
                contributions.filter((c) => c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD)
                  .length
              }{" "}
              / {contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Showing only contributions ≥ 10,000 tokens</p>
          </div>
          <div className="bg-black/50 p-4 rounded-lg border border-[#ff4800]/30">
            <p className="text-sm text-gray-400">Distribution Progress</p>
            <div className="mt-2">
              <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                <div
                  className="bg-[#ff4800] h-2 rounded-full"
                  style={{
                    width:
                      contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length > 0
                        ? `${(contributions.filter((c) => c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length / contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length) * 100}%`
                        : "0%",
                  }}
                ></div>
              </div>
              <p className="text-xs text-right">
                {contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length > 0
                  ? Math.round(
                      (contributions.filter(
                        (c) => c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD,
                      ).length /
                        contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Distribution Settings</h3>
        <div className="bg-black/50 p-4 rounded-lg border border-[#ff4800]/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="batchSize" className="text-sm text-gray-400">
                  Batch Size
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-[#ff4800]/30 text-[#ff9800]"
                    onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                    disabled={batchSize <= 1 || processingLocked}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{batchSize}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-[#ff4800]/30 text-[#ff9800]"
                    onClick={() => setBatchSize(Math.min(3, batchSize + 1))}
                    disabled={batchSize >= 3 || processingLocked}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Process {batchSize} contribution{batchSize > 1 ? "s" : ""} at a time
                </p>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <Switch id="test-mode" checked={testMode} onCheckedChange={setTestMode} disabled={processingLocked} />
                  <Label htmlFor="test-mode" className="text-white">
                    Test Mode
                  </Label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {testMode ? "Mark tokens as sent without actual transactions" : "Send actual token transactions"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#ff4800]/20">
              <div>
                <p className="text-sm text-gray-400">Current RPC Endpoint:</p>
                <p className="text-xs font-mono mt-1">{RPC_ENDPOINTS[currentRpcIndex]}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#ff4800]/30 text-[#ff9800]"
                onClick={switchToNextRpcEndpoint}
                disabled={processingLocked}
              >
                Switch Endpoint
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleExportCSV} className="bg-[#ff4800] hover:bg-[#ff4800]/80" disabled={processingLocked}>
            Export Contributions (CSV)
          </Button>

          <Button
            onClick={handleDistributeTokens}
            className="bg-green-600 hover:bg-green-700"
            disabled={
              distributionStatus.status === "processing" ||
              contributions.filter((c) => !c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD)
                .length === 0 ||
              !connected ||
              !publicKey ||
              publicKey.toString() !== ADMIN_WALLET_ADDRESS ||
              processingLocked
            }
          >
            Distribute Tokens with Connected Wallet
            {contributions.filter((c) => !c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD)
              .length > 0 && (
              <span className="ml-2 bg-white text-green-600 rounded-full text-xs px-2 py-0.5">
                {
                  contributions.filter(
                    (c) => !c.tokensSent && c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD,
                  ).length
                }
              </span>
            )}
          </Button>

          <Button
            onClick={handleExportDistributionRecords}
            variant="outline"
            className="border-[#ff4800]/30 text-[#ff9800]"
            disabled={processingLocked}
          >
            Export Distribution Records
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-2">Recent Contributions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ff4800]/30">
                <th className="text-left p-2">Wallet</th>
                <th className="text-right p-2">Amount (SOL)</th>
                <th className="text-right p-2">Tokens</th>
                <th className="text-right p-2">Date</th>
                <th className="text-center p-2">Status</th>
                <th className="text-center p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-gray-400">
                    {isLoading ? "Loading contributions..." : "No contributions yet"}
                  </td>
                </tr>
              ) : (
                contributions
                  .filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD)
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 15) // Show more contributions (increased from 10 to 15)
                  .map((contribution, index) => {
                    const verificationResult = verificationResults[contribution.signature]
                    const needsResend = verificationResult?.needsResend

                    return (
                      <tr key={index} className="border-b border-[#ff4800]/10">
                        <td className="p-2">
                          <span className="font-mono text-xs">
                            {contribution.sender.substring(0, 6)}...
                            {contribution.sender.substring(contribution.sender.length - 4)}
                          </span>
                        </td>
                        <td className="text-right p-2">{contribution.amount.toFixed(2)}</td>
                        <td className="text-right p-2">
                          {(contribution.amount * TOKEN_DISTRIBUTION_RATE).toLocaleString()}
                        </td>
                        <td className="text-right p-2">{new Date(contribution.timestamp).toLocaleString()}</td>
                        <td className="text-center p-2">
                          {contribution.tokensSent ? (
                            <div className="flex flex-col items-center gap-1">
                              {needsResend ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Insufficient
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" /> Sent
                                </span>
                              )}
                              {verificationResult && (
                                <span className="text-xs">
                                  {verificationResult.balance?.toLocaleString()} /{" "}
                                  {verificationResult.expected?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-[#ff4800]/30 text-[#ff9800]"
                              onClick={() => handleVerifyDistribution(contribution)}
                              disabled={isLoading || processingLocked}
                              title="Verify Token Balance"
                            >
                              <Check className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-blue-500/30 text-blue-500"
                              onClick={() => testTokenTransferSetup(contribution)}
                              disabled={isLoading || processingLocked}
                              title="Test Token Transfer Setup"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-green-500/30 text-green-500"
                              onClick={() => testDirectTokenTransfer(contribution)}
                              disabled={isLoading || processingLocked}
                              title="Test Direct Transfer"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>

                            {contribution.tokensSent && needsResend && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-500/30 text-red-500"
                                onClick={() => handleResendTokens(contribution)}
                                disabled={isLoading || processingLocked || distributionStatus.status === "processing"}
                                title="Resend Tokens"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
        {contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length > 15 && (
          <div className="mt-2 text-xs text-gray-400 text-right">
            Showing 15 of{" "}
            {contributions.filter((c) => c.amount * TOKEN_DISTRIBUTION_RATE >= MIN_TOKEN_THRESHOLD).length}{" "}
            contributions
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmDistribution}
        contributionsToProcess={contributionsToConfirm}
        isResending={isResending}
      />

      {/* Address Verification Dialog */}
      {addressVerificationInfo && (
        <AddressVerificationDialog
          isOpen={isAddressVerificationOpen}
          onClose={() => setIsAddressVerificationOpen(false)}
          onConfirm={() => setIsAddressVerificationOpen(false)} // Add logic here if needed
          senderTokenAccount={addressVerificationInfo.senderTokenAccount}
          recipientTokenAccount={addressVerificationInfo.recipientTokenAccount}
          recipientWallet={addressVerificationInfo.recipientWallet}
          amount={addressVerificationInfo.amount}
        />
      )}
    </div>
  )
}

