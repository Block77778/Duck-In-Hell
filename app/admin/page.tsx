"use client"

import { AdminPanel } from "@/components/admin-panel"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"

function AdminDebug() {
  const { publicKey } = useWallet()
  const [adminWallet, setAdminWallet] = useState("")

  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import("@/lib/security").then(({ getAdminWalletAddress }) => {
      setAdminWallet(getAdminWalletAddress())
    })
  }, [])

  if (!publicKey) return null

  return (
    <div className="bg-black/80 border border-yellow-500/50 p-2 rounded text-xs mb-4">
      <p>Connected: {publicKey.toString()}</p>
      <p>Admin: {adminWallet}</p>
      <p>Match: {publicKey.toString() === adminWallet ? "✅ Yes" : "❌ No"}</p>
    </div>
  )
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#ff9800]">DUCK IN HELL ADMIN</h1>

            <AdminDebug />
            <AdminPanel />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

