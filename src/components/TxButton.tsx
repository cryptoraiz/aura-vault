/**
 * Stateful transaction button.
 * Shows idle -> pending (wallet) -> confirming -> success/error states.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader, X } from 'lucide-react'

export type TxState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface TxButtonProps {
  state: TxState
  onClick: () => void | Promise<void>
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  loadingLabel?: string
  confirmingLabel?: string
}

export default function TxButton({
  state,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
  style,
  children,
  loadingLabel = 'Confirm in wallet...',
  confirmingLabel = 'Confirming...',
}: TxButtonProps) {
  const isLoading = state === 'pending' || state === 'confirming'
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-secondary'

  return (
    <button
      className={`${cls} ${className} relative overflow-hidden`}
      style={style}
      onClick={() => void onClick()}
      disabled={disabled || isLoading}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'idle' && (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {children}
          </motion.span>
        )}
        {state === 'pending' && (
          <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
            <Loader size={14} className="animate-spin" />
            {loadingLabel}
          </motion.span>
        )}
        {state === 'confirming' && (
          <motion.span key="confirming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
            <Loader size={14} className="animate-spin" />
            {confirmingLabel}
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2" style={{ color: '#2DD4A0' }}>
            <Check size={14} />
            Done
          </motion.span>
        )}
        {state === 'error' && (
          <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2" style={{ color: '#FF5C7A' }}>
            <X size={14} />
            Failed
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
