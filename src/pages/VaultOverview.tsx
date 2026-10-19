import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { erc20Abi } from 'viem'
import { AURA_VAULT_ABI, getVaultAddress } from '../vault-config'
import { useVault } from '../hooks/useAuraVault'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import GlassCard from '../components/GlassCard'
import SegmentedBar from '../components/SegmentedBar'
import RollingNumber from '../components/RollingNumber'
import TxButton, { TxState } from '../components/TxButton'
import { shortAddr, formatUsdc, parseUsdc, bpToPercent, addrGradient, memberColor, parseContractError } from '../utils/format'
import { ARC_TESTNET_ID } from '../config'

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  pendingBalances,
  payees,
  state,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  pendingBalances: readonly bigint[]
  payees: readonly `0x${string}`[]
  state: TxState
}) {
  if (!isOpen) return null
  const hasAnything = pendingBalances.some((b) => b > 0n)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F7FA' }}>{title}</h3>
        {!hasAnything ? (
          <p className="mb-4 text-sm" style={{ color: '#8A94A8' }}>
            No pending balances to distribute.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {payees.map((payee, i) => {
              const pending = pendingBalances[i] ?? 0n
              if (pending === 0n) return null
              return (
                <div key={payee} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full" style={{ background: addrGradient(payee) }} />
                    <span className="mono" style={{ color: '#8A94A8' }}>{shortAddr(payee)}</span>
                  </div>
                  <span className="font-semibold mono" style={{ color: '#2DD4A0' }}>
                    ${formatUsdc(pending)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <TxButton
            state={state}
            onClick={onConfirm}
            disabled={!hasAnything}
            className="flex-1 text-sm"
          >
            Distribute All
          </TxButton>
        </div>
      </motion.div>
    </div>
  )
}

export default function VaultOverview() {
  const { id } = useParams<{ id: string }>()
  const vaultId = BigInt(id ?? '0')
  const { address, chainId = ARC_TESTNET_ID, isConnected } = useAccount()
  const activeChain = chainId

  const contractAddress = getVaultAddress(activeChain)
  const usdcFact = getUsdc(activeChain)

  const { data: vaultData, refetch } = useVault(vaultId, activeChain)
  const [hoveredMember, setHoveredMember] = useState<number | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositMemo, setDepositMemo] = useState('')
  const [showDepositForm, setShowDepositForm] = useState(false)

  const [claimStates, setClaimStates] = useState<Record<number, TxState>>({})
  const [distributeState, setDistributeState] = useState<TxState>('idle')
  const [depositState, setDepositState] = useState<TxState>('idle')

  const { writeContractAsync } = useWriteContract()

  // USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcFact?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    chainId: activeChain,
    query: { enabled: !!address && !!contractAddress && !!usdcFact },
  })

  if (!vaultData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-6 rounded w-32 mb-6" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="glass-card p-8 h-48" />
        </div>
      </div>
    )
  }

  const [name, creator, payees, shares, totalDeposited, totalReleased, pendingBalances, releasedBalances] = vaultData as [string, `0x${string}`, readonly `0x${string}`[], readonly bigint[], bigint, bigint, readonly bigint[], readonly bigint[]]
  const vaultBalance = totalDeposited - totalReleased
  const totalPending = pendingBalances.reduce((s, b) => s + b, 0n)

  const payLink = `${window.location.origin}/pay/${vaultId}`
  const handleCopyLink = () => {
    void navigator.clipboard.writeText(payLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClaim = async (payee: `0x${string}`, index: number) => {
    if (!contractAddress) return
    setClaimStates((s) => ({ ...s, [index]: 'pending' }))
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AURA_VAULT_ABI,
        functionName: 'release',
        args: [vaultId, payee],
        chainId: activeChain,
      })
      setClaimStates((s) => ({ ...s, [index]: 'confirming' }))
      await new Promise((r) => setTimeout(r, 3000))
      setClaimStates((s) => ({ ...s, [index]: 'success' }))
      toast.success('Funds claimed!', {
        action: { label: 'Explorer', onClick: () => { window.open(buildTxExplorerUrl(activeChain, hash), '_blank') } },
      })
      void refetch()
      setTimeout(() => setClaimStates((s) => ({ ...s, [index]: 'idle' })), 3000)
    } catch (err) {
      setClaimStates((s) => ({ ...s, [index]: 'error' }))
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) toast.error(msg)
      setTimeout(() => setClaimStates((s) => ({ ...s, [index]: 'idle' })), 3000)
    }
  }

  const handleDistribute = async () => {
    if (!contractAddress) return
    setDistributeState('pending')
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AURA_VAULT_ABI,
        functionName: 'distributeAll',
        args: [vaultId],
        chainId: activeChain,
      })
      setDistributeState('confirming')
      await new Promise((r) => setTimeout(r, 3000))
      setDistributeState('success')
      toast.success('Distributed to all payees!', {
        action: { label: 'Explorer', onClick: () => { window.open(buildTxExplorerUrl(activeChain, hash), '_blank') } },
      })
      void refetch()
      setShowModal(false)
      setTimeout(() => setDistributeState('idle'), 3000)
    } catch (err) {
      setDistributeState('error')
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) toast.error(msg)
      setTimeout(() => setDistributeState('idle'), 3000)
    }
  }

  const handleDeposit = async () => {
    if (!contractAddress || !usdcFact) return
    const amount = parseUsdc(depositAmount)
    if (amount === 0n) return
    setDepositState('pending')
    try {
      // Check allowance; if needed, approve first
      if (!allowance || allowance < amount) {
        await writeContractAsync({
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, amount],
          chainId: activeChain,
        })
        toast.loading('Approving USDC...', { id: 'deposit' })
        await new Promise((r) => setTimeout(r, 3000))
        void refetchAllowance()
      }

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AURA_VAULT_ABI,
        functionName: 'deposit',
        args: [vaultId, amount, depositMemo],
        chainId: activeChain,
      })
      setDepositState('confirming')
      toast.loading('Confirming deposit...', { id: 'deposit' })
      await new Promise((r) => setTimeout(r, 3000))
      setDepositState('success')
      toast.success(`Deposited $${formatUsdc(amount)} USDC`, {
        id: 'deposit',
        action: { label: 'Explorer', onClick: () => { window.open(buildTxExplorerUrl(activeChain, hash), '_blank') } },
      })
      setDepositAmount('')
      setDepositMemo('')
      setShowDepositForm(false)
      void refetch()
      setTimeout(() => setDepositState('idle'), 3000)
    } catch (err) {
      setDepositState('error')
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) toast.error(msg, { id: 'deposit' })
      setTimeout(() => setDepositState('idle'), 3000)
    }
  }

  const segments = payees.map((p, i) => ({ bp: Number(shares[i]), label: shortAddr(p) }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: '#8A94A8' }}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-sm font-medium" style={{ color: '#F5F7FA' }}>{name}</span>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all"
          style={{
            background: 'rgba(0,82,255,0.1)',
            color: '#00D2FF',
            border: '1px solid rgba(0,82,255,0.2)',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy payment link'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Hero card */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="label-sm mb-2">VAULT BALANCE</div>
          <div className="mb-6">
            <RollingNumber
              value={parseFloat(formatUsdc(vaultBalance).replace(/,/g, ''))}
              prefix="$"
              suffix=" USDC"
              decimals={2}
              className="text-5xl font-bold"
              duration={500}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="label-sm mb-1">Pending</div>
              <div className="text-lg font-semibold mono" style={{ color: '#2DD4A0' }}>
                ${formatUsdc(totalPending)}
              </div>
            </div>
            <div>
              <div className="label-sm mb-1">Distributed</div>
              <div className="text-lg font-semibold mono" style={{ color: '#F5F7FA' }}>
                ${formatUsdc(totalReleased)}
              </div>
            </div>
            <div>
              <div className="label-sm mb-1">Total In</div>
              <div className="text-lg font-semibold mono" style={{ color: '#F5F7FA' }}>
                ${formatUsdc(totalDeposited)}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Actions card */}
        <GlassCard className="p-5 flex flex-col gap-3" delay={0.06}>
          <div className="label-sm mb-1">Actions</div>

          {/* Deposit */}
          <AnimatePresence>
            {showDepositForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8A94A8' }}>$</span>
                  <input
                    className="input-field pl-7 text-sm"
                    placeholder="Amount USDC"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <input
                  className="input-field text-sm"
                  placeholder="Reference (optional)"
                  value={depositMemo}
                  onChange={(e) => setDepositMemo(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDepositForm(false)}
                    className="btn-secondary flex-1 text-sm"
                    style={{ minHeight: 40 }}
                  >
                    Cancel
                  </button>
                  <TxButton
                    state={depositState}
                    onClick={handleDeposit}
                    disabled={!depositAmount || !isConnected}
                    className="flex-1 text-sm"
                    loadingLabel="Approving..."
                    confirmingLabel="Depositing..."
                  >
                    Deposit
                  </TxButton>
                </div>
              </motion.div>
            ) : (
              <button
                className="btn-primary w-full text-sm"
                onClick={() => setShowDepositForm(true)}
              >
                Deposit USDC
              </button>
            )}
          </AnimatePresence>

          <button
            className="btn-secondary w-full text-sm"
            onClick={() => setShowModal(true)}
          >
            Distribute All Funds
          </button>

          <div
            className="text-xs mt-2"
            style={{ color: '#8A94A8' }}
          >
            <span className="mono" style={{ color: '#8A94A8' }}>Creator: </span>
            <span className="mono">{shortAddr(creator)}</span>
          </div>
        </GlassCard>
      </div>

      {/* Split bar */}
      <GlassCard className="p-5 mb-5" delay={0.08}>
        <div className="label-sm mb-3">Revenue Split</div>
        <SegmentedBar
          segments={segments}
          hoveredIndex={hoveredMember}
          onHover={setHoveredMember}
        />
        <div className="flex flex-wrap gap-3 mt-3">
          {payees.map((p, i) => (
            <div
              key={p}
              className="flex items-center gap-1.5 text-xs"
              style={{ opacity: hoveredMember === undefined || hoveredMember === i ? 1 : 0.4 }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: memberColor(i) }} />
              <span className="mono" style={{ color: '#8A94A8' }}>{shortAddr(p)}</span>
              <span className="font-semibold" style={{ color: '#F5F7FA' }}>{bpToPercent(shares[i])}%</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Members table / cards */}
      <GlassCard className="p-5" delay={0.1}>
        <div className="label-sm mb-4">Members</div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="label-sm pb-3 pr-4">Member</th>
                <th className="label-sm pb-3 pr-4">Share</th>
                <th className="label-sm pb-3 pr-4">Withdrawn</th>
                <th className="label-sm pb-3 pr-4" style={{ color: '#2DD4A0' }}>Available</th>
                <th className="label-sm pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {payees.map((payee, i) => {
                const isMe = address?.toLowerCase() === payee.toLowerCase()
                const pending = pendingBalances[i] ?? 0n
                const released = releasedBalances[i] ?? 0n
                const claimState = claimStates[i] ?? 'idle'
                const isHovered = hoveredMember === i

                return (
                  <tr
                    key={payee}
                    className="transition-colors"
                    style={{
                      background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={() => setHoveredMember(i)}
                    onMouseLeave={() => setHoveredMember(undefined)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0"
                          style={{ background: addrGradient(payee) }}
                        />
                        <div>
                          <span className="mono text-sm" style={{ color: '#F5F7FA' }}>{shortAddr(payee)}</span>
                          {isMe && (
                            <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,82,255,0.15)', color: '#00D2FF' }}>
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mono text-sm font-medium" style={{ color: '#F5F7FA' }}>
                        {bpToPercent(shares[i])}%
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mono text-sm" style={{ color: '#8A94A8' }}>
                        ${formatUsdc(released)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mono text-sm font-semibold" style={{ color: pending > 0n ? '#2DD4A0' : '#8A94A8' }}>
                        ${formatUsdc(pending)}
                      </span>
                    </td>
                    <td className="py-3">
                      {isMe ? (
                        <TxButton
                          state={claimState}
                          onClick={() => handleClaim(payee, i)}
                          disabled={pending === 0n}
                          variant="secondary"
                          className="text-xs px-4"
                          style={{ minHeight: '36px' }}
                        >
                          Claim
                        </TxButton>
                      ) : (
                        <button
                          disabled
                          title="Only the payee can withdraw"
                          className="text-xs px-4 rounded-xl opacity-30 cursor-not-allowed"
                          style={{
                            minHeight: '36px',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#8A94A8',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          Claim
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {payees.map((payee, i) => {
            const isMe = address?.toLowerCase() === payee.toLowerCase()
            const pending = pendingBalances[i] ?? 0n
            const released = releasedBalances[i] ?? 0n
            const claimState = claimStates[i] ?? 'idle'

            return (
              <div
                key={payee}
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full" style={{ background: addrGradient(payee) }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-sm font-medium" style={{ color: '#F5F7FA' }}>{shortAddr(payee)}</span>
                      {isMe && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,82,255,0.15)', color: '#00D2FF' }}>
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs mono" style={{ color: '#8A94A8' }}>
                      {bpToPercent(shares[i])}% share
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="label-sm mb-0.5">Withdrawn</div>
                    <div className="text-sm mono" style={{ color: '#8A94A8' }}>${formatUsdc(released)}</div>
                  </div>
                  <div>
                    <div className="label-sm mb-0.5" style={{ color: '#2DD4A0' }}>Available</div>
                    <div className="text-sm mono font-semibold" style={{ color: pending > 0n ? '#2DD4A0' : '#8A94A8' }}>
                      ${formatUsdc(pending)}
                    </div>
                  </div>
                </div>
                {isMe ? (
                  <TxButton
                    state={claimState}
                    onClick={() => handleClaim(payee, i)}
                    disabled={pending === 0n}
                    variant="secondary"
                    className="w-full text-sm"
                  >
                    Claim
                  </TxButton>
                ) : (
                  <button
                    disabled
                    className="w-full text-sm rounded-xl py-3 opacity-30 cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#8A94A8', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    Only payee can withdraw
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Distribute modal */}
      <AnimatePresence>
        {showModal && (
          <ConfirmModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleDistribute}
            title="Distribute All Funds"
            pendingBalances={pendingBalances}
            payees={payees}
            state={distributeState}
          />
        )}
      </AnimatePresence>

      {/* Mobile fixed action bar */}
      <div
        className="md:hidden fixed bottom-16 inset-x-0 flex gap-2 p-3 z-30"
        style={{
          background: 'rgba(5,7,13,0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          className="btn-primary flex-1 text-sm"
          onClick={() => setShowDepositForm(!showDepositForm)}
        >
          Deposit
        </button>
        <button
          className="btn-secondary flex-1 text-sm"
          onClick={() => setShowModal(true)}
        >
          Distribute
        </button>
      </div>
    </div>
  )
}
