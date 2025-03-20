import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./clientLayout"

export const metadata: Metadata = {
  title: "Duck In Hell - Presale",
  description: "The first meme market sentiment indicator. Join the presale now!",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}



import './globals.css'