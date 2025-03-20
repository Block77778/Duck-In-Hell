"use client"

import { useEffect, useState } from "react"

export function CountdownTimer() {
  // Use a fixed end date instead of calculating it relative to the current date
  // Format: new Date(year, month (0-11), day, hour, minute, second)
  // For example, if you want May 30, 2024 at midnight UTC:
  const getFixedEndDate = () => {
    // Fixed end date: April 29th, 2025 at 9 PM GMT
    // Note: In JavaScript, months are 0-indexed (0 = January, 11 = December)
    const endDate = new Date(Date.UTC(2025, 3, 29, 21, 0, 0)) // April 29, 2025 at 9 PM GMT 
    return endDate
  }

  const [endDate] = useState(getFixedEndDate())
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [isPresaleEnded, setIsPresaleEnded] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
        setIsPresaleEnded(false)
      } else {
        // Presale has ended
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        })
        setIsPresaleEnded(true)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex flex-col items-center">
      {isPresaleEnded ? (
        <div className="text-center">
          <div className="bg-black/80 border border-[#ff4800]/30 p-4 rounded-lg mb-4">
            <div className="text-2xl font-bold text-[#ff9800] pixel-font">PRESALE COMPLETED</div>
            <p className="mt-2 text-white">Tokens are now available on Raydium</p>
          </div>
          <a
            href="https://raydium.io/swap/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#ff4800] hover:bg-[#ff4800]/80 text-white px-6 py-2 rounded-full"
          >
            Buy on Raydium
          </a>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-4 md:gap-6">
            <div className="bg-black/80 border border-[#ff4800]/30 p-4 rounded-lg w-20">
              <div className="text-3xl font-bold text-[#ff9800] pixel-font">{timeLeft.days}</div>
              <div className="text-xs uppercase pixel-font">Days</div>
            </div>
            <div className="bg-black/80 border border-[#ff4800]/30 p-4 rounded-lg w-20">
              <div className="text-3xl font-bold text-[#ff9800] pixel-font">{timeLeft.hours}</div>
              <div className="text-xs uppercase pixel-font">Hours</div>
            </div>
            <div className="bg-black/80 border border-[#ff4800]/30 p-4 rounded-lg w-20">
              <div className="text-3xl font-bold text-[#ff9800] pixel-font">{timeLeft.minutes}</div>
              <div className="text-xs uppercase pixel-font">Mins</div>
            </div>
            <div className="bg-black/80 border border-[#ff4800]/30 p-4 rounded-lg w-20">
              <div className="text-3xl font-bold text-[#ff9800] pixel-font">{timeLeft.seconds}</div>
              <div className="text-xs uppercase pixel-font">Secs</div>
            </div>
          </div>
          <p className="mt-4 text-[#ff9800] font-medium">Follow the prime numbers!</p>
        </>
      )}
    </div>
  )
}



