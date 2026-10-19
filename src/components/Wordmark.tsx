/**
 * <Wordmark /> — Aura Vault brand name with gradient "Aura", bold "Vault",
 * a subtle glow, and an optional tagline hidden on mobile.
 *
 * Usage:
 *   <Wordmark />               — default (header)
 *   <Wordmark showTagline />   — with tagline (footer / loading screens)
 */

const GRADIENT = 'linear-gradient(90deg, #4FC3FF 0%, #B995FF 55%, #6EE7B7 100%)'

const GLOW: React.CSSProperties = {
  textShadow: '0 0 18px rgba(79,140,255,0.25)',
}

const BASE: React.CSSProperties = {
  fontSize: 20,
  letterSpacing: '0.02em',
  lineHeight: 1,
  fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif",
}

interface WordmarkProps {
  /** Show "REVENUE SPLITS ON ARC" tagline — hidden on mobile regardless */
  showTagline?: boolean
}

export default function Wordmark({ showTagline = false }: WordmarkProps) {
  return (
    <span className="flex flex-col justify-center" style={{ gap: 2 }}>
      {/* Name row */}
      <span className="flex items-baseline" style={{ gap: 4, ...GLOW }}>
        {/* "Aura" — gradient */}
        <span
          style={{
            ...BASE,
            fontWeight: 600,
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            // Prevent clipping: padding + negative margin trick keeps
            // descenders and the gradient edge from being cut off.
            paddingBottom: 2,
            paddingTop: 2,
          }}
        >
          Aura
        </span>

        {/* thin space — visually separates the two words */}
        <span style={{ display: 'inline-block', width: 3 }} aria-hidden />

        {/* "Vault" — solid white, heavier weight */}
        <span
          style={{
            ...BASE,
            fontWeight: 800,
            color: '#FFFFFF',
          }}
        >
          Vault
        </span>
      </span>

      {/* Tagline — desktop only */}
      {showTagline && (
        <span
          className="hidden sm:block"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#8B93A7',
            lineHeight: 1,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          Revenue Splits on Arc
        </span>
      )}
    </span>
  )
}
