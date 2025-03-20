import { Orbitron } from "next/font/google"

// Initialize a better font that's still futuristic but more readable
export const mainFont = Orbitron({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-main",
})

