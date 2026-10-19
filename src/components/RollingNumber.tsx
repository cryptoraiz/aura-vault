import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface RollingNumberProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export default function RollingNumber({
  value,
  duration = 500,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
}: RollingNumberProps) {
  const [displayed, setDisplayed] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)
  const shouldReduce = useReducedMotion()

  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (shouldReduce) {
      setDisplayed(value)
      prevRef.current = value
      return
    }
    const start = prevRef.current
    const end = value
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(start + (end - start) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = end
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration, shouldReduce])

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(displayed)

  return (
    <span className={`mono ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
