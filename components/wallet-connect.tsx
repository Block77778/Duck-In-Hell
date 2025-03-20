"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
    // This is a placeholder for actual wallet connection logic
    setTimeout(() => {
      setIsConnecting(false)
    }, 1500)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#ff4800] hover:bg-[#ff4800]/80 text-white">Connect Wallet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black border-[#ff4800]/50">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-[#ff9800]">Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-center text-sm text-gray-300 mb-4">
            Connect your Phantom wallet to participate in the Duck In Hell presale
          </p>
          <Button
            onClick={handleConnect}
            className="bg-[#ff4800] hover:bg-[#ff4800]/80 text-white flex items-center justify-center gap-2"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Connecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="128" height="128" rx="64" fill="url(#paint0_linear)" />
                  <path
                    d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8253 41.3057 14.4048 64.0583C13.9708 87.283 33.1824 106.787 56.7724 106.787H60.887C63.3349 106.787 65.3139 104.834 65.3139 102.419C65.3139 100.004 63.3349 98.0512 60.887 98.0512H56.7724C38.5026 98.0512 23.4377 83.2356 23.1442 65.2309C22.8443 46.8344 37.766 31.7358 56.7724 31.7358C75.4792 31.7358 90.2655 46.3169 90.2655 64.9142H78.8232C77.1516 64.9142 75.6273 65.8858 74.9034 67.3726C74.1723 68.8521 74.3517 70.6292 75.3799 71.9714L91.4896 92.5767C92.9461 94.419 95.693 94.419 97.1495 92.5767L113.259 71.9714C114.287 70.6292 114.467 68.8521 113.736 67.3726C113.012 65.8858 111.488 64.9142 109.816 64.9142H110.584Z"
                    fill="white"
                  />
                  <defs>
                    <linearGradient id="paint0_linear" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#534BB1" />
                      <stop offset="1" stopColor="#551BF9" />
                    </linearGradient>
                  </defs>
                </svg>
                Connect Phantom
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 text-center">
          By connecting your wallet, you agree to the Terms of Service and Privacy Policy
        </p>
      </DialogContent>
    </Dialog>
  )
}

