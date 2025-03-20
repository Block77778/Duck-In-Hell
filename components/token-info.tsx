"use client"

import { ExternalLink, Copy, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getTokenAddress } from "@/lib/security"

// Get the token address from the security module
const TOKEN_ADDRESS = getTokenAddress()

export function TokenInfo() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(TOKEN_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addToPhantom = async () => {
    try {
      // @ts-ignore
      if (window.solana && window.solana.isPhantom) {
        // @ts-ignore
        await window.solana.request({
          method: "wallet_watchAsset",
          params: {
            type: "SPL",
            options: {
              address: TOKEN_ADDRESS,
            },
          },
        })
      } else {
        alert("Phantom wallet not detected. Please install Phantom wallet extension.")
      }
    } catch (error) {
      console.error("Error adding token to wallet:", error)
    }
  }

  return (
    <div className="bg-black/70 border border-[#ff4800]/50 p-6 rounded-lg mb-8">
      <h3 className="text-xl font-bold mb-4 text-[#ff9800]">Token Information</h3>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Token Address:</p>
          <div className="flex items-center gap-2">
            <code className="bg-black/50 p-2 rounded text-xs font-mono flex-1 overflow-x-auto">{TOKEN_ADDRESS}</code>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-[#ff4800]/30 hover:bg-[#ff4800]/20"
              onClick={copyToClipboard}
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-[#ff9800]" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="border-[#ff4800]/30 hover:bg-[#ff4800]/20 text-[#ff9800] flex items-center gap-2"
            onClick={addToPhantom}
          >
            Add to Phantom
          </Button>

          <a
            href={`https://solscan.io/token/${TOKEN_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[#ff4800]/30 hover:bg-[#ff4800]/20 text-[#ff9800] h-10 px-4 py-2"
          >
            View on Solscan <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p className="mb-2">
            <strong className="text-red-500">Important:</strong> This token may appear as "unsafe" in Phantom wallet.
            This is normal for new tokens that haven't been widely verified yet.
          </p>
          <p>Always verify the token address matches the one shown above before interacting with it.</p>
        </div>
      </div>
    </div>
  )
}

