/**
 * AuraVault contract configuration.
 * The address is populated after deployment.
 * Import the ABI from the Foundry artifact.
 */

// Will be populated after deploy — imported dynamically to avoid import errors before build
export const AURA_VAULT_ADDRESS_TESTNET = '0xc121dcbe21f36b4605ea5e11ffdb328233c3b37b' as `0x${string}`
export const AURA_VAULT_ADDRESS_MAINNET = '' as `0x${string}` // set after mainnet deploy

export const AURA_VAULT_ABI = [
  // createVault
  {
    type: 'function',
    name: 'createVault',
    inputs: [
      { name: 'payees', type: 'address[]' },
      { name: 'shares', type: 'uint256[]' },
      { name: 'vaultName', type: 'string' },
    ],
    outputs: [{ name: 'vaultId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // deposit
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'vaultId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // release
  {
    type: 'function',
    name: 'release',
    inputs: [
      { name: 'vaultId', type: 'uint256' },
      { name: 'payee', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // distributeAll
  {
    type: 'function',
    name: 'distributeAll',
    inputs: [{ name: 'vaultId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // getPendingBalance
  {
    type: 'function',
    name: 'getPendingBalance',
    inputs: [
      { name: 'vaultId', type: 'uint256' },
      { name: 'payee', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // getVault
  {
    type: 'function',
    name: 'getVault',
    inputs: [{ name: 'vaultId', type: 'uint256' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'creator', type: 'address' },
      { name: 'payees', type: 'address[]' },
      { name: 'shares', type: 'uint256[]' },
      { name: 'totalDeposited', type: 'uint256' },
      { name: 'totalReleased', type: 'uint256' },
      { name: 'pendingBalances', type: 'uint256[]' },
      { name: 'releasedBalances', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  // getVaultsByCreator
  {
    type: 'function',
    name: 'getVaultsByCreator',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  // getVaultsByPayee
  {
    type: 'function',
    name: 'getVaultsByPayee',
    inputs: [{ name: 'payee', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  // vaultCount
  {
    type: 'function',
    name: 'vaultCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // getPayeeShare
  {
    type: 'function',
    name: 'getPayeeShare',
    inputs: [
      { name: 'vaultId', type: 'uint256' },
      { name: 'payee', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // usdcAddress
  {
    type: 'function',
    name: 'usdcAddress',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // MAX_PAYEES
  {
    type: 'function',
    name: 'MAX_PAYEES',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event',
    name: 'VaultCreated',
    inputs: [
      { name: 'vaultId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'payees', type: 'address[]', indexed: false },
      { name: 'shares', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DepositReceived',
    inputs: [
      { name: 'vaultId', type: 'uint256', indexed: true },
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'memo', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PaymentReleased',
    inputs: [
      { name: 'vaultId', type: 'uint256', indexed: true },
      { name: 'payee', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  // Errors
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'EmptyPayeeList', inputs: [] },
  { type: 'error', name: 'ArrayLengthMismatch', inputs: [] },
  { type: 'error', name: 'InvalidShare', inputs: [] },
  { type: 'error', name: 'DuplicatePayee', inputs: [] },
  { type: 'error', name: 'InvalidSharesTotal', inputs: [] },
  { type: 'error', name: 'InvalidVaultId', inputs: [] },
  { type: 'error', name: 'NotAPayee', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'NothingToRelease', inputs: [] },
  { type: 'error', name: 'NothingToDistribute', inputs: [] },
  { type: 'error', name: 'EmptyVaultName', inputs: [] },
  { type: 'error', name: 'TooManyPayees', inputs: [] },
] as const

export function getVaultAddress(chainId: number): `0x${string}` | undefined {
  if (chainId === 5042002) return AURA_VAULT_ADDRESS_TESTNET || undefined
  if (chainId === 5042) return AURA_VAULT_ADDRESS_MAINNET || undefined
  return undefined
}
