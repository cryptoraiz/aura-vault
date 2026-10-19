/**
 * wagmi configuration for Aura Vault
 * Supports Arc Testnet (default) and Arc Mainnet (for network toggle).
 */

import { http, createConfig } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Official Arc RPC endpoints — the viem built-in chain definitions point at
// *.arc.network which is inactive; use *.arc.io instead.
export const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.io'
export const ARC_MAINNET_RPC = 'https://rpc.mainnet.arc.io'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, ARC_TESTNET_RPC)
registerChain(arc.id, ARC_MAINNET_RPC)

export const ARC_TESTNET_ID = 5042002
export const ARC_MAINNET_ID = 5042

export const config = createConfig({
  chains: [arcTestnet, arc],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(ARC_TESTNET_RPC),
    [arc.id]: http(ARC_MAINNET_RPC),
  },
})
