import { motion } from 'framer-motion'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
  onClick?: () => void
  hoverable?: boolean
}

export default function GlassCard({
  children,
  className = '',
  style,
  delay = 0,
  onClick,
  hoverable,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      className={`glass-card ${hoverable ? 'cursor-pointer' : ''} ${className}`}
      style={style}
      whileHover={hoverable ? { y: -2, boxShadow: '0 8px 32px rgba(0,82,255,0.12)' } : undefined}
    >
      {children}
    </motion.div>
  )
}
