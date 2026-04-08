/**
 * ShineBorder — rotating shine that only lights the card border edge.
 * Uses CSS @property --shine-angle for a clean conic-gradient rotation
 * with mask-composite to expose only the padding (border) zone.
 * Place as first child of a `relative overflow-hidden` container.
 */
export function ShineBorder({
  shineColor = "white",
  duration = 12,
  borderWidth = 1,
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        padding: borderWidth,
        background: `conic-gradient(from var(--shine-angle, 0deg), transparent 50%, ${shineColor} 65%, transparent 80%)`,
        WebkitMask:
          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animation: `shine-border-spin ${duration}s linear infinite`,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  )
}
