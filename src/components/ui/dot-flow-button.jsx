import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DotLoader } from '@/components/ui/dot-loader'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

// ─── Dot frame presets ────────────────────────────────────────────────────────
// Each frame = indices of "active" dots in a 5-dot row

export const DOT_FRAMES = {
  // Left-to-right sweep — used for "Create Task"
  flow: [
    [], [0], [0, 1], [0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4], [4], [],
  ],
  // Outward pulse from center — used for "New Project"
  pulse: [
    [], [2], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2], [],
  ],
  // Accumulate left-to-right then dissolve — used for "New Time Block"
  build: [
    [], [0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4],
    [1, 2, 3, 4], [2, 3, 4], [3, 4], [4], [],
  ],
  // Alternating spark — used for "Auto-Fill Block"
  spark: [
    [], [2], [0, 4], [1, 3], [0, 2, 4], [1, 3], [0, 4], [2], [],
  ],
  // Fast sweep for loading state
  loading: [
    [0], [1], [2], [3], [4], [3], [2], [1],
  ],
}

// ─── DotFlowButton ────────────────────────────────────────────────────────────
/**
 * A button styled after the DotFlow component: black pill with animated dots
 * on the left and static text on the right. Uses GSAP for mount/click effects.
 *
 * Props:
 *  children    – button label text
 *  onClick     – click handler
 *  type        – "button" | "submit" (default "button")
 *  disabled    – disables the button
 *  loading     – shows a faster "loading" dot animation and disables the button
 *  dotVariant  – one of the DOT_FRAMES keys (default "flow")
 *  className   – extra classes for the outer button
 */
export function DotFlowButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  dotVariant = 'flow',
  className,
}) {
  const btnRef = useRef(null)

  // Mount animation: fade + slide in from below
  useGSAP(() => {
    gsap.from(btnRef.current, {
      y: 6,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
    })
  }, { scope: btnRef })

  function handleClick(e) {
    if (disabled || loading) return
    // Subtle press feedback
    gsap.timeline()
      .to(btnRef.current, { scale: 0.95, duration: 0.08, ease: 'power1.in' })
      .to(btnRef.current, { scale: 1,    duration: 0.25, ease: 'elastic.out(1, 0.5)' })
    onClick?.(e)
  }

  const frames = loading ? DOT_FRAMES.loading : (DOT_FRAMES[dotVariant] ?? DOT_FRAMES.flow)

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        // Base — dark pill matching DotFlow's bg-black aesthetic
        'inline-flex items-center gap-3 rounded-md bg-black/90 border border-white/8',
        'px-4 py-2.5 select-none',
        // Text
        'text-sm font-medium text-white whitespace-nowrap',
        // Hover / focus
        'hover:bg-[#1a0a0a] hover:border-[#F23B3B]/25 hover:shadow-md hover:shadow-[#F23B3B]/10',
        'focus:outline-none focus:ring-1 focus:ring-[#F23B3B]/50',
        // Disabled
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className,
      )}
    >
      <DotLoader
        frames={frames}
        className="gap-px"
        repeatCount={999_999}
        duration={loading ? 80 : 110}
        dotClassName="bg-white/15 [&.active]:bg-white size-1 rounded-[1px] transition-colors duration-75"
      />
      <span>{children}</span>
    </button>
  )
}
