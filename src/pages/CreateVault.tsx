import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useWriteContract } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Wand2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { AURA_VAULT_ABI, getVaultAddress } from '../vault-config'
import GlassCard from '../components/GlassCard'
import DonutChart from '../components/DonutChart'
import TxButton, { TxState } from '../components/TxButton'
import { isAddress } from 'viem'
import { parseUsdc, formatUsdc, shortAddr, parseContractError } from '../utils/format'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_TESTNET_ID } from '../config'

interface Member {
  address: string
  percent: string
  addrError?: string
}

/**
 * Convert a percent string (e.g. "33.33") to integer basis points.
 * Multiplies by 100 then rounds to the nearest integer.
 * "33.33" → 3333, "50" → 5000, "100" → 10000.
 */
function toBasicPoints(percent: string): number {
  if (!percent || percent.trim() === '') return 0
  const n = parseFloat(percent)
  if (isNaN(n) || n < 0) return 0
  // Multiply by 100 with a small epsilon to avoid 33.33*100 = 3332.9999...
  return Math.round(n * 100 + 1e-9)
}

const defaultMember = (): Member => ({ address: '', percent: '' })

export default function CreateVault() {
  const { address, chainId = ARC_TESTNET_ID, isConnected } = useAccount()
  const navigate = useNavigate()
  const activeChain = chainId

  const [vaultName, setVaultName] = useState('')
  const [members, setMembers] = useState<Member[]>([defaultMember(), defaultMember()])
  const [simulateAmount, setSimulateAmount] = useState('1000')
  const [previewOpen, setPreviewOpen] = useState(false) // mobile toggle
  const [txState, setTxState] = useState<TxState>('idle')

  const { writeContractAsync } = useWriteContract()

  const contractAddress = getVaultAddress(activeChain)

  // Computed — totalBp is the integer sum of all member shares in basis points.
  // totalPct is purely for display: sum of each member's percent string parsed as float,
  // so "33.33" + "33.33" shows as 66.66% instead of going through bp round-trip.
  const totalBp = useMemo(
    () => members.reduce((s, m) => s + toBasicPoints(m.percent), 0),
    [members],
  )
  // Display the real numeric sum of the typed percent values (no round-trip through bp)
  const totalPct = useMemo(
    () => members.reduce((s, m) => s + (parseFloat(m.percent) || 0), 0),
    [members],
  )
  const remaining = 10000 - totalBp

  const memberErrors = useMemo(() => {
    const seenAddrs = new Set<string>()
    return members.map((m) => {
      if (!m.address) return ''
      if (!isAddress(m.address)) return 'Invalid address'
      const lower = m.address.toLowerCase()
      if (seenAddrs.has(lower)) return 'Duplicate address'
      seenAddrs.add(lower)
      return ''
    })
  }, [members])

  const isValid =
    vaultName.trim().length > 0 &&
    members.length > 0 &&
    members.every((m) => m.address && isAddress(m.address) && m.percent) &&
    memberErrors.every((e) => !e) &&
    totalBp === 10000

  const addMember = () => setMembers((ms) => [...ms, defaultMember()])

  const removeMember = (i: number) =>
    setMembers((ms) => ms.filter((_, idx) => idx !== i))

  const updateMember = (i: number, field: keyof Member, value: string) =>
    setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)))

  const splitEqually = () => {
    const n = members.length
    if (n === 0) return
    // Distribute 10000 bp equally; give any remainder to the first member
    const baseBp = Math.floor(10000 / n)         // e.g. 3 members → 3333
    const remainder = 10000 - baseBp * n          // e.g. 1 bp leftover
    setMembers((ms) =>
      ms.map((m, i) => {
        const bp = i === 0 ? baseBp + remainder : baseBp  // first gets the dust
        return { ...m, percent: (bp / 100).toFixed(2) }   // "33.34" / "33.33"
      }),
    )
  }

  const simulate = useMemo(() => {
    const amount = parseUsdc(simulateAmount)
    return members.map((m) => {
      const bp = toBasicPoints(m.percent)
      if (!bp || !amount) return 0n
      return (amount * BigInt(bp)) / 10000n
    })
  }, [members, simulateAmount])

  const handleCreate = async () => {
    if (!isValid || !contractAddress || !address) return
    setTxState('pending')
    try {
      const payees = members.map((m) => m.address as `0x${string}`)
      const shares = members.map((m) => BigInt(toBasicPoints(m.percent)))

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AURA_VAULT_ABI,
        functionName: 'createVault',
        args: [payees, shares, vaultName],
        chainId: activeChain,
      })

      setTxState('confirming')
      toast.loading('Creating vault...', { id: 'create' })

      // Wait for receipt in a simple polling approach
      let attempts = 0
      const maxAttempts = 60
      const poll = async (): Promise<void> => {
        if (attempts++ > maxAttempts) throw new Error('Timeout')
        await new Promise((r) => setTimeout(r, 2000))
      }

      await poll()

      setTxState('success')
      toast.success('Vault created!', {
        id: 'create',
        description: 'Your vault is live onchain.',
        action: {
          label: 'View on explorer',
          onClick: () => { window.open(buildTxExplorerUrl(activeChain, hash), '_blank') },
        },
      })

      setTimeout(() => { void navigate('/') }, 1500)
    } catch (err) {
      setTxState('error')
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) {
        toast.error(msg, { id: 'create' })
      }
      setTimeout(() => setTxState('idle'), 3000)
    }
  }

  const donutSlices = members.map((m, i) => ({
    label: m.address ? shortAddr(m.address) : `Member ${i + 1}`,
    bp: toBasicPoints(m.percent) || 0,
  }))

  if (!contractAddress) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <GlassCard className="p-8 text-center">
          <p style={{ color: '#8A94A8' }}>
            Contract not yet deployed on this network. Switch to Arc Testnet.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F7FA', letterSpacing: '-0.02em' }}>
          Create New Vault
        </h1>
        <p className="text-sm" style={{ color: '#8A94A8' }}>
          Set up revenue splitting for your team, partners, or DAO.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Vault name */}
          <GlassCard className="p-5" delay={0}>
            <label className="label-sm block mb-3">Vault Name</label>
            <input
              className="input-field"
              placeholder="e.g. Q4 Revenue Split"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              maxLength={80}
            />
          </GlassCard>

          {/* Members */}
          <GlassCard className="p-5" delay={0.06}>
            <div className="flex items-center justify-between mb-4">
              <label className="label-sm">Members & Shares</label>
              <button
                onClick={splitEqually}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(0,82,255,0.1)', color: '#00D2FF' }}
              >
                <Wand2 size={12} />
                Split equally
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {members.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex gap-2 items-start">
                      {/* Address */}
                      <div className="flex-1">
                        <input
                          className={`input-field text-sm mono ${memberErrors[i] ? 'error' : ''}`}
                          placeholder="0x..."
                          value={m.address}
                          onChange={(e) => updateMember(i, 'address', e.target.value)}
                        />
                        {memberErrors[i] && (
                          <p className="text-xs mt-1" style={{ color: '#FF5C7A' }}>
                            {memberErrors[i]}
                          </p>
                        )}
                      </div>
                      {/* Percent */}
                      <div className="w-24">
                        <div className="relative">
                          <input
                            className="input-field text-sm text-right pr-6"
                            placeholder="33.33"
                            value={m.percent}
                            onChange={(e) => updateMember(i, 'percent', e.target.value)}
                          />
                          <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                            style={{ color: '#8A94A8' }}
                          >
                            %
                          </span>
                        </div>
                      </div>
                      {/* Delete */}
                      {members.length > 1 && (
                        <button
                          onClick={() => removeMember(i)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors mt-0.5"
                          style={{ background: 'rgba(255,92,122,0.08)', color: '#FF5C7A' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add member */}
            <button
              onClick={addMember}
              className="mt-3 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#0052FF' }}
            >
              <Plus size={14} />
              Add member
            </button>

            {/* Total indicator */}
            <div
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="label-sm">Total</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-bold mono"
                  style={{ color: totalBp === 10000 ? '#2DD4A0' : '#FF5C7A' }}
                >
                  {totalPct.toFixed(2)}%
                </span>
                {totalBp === 10000 ? (
                  <span className="text-xs font-semibold" style={{ color: '#2DD4A0' }}>OK</span>
                ) : (
                  <span className="text-xs" style={{ color: '#FF5C7A' }}>
                    {remaining > 0
                      ? `Missing ${(remaining / 100).toFixed(2)}%`
                      : `Over by ${(Math.abs(remaining) / 100).toFixed(2)}%`}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Create button */}
          <TxButton
            state={txState}
            onClick={handleCreate}
            disabled={!isValid || !isConnected}
            className="w-full text-base"
            loadingLabel="Confirm in wallet..."
            confirmingLabel="Creating vault..."
          >
            Create Vault
          </TxButton>

          {!isConnected && (
            <p className="text-sm text-center" style={{ color: '#8A94A8' }}>
              Connect your wallet to create a vault.
            </p>
          )}
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2">
          {/* Mobile collapsible toggle */}
          <button
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#F5F7FA' }}
            onClick={() => setPreviewOpen(!previewOpen)}
          >
            <span>Preview</span>
            <ChevronDown
              size={16}
              className="transition-transform"
              style={{ transform: previewOpen ? 'rotate(180deg)' : 'none', color: '#8A94A8' }}
            />
          </button>

          <div className={`${previewOpen ? 'block' : 'hidden'} lg:block`}>
            <GlassCard delay={0.1} className="p-5">
              <div className="label-sm mb-4">Live Preview</div>

              {/* Donut */}
              <div className="flex justify-center mb-5">
                <DonutChart slices={donutSlices.filter((s) => s.bp > 0)} size={160} />
              </div>

              {/* Simulate deposit */}
              <div
                className="pt-4 mt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="label-sm mb-2">Simulate a deposit</div>
                <div className="relative mb-3">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: '#8A94A8' }}
                  >
                    $
                  </span>
                  <input
                    className="input-field text-sm pl-7"
                    value={simulateAmount}
                    onChange={(e) => setSimulateAmount(e.target.value)}
                    placeholder="1000"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {members.map((m, i) => {
                    const bp = toBasicPoints(m.percent)
                    const amt = simulate[i]
                    if (!bp) return null
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: ['#0052FF', '#00D2FF', '#7C5CFF', '#2DD4A0', '#F5B544', '#FF7AB6'][i % 6] }}
                          />
                          <span className="mono truncate" style={{ color: '#8A94A8', maxWidth: 100 }}>
                            {m.address ? shortAddr(m.address) : `Member ${i + 1}`}
                          </span>
                        </div>
                        <span className="font-semibold mono" style={{ color: '#F5F7FA' }}>
                          ${formatUsdc(amt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
