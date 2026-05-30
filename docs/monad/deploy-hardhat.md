# Deploy a Smart Contract to Monad with Hardhat

> Source: https://docs.monad.xyz/guides/deploy-smart-contract/hardhat (extracted 2026-05-30)

## Prerequisites

- **Node.js v18.0.0+** (Windows: use WSL 2).

## Critical config

Set `evmVersion: "prague"` in the Solidity compiler settings:

```ts
solidity: {
  version: "0.8.28",
  settings: {
    evmVersion: "prague",
  },
},
```

## Steps

### 1. Clone the template

```bash
git clone https://github.com/monad-developers/hardhat-monad.git
cd hardhat-monad
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PRIVATE_KEY=your_private_key_here
```

> ⚠️ Never commit your private key, share it in public repos, or expose it client-side.

### 4. Deploy (Hardhat Ignition)

**Testnet:**

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts --network monadTestnet
```

**Mainnet:**

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts --network monadMainnet
```

## Network reference

| Network | Chain ID | RPC |
|---------|----------|-----|
| Testnet | 10143 | https://testnet-rpc.monad.xyz |
| Mainnet | 143   | https://rpc.monad.xyz |

## Verify

See https://docs.monad.xyz/guides/verify-smart-contract/hardhat
(also captured in [`raw/llms-full.txt`](./raw/llms-full.txt)).
