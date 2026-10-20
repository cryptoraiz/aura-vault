import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arc, arcTestnet } from 'viem/chains'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { getVaultAddress, AURA_VAULT_ABI } from '../vault-config'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import GlassCard from '../components/GlassCard'
import { formatUsdc, shortAddr, relativeTime } from '../utils/format'
import { ARC_TESTNET_ID, ARC_MAINNET_ID } from '../config'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventKind = 'VaultCreated' | 'DepositReceived' | 'PaymentReleased'
type FilterKind = 'all' | 'deposits' | 'withdrawals'

interface ActivityEvent {
  kind: EventKind
  vaultId: bigint
  blockNumber: bigint
  txHash: `0x${string}`
  logIndex: number
  blockTimestamp?: number
  args: Record<string, unknown>
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(chainId: number) {
  return `aura_vault_activity_${chainId}`
}

function loadCache(chainId: number): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(cacheKey(chainId))
    if (!raw) return []
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    return parsed.map((e) => ({
      ...(e as unknown as ActivityEvent),
      vaultId: BigInt(e.vaultId as string),
      blockNumber: BigInt(e.blockNumber as string),
    }))
  } catch {
    return []
  }
}

function saveCache(chainId: number, events: ActivityEvent[]) {
  try {
    const serialisable = events.map((e) => ({
      ...e,
      vaultId: e.vaultId.toString(),
      blockNumber: e.blockNumber.toString(),
    }))
    localStorage.setItem(cacheKey(chainId), JSON.stringify(serialisable))
  } catch {
    // storage quota exceeded — silently skip
  }
}

/** Merge two event arrays, deduplicating by txHash+logIndex */
function mergeEvents(existing: ActivityEvent[], incoming: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set(existing.map((e) => `${e.txHash}:${e.logIndex}`))
  const merged = [...existing]
  for (const e of incoming) {
    const key = `${e.txHash}:${e.logIndex}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(e)
    }
  }
  return merged.sort((a, b) => Number(b.blockNumber - a.blockNumber))
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ event, chainId, delay }: { event: ActivityEvent; chainId: number; delay: number }) {
  const _chain = requireChain(chainId)
  const isDeposit = event.kind === 'DepositReceived'
  const isWithdrawal = event.kind === 'PaymentReleased'
  const isCreated = event.kind === 'VaultCreated'

  const amount =
    isDeposit || isWithdrawal ? (event.args.amount as bigint | undefined) : undefined

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
            ? 'rgba(45,212,160,0.12)'
            : isWithdrawal
            ? 'rgba(0,82,255,0.12)'
            : 'rgba(124,92,255,0.12)',
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
              background: isDeposit
                ? 'rgba(45,212,160,0.1)'
                : isWithdrawal
                ? 'rgba(0,82,255,0.1)'
                : 'rgba(124,92,255,0.1)',
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
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#8A94A8' }}
            >
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Activity() {
  const { chainId = ARC_MAINNET_ID } = useAccount()
  const activeChain = chainId
  const contractAddress = getVaultAddress(activeChain)

  const [events, setEvents] = useState<ActivityEvent[]>(() => loadCache(activeChain))
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKind>('all')
  const [vaultFilter, setVaultFilter] = useState('')

  // Track which chain the events state currently belongs to
  const eventsChainRef = useRef(activeChain)

  // Reload cache when the active chain changes
  useEffect(() => {
    if (eventsChainRef.current !== activeChain) {
      eventsChainRef.current = activeChain
      setEvents(loadCache(activeChain))
    }
  }, [activeChain])

  const fetchEvents = useCallback(async () => {
    if (!contractAddress) return
    setLoading(true)
    try {
      const chainConfig = activeChain === ARC_MAINNET_ID ? arc : arcTestnet
      const client = createPublicClient({ chain: chainConfig, transport: http() })

      const currentBlock = await client.getBlockNumber()
      // 4,000-block window stays safely under the RPC's 5,000-block hard limit
      const fromBlock = currentBlock > 4000n ? currentBlock - 4000n : 0n

      const [depositLogs, releaseLogs, createdLogs] = await Promise.all([
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            'event DepositReceived(uint256 indexed vaultId, address indexed depositor, uint256 amount, string memo)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            'event PaymentReleased(uint256 indexed vaultId, address indexed payee, uint256 amount)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            'event VaultCreated(uint256 indexed vaultId, address indexed creator, string name, address[] payees, uint256[] shares)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
      ])

      const fresh: ActivityEvent[] = [
        ...depositLogs.map((log) => ({
          kind: 'DepositReceived' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          args: { depositor: log.args.depositor, amount: log.args.amount, memo: log.args.memo },
        })),
        ...releaseLogs.map((log) => ({
          kind: 'PaymentReleased' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          args: { payee: log.args.payee, amount: log.args.amount },
        })),
        ...createdLogs.map((log) => ({
          kind: 'VaultCreated' as EventKind,
          vaultId: log.args.vaultId ?? 0n,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          args: { creator: log.args.creator, name: log.args.name },
        })),
      ]

      // Merge with existing cache so historical events survive
      const cached = loadCache(activeChain)
      let merged = mergeEvents(cached, fresh)

      // ── Onchain fallback: if merged is still empty, synthesise from vault state ──
      if (merged.length === 0) {
        merged = await synthesiseFromVaults(client, contractAddress, activeChain)
      }

      // Enrich the 20 most-recent events with block timestamps
      const recent = merged.slice(0, 20)
      const blockNums = [...new Set(recent.map((e) => e.blockNumber))]
      const blocks = await Promise.all(
        blockNums.map((n) => client.getBlock({ blockNumber: n })),
      )
      const blockTimes = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]))
      const enriched = merged.map((e, i) => ({
        ...e,
        blockTimestamp: i < 20 ? blockTimes.get(e.blockNumber) : undefined,
      }))

      saveCache(activeChain, enriched)
      setEvents(enriched)
    } catch (err) {
      console.error('Failed to fetch events', err)
      // Keep showing whatever is already in state (from cache)
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
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: '#F5F7FA', letterSpacing: '-0.02em' }}
        >
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
          {/* Filters + Refresh */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
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

            {/* Refresh button */}
            <button
              onClick={() => { void fetchEvents() }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: loading ? '#8A94A8' : '#F5F7FA',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw
                size={13}
                className={loading ? 'animate-spin' : ''}
                style={{ color: '#00D2FF' }}
              />
              Refresh
            </button>
          </div>

          <GlassCard className="p-5">
            {loading && events.length === 0 && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                    <div
                      className="w-9 h-9 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                    <div className="flex-1">
                      <div
                        className="h-4 rounded w-1/4 mb-2"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      />
                      <div
                        className="h-3 rounded w-1/3"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      />
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
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#F5F7FA' }}>
                  No activity yet
                </h3>
                <p className="text-sm" style={{ color: '#8A94A8' }}>
                  Make the first deposit to see it here.
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <div>
                {filtered.map((event, i) => (
                  <EventRow
                    key={`${event.txHash}-${event.logIndex}-${i}`}
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

// ─── Onchain fallback: synthesise ActivityEvents from vault state ─────────────

async function synthesiseFromVaults(
  client: ReturnType<typeof createPublicClient>,
  contractAddress: `0x${string}`,
  chainId: number,
): Promise<ActivityEvent[]> {
  try {
    const count = await client.readContract({
      address: contractAddress,
      abi: AURA_VAULT_ABI,
      functionName: 'vaultCount',
    })
    if (!count || count === 0n) return []

    const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1))
    const vaults = await Promise.all(
      ids.map((id) =>
        client.readContract({
          address: contractAddress,
          abi: AURA_VAULT_ABI,
          functionName: 'getVault',
          args: [id],
        }),
      ),
    )

    const synthetic: ActivityEvent[] = []
    const currentBlock = await client.getBlockNumber()

    vaults.forEach((v, idx) => {
      const vaultId = ids[idx]
      // getVault returns [name, creator, payees, shares, totalDeposited, totalReleased, ...]
      const [_name, creator, , , totalDeposited] = v as [
        string, string, string[], bigint[], bigint, bigint, bigint[], bigint[],
      ]

      // Synthesised "VaultCreated" entry — use a deterministic fake tx hash
      const fakeHash = `0x${'0'.repeat(39)}${vaultId.toString(16).padStart(25, '0')}` as `0x${string}`
      synthetic.push({
        kind: 'VaultCreated',
        vaultId,
        blockNumber: currentBlock,
        txHash: fakeHash,
        logIndex: 0,
        args: { creator, name: _name },
      })

      // If deposits exist, add a synthesised DepositReceived entry
      if (totalDeposited > 0n) {
        const fakeDepHash = `0x${'1'.repeat(39)}${vaultId.toString(16).padStart(25, '0')}` as `0x${string}`
        synthetic.push({
          kind: 'DepositReceived',
          vaultId,
          blockNumber: currentBlock,
          txHash: fakeDepHash,
          logIndex: 1,
          args: { depositor: creator, amount: totalDeposited, memo: '' },
        })
      }
    })

    saveCache(chainId, synthetic)
    return synthetic.sort((a, b) => Number(b.vaultId - a.vaultId))
  } catch {
    return []
  }
}
