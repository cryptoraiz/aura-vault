import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { motion } from 'framer-motion'
import { Shield, Vault } from 'lucide-react'
import { toast } from 'sonner'
import { erc20Abi } from 'viem'
import { AURA_VAULT_ABI, getVaultAddress } from '../vault-config'
import { useVault } from '../hooks/useAuraVault'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import TxButton, { TxState } from '../components/TxButton'
import { formatUsdc, parseUsdc, parseContractError } from '../utils/format'
import { ARC_TESTNET_ID } from '../config'

const QUICK_AMOUNTS = ['10', '50', '100']

export default function PayPage() {
  const { id } = useParams<{ id: string }>()
  const vaultId = BigInt(id ?? '0')

  // Use ARC_TESTNET_ID as fallback for public view (no wallet needed to view)
  const { address, chainId = ARC_TESTNET_ID, isConnected } = useAccount()
  const activeChain = chainId

  const contractAddress = getVaultAddress(activeChain) ?? getVaultAddress(ARC_TESTNET_ID)
  const usdcFact = getUsdc(activeChain) ?? getUsdc(ARC_TESTNET_ID)

  const { data: vaultData } = useVault(vaultId, ARC_TESTNET_ID) // always read from testnet for display

  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [txState, setTxState] = useState<TxState>('idle')

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

  const vaultName = vaultData?.[0] ?? `Vault #${id}`

  const handlePay = async () => {
    const rawAmount = parseUsdc(amount)
    if (rawAmount === 0n || !contractAddress || !usdcFact) return
    setTxState('pending')
    try {
      // Approve if needed
      if (!allowance || allowance < rawAmount) {
        await writeContractAsync({
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, rawAmount],
          chainId: activeChain,
        })
        toast.loading('Approving USDC...', { id: 'pay' })
        await new Promise((r) => setTimeout(r, 3000))
        void refetchAllowance()
      }

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AURA_VAULT_ABI,
        functionName: 'deposit',
        args: [vaultId, rawAmount, memo],
        chainId: activeChain,
      })
      setTxState('confirming')
      toast.loading('Confirming payment...', { id: 'pay' })
      await new Promise((r) => setTimeout(r, 3000))
      setTxState('success')
      toast.success(`Paid $${formatUsdc(rawAmount)} USDC!`, {
        id: 'pay',
        action: { label: 'View', onClick: () => window.open(buildTxExplorerUrl(activeChain, hash), '_blank') },
      })
      setAmount('')
      setMemo('')
    } catch (err) {
      setTxState('error')
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) toast.error(msg, { id: 'pay' })
      setTimeout(() => setTxState('idle'), 3000)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-4"
      style={{
        background: '#05070D',
        backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(0,82,255,0.2) 0%, transparent 70%)',
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-8"
        style={{ color: '#F5F7FA' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#0052FF,#00D2FF)' }}
        >
          <Vault size={17} color="white" />
        </div>
        <span className="text-xl font-bold">Aura Vault</span>
      </motion.div>

      {/* Pay card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 w-full max-w-md"
      >
        <div className="label-sm mb-2">Pay into</div>
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#F5F7FA', letterSpacing: '-0.02em' }}>
          {vaultName}
        </h1>

        {/* Quick amounts */}
        <div className="flex gap-2 mb-4">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: amount === a ? 'rgba(0,82,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: amount === a ? '#00D2FF' : '#8A94A8',
                border: `1px solid ${amount === a ? 'rgba(0,82,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: '#8A94A8' }}>$</span>
          <input
            className="input-field pl-8 text-xl font-bold mono"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ height: '56px' }}
          />
        </div>

        {/* Reference */}
        <input
          className="input-field text-sm mb-5"
          placeholder="Reference (e.g. Invoice #12)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />

        {/* Connect or Pay */}
        {!isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="btn-primary w-full text-base">
                Connect wallet to pay
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : (
          <TxButton
            state={txState}
            onClick={handlePay}
            disabled={!amount || parseUsdc(amount) === 0n}
            className="w-full text-base"
            loadingLabel="Approving USDC..."
            confirmingLabel="Confirming payment..."
          >
            Pay with USDC
          </TxButton>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 mt-6 text-sm"
        style={{ color: '#8A94A8' }}
      >
        <Shield size={14} />
        <span>Secured onchain on Arc Network</span>
      </motion.div>
    </div>
  )
}
