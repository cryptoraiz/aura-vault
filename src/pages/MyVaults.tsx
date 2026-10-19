import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { Plus, ArrowRight } from 'lucide-react'
import { ARC_TESTNET_ID } from '../config'
import { useVaultsByCreator, useVaultsByPayee, useMultipleVaults } from '../hooks/useAuraVault'
import GlassCard from '../components/GlassCard'
import { formatUsdc, bpToPercent, addrGradient } from '../utils/format'

function VaultCard({
  vaultId,
  chainId,
  address,
  delay,
}: {
  vaultId: bigint
  chainId: number
  address: `0x${string}`
  delay: number
}) {
  const { data } = useMultipleVaults([vaultId], chainId)
  const vaultData = data?.[0]?.result

  if (!vaultData) {
    return (
      <div className="glass-card p-5 animate-pulse">
        <div className="h-4 rounded w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-8 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    )
  }

  type VaultResult = [string, `0x${string}`, readonly `0x${string}`[], readonly bigint[], bigint, bigint, readonly bigint[], readonly bigint[]]
  const [name, creator, payees, shares, totalDeposited, totalReleased, pendingBalances] = vaultData as VaultResult
  const myIndex = payees.findIndex((p: string) => p.toLowerCase() === address.toLowerCase())
  const isCreator = creator.toLowerCase() === address.toLowerCase()
  const myPending = myIndex >= 0 ? pendingBalances[myIndex] : 0n
  const myShare = myIndex >= 0 ? shares[myIndex] : 0n

  return (
    <GlassCard delay={delay} hoverable className="p-5">
      <Link to={`/vault/${vaultId}`} className="block">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="label-sm mb-1">Vault #{vaultId.toString()}</div>
            <h3 className="font-semibold text-lg" style={{ color: '#F5F7FA' }}>{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <span className="label-sm px-2 py-1 rounded-lg" style={{ background: 'rgba(0,82,255,0.15)', color: '#00D2FF' }}>
                CREATOR
              </span>
            )}
            <ArrowRight size={16} style={{ color: '#8A94A8' }} />
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4">
          <div className="label-sm mb-1">Vault Balance</div>
          <div className="text-2xl font-bold mono" style={{ color: '#F5F7FA' }}>
            ${formatUsdc(totalDeposited - totalReleased)}
          </div>
        </div>

        {/* Payees avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {payees.slice(0, 5).map((p, idx) => (
              <div
                key={p}
                className="w-7 h-7 rounded-full border-2 flex-shrink-0"
                style={{
                  background: addrGradient(p),
                  borderColor: '#05070D',
                  zIndex: payees.length - idx,
                }}
                title={p}
              />
            ))}
            {payees.length > 5 && (
              <div
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderColor: '#05070D',
                  color: '#8A94A8',
                }}
              >
                +{payees.length - 5}
              </div>
            )}
          </div>
          <span className="text-sm" style={{ color: '#8A94A8' }}>
            {payees.length} {payees.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* My pending */}
        {myIndex >= 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#8A94A8' }}>
                Your share ({bpToPercent(myShare)}%)
              </span>
              <span
                className="text-sm font-semibold mono"
                style={{ color: myPending > 0n ? '#2DD4A0' : '#8A94A8' }}
              >
                ${formatUsdc(myPending)} available
              </span>
            </div>
          </div>
        )}
      </Link>
    </GlassCard>
  )
}

export default function MyVaults() {
  const { address, chainId = ARC_TESTNET_ID, isConnected } = useAccount()
  const activeChain = chainId

  const { data: creatorVaultIds, isLoading: loadingCreator } = useVaultsByCreator(address, activeChain)
  const { data: payeeVaultIds, isLoading: loadingPayee } = useVaultsByPayee(address, activeChain)

  // Merge unique vault IDs
  const allIds = [
    ...new Set([...(creatorVaultIds ?? []).map(String), ...(payeeVaultIds ?? []).map(String)]),
  ].map(BigInt)

  const isLoading = loadingCreator || loadingPayee

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F7FA', letterSpacing: '-0.02em' }}>
            My Vaults
          </h1>
          <p className="text-sm" style={{ color: '#8A94A8' }}>
            Vaults where you are a creator or payee
          </p>
        </div>
        <Link to="/create" className="btn-primary px-5 text-sm flex items-center gap-2">
          <Plus size={16} />
          New Vault
        </Link>
      </div>

      {/* Testnet get USDC hint */}
      {chainId === ARC_TESTNET_ID && isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(0,82,255,0.08)',
            border: '1px solid rgba(0,82,255,0.2)',
            color: '#8A94A8',
          }}
        >
          <span>Need test USDC?</span>
          <span style={{ color: '#00D2FF' }}>Use "Get test USDC" in the Arc Studio sidebar.</span>
        </motion.div>
      )}

      {/* Not connected */}
      {!isConnected && (
        <GlassCard className="p-12 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,82,255,0.1)' }}
          >
            <Plus size={28} style={{ color: '#0052FF' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#F5F7FA' }}>Connect your wallet</h2>
          <p style={{ color: '#8A94A8' }}>Connect your wallet to view your vaults.</p>
        </GlassCard>
      )}

      {/* Loading */}
      {isConnected && isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 rounded w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-8 rounded w-1/2 mb-4" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-4 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Vault list */}
      {isConnected && !isLoading && allIds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allIds.map((id, i) => (
            <VaultCard
              key={id.toString()}
              vaultId={id}
              chainId={activeChain}
              address={address!}
              delay={i * 0.06}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isConnected && !isLoading && allIds.length === 0 && (
        <GlassCard className="p-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,82,255,0.08)' }}
          >
            <Plus size={28} style={{ color: '#0052FF' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#F5F7FA' }}>No vaults yet</h2>
          <p className="mb-6" style={{ color: '#8A94A8' }}>
            Create your first vault to start splitting USDC with your team.
          </p>
          <Link to="/create" className="btn-primary px-8 text-sm inline-flex items-center gap-2">
            <Plus size={16} />
            Create your first vault
          </Link>
        </GlassCard>
      )}
    </div>
  )
}
