/**
 * Core hook for reading from the AuraVault contract.
 * All amounts are 6-decimal ERC-20 USDC bigints.
 */
import { useReadContract, useReadContracts } from 'wagmi'
import { AURA_VAULT_ABI, getVaultAddress } from '../vault-config'

export function useVaultCount(chainId: number) {
  const address = getVaultAddress(chainId)
  return useReadContract({
    address,
    abi: AURA_VAULT_ABI,
    functionName: 'vaultCount',
    chainId,
    query: { enabled: !!address },
  })
}

export function useVault(vaultId: bigint | number, chainId: number) {
  const address = getVaultAddress(chainId)
  const id = BigInt(vaultId)
  return useReadContract({
    address,
    abi: AURA_VAULT_ABI,
    functionName: 'getVault',
    args: [id],
    chainId,
    query: { enabled: !!address && id > 0n },
  })
}

export function useVaultsByCreator(creator: `0x${string}` | undefined, chainId: number) {
  const address = getVaultAddress(chainId)
  return useReadContract({
    address,
    abi: AURA_VAULT_ABI,
    functionName: 'getVaultsByCreator',
    args: creator ? [creator] : undefined,
    chainId,
    query: { enabled: !!address && !!creator },
  })
}

export function useVaultsByPayee(payee: `0x${string}` | undefined, chainId: number) {
  const address = getVaultAddress(chainId)
  return useReadContract({
    address,
    abi: AURA_VAULT_ABI,
    functionName: 'getVaultsByPayee',
    args: payee ? [payee] : undefined,
    chainId,
    query: { enabled: !!address && !!payee },
  })
}

export function usePendingBalance(
  vaultId: bigint | number,
  payee: `0x${string}` | undefined,
  chainId: number
) {
  const address = getVaultAddress(chainId)
  const id = BigInt(vaultId)
  return useReadContract({
    address,
    abi: AURA_VAULT_ABI,
    functionName: 'getPendingBalance',
    args: payee ? [id, payee] : undefined,
    chainId,
    query: { enabled: !!address && !!payee && id > 0n },
  })
}

/** Fetch multiple vaults in one call batch */
export function useMultipleVaults(vaultIds: bigint[], chainId: number) {
  const address = getVaultAddress(chainId)
  return useReadContracts({
    contracts: vaultIds.map((id) => ({
      address,
      abi: AURA_VAULT_ABI,
      functionName: 'getVault' as const,
      args: [id] as const,
      chainId,
    })),
    query: { enabled: !!address && vaultIds.length > 0 },
  })
}
