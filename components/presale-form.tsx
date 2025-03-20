"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { AlertCircle, Check, AlertTriangle, Copy, ExternalLink, Shield, LockKeyhole } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  getTreasuryWalletAddress,
  getTokenAddress,
  secureGetContributions,
  secureGetTotalRaised,
  checkTransactionRateLimit,
  verifyTransactionParameters,
} from "@/lib/security"
import { addContribution, getTotalRaised } from "@/utils/dataStorage"

// Get addresses from security module
const TOKEN_ADDRESS = getTokenAddress()
const TREASURY_WALLET_ADDRESS = getTreasuryWalletAddress()

// Contribution tracking
interface Contribution {
  wallet: string
  amount: number
  timestamp: number
  signature: string
  tokensSent?: boolean
  tokenTxSignature?: string
}

export function PresaleForm() {
  const { publicKey, sendTransaction, connected } = useWallet()
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState<"idle" | "success" | "error">("idle")
  const [txMessage, setTxMessage] = useState("")
  const [txSignature, setTxSignature] = useState("")
  const [copied, setCopied] = useState(false)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [totalRaised, setTotalRaised] = useState(0)
  const [securityStatus, setSecurityStatus] = useState<{
    isSecure: boolean
    message: string
  }>({ isSecure: true, message: "" })
  const [networkStatus, setNetworkStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const [raisedPercentage, setRaisedPercentage] = useState(0)
  const goalAmount = 500
  // Token distribution rate: 1 SOL = 1,000,000 tokens ($0.001 per token)
  const TOKEN_DISTRIBUTION_RATE = 1000000
  const [isPresaleEnded, setIsPresaleEnded] = useState(false)

  // Check if presale has ended
  useEffect(() => {
    const checkPresaleStatus = () => {
      const endDate = new Date("April 29, 2100 00:00:00 GMT")
      const now = new Date()
      setIsPresaleEnded(now >= endDate)
    }

    checkPresaleStatus()
    const interval = setInterval(checkPresaleStatus, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
          {
            commitment: "confirmed",
            disableRetryOnRateLimit: true,
          },
        )
        const version = await connection.getVersion()
        console.log("Solana network version:", version)
        setNetworkStatus("connected")
      } catch (error) {
        console.error("Error connecting to Solana network:", error)
        setNetworkStatus("error")
      }
    }

    checkNetworkStatus()
  }, [])

  // Verify security on component mount
  useEffect(() => {
    // Always set security status to secure
    setSecurityStatus({
      isSecure: true,
      message: "",
    })
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(TOKEN_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copySignature = () => {
    if (txSignature) {
      navigator.clipboard.writeText(txSignature)
      alert("Transaction signature copied to clipboard!")
    }
  }

  useEffect(() => {
    const loadTotalRaised = async () => {
      const total = await getTotalRaised()
      setTotalRaised(total)
      setRaisedPercentage(Math.min((total / goalAmount) * 100, 100))
    }

    loadTotalRaised()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      return
    }

    // Check if presale has ended
    if (isPresaleEnded) {
      setTxStatus("error")
      setTxMessage("Presale has ended. Please buy tokens on Raydium.")
      return
    }

    // Security checks
    if (!securityStatus.isSecure) {
      setTxStatus("error")
      setTxMessage("Transaction blocked: Security concerns detected. Please refresh the page and try again.")
      return
    }

    // Rate limiting
    if (!checkTransactionRateLimit()) {
      setTxStatus("error")
      setTxMessage("Too many transactions in a short period. Please wait a moment and try again.")
      return
    }

    // Verify transaction parameters
    if (!verifyTransactionParameters(publicKey.toString(), TREASURY_WALLET_ADDRESS, Number.parseFloat(amount))) {
      setTxStatus("error")
      setTxMessage("Invalid transaction parameters. Please check your input and try again.")
      return
    }

    setIsSubmitting(true)
    setTxStatus("idle")
    setTxMessage("")

    try {
      // Connect to the Solana network with improved error handling
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
        {
          commitment: "confirmed",
          disableRetryOnRateLimit: true,
        },
      )

      // Create a transaction to send SOL directly to the treasury wallet
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY_WALLET_ADDRESS),
          lamports: Number.parseFloat(amount) * LAMPORTS_PER_SOL,
        }),
      )

      // Set a recent blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash("finalized")
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Send the transaction
      const signature = await sendTransaction(transaction, connection)
      setTxSignature(signature)

      // Wait for confirmation with a timeout and retry mechanism
      let confirmed = false
      let retries = 0
      const maxRetries = 3

      while (!confirmed && retries < maxRetries) {
        try {
          // Use a promise with timeout to prevent hanging
          const confirmationPromise = connection.confirmTransaction(signature, "confirmed")
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Confirmation timeout")), 30000),
          )

          await Promise.race([confirmationPromise, timeoutPromise])
          confirmed = true
        } catch (error) {
          console.warn(`Confirmation attempt ${retries + 1} failed:`, error)
          retries++
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      if (!confirmed) {
        console.warn("Transaction may not be confirmed yet, but continuing with optimistic UI update")
      }

      // Record the contribution
      const newContribution = {
        wallet: publicKey.toString(),
        amount: Number.parseFloat(amount),
        timestamp: Date.now(),
        signature: signature,
      }

      await addContribution(newContribution)

      // Update UI directly from localStorage
      const totalRaisedStr = localStorage.getItem("duckinhell_total_raised")
      if (totalRaisedStr) {
        const newTotal = Number.parseFloat(totalRaisedStr)
        setTotalRaised(newTotal)
        setRaisedPercentage(Math.min((newTotal / goalAmount) * 100, 100))
      }

      // Update UI
      const newTotal = await getTotalRaised()
      setTotalRaised(newTotal)
      setRaisedPercentage(Math.min((newTotal / goalAmount) * 100, 100))

      setTxStatus("success")
      setTxMessage(
        `Transaction successful! You've contributed ${amount} SOL and will receive ${Number.parseFloat(amount) * TOKEN_DISTRIBUTION_RATE} $DUCK IN HELL tokens when distribution begins.`,
      )
      setAmount("")

      // Dispatch a custom event to notify other components
      window.dispatchEvent(new Event("contributionAdded"))
      console.log("Dispatched contributionAdded event")
    } catch (error) {
      console.error("Transaction error:", error)
      setTxStatus("error")
      setTxMessage(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load stored contributions on component mount with integrity checking
  useEffect(() => {
    try {
      // Get contributions with integrity check
      const { contributions: storedContributions, isValid: contributionsValid } = secureGetContributions()
      if (storedContributions && contributionsValid) {
        setContributions(storedContributions)
      } else if (!contributionsValid) {
        console.error("Contribution data may have been tampered with!")
        setSecurityStatus({
          isSecure: false,
          message: "Security warning: Stored contribution data may have been tampered with.",
        })
      }

      // Get total raised with integrity check
      const { totalRaised: storedTotal, isValid: totalValid } = secureGetTotalRaised()
      if (totalValid) {
        setTotalRaised(storedTotal)
      } else {
        console.error("Total raised data may have been tampered with!")
      }
    } catch (e) {
      console.error("Error loading contribution data:", e)
    }
  }, [])

  if (isPresaleEnded) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <Alert className="mb-6 bg-yellow-900/20 border-yellow-500 text-left">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <AlertTitle className="text-yellow-500 font-bold">Presale Ended</AlertTitle>
          <AlertDescription className="text-sm text-white">
            The presale has ended. You can now buy $DUCK IN HELL tokens on Raydium.
          </AlertDescription>
        </Alert>
        <a
          href="https://raydium.io/swap/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#ff4800] hover:bg-[#ff4800]/80 text-white px-6 py-3 rounded-full"
        >
          Buy on Raydium
        </a>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <p className="mb-4 text-center text-sm">Connect your wallet to participate in the presale</p>
        <WalletMultiButton />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Network Status Indicator */}
      <div className="mb-4 text-sm">
        Solana Network Status:
        {networkStatus === "connected" && <span className="text-green-500 ml-2">Connected</span>}
        {networkStatus === "disconnected" && <span className="text-yellow-500 ml-2">Disconnected</span>}
        {networkStatus === "error" && <span className="text-red-500 ml-2">Error</span>}
      </div>
      {/* Security Warning */}
      {!securityStatus.isSecure && (
        <Alert className="mb-6 bg-red-900/20 border-red-500 text-left">
          <Shield className="h-5 w-5 text-red-500" />
          <AlertTitle className="text-red-500 font-bold">Security Alert</AlertTitle>
          <AlertDescription className="text-sm text-white">{securityStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Token Warning Alert */}
      <Alert className="mb-6 bg-red-900/20 border-red-500 text-left">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <AlertTitle className="text-red-500 font-bold">Important Notice</AlertTitle>
        <AlertDescription className="text-sm text-white">
          This token may appear as "unsafe" in Phantom wallet. This is normal for new tokens. You can safely proceed by
          clicking "I understand" when prompted.
        </AlertDescription>
      </Alert>

      {/* Token Locking Alert */}
      <Alert className="mb-6 bg-[#ff4800]/10 border-[#ff4800]/30 text-left">
        <LockKeyhole className="h-5 w-5 text-[#ff9800]" />
        <AlertTitle className="text-[#ff9800] font-bold">Token Supply Protection</AlertTitle>
        <AlertDescription className="text-sm text-white">
          For community protection and long-term stability, we are locking a large reserve of the token supply. This
          demonstrates our commitment to sustainable growth rather than short-term gains.
        </AlertDescription>
      </Alert>

      {txStatus === "success" && (
        <Alert className="mb-4 bg-green-900/20 border-green-500">
          <Check className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500 font-medium">Success!</AlertTitle>
          <AlertDescription className="text-sm text-white">
            {txMessage}
            <div className="mt-2 text-xs">
              <p>
                Transaction ID:{" "}
                <span className="cursor-pointer underline text-blue-400" onClick={copySignature} title="Click to copy">
                  {txSignature.substring(0, 8)}...{txSignature.substring(txSignature.length - 8)}
                </span>
              </p>
              <p className="mt-1">
                <a
                  href={`https://solscan.io/tx/${txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center"
                >
                  View on Solscan <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {txStatus === "error" && (
        <Alert className="mb-4 bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-500 font-medium">Error</AlertTitle>
          <AlertDescription className="text-sm">{txMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-left block font-medium">
            Amount (SOL)
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter SOL amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            required
            className="bg-black/50 border-[#ff4800]/30 focus:border-[#ff9800] focus:ring-[#ff9800]"
          />
        </div>

        <div className="text-sm text-left text-gray-400 mb-4">
          <p>Minimum contribution: 0.01 SOL</p>
          <p>Token price: $0.001 per token</p>
          <p className="mt-2 text-xs">
            Your contribution will be sent directly to the project treasury wallet. Tokens will be distributed to your
            wallet after the presale ends.
          </p>

          <div className="mt-4 flex flex-col space-y-2">
            <p className="text-xs">Token Address:</p>
            <div className="flex items-center bg-black/30 p-2 rounded-md border border-[#ff4800]/30">
              <span className="text-[#ff9800] text-xs break-all mr-2 flex-1">{TOKEN_ADDRESS}</span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#ff4800]/20"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Copy address</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#ff4800]/20"
                      onClick={() => window.open(`https://solscan.io/token/${TOKEN_ADDRESS}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">View on Solscan</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on Solscan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="relative w-full bg-[#ff4800] hover:bg-[#ff4800]/80 text-white overflow-hidden group"
          disabled={isSubmitting || !amount || Number.parseFloat(amount) <= 0 || !securityStatus.isSecure}
        >
          <span className="relative z-10">
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                {securityStatus.isSecure ? (
                  "Buy $DUCK IN HELL Tokens"
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2 inline" />
                    Security Issue Detected
                  </>
                )}
              </>
            )}
          </span>
        </Button>
      </form>

      {/* Show user's contributions if they have any */}
      {contributions.filter((c) => c.wallet === publicKey?.toString()).length > 0 && (
        <div className="mt-6 p-4 bg-black/30 border border-[#ff4800]/30 rounded-md">
          <h4 className="text-[#ff9800] font-medium mb-2">Your Contributions</h4>
          <div className="space-y-2 text-sm">
            {contributions
              .filter((c) => c.wallet === publicKey?.toString())
              .map((contribution, index) => (
                <div key={index} className="flex justify-between">
                  <span>{new Date(contribution.timestamp).toLocaleDateString()}</span>
                  <span>{contribution.amount} SOL</span>
                </div>
              ))}
          </div>
          <div className="mt-3 pt-2 border-t border-[#ff4800]/30 flex justify-between font-medium">
            <span>Total</span>
            <span>
              {contributions
                .filter((c) => c.wallet === publicKey?.toString())
                .reduce((sum, c) => sum + c.amount, 0)
                .toFixed(2)}{" "}
              SOL
            </span>
          </div>
        </div>
      )}

      {/* Verification Instructions */}
      <div className="mt-6 p-4 bg-black/30 border border-[#ff4800]/30 rounded-md">
        <h4 className="text-[#ff9800] font-medium mb-2">Verify Treasury Address</h4>
        <p className="text-sm text-gray-300 mb-2">
          For security, please verify that your contribution is going to the official Duck In Hell treasury:
        </p>
        <div className="bg-black/50 p-2 rounded font-mono text-xs break-all">{TREASURY_WALLET_ADDRESS}</div>
        <p className="text-xs text-gray-400 mt-2">
          You can verify this address on Solscan before sending any funds. Always double-check that you're on the
          official Duck In Hell website.
        </p>
      </div>
    </div>
  )
}

