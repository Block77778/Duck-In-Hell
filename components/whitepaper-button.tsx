"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface WhitepaperButtonProps {
  className?: string
}

export function WhitepaperButton({ className = "" }: WhitepaperButtonProps) {
  const handleClick = () => {
    const whitepaperUrl =
      "https://www.dropbox.com/scl/fi/11oidi1sejr2blw246rma/Whitepaper-Duck-in-hell.pdf?rlkey=vftuwxnj1xdvc7rof5kr17gsf&st=7v80lvss&dl=1"
    window.open(whitepaperUrl, "_blank")
  }

  return (
    <Button
      variant="outline"
      className={`border-[#ff4800] text-[#ff9800] hover:bg-[#ff4800]/20 rounded-full flex items-center gap-2 ${className}`}
      onClick={handleClick}
    >
      <FileText className="h-4 w-4" />
      Whitepaper
    </Button>
  )
}


