"use client"

import { useEffect, useRef } from "react"

interface BurningTextProps {
  text: string
  className?: string
  subText?: string
}

export function BurningText({ text, className = "", subText }: BurningTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create individual spans for each letter to animate them separately
    const letters = text.split("")
    container.innerHTML = ""

    const textElement = document.createElement("h1")
    textElement.className = className

    // Add each letter with proper spacing
    letters.forEach((letter, index) => {
      const span = document.createElement("span")
      span.textContent = letter
      span.className = "inline-block relative burning-letter"
      span.style.animationDelay = `${index * 0.1}s`
      textElement.appendChild(span)

      // Add a space after "DUCK" if we're at the right position
      if (index === 3) {
        const space = document.createElement("span")
        space.innerHTML = "&nbsp;"
        space.className = "inline-block relative"
        textElement.appendChild(space)
      }

      // Add a space after "IN" if we're at the right position
      if (index === 5) {
        const space = document.createElement("span")
        space.innerHTML = "&nbsp;"
        space.className = "inline-block relative"
        textElement.appendChild(space)
      }
    })

    container.appendChild(textElement)

    if (subText) {
      const subTextElement = document.createElement("h2")
      subTextElement.className = "text-xl md:text-2xl font-medium mt-2 mb-6 text-[#ff9800]"

      // Format the subText with proper spacing and capitalization
      const formattedSubText = "The First Meme Market Sentiment Indicator"
      const subLetters = formattedSubText.split("")

      subLetters.forEach((letter, index) => {
        const span = document.createElement("span")
        span.textContent = letter
        span.className = "inline-block relative burning-letter"
        span.style.animationDelay = `${index * 0.05}s`
        subTextElement.appendChild(span)
      })

      container.appendChild(subTextElement)
    }

    return () => {
      container.innerHTML = ""
    }
  }, [text, className, subText])

  return (
    <div ref={containerRef} className="burning-text-container">
      <style jsx global>{`
        .burning-letter {
          text-shadow: 
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 15px #fff,
            0 0 20px #ff4800,
            0 0 35px #ff4800,
            0 0 40px #ff4800;
          animation: flicker 2s linear infinite alternate;
        }
        
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 15px #fff,
              0 0 20px #ff4800,
              0 0 35px #ff4800,
              0 0 40px #ff4800;
          }
          20%, 24%, 55% {
            text-shadow: none;
          }
        }
        
        /* Add different animation delays to create a more realistic effect */
        .burning-letter:nth-child(2n) {
          animation-delay: 0.1s;
        }
        
        .burning-letter:nth-child(3n) {
          animation-delay: 0.15s;
        }
        
        .burning-letter:nth-child(5n) {
          animation-delay: 0.3s;
        }
        
        .burning-letter:nth-child(7n) {
          animation-delay: 0.45s;
        }

        /* Prevent word breaks on small screens */
        @media (max-width: 640px) {
          .burning-text-container h1,
          .burning-text-container h2 {
            white-space: nowrap;
            overflow-x: auto;
            padding-bottom: 10px;
          }
        }
      `}</style>
    </div>
  )
}

