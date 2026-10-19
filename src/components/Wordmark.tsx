/**
 * <Wordmark /> — Aura Vault brand name with gradient "Aura", bold "Vault",
 * and an optional crisp tagline hidden on mobile.
 *
 * Usage:
 *   <Wordmark />               — default (header, no tagline)
 *   <Wordmark showTagline />   — with tagline (desktop header / loading screens)
 */

const GRADIENT = 'linear-gradient(90deg, #4FC3FF 0%, #B995FF 55%, #6EE7B7 100%)'

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
    <span className="flex flex-col justify-center" style={{ gap: 4 }}>
      {/* Name row — no text-shadow so gradient text stays crisp */}
      <span className="flex items-center" style={{ gap: 0 }}>
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
            // Extra padding prevents the gradient from being clipped at edges
            paddingBottom: 2,
            paddingTop: 2,
          }}
        >
          Aura
        </span>

        {/* Natural inter-word gap: 5px */}
        <span style={{ display: 'inline-block', width: 5 }} aria-hidden />

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

      {/* Tagline — desktop only, no shadow/blur for crispness */}
      {showTagline && (
        <span
          className="hidden sm:block"
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#94A3B8',
            lineHeight: 1,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            textShadow: 'none',
          }}
        >
          Revenue Splits on Arc
        </span>
      )}
    </span>
  )
}
