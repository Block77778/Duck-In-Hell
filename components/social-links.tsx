"use client"

import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SocialLinks() {
  return (
    <div className="flex justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full border-[#ff4800]/50 hover:bg-[#ff4800]/20 pixel-font"
        onClick={() => window.open("https://x.com/duckinhelltoken?s=21", "_blank")}
      >
        {/* X logo (formerly Twitter) */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#ff9800]"
        >
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            fill="currentColor"
          />
        </svg>
        <span className="sr-only">X (Twitter)</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full border-[#ff4800]/50 hover:bg-[#ff4800]/20 pixel-font"
        onClick={() => window.open("https://t.me/DuckInHellSol", "_blank")}
      >
        <Send className="h-5 w-5 text-[#ff9800]" />
        <span className="sr-only">Telegram</span>
      </Button>
    </div>
  )
}

