import React from 'react'
import { cn } from '@/lib/utils'
import { cva } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

const buttonVariants = cva(
  "relative group border text-foreground inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-blue-500/5 hover:bg-blue-500/0 border-blue-500/20 rounded-full",
        solid: "bg-blue-500 hover:bg-blue-600 text-white border-transparent hover:border-foreground/50 transition-all duration-200 rounded-full",
        ghost: "border-transparent bg-transparent hover:border-zinc-600 hover:bg-white/10 rounded-full",
        outline: "border-white/15 bg-transparent hover:bg-white/5 hover:border-white/25 text-white/70 hover:text-white rounded-lg",
        destructive: "bg-red-900/60 hover:bg-red-800/70 border-red-700/50 text-white rounded-full",
        link: "border-transparent bg-transparent text-white/60 hover:text-white underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "px-10 py-2.5 text-base",
        sm: "px-6 py-1.5 text-sm",
        lg: "px-14 py-4 text-lg",
        icon: "h-12 w-12 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, neon = true, size, variant, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Neon effects only apply to rounded-full variants and never when asChild (Slot requires single child)
    const showNeon = neon && !asChild && variant !== "outline" && variant !== "icon" && variant !== "link"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {showNeon ? (
          <>
            <span className="absolute h-px opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out inset-x-0 inset-y-0 bg-gradient-to-r w-3/4 mx-auto from-transparent dark:via-blue-500 via-blue-600 to-transparent" />
            {children}
            <span className="absolute group-hover:opacity-30 transition-all duration-500 ease-in-out inset-x-0 h-px -bottom-px bg-gradient-to-r w-3/4 mx-auto from-transparent dark:via-blue-500 via-blue-600 to-transparent" />
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
