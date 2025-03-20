"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { secureGetContributions } from "@/lib/security"
import { resetOfflineState } from "@/utils/offlineMode"

export function DebugPanel() {
  const [contributions, setContributions] = useState<any[]>([])
  const [totalRaised, setTotalRaised] = useState<number>(0)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    // Load contributions
    try {
      const { contributions: storedContributions } = secureGetContributions()
      if (storedContributions) {
        setContributions(storedContributions)

        // Calculate total
        const total = storedContributions.reduce((sum, c) => sum + (c.amount || 0), 0)
        setTotalRaised(total)
      }
    } catch (e) {
      console.error("Error loading debug data:", e)
    }

    // Also check direct total
    const directTotal = localStorage.getItem("duckinhell_total_raised")
    if (directTotal) {
      console.log("Direct total from localStorage:", directTotal)
    }
  }, [showPanel])

  if (!showPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-black/70 border-[#ff4800]/30 text-[#ff9800]"
          onClick={() => setShowPanel(true)}
        >
          Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-black/90 border border-[#ff4800]/50 rounded-lg p-4 text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[#ff9800] font-bold">Debug Panel</h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400" onClick={() => setShowPanel(false)}>
          ×
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-gray-400">Total Raised (calculated):</p>
          <p className="font-mono">{totalRaised.toFixed(4)} SOL</p>
        </div>

        <div>
          <p className="text-gray-400">localStorage Values:</p>
          <div className="font-mono">
            duckinhell_total_raised: {localStorage.getItem("duckinhell_total_raised") || "not set"}
          </div>
        </div>

        <div>
          <p className="text-gray-400">Contributions ({contributions.length}):</p>
          <div className="max-h-40 overflow-y-auto">
            {contributions.length === 0 ? (
              <p className="text-gray-500 italic">No contributions found</p>
            ) : (
              contributions.map((c, i) => (
                <div key={i} className="border-t border-[#ff4800]/20 pt-1 mt-1">
                  <div>
                    Wallet: {c.wallet.substring(0, 6)}...{c.wallet.substring(c.wallet.length - 4)}
                  </div>
                  <div>Amount: {c.amount} SOL</div>
                  <div>Time: {new Date(c.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-[#ff4800]/30 text-[#ff9800]"
            onClick={() => {
              localStorage.clear()
              setContributions([])
              setTotalRaised(0)
              alert("Local storage cleared")
            }}
          >
            Clear Storage
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs border-[#ff4800]/30 text-[#ff9800]"
            onClick={() => {
              window.location.reload()
            }}
          >
            Refresh Page
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs border-red-500/30 text-red-500"
            onClick={() => {
              resetOfflineState()
              alert("Offline mode and rate limit cleared")
            }}
          >
            Clear Offline Mode
          </Button>
        </div>
      </div>
    </div>
  )
}

