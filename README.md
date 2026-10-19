# Aura Vault

A decentralized USDC vault protocol for escrow-style deposits and automatic revenue splitting — built on Arc, Circle's L1 blockchain where USDC is the native gas token.

---

## What It Does

Aura Vault lets anyone create a shared payment vault with a list of payees and their percentage shares. Clients or partners deposit USDC into the vault; each payee can withdraw their share at any time via a pull-payment model. No intermediaries, no databases, no backend storage.

**Use cases:** Web3 teams splitting revenue, DAO treasury distributions, freelancer invoice pools, partner agreements.

---

## Architecture: 100% Onchain

All vault data, balances, and history live exclusively in the smart contract and its events. There is no centralized database, no server-side storage, and no session state. The app rebuilds all state from:

- **Contract reads** (`getVault`, `getPendingBalance`, `getVaultsByCreator`, `getVaultsByPayee`) for live balances
- **Contract events** (`VaultCreated`, `DepositReceived`, `PaymentReleased`) for activity history

This means history survives cache clearing and device changes — it is always readable from any device connected to the same network.

---

## Smart Contract: AuraVault.sol

Deployed on **Arc Testnet**: [`0xc121dcbe21f36b4605ea5e11ffdb328233c3b37b`](https://explorer.testnet.arc.io/address/0xc121dcbe21f36b4605ea5e11ffdb328233c3b37b)

### Key Design Decisions

- **Pull-payment model**: Inspired by OpenZeppelin's PaymentSplitter. The contract tracks `totalDeposited` and `released[payee]` per vault. Pending balance = `totalDeposited × share / 10000 − released[payee]`.
- **Basis points for shares**: Shares use basis points (10000 = 100%) to support decimals like 33.33% (3333 bp).
- **USDC ERC-20 only**: All amounts use the 6-decimal USDC ERC-20 view (`0x3600000000000000000000000000000000000000` on Arc). The 18-decimal native view is never used for vault accounting.
- **Max 50 payees per vault**: Bounds the gas cost of `distributeAll`.
- **Fault-tolerant `distributeAll`**: Uses a low-level call per payee. If one payee's transfer fails (e.g. blocklisted), that payee is skipped and the rest receive their funds. Use `release(vaultId, payee)` as the fallback for any skipped payee.
- **ReentrancyGuard + SafeERC20**: All state changes happen before external calls (checks-effects-interactions).

### Functions

| Function | Description |
|---|---|
| `createVault(payees, shares, vaultName)` | Creates a vault; shares must sum to 10000 bp |
| `deposit(vaultId, amount, memo)` | Pulls USDC from sender into the vault |
| `release(vaultId, payee)` | Sends a single payee's pending USDC to them |
| `distributeAll(vaultId)` | Releases pending USDC to all payees in one tx |
| `getPendingBalance(vaultId, payee)` | View: pending USDC for a payee |
| `getVault(vaultId)` | View: full vault data including per-payee balances |
| `getVaultsByCreator(address)` | View: vault IDs created by an address |
| `getVaultsByPayee(address)` | View: vault IDs where address is a payee |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Arc Testnet (Chain ID 5042002), Arc Mainnet (5042) |
| Smart contract | Solidity 0.8.28, Foundry, OpenZeppelin 5.1.0 |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3 |
| Web3 | wagmi v2, viem v2, ConnectKit |
| State | All live state from contract reads/events — no Redux, no API |
| Fonts | DM Sans, JetBrains Mono |
| Animations | Framer Motion |

---

## How to Run

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# Build the contract
bun run contracts:build

# Run contract tests (61 tests)
bun run contracts:test
```

Navigate to `http://localhost:5173`. Connect an injected wallet (MetaMask or Rabby). Use the "Get test USDC" button in Arc Studio's sidebar to fund your wallet on Arc Testnet.

---

## Screens

| Route | Description |
|---|---|
| `/` | My Vaults — vaults where you are creator or payee |
| `/vault/:id` | Vault Overview — balances, members table, deposit/distribute |
| `/create` | Create New Vault — live preview with donut chart |
| `/activity` | Activity — onchain event feed with filters |
| `/pay/:id` | Public Pay Page — share with anyone to receive USDC |

---

## Network Toggle

The top bar includes a Testnet / Mainnet toggle. Testnet is the default for development. The contract is only deployed on Arc Testnet; switching to mainnet shows an appropriate message until a mainnet deployment is made.

A yellow banner appears if your wallet is connected to a different network, with a one-click "Switch to Arc" button.

---

## Roadmap

Aura Vault is a foundation. Planned extensions:

### Milestone-Based Escrow with Refunds
Vaults with time-locked milestones where a depositor can reclaim unreleased funds if conditions are not met. Combines the pull-payment model with a time-bounded escrow mechanism.

### ERC-20 Multi-Token Support
Accept deposits in any ERC-20 (USDT, WETH, etc.) alongside USDC. The contract would track per-token `totalDeposited` and `released` mappings and support token-specific `release` calls.

### Aura Payments (Sister Product)
A lightweight, single-recipient payment request protocol. Generate a shareable invoice link with a fixed USDC amount, optional deadline, and memo. Built on the same 100% onchain, no-database philosophy.

---

## Security Notes

- The contract has been reviewed at the `balanced` severity level (Critical + High findings) and all findings were addressed before deployment.
- **This is not a substitute for a paid professional audit.** Use on mainnet only after an independent audit.
- The platform deployer wallet owns no special privileges — `AuraVault` has no `owner` or admin role.
