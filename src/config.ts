/**
 * wagmi configuration for Aura Vault
 * Supports Arc Testnet (default) and Arc Mainnet (for network toggle).
 */

import { http, createConfig } from 'wagmi'
import { arc, arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const ARC_TESTNET_ID = 5042002
export const ARC_MAINNET_ID = 5042

export const config = createConfig({
  chains: [arcTestnet, arc],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [arc.id]: http(),
  },
})
