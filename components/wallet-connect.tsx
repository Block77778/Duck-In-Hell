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
        <Button className="bg-[#ff4800] hover:bg-[#ff4800]/80 text-white">Buy Now</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black border-[#ff4800]/50">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-[#ff9800]">Token Launching Soon</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-center text-sm text-gray-300 mb-4">
            $DUCKINHELL token will be available soon on Raydium. Follow us on social media for launch announcements!
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
              <>Got it</>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 text-center">Stay tuned for our official launch announcement</p>
      </DialogContent>
    </Dialog>
  )
}


