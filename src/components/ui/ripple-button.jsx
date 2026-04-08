import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export const RippleButton = React.forwardRef(
  (
    {
      className,
      children,
      rippleColor = "#ffffff",
      duration = "600ms",
      onClick,
      ...props
    },
    ref
  ) => {
    const [buttonRipples, setButtonRipples] = useState([])

    const handleClick = (event) => {
      createRipple(event)
      onClick?.(event)
    }

    const createRipple = (event) => {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2
      const newRipple = { x, y, size, key: Date.now() }
      setButtonRipples((prev) => [...prev, newRipple])
    }

    useEffect(() => {
      let timeout = null
      if (buttonRipples.length > 0) {
        const lastRipple = buttonRipples[buttonRipples.length - 1]
        timeout = setTimeout(() => {
          setButtonRipples((prev) => prev.filter((r) => r.key !== lastRipple.key))
        }, parseInt(duration))
      }
      return () => { if (timeout !== null) clearTimeout(timeout) }
    }, [buttonRipples, duration])

    return (
      <button
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#F23B3B]/25 bg-black/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#F23B3B]/40 hover:bg-[#F23B3B]/10",
          className
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <div className="relative z-10 flex items-center gap-2">{children}</div>
        <span className="pointer-events-none absolute inset-0">
          {buttonRipples.map((ripple) => (
            <span
              className="animate-rippling absolute rounded-full opacity-30"
              key={ripple.key}
              style={{
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                top: `${ripple.y}px`,
                left: `${ripple.x}px`,
                backgroundColor: rippleColor,
                transform: "scale(0)",
                "--duration": duration,
              }}
            />
          ))}
        </span>
      </button>
    )
  }
)

RippleButton.displayName = "RippleButton"
