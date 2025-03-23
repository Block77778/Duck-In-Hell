"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { SocialLinks } from "@/components/social-links"
import { Header } from "@/components/header"
import { PresaleForm } from "@/components/presale-form"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { Send, FileText, RefreshCw } from "lucide-react"
import { DebugPanel } from "@/components/debug-panel"
import { getTotalRaised } from "@/utils/dataStorage"

export default function Home() {
  const [totalRaised, setTotalRaised] = useState(0)
  const [raisedPercentage, setRaisedPercentage] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const goalAmount = 500 // 500 SOL goal

  // Add this state for the refresh button
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"blockchain" | "cache" | "localStorage">("blockchain")

  // Set isMounted to true when component mounts
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load total raised amount from localStorage with better error handling
  useEffect(() => {
    if (!isMounted) return

    const loadTotalRaised = async () => {
      try {
        console.log("Loading total raised amount...")
        setErrorMessage(null)

        try {
          // Import the blockchain utilities
          const { getTreasuryBalance, getCachedTotalRaised } = await import("@/utils/blockchainData")

          // Try to get data from blockchain
          setDataSource("blockchain")

          try {
            // Get the calculated total from transactions
            const calculatedTotal = await getCachedTotalRaised()
            console.log("Calculated total from transactions:", calculatedTotal)

            if (calculatedTotal > 0) {
              setTotalRaised(calculatedTotal)
              setRaisedPercentage(Math.min((calculatedTotal / goalAmount) * 100, 100))
              setLastRefreshTime(Date.now())
            } else {
              // Fallback to localStorage if blockchain data is not available
              setDataSource("localStorage")
              const localTotal = await getTotalRaised()
              console.log("Total raised from localStorage:", localTotal)
              setTotalRaised(localTotal)
              setRaisedPercentage(Math.min((localTotal / goalAmount) * 100, 100))
            }
          } catch (error) {
            console.error("Error fetching blockchain data:", error)

            // Fallback to localStorage
            const localTotal = await getTotalRaised()
            setTotalRaised(localTotal)
            setRaisedPercentage(Math.min((localTotal / goalAmount) * 100, 100))
          }
        } catch (error) {
          console.error("Error loading blockchain data:", error)

          // Fallback to localStorage
          setDataSource("localStorage")
          const localTotal = await getTotalRaised()
          setTotalRaised(localTotal)
          setRaisedPercentage(Math.min((localTotal / goalAmount) * 100, 100))
        }
      } catch (error) {
        console.error("Error loading total raised:", error)
        // Final fallback - just use 0
        setTotalRaised(0)
        setRaisedPercentage(0)
      }
    }

    loadTotalRaised()

    // Set up polling to refresh data every 30 minutes
    const intervalId = setInterval(
      () => {
        loadTotalRaised()
      },
      30 * 60 * 1000,
    ) // 30 minutes

    return () => clearInterval(intervalId)
  }, [goalAmount, isMounted])

  // Add a manual refresh function
  const refreshTotalRaised = async () => {
    if (!isMounted) return

    // Prevent refreshing more than once per minute
    const now = Date.now()
    if (now - lastRefreshTime < 60 * 1000) {
      alert("Please wait at least 1 minute between refreshes.")
      return
    }

    try {
      setIsRefreshing(true)
      setErrorMessage(null)

      const { getCachedTotalRaised } = await import("@/utils/blockchainData")

      try {
        // Get fresh data without invalidating cache to reduce RPC calls
        const calculatedTotal = await getCachedTotalRaised()
        console.log("Manually refreshed total raised:", calculatedTotal)

        setTotalRaised(calculatedTotal)
        setRaisedPercentage(Math.min((calculatedTotal / goalAmount) * 100, 100))
        setLastRefreshTime(now)
        setDataSource("blockchain")
      } catch (error) {
        console.error("Error refreshing blockchain data:", error)
        alert("Error refreshing data. Using cached data.")

        // Fallback to localStorage
        const localTotal = await getTotalRaised()
        setTotalRaised(localTotal)
        setRaisedPercentage(Math.min((localTotal / goalAmount) * 100, 100))
      }
    } catch (error) {
      console.error("Error refreshing total raised:", error)
      alert("Error refreshing data. Please try again later.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleWhitepaperClick = () => {
    const whitepaperUrl =
      "https://www.dropbox.com/scl/fi/w3rkkjzg230u0ty7jmj73/DuckInHell-Whitepaper.pdf?rlkey=dmg1107tg61injdcs75a26n2s&dl=1"
    window.open(whitepaperUrl, "_blank")
  }

  // If not mounted yet (server-side), render a minimal version
  if (!isMounted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">DUCK IN HELL</h1>
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section
        id="home"
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#ff4800]/20 to-black z-0"></div>
        <div className="container mx-auto px-4 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left side - Text content */}
            <div className="text-left order-2 md:order-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                <span className="burning-letter">D</span>
                <span className="burning-letter">U</span>
                <span className="burning-letter">C</span>
                <span className="burning-letter">K</span>
                &nbsp;
                <span className="burning-letter">I</span>
                <span className="burning-letter">N</span>
                &nbsp;
                <span className="burning-letter">H</span>
                <span className="burning-letter">E</span>
                <span className="burning-letter">L</span>
                <span className="burning-letter">L</span>
              </h1>
              <h2 className="text-xl md:text-2xl font-medium mt-2 mb-6">
                <span className="burning-letter">T</span>
                <span className="burning-letter">h</span>
                <span className="burning-letter">e</span>
                &nbsp;
                <span className="burning-letter">F</span>
                <span className="burning-letter">i</span>
                <span className="burning-letter">r</span>
                <span className="burning-letter">s</span>
                <span className="burning-letter">t</span>
                &nbsp;
                <span className="burning-letter">M</span>
                <span className="burning-letter">e</span>
                <span className="burning-letter">m</span>
                <span className="burning-letter">e</span>
                &nbsp;
                <span className="burning-letter">M</span>
                <span className="burning-letter">a</span>
                <span className="burning-letter">r</span>
                <span className="burning-letter">k</span>
                <span className="burning-letter">e</span>
                <span className="burning-letter">t</span>
                <span className="sentiment-space">&nbsp;</span>
                <br className="mobile-break" />
                <span className="burning-letter sentiment-word">S</span>
                <span className="burning-letter sentiment-word">e</span>
                <span className="burning-letter sentiment-word">n</span>
                <span className="burning-letter sentiment-word">t</span>
                <span className="burning-letter sentiment-word">i</span>
                <span className="burning-letter sentiment-word">m</span>
                <span className="burning-letter sentiment-word">e</span>
                <span className="burning-letter sentiment-word">n</span>
                <span className="burning-letter sentiment-word">t</span>
                &nbsp;
                <span className="burning-letter">I</span>
                <span className="burning-letter">n</span>
                <span className="burning-letter">d</span>
                <span className="burning-letter">i</span>
                <span className="burning-letter">c</span>
                <span className="burning-letter">a</span>
                <span className="burning-letter">t</span>
                <span className="burning-letter">o</span>
                <span className="burning-letter">r</span>
              </h2>
              <p className="text-lg md:text-xl mb-8">
                Duck In Hell is your emotional support in a market that has none.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="wallet"
                  onClick={() => {
                    const presaleSection = document.getElementById("presale")
                    presaleSection?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  Join Presale
                </Button>
                <Button
                  variant="outline"
                  className="border-[#ff4800] text-[#ff9800] hover:bg-[#ff4800]/20 rounded-full flex items-center gap-2"
                  onClick={handleWhitepaperClick}
                >
                  <FileText className="h-4 w-4" />
                  Whitepaper
                </Button>
              </div>
            </div>

            {/* Right side - Image */}
            <div className="flex justify-center md:justify-end order-1 md:order-2">
              <div className="w-full max-w-[500px]">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/C71E6C80-EB38-4456-9C6B-6CC59CF228DF.png-3haDjVyC8Sk9k6avILXmgBnISqZpoA.jpeg"
                  alt="Duck In Hell"
                  width={600}
                  height={600}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <div className="animate-bounce">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#ff9800]"
            >
              <path d="M12 5v14"></path>
              <path d="m19 12-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Presale Section */}
      <section id="presale" className="relative py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-[#ff9800]">PRESALE</h2>
            <div className="mb-8 inline-block bg-[#ff4800]/20 px-3 py-1 rounded-md border border-[#ff4800]/30">
              <span className="text-xl font-bold text-[#ff9800]">$DUCK IN HELL</span>
            </div>
            <div className="mb-10">
              <CountdownTimer />
            </div>
            <div className="bg-black/70 border border-[#ff4800]/50 p-8 rounded-lg mb-10">
              {/* Rest of the content */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="flex items-center">
                    <p className="text-[#ff9800]">Raised</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 w-6 p-0 text-[#ff9800]"
                      onClick={refreshTotalRaised}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-2xl font-bold">{totalRaised.toFixed(2)} SOL</p>
                  {errorMessage && <p className="text-xs text-yellow-500 mt-1">{errorMessage}</p>}
                  {dataSource !== "blockchain" && !errorMessage && (
                    <p className="text-xs text-gray-400 mt-1">
                      Using {dataSource === "cache" ? "cached" : "local"} data
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[#ff9800]">Goal</p>
                  <p className="text-2xl font-bold">{goalAmount.toLocaleString()} SOL</p>
                </div>
              </div>
              <PresaleForm />
            </div>
            <p className="text-lg mb-4">Join the chaos. Follow us on X & Telegram</p>
            <div className="flex justify-center gap-6 mb-6">
              <a
                href="https://x.com/duckinhelltoken?s=21"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-[#ff9800] hover:text-[#ff4800] transition-colors"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2"
                >
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    fill="currentColor"
                  />
                </svg>
                @duckinhelltoken
              </a>
              <a
                href="https://t.me/DuckInHellSol"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-[#ff9800] hover:text-[#ff4800] transition-colors"
              >
                <Send className="h-5 w-5 mr-2" />
                DuckInHellSol
              </a>
            </div>
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#ff9800]">
              SITTING DUCKS FEEL SAFE, BUT IN THE END ALWAYS GET PLUCKED
            </h2>
            <div className="space-y-6 text-lg">
              <p>Crypto isn't rational—it's pure, unfiltered chaos. Greed. Fear. Euphoria. Despair.</p>
              <p>
                We are anti rug and quick flip! This is a community-driven inferno, where hype fuels the flames and
                sentiment shapes the journey.
              </p>
              <div className="mt-8 p-4 bg-[#ff4800]/10 border border-[#ff4800]/30 rounded-lg">
                <h3 className="text-xl font-bold mb-2 text-[#ff9800]">Community Protection</h3>
                <p>
                  To protect our community and ensure long-term stability, we are locking a large reserve of the token
                  supply. This commitment demonstrates our dedication to sustainable growth rather than short-term
                  gains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Duckie Feels Section */}
      <section id="duckie" className="py-20 bg-black/90">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#ff9800]">DUCKIE FEELS IT ALL!</h2>
            <div className="space-y-6 text-lg">
              <p>
                Every day, Duckie's mood shifts, tracking the market's emotional spiral—from crippling panic to
                full-throttle mania. The community feeds the fire, and when the hype hits maximum... Duckie's egg
                hatches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#ff9800]">HOW IT WORKS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="bg-black/50 border border-[#ff4800]/30 p-6 rounded-lg">
                <div className="text-4xl font-bold text-[#ff9800] mb-4">1</div>
                <p>Duckie reacts to the market—his mood shifts daily.</p>
              </div>
              <div className="bg-black/50 border border-[#ff4800]/30 p-6 rounded-lg">
                <div className="text-4xl font-bold text-[#ff9800] mb-4">2</div>
                <p>
                  $DuckInHell available on Raydium feeds Memenomics model and the development of unique meme market
                  sentiment indicators.
                </p>
              </div>
              <div className="bg-black/50 border border-[#ff4800]/30 p-6 rounded-lg">
                <div className="text-4xl font-bold text-[#ff9800] mb-4">3</div>
                <p>When the time is right, the egg hatches… and all hell breaks loose.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 bg-black/90">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[#ff9800]">
              HATCHED BY ANALYSTS, ARTISTS & AVIAN VISIONARIES
            </h2>
            <div className="space-y-6 text-lg">
              <p>
                Born in the inferno, Duck In Hell was forged in fire by market analysts, degenerate artists, and
                unhinged visionaries who feast on meme market sentiment. This isn't just a project—it's a living,
                breathing reflection of crypto's emotional insanity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      {isMounted && <DebugPanel />}
    </main>
  )
}

