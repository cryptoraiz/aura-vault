# Aura Vault

> Built with Arc Studio - money-powered apps in minutes

Decentralized USDC vault protocol for escrow-style deposits and automatic revenue splitting. 100% onchain — no centralized database or backend. All vault data, balances and history live in the smart contract and its events.

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| AuraVault | Arc Testnet | `0xc121dcbe21f36b4605ea5e11ffdb328233c3b37b` | [View](https://explorer.testnet.arc.io/address/0xc121dcbe21f36b4605ea5e11ffdb328233c3b37b) |

**Deployment date:** 2026-10-19
**Deployer wallet:** 3c2464b2-8369-52e2-a782-800bbeca5396
**USDC (constructor arg):** 0x3600000000000000000000000000000000000000 (Arc ERC-20, 6 decimals)

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
