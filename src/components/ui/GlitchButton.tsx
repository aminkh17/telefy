"use client"

import React, { useState } from "react"
import { cn } from "../../lib/utils" 

export interface GlitchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The text content of the button.
   */
  children: React.ReactNode
  /**
   * Custom class names for the button.
   */
  className?: string
}

export const GlitchButton: React.FC<GlitchButtonProps> = ({ children, className, ...props }) => {
  const [isGlitching, setIsGlitching] = useState(false)

  const handleMouseEnter = () => {
    setIsGlitching(true)
  }

  const handleMouseLeave = () => {
    setIsGlitching(false)
  }

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center px-6 py-3 text-lg font-bold text-white uppercase tracking-wider",
        "bg-purple-600 hover:bg-purple-700 transition-colors duration-200",
        "border-2 border-purple-500 rounded-md overflow-hidden",
        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
        "group", // For group-hover effects
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <span className="relative z-10">{children}</span>

      {/* Glitch layers */}
      <span
        className={cn(
          "absolute inset-0 bg-purple-800 opacity-0",
          "transition-opacity duration-75",
          isGlitching && "animate-glitch-1",
        )}
      />
      <span
        className={cn(
          "absolute inset-0 bg-purple-400 opacity-0",
          "transition-opacity duration-75",
          isGlitching && "animate-glitch-2",
        )}
      />
      <span
        className={cn(
          "absolute inset-0 bg-purple-900 opacity-0",
          "transition-opacity duration-75",
          isGlitching && "animate-glitch-3",
        )}
      />

      {/* Optional: Hover effect for a subtle shift */}
      <span
        className={cn(
          "absolute inset-0 transform translate-x-0 translate-y-0",
          "group-hover:translate-x-0.5 group-hover:translate-y-0.5",
          "transition-transform duration-100 ease-out",
          "bg-purple-500 opacity-0 group-hover:opacity-20",
        )}
      />
    </button>
  )
}
