import { memberColor } from '../utils/format'

interface Segment {
  bp: number
  label: string
}

interface SegmentedBarProps {
  segments: Segment[]
  hoveredIndex?: number
  onHover?: (index: number | undefined) => void
}

export default function SegmentedBar({ segments, hoveredIndex, onHover }: SegmentedBarProps) {
  const total = segments.reduce((s, x) => s + x.bp, 0) || 10000

  return (
    <div className="flex items-center h-3 gap-0.5 rounded-full overflow-hidden w-full">
      {segments.map((seg, i) => {
        const pct = (seg.bp / total) * 100
        return (
          <div
            key={i}
            className="h-full rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
            style={{
              width: `${pct}%`,
              background: memberColor(i),
              opacity: hoveredIndex === undefined || hoveredIndex === i ? 1 : 0.35,
              transform: hoveredIndex === i ? 'scaleY(1.5)' : 'scaleY(1)',
            }}
            onMouseEnter={() => onHover?.(i)}
            onMouseLeave={() => onHover?.(undefined)}
            title={`${seg.label}: ${(seg.bp / 100).toFixed(2)}%`}
          />
        )
      })}
    </div>
  )
}
