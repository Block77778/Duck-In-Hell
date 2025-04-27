"use client"

import Link from "next/link"
import { SocialLinks } from "@/components/social-links"
import { Send } from "lucide-react"
import { WhitepaperButton } from "./whitepaper-button"

export function Footer() {
  return (
    <footer className="bg-black border-t border-[#ff4800]/20 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-[#ff9800]">DUCK IN HELL</h3>
            <div className="inline-block bg-[#ff4800]/20 px-3 py-1 rounded-md border border-[#ff4800]/30 mb-4">
              <span className="text-lg font-bold text-[#ff9800]">$DUCKINHELL</span>
            </div>
            <p className="text-gray-400 text-xs">
              The First Meme Market Sentiment Indicator. Your emotional support in a market that has none.
            </p>
            <WhitepaperButton className="mt-4 text-xs py-1 px-3 h-auto" />
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#ff9800]">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="#home"
                className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector("#home")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Home
              </Link>
              <Link
                href="#launch"
                className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector("#launch")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Launch
              </Link>
              <Link
                href="#about"
                className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                About
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                How It Works
              </Link>
              <div className="flex flex-col space-y-2 mt-2 pt-2 border-t border-[#ff4800]/20">
                <a
                  href="https://x.com/duckinhelltoken?s=21"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs flex items-center"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1"
                  >
                    <path
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      fill="currentColor"
                    />
                  </svg>
                  X (Twitter)
                </a>
                <a
                  href="https://t.me/DuckinHell/1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#ff9800] transition-colors text-xs flex items-center"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Telegram
                </a>
              </div>
            </nav>
          </div>

          {/* Connect Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#ff9800]">Connect With Us</h3>
            <p className="text-gray-400 mb-4 text-xs">
              Join our community and stay updated on the latest news and developments.
            </p>
            <SocialLinks />
          </div>
        </div>

        <div className="border-t border-[#ff4800]/20 mt-8 pt-8 text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} Duck In Hell. All rights reserved.</p>
          <p className="mt-2">Trading cryptocurrencies involves risk. Do your own research before investing.</p>
          {/* Hidden number as requested */}
          <p className="text-[0.7rem] text-gray-600 mt-4 opacity-40 select-none">1000000000000066600000000000001</p>
        </div>
      </div>
    </footer>
  )
}


