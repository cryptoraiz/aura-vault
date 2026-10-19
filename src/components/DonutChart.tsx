import { memberColor, bpToPercent } from '../utils/format'

interface Slice {
  label: string
  bp: number // basis points
}

interface DonutChartProps {
  slices: Slice[]
  size?: number
  thickness?: number
}

export default function DonutChart({ slices, size = 160, thickness = 28 }: DonutChartProps) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const gap = 3 / r // gap in radians ~3px

  const total = slices.reduce((s, x) => s + x.bp, 0) || 10000
  let currentAngle = -Math.PI / 2 // start at top

  const paths: { d: string; color: string; label: string; bp: number }[] = []

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i]
    const fraction = slice.bp / total
    const arcAngle = fraction * 2 * Math.PI - gap

    if (arcAngle <= 0) continue

    const startAngle = currentAngle + gap / 2
    const endAngle = startAngle + arcAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)

    const largeArc = arcAngle > Math.PI ? 1 : 0

    const d = [
      `M ${x1.toFixed(3)} ${y1.toFixed(3)}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    ].join(' ')

    paths.push({ d, color: memberColor(i), label: slice.label, bp: slice.bp })
    currentAngle += fraction * 2 * Math.PI
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={thickness}
        />
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={thickness}
            strokeLinecap="round"
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#F5F7FA" fontSize="11" fontWeight="600" fontFamily="'JetBrains Mono', monospace">
          {slices.length}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#8A94A8" fontSize="10" fontFamily="system-ui">
          {slices.length === 1 ? 'member' : 'members'}
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-2 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: memberColor(i) }}
              />
              <span className="text-sm mono truncate" style={{ color: '#8A94A8', maxWidth: 120 }}>
                {s.label.length > 12 ? `${s.label.slice(0, 6)}…${s.label.slice(-4)}` : s.label}
              </span>
            </div>
            <span className="text-sm font-semibold mono" style={{ color: '#F5F7FA' }}>
              {bpToPercent(s.bp)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
