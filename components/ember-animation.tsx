"use client"

import { useEffect, useRef } from "react"

export function EmberAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Ember particle class with pixel art style
    class Ember {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      life: number
      maxLife: number
      color: string
      pixelSize: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = canvas.height + Math.random() * 20
        this.size = Math.random() * 4 + 1.5 // Increased size
        this.speedX = Math.random() * 1 - 0.5
        this.speedY = Math.random() * -3 - 1.5
        this.opacity = Math.random() * 0.7 + 0.5 // Increased opacity for brightness
        this.maxLife = Math.random() * 100 + 150
        this.life = 0
        this.pixelSize = Math.floor(Math.random() * 2) + 2 // Size of pixel squares

        // Brighter color between orange and red
        const hue = Math.floor(Math.random() * 30) + 10 // 10-40 (red to orange)
        const saturation = Math.floor(Math.random() * 20) + 80 // 80-100%
        const lightness = Math.floor(Math.random() * 20) + 60 // 60-80% (increased brightness)
        this.color = `hsla(${hue}, ${saturation}%, ${lightness}%, `
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        // Add some waviness to the movement
        this.x += Math.sin(this.life * 0.02) * 0.2

        // Gradually slow down
        this.speedY *= 0.99

        // Fade based on life cycle
        if (this.life < 20) {
          this.opacity = (this.life / 20) * 0.7 // Increased max opacity
        } else if (this.life > this.maxLife - 50) {
          this.opacity = ((this.maxLife - this.life) / 50) * 0.7 // Increased max opacity
        }

        this.life++
      }

      draw(ctx: CanvasRenderingContext2D) {
        // Draw as a pixel square instead of a circle for pixel art style
        ctx.fillStyle = `${this.color}${this.opacity})`
        ctx.fillRect(
          Math.floor(this.x / this.pixelSize) * this.pixelSize,
          Math.floor(this.y / this.pixelSize) * this.pixelSize,
          this.pixelSize,
          this.pixelSize,
        )
      }

      isAlive() {
        return this.life < this.maxLife && this.y > -10
      }
    }

    let embers: Ember[] = []
    const maxEmbers = 150 // Increased number of embers

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Add new embers if needed
      if (embers.length < maxEmbers && Math.random() > 0.9) {
        embers.push(new Ember())
      }

      // Update and draw embers
      embers.forEach((ember) => {
        ember.update()
        ember.draw(ctx)
      })

      // Remove dead embers
      embers = embers.filter((ember) => ember.isAlive())

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ opacity: 0.8 }} // Increased opacity
    />
  )
}

