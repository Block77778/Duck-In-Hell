import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./clientLayout"

export const metadata: Metadata = {
  title: "Duck In Hell",
  description: "The first meme market sentiment indicator on Solana.",
  generator: "v0.dev",
  openGraph: {
    title: "Duck In Hell",
    description: "The first meme market sentiment indicator on Solana.",
    url: "https://duckinhellsolana.com",
    siteName: "Duck In Hell",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duck In Hell",
    description: "The first meme market sentiment indicator on Solana.",
    creator: "@duckinhelltoken",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}


