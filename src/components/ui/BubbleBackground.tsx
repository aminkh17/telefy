"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "../../lib/utils"

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
}

export interface BubbleBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  bubbleCount?: number
  minBubbleSize?: number
  maxBubbleSize?: number
  bubbleSpeed?: number
  bubbleColors?: string[]
  animationDuration?: number
  hoverEffect?: boolean
  mouseInteraction?: boolean
  glowEffect?: boolean
  blurEffect?: boolean
  backgroundColor?: string
  className?: string
}

export const BubbleBackground: React.FC<BubbleBackgroundProps> = ({
  bubbleCount = 20,
  minBubbleSize = 10,
  maxBubbleSize = 40,
  bubbleSpeed = 1,
  bubbleColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"],
  animationDuration = 20000,
  hoverEffect = true,
  mouseInteraction = true,
  glowEffect = true,
  blurEffect = false,
  backgroundColor = "#0f172a", // slate-900
  className,
  ...props
}) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameId = useRef<number | null>(null)
  const mousePosition = useRef({ x: 0, y: 0 })

  const generateBubble = useCallback(() => {
    const container = containerRef.current
    if (!container) return null

    const size = Math.random() * (maxBubbleSize - minBubbleSize) + minBubbleSize
    const x = Math.random() * container.offsetWidth
    const y = Math.random() * container.offsetHeight
    const speedX = (Math.random() - 0.5) * 2 * bubbleSpeed
    const speedY = (Math.random() - 0.5) * 2 * bubbleSpeed
    const opacity = Math.random() * 0.5 + 0.2 // 0.2 to 0.7
    const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)]

    return {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
      speedX,
      speedY,
      opacity,
      color,
    }
  }, [bubbleColors, maxBubbleSize, minBubbleSize, bubbleSpeed])

  useEffect(() => {
    // Initialize bubbles
    const initialBubbles: Bubble[] = []
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = generateBubble()
      if (bubble) initialBubbles.push(bubble)
    }
    setBubbles(initialBubbles)

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current && mouseInteraction) {
        const rect = containerRef.current.getBoundingClientRect()
        mousePosition.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      }
    }

    if (mouseInteraction) {
      window.addEventListener("mousemove", handleMouseMove)
    }

    return () => {
      if (mouseInteraction) {
        window.removeEventListener("mousemove", handleMouseMove)
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [bubbleCount, generateBubble, mouseInteraction])

  useEffect(() => {
    const animateBubbles = () => {
      setBubbles((prevBubbles) => {
        const container = containerRef.current
        if (!container) return prevBubbles

        const newBubbles = prevBubbles.map((bubble) => {
          let { x, y, speedX, speedY, size } = bubble

          // Apply mouse interaction
          if (mouseInteraction) {
            const dx = mousePosition.current.x - x
            const dy = mousePosition.current.y - y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const repulsionRadius = 150
            const repulsionStrength = 0.5

            if (distance < repulsionRadius) {
              const angle = Math.atan2(dy, dx)
              speedX -= Math.cos(angle) * repulsionStrength * (repulsionRadius - distance) / repulsionRadius
              speedY -= Math.sin(angle) * repulsionStrength * (repulsionRadius - distance) / repulsionRadius
            }
          }

          x += speedX * 0.1 // Reduced speed factor for smoother movement
          y += speedY * 0.1

          // Boundary detection and wrap-around
          if (x < -size) x = container.offsetWidth + size
          if (x > container.offsetWidth + size) x = -size
          if (y < -size) y = container.offsetHeight + size
          if (y > container.offsetHeight + size) y = -size

          // Dampen speed slightly to prevent infinite acceleration
          speedX *= 0.99
          speedY *= 0.99

          return { ...bubble, x, y, speedX, speedY }
        })

        return newBubbles
      })
      animationFrameId.current = requestAnimationFrame(animateBubbles)
    }

    animationFrameId.current = requestAnimationFrame(animateBubbles)

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [mouseInteraction])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden",
        blurEffect && "backdrop-blur-sm",
        className,
      )}
      style={{ backgroundColor }}
      {...props}
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={cn(
            "absolute rounded-full will-change-transform",
            hoverEffect && "transition-transform duration-300 ease-out hover:scale-125",
            glowEffect && "shadow-lg shadow-current",
          )}
          style={{
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
            backgroundColor: bubble.color,
            transitionDuration: `${animationDuration}ms`,
          }}
        />
      ))}
    </div>
  )
}
