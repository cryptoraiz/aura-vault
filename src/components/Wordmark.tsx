/**
 * <Wordmark /> — Aura Vault brand name.
 * "Aura" = solid white bold, "Vault" = blue-cyan gradient bold.
 *
 * Usage:
 *   <Wordmark />               — default (header, no tagline)
 *   <Wordmark showTagline />   — with tagline (desktop header / loading screens)
 */

const VAULT_GRADIENT = 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 50%, #67E8F9 100%)'

const BASE: React.CSSProperties = {
  fontSize: 20,
  letterSpacing: '-0.02em', // tracking-tight
  lineHeight: 1,
  fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif",
  fontWeight: 700,
}

interface WordmarkProps {
  /** Show "REVENUE SPLITS ON ARC" tagline — hidden on mobile regardless */
  showTagline?: boolean
}

export default function Wordmark({ showTagline = false }: WordmarkProps) {
  return (
    <span className="flex flex-col justify-center" style={{ gap: 4 }}>
      {/* Name row */}
      <span className="flex items-center" style={{ gap: 6 }}>
        {/* "Aura" — solid white */}
        <span style={{ ...BASE, color: '#FFFFFF' }}>
          Aura
        </span>

        {/* "Vault" — blue-cyan gradient */}
        <span
          style={{
            ...BASE,
            fontWeight: 800,
            background: VAULT_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            paddingBottom: 2,
            paddingTop: 2,
          }}
        >
          Vault
        </span>
      </span>

      {/* Tagline — desktop only, crisp, no shadow */}
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
