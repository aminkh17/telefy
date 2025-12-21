"use client"

import React from "react"
import { cn } from "../../lib/utils"

export interface MorphingBlobProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The base background color of the blob.
   * @default "bg-blue-500"
   */
  backgroundColor?: string
  /**
   * The size of the blob (width and height).
   * @default "w-48 h-48"
   */
  size?: string
  /**
   * The animation speed.
   * @default "duration-2000"
   */
  animationSpeed?: "duration-1000" | "duration-2000" | "duration-3000" | "duration-4000"
  /**
   * Whether to apply a blur effect to the blob.
   * @default true
   */
  withBlur?: boolean
  /**
   * Custom class names for the blob container.
   */
  className?: string
}

export const MorphingBlob: React.FC<MorphingBlobProps> = ({
  backgroundColor = "bg-blue-500",
  size = "w-48 h-48",
  animationSpeed = "duration-2000",
  withBlur = true,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        size,
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0",
          backgroundColor,
          "rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%]", // Initial blob shape
          "animate-morph",
          animationSpeed,
          withBlur && "filter blur-2xl",
        )}
      />
    </div>
  )
}
