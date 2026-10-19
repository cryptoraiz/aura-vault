/**
 * Formatting utilities for Aura Vault.
 * All USDC amounts are 6-decimal ERC-20 values (bigint).
 */

/** Shorten an Ethereum address for display: 0x1234...5678 */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/** Format a raw 6-decimal USDC bigint to a human-readable string, e.g. "1,234.56" */
export function formatUsdc(raw: bigint | undefined | null, decimals = 2): string {
  if (raw === undefined || raw === null) return '0.00'
  const str = raw.toString().padStart(7, '0')
  const intPart = str.slice(0, str.length - 6) || '0'
  const fracPart = str.slice(-6)
  const full = `${intPart}.${fracPart}`
  const num = parseFloat(full)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/** Parse a user string like "1234.56" to a raw 6-decimal bigint */
export function parseUsdc(input: string): bigint {
  const trimmed = input.trim().replace(/,/g, '')
  if (!trimmed || isNaN(parseFloat(trimmed))) return 0n
  const [intPart = '0', fracPart = ''] = trimmed.split('.')
  const frac = fracPart.slice(0, 6).padEnd(6, '0')
  return BigInt(intPart) * 1_000_000n + BigInt(frac)
}

/** Convert basis points (1-10000) to a human-readable percentage string */
export function bpToPercent(bp: bigint | number): string {
  const n = typeof bp === 'bigint' ? Number(bp) : bp
  return (n / 100).toFixed(2).replace(/\.?0+$/, '')
}

/** Relative time: "5 min ago", "2h ago", "3 days ago" */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/** Generate a deterministic gradient from an address for avatars */
export function addrGradient(addr: string): string {
  const colors = [
    '#0052FF', '#00D2FF', '#7C5CFF', '#2DD4A0', '#F5B544', '#FF7AB6',
    '#FF5C7A', '#38BDF8', '#A78BFA', '#34D399',
  ]
  const hash = addr
    ? [...addr.slice(2, 10)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 0
  const c1 = colors[hash % colors.length]
  const c2 = colors[(hash + 3) % colors.length]
  return `linear-gradient(135deg, ${c1}, ${c2})`
}

/** Member color by index */
export const MEMBER_COLORS = [
  '#0052FF', '#00D2FF', '#7C5CFF', '#2DD4A0', '#F5B544', '#FF7AB6',
]
export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

/** Parse a revert error into a user-friendly message */
export function parseContractError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient')) return 'Insufficient USDC balance.'
  if (msg.includes('nothingtorelease')) return 'Nothing to withdraw yet.'
  if (msg.includes('nothingtodistribute')) return 'No pending balances to distribute.'
  if (msg.includes('notapayee')) return 'This address is not a payee in this vault.'
  if (msg.includes('zeroamount')) return 'Amount must be greater than zero.'
  if (msg.includes('invalidvaultid')) return 'Vault not found.'
  if (msg.includes('duplicatepayee')) return 'Duplicate payee address.'
  if (msg.includes('invalidsharestotal')) return 'Shares must sum to exactly 100%.'
  if (msg.includes('reverted')) return 'Transaction failed. Please try again.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please try again.'
}
