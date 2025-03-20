"use client"

import type React from "react"
import "./globals.css"
import { WalletProviders } from "@/components/wallet-providers"
import { EmberAnimation } from "@/components/ember-animation"
import { mainFont } from "./fonts"
import { useEffect } from "react"
import { initializeFromLocalStorage } from "@/utils/dataStorage"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Initialize data from localStorage
    initializeFromLocalStorage()
  }, [])

  return (
    <html lang="en" className={mainFont.variable}>
      <body>
        <WalletProviders>
          <EmberAnimation />
          {children}
        </WalletProviders>
      </body>
    </html>
  )
}

