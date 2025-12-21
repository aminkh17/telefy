"use client"

import React from "react"
import { cn } from "../../lib/utils"

export interface AppleGlassEffectProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The intensity of the blur effect. Corresponds to Tailwind's blur utility classes.
   * @default "md"
   */
  blurIntensity?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  /**
   * The opacity of the background color. Value between 0 and 100.
   * @default 20
   */
  backgroundOpacity?: number
  /**
   * The color of the background. Can be any valid CSS color string or Tailwind color class (e.g., "blue-500").
   * @default "white"
   */
  backgroundColor?: string
  /**
   * Whether to apply a border to the glass effect.
   * @default true
   */
  withBorder?: boolean
  /**
   * The color of the border. Only applies if `withBorder` is true.
   * @default "white"
   */
  borderColor?: string
  /**
   * The opacity of the border. Value between 0 and 100. Only applies if `withBorder` is true.
   * @default 30
   */
  borderOpacity?: number
  /**
   * The border radius of the glass effect. Corresponds to Tailwind's rounded utility classes.
   * @default "xl"
   */
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full"
  /**
   * Whether to apply a subtle shadow to the glass effect.
   * @default true
   */
  withShadow?: boolean
  /**
   * The content to be rendered inside the glass effect component.
   */
  children?: React.ReactNode
}

export const AppleGlassEffect: React.FC<AppleGlassEffectProps> = ({
  blurIntensity = "md",
  backgroundOpacity = 20,
  backgroundColor = "white",
  withBorder = true,
  borderColor = "white",
  borderOpacity = 30,
  borderRadius = "xl",
  withShadow = true,
  children,
  className,
  ...props
}) => {
  const blurClass = blurIntensity !== "none" ? `backdrop-blur-${blurIntensity}` : ""
  const roundedClass = `rounded-${borderRadius}`
  const shadowClass = withShadow ? "shadow-lg" : ""

  const bgStyle = {
    backgroundColor: backgroundColor,
    opacity: backgroundOpacity / 100,
  }

  const borderStyle = withBorder
    ? {
        borderColor: borderColor,
        borderWidth: "1px",
        opacity: borderOpacity / 100,
      }
    : {}

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        blurClass,
        roundedClass,
        shadowClass,
        className,
      )}
      style={{
        ...props.style,
        ...borderStyle,
      }}
      {...props}
    >
      <div
        className="absolute inset-0 -z-10"
        style={bgStyle}
      />
      {children}
    </div>
  )
}
