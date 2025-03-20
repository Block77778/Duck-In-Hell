"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, WifiOff, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  isOfflineMode,
  setOfflineMode,
  isRateLimited,
  getRateLimitExpiry,
  resetOfflineState,
} from "@/utils/offlineMode"

export function OfflineModeIndicator() {
  const [offline, setOffline] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [remainingTime, setRemainingTime] = useState("")
  const [isClearing, setIsClearing] = useState(false)

  // Update state from localStorage
  const updateState = () => {
    setOffline(isOfflineMode())
    setRateLimited(isRateLimited())

    // Calculate remaining time for rate limit
    if (isRateLimited()) {
      const expiry = getRateLimitExpiry()
      if (expiry) {
        const remaining = expiry - Date.now()
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000)
          const seconds = Math.floor((remaining % 60000) / 1000)
          setRemainingTime(`${minutes}m ${seconds}s remaining`)
        } else {
          setRemainingTime("Expired")
        }
      }
    }
  }

  // Initialize state
  useEffect(() => {
    updateState()

    // Set up interval to update remaining time
    const interval = setInterval(() => {
      updateState()
    }, 1000)

    // Listen for changes to offline mode
    const handleOfflineModeChanged = () => updateState()
    window.addEventListener("offlineModeChanged", handleOfflineModeChanged)

    // Listen for changes to rate limit status
    const handleRateLimitChanged = () => updateState()
    window.addEventListener("rateLimitChanged", handleRateLimitChanged)

    return () => {
      clearInterval(interval)
      window.removeEventListener("offlineModeChanged", handleOfflineModeChanged)
      window.removeEventListener("rateLimitChanged", handleRateLimitChanged)
    }
  }, [])

  // Toggle offline mode
  const toggleOfflineMode = () => {
    setOfflineMode(!offline)
  }

  // Try to go back online
  const tryGoOnline = () => {
    setIsClearing(true)

    // Reset all offline states
    resetOfflineState()

    // Refresh the page to get fresh data
    window.location.reload()
  }

  if (!offline && !rateLimited) {
    return null
  }

  return (
    <Alert className="mb-4 bg-yellow-900/20 border-yellow-500">
      {rateLimited ? (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      ) : (
        <WifiOff className="h-5 w-5 text-yellow-500" />
      )}

      <AlertTitle className="text-yellow-500">{rateLimited ? "Rate Limit Detected" : "Offline Mode Active"}</AlertTitle>

      <AlertDescription className="text-sm text-white">
        {rateLimited ? (
          <div>
            <p className="mb-2">
              The Solana RPC provider is currently rate limiting requests. Using cached data. This will not affect your
              ability to participate in the presale.
            </p>
            {remainingTime && (
              <p className="flex items-center text-xs">
                <Clock className="h-3 w-3 mr-1" /> {remainingTime}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={tryGoOnline}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Clearing...
                  </>
                ) : (
                  "Clear Rate Limit & Refresh"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              The app is in offline mode to avoid rate limiting. Using cached data. This will not affect your ability to
              participate in the presale.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={toggleOfflineMode}
                disabled={isClearing}
              >
                Go Online
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                onClick={tryGoOnline}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Refreshing...
                  </>
                ) : (
                  "Clear & Refresh Page"
                )}
              </Button>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

