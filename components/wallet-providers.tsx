"use client"

import type React from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { useMemo } from "react"

// Import the styles for the wallet adapter
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletProviders({ children }: { children: React.ReactNode }) {
  // Use the environment variable for the RPC URL with fallbacks
  const endpoint = useMemo(() => {
    const envEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    // Return the environment variable if it exists, otherwise use mainnet-beta
    return envEndpoint || clusterApiUrl("mainnet-beta")
  }, [])

  // Add a connection config to disable WebSocket for problematic endpoints
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed",
      disableRetryOnRateLimit: false,
      wsEndpoint: undefined, // Disable WebSocket connection which can cause issues
    }),
    [],
  )

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking
  // so that only the wallets you configure are bundled
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

