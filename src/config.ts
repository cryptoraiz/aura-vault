/**
 * wagmi configuration for Aura Vault
 * Arc Mainnet is the primary chain; Arc Testnet is available via the network toggle.
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
  chains: [arc, arcTestnet], // arc first → wagmi treats it as the default chain
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [arc.id]: http(),
  },
})
