"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton as SolanaWalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function WalletMultiButton() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted to avoid hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button className="wallet-button">
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <div className="wallet-adapter-button-wrapper">
      <style jsx global>{`
        .wallet-adapter-button {
          background: linear-gradient(135deg, #ff4800, #ff9800) !important;
          border-radius: 50px !important;
          padding: 0.5rem 1.25rem !important;
          font-family: var(--font-main), sans-serif !important;
          font-size: 0.9rem !important;
          font-weight: 600 !important;
          height: auto !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 10px rgba(255, 72, 0, 0.3) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
          overflow: hidden !important;
        }
        
        .wallet-adapter-button-start-icon {
          margin-right: 8px !important;
        }
        
        .wallet-adapter-button::after {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: linear-gradient(rgba(255, 255, 255, 0.1), transparent) !important;
          pointer-events: none !important;
        }
        
        .wallet-adapter-button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 15px rgba(255, 72, 0, 0.4) !important;
          background: linear-gradient(135deg, #ff5a1f, #ffb347) !important;
        }
        
        .wallet-adapter-button:not([disabled]):hover {
          background: linear-gradient(135deg, #ff5a1f, #ffb347) !important;
        }
        
        .wallet-adapter-modal-wrapper {
          background-color: #111 !important;
          border: 1px solid rgba(255, 72, 0, 0.3) !important;
          border-radius: 12px !important;
          box-shadow: 0 0 20px rgba(255, 72, 0, 0.2) !important;
        }
        
        .wallet-adapter-modal-title {
          color: #ff9800 !important;
          font-family: var(--font-main), sans-serif !important;
          font-size: 1.2rem !important;
          font-weight: 700 !important;
        }
        
        .wallet-adapter-modal-button-close {
          background-color: rgba(255, 72, 0, 0.2) !important;
          border-radius: 50% !important;
        }
        
        .wallet-adapter-modal-content {
          font-family: var(--font-main), sans-serif !important;
          font-size: 0.9rem !important;
        }
        
        .wallet-adapter-modal-list {
          margin: 1.5rem 0 !important;
        }
        
        .wallet-adapter-modal-list-more {
          font-family: var(--font-main), sans-serif !important;
          font-size: 0.9rem !important;
          color: #ff9800 !important;
        }
        
        .wallet-adapter-modal-list .wallet-adapter-button {
          border-radius: 8px !important;
          margin-bottom: 10px !important;
          background: rgba(255, 72, 0, 0.1) !important;
          border: 1px solid rgba(255, 72, 0, 0.3) !important;
          color: white !important;
        }
        
        .wallet-adapter-modal-list .wallet-adapter-button:hover {
          background: rgba(255, 72, 0, 0.2) !important;
        }
      `}</style>
      <SolanaWalletMultiButton startIcon={<Wallet className="h-4 w-4" />} />
    </div>
  )
}

