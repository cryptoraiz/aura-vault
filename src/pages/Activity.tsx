import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arc, arcTestnet } from 'viem/chains'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Plus } from 'lucide-react'
import { getVaultAddress } from '../vault-config'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import GlassCard from '../components/GlassCard'
import { formatUsdc, shortAddr, relativeTime } from '../utils/format'
import { ARC_TESTNET_ID, ARC_MAINNET_ID } from '../config'

type EventKind = 'VaultCreated' | 'DepositReceived' | 'PaymentReleased'
type FilterKind = 'all' | 'deposits' | 'withdrawals'

interface ActivityEvent {
  kind: EventKind
  vaultId: bigint
  blockNumber: bigint
  txHash: `0x${string}`
  blockTimestamp?: number
  args: Record<string, unknown>
}

function EventRow({ event, chainId, delay }: { event: ActivityEvent; chainId: number; delay: number }) {
  const _chain = requireChain(chainId) // validates chainId is known
  const isDeposit = event.kind === 'DepositReceived'
  const isWithdrawal = event.kind === 'PaymentReleased'
  const isCreated = event.kind === 'VaultCreated'

  const amount =
    isDeposit
      ? (event.args.amount as bigint)
      : isWithdrawal
      ? (event.args.amount as bigint)
      : undefined

  const actor = isDeposit
    ? (event.args.depositor as string)
    : isWithdrawal
    ? (event.args.payee as string)
    : (event.args.creator as string)

  const txUrl = buildTxExplorerUrl(chainId, event.txHash)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isDeposit
            ? 'rgba(45, 212, 160, 0.12)'
            : isWithdrawal
            ? 'rgba(0, 82, 255, 0.12)'
            : 'rgba(124, 92, 255, 0.12)',
        }}
      >
        {isDeposit && <ArrowDownLeft size={15} style={{ color: '#2DD4A0' }} />}
        {isWithdrawal && <ArrowUpRight size={15} style={{ color: '#00D2FF' }} />}
        {isCreated && <Plus size={15} style={{ color: '#7C5CFF' }} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: '#F5F7FA' }}>
            {isDeposit ? 'Deposit' : isWithdrawal ? 'Withdrawal' : 'Vault Created'}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: isDeposit ? 'rgba(45,212,160,0.1)' : isWithdrawal ? 'rgba(0,82,255,0.1)' : 'rgba(124,92,255,0.1)',
              color: isDeposit ? '#2DD4A0' : isWithdrawal ? '#00D2FF' : '#7C5CFF',
            }}
          >
            Vault #{event.vaultId.toString()}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs mono truncate" style={{ color: '#8A94A8' }}>
            {shortAddr(actor)}
          </span>
          {(event.args.memo as string) && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#8A94A8' }}>
              {event.args.memo as string}
            </span>
          )}
        </div>
      </div>

      {/* Amount + time */}
      <div className="text-right flex-shrink-0">
        {amount !== undefined && (
          <div
            className="text-sm font-semibold mono"
            style={{ color: isDeposit ? '#2DD4A0' : '#F5F7FA' }}
          >
            {isDeposit ? '+' : '-'}${formatUsdc(amount)}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5 justify-end">
          {event.blockTimestamp && (
            <span className="text-xs" style={{ color: '#8A94A8' }}>
              {relativeTime(event.blockTimestamp)}
            </span>
          )}
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: '#8A94A8' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export default function Activity() {
  const { chainId = ARC_TESTNET_ID } = useAccount()
  const activeChain = chainId
  const contractAddress = getVaultAddress(activeChain)

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKind>('all')
  const [vaultFilter, setVaultFilter] = useState('')

  const fetchEvents = useCallback(async () => {
    if (!contractAddress) return
    setLoading(true)
    try {
      const chainConfig = activeChain === ARC_MAINNET_ID ? arc : arcTestnet
      const client = createPublicClient({
        chain: chainConfig,
        transport: http(),
      })

      const currentBlock = await client.getBlockNumber()
      // Look back up to 2,000 blocks to stay within RPC range limits
      const fromBlock = currentBlock > 2000n ? currentBlock - 2000n : 0n

      const [depositLogs, releaseLogs, createdLogs] = await Promise.all([
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem('event DepositReceived(uint256 indexed vaultId, address indexed depositor, uint256 amount, string memo)'),
          fromBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem('event PaymentReleased(uint256 indexed vaultId, address indexed payee, uint256 amount)'),
          fromBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem('event VaultCreated(uint256 indexed vaultId, address indexed creator, string name, address[] payees, uint256[] shares)'),
          fromBlock,
          toBlock: 'latest',
        }),
      ])

      const allEvents: ActivityEvent[] = [
        ...depositLogs.map((log) => ({
          kind: 'DepositReceived' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          args: { depositor: log.args.depositor, amount: log.args.amount, memo: log.args.memo },
        })),
        ...releaseLogs.map((log) => ({
          kind: 'PaymentReleased' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          args: { payee: log.args.payee, amount: log.args.amount },
        })),
        ...createdLogs.map((log) => ({
          kind: 'VaultCreated' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          args: { creator: log.args.creator, name: log.args.name },
        })),
      ].sort((a, b) => Number(b.blockNumber - a.blockNumber))

      // Fetch block timestamps for recent events (first 20)
      const recent = allEvents.slice(0, 20)
      const blockNums = [...new Set(recent.map((e) => e.blockNumber))]
      const blocks = await Promise.all(blockNums.map((n) => client.getBlock({ blockNumber: n })))
      const blockTimes = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]))

      const enriched = allEvents.map((e, i) => ({
        ...e,
        blockTimestamp: i < 20 ? blockTimes.get(e.blockNumber) : undefined,
      }))

      setEvents(enriched)
    } catch (err) {
      console.error('Failed to fetch events', err)
    } finally {
      setLoading(false)
    }
  }, [contractAddress, activeChain])

  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const filtered = events.filter((e) => {
    if (filter === 'deposits' && e.kind !== 'DepositReceived') return false
    if (filter === 'withdrawals' && e.kind !== 'PaymentReleased') return false
    if (vaultFilter && e.vaultId.toString() !== vaultFilter) return false
    return true
  })

  const filterBtns: { key: FilterKind; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'deposits', label: 'Deposits' },
    { key: 'withdrawals', label: 'Withdrawals' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F7FA', letterSpacing: '-0.02em' }}>
          Activity
        </h1>
        <p className="text-sm" style={{ color: '#8A94A8' }}>
          Live onchain events from the AuraVault contract
        </p>
      </div>

      {!contractAddress && (
        <GlassCard className="p-8 text-center">
          <p style={{ color: '#8A94A8' }}>Contract not deployed on this network yet.</p>
        </GlassCard>
      )}

      {contractAddress && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {filterBtns.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: filter === key ? 'rgba(0,82,255,0.2)' : 'transparent',
                    color: filter === key ? '#00D2FF' : '#8A94A8',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              className="input-field text-sm w-40"
              style={{ minHeight: 'auto', padding: '8px 12px' }}
              placeholder="Vault ID"
              value={vaultFilter}
              onChange={(e) => setVaultFilter(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <GlassCard className="p-5">
            {loading && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex-1">
                      <div className="h-4 rounded w-1/4 mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <div className="h-3 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0,82,255,0.08)' }}
                >
                  <ArrowDownLeft size={24} style={{ color: '#0052FF' }} />
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#F5F7FA' }}>No activity yet</h3>
                <p className="text-sm" style={{ color: '#8A94A8' }}>
                  Make the first deposit to see it here.
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div>
                {filtered.map((event, i) => (
                  <EventRow
                    key={`${event.txHash}-${i}`}
                    event={event}
                    chainId={activeChain}
                    delay={Math.min(i * 0.04, 0.3)}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
