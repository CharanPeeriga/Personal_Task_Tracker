import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * DotLoader — animates through an array of frames.
 * Each frame is an array of dot indices that should be "active".
 *
 * Props:
 *  frames      – number[][]   each inner array = active dot indices for that frame
 *  onComplete  – () => void   fires after all repeats finish
 *  duration    – ms per frame (default 150)
 *  repeatCount – how many full cycles before calling onComplete (default 1)
 *  dotClassName – class applied to every dot; use [&.active]:... for active state
 *  className   – class for the wrapper flex row
 */
export function DotLoader({
  frames,
  onComplete,
  className,
  repeatCount = 1,
  duration = 150,
  dotClassName,
}) {
  const [frameIdx, setFrameIdx] = useState(0)
  const repsRef = useRef(0)

  // Derive dot count from maximum index found in all frames
  const allIndices = frames.flat()
  const dotCount = allIndices.length > 0 ? Math.max(...allIndices) + 1 : 0

  useEffect(() => {
    const timer = setTimeout(() => {
      setFrameIdx(prev => {
        if (prev < frames.length - 1) return prev + 1
        repsRef.current += 1
        if (repsRef.current < repeatCount) return 0
        repsRef.current = 0
        onComplete?.()
        return 0
      })
    }, duration)
    return () => clearTimeout(timer)
  }, [frameIdx, frames, duration, repeatCount, onComplete])

  const activeSet = new Set(frames[frameIdx] ?? [])

  return (
    <div className={cn('flex', className)}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className={cn(dotClassName, activeSet.has(i) ? 'active' : '')}
        />
      ))}
    </div>
  )
}
