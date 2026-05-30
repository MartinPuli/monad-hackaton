# Monad Build Cheatsheet

Everything you need to start shipping on Monad. Monad is EVM-equivalent, so
Solidity + Foundry/Hardhat/viem/wagmi all work unchanged — you just point them at
Monad's RPC and chain ID.

## Networks

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Testnet | `10143`  | `https://testnet-rpc.monad.xyz` |
| Mainnet | `143`    | `https://rpc.monad.xyz` |

- Native token: **MON**
- Default to **testnet (10143)** for everything unless you explicitly need mainnet.
- Docs: https://docs.monad.xyz

## Explorers

| Explorer | Testnet | Mainnet |
|----------|---------|---------|
| Socialscan  | https://monad-testnet.socialscan.io | https://monad.socialscan.io |
| MonadVision | https://testnet.monadvision.com     | https://monadvision.com |
| Monadscan   | https://testnet.monadscan.com       | https://monadscan.com |

## Critical gotchas

1. **`evmVersion: "prague"`** — always set it in your compiler config. Requires **Solidity 0.8.27+**
   (the deploy templates pin `0.8.28`). Skipping this is the #1 cause of weird deploy/verify errors.
2. **Foundry:** use `forge script` for deploys, **not** `forge create` (the `--broadcast` flag on
   `forge create` is buggy and often silently ignored).
3. **Deploy scripts must not hardcode the deployer address** — read the key from `--private-key`
   (`vm.startBroadcast()` with no args). Hardcoding causes `No associated wallet` errors.
4. **Frontend:** import the chain, don't define it: `import { monadTestnet } from "viem/chains"`.

## Foundry config (`foundry.toml`)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
evm_version = "prague"
solc_version = "0.8.28"
```

## Frontend (viem + wagmi)

```ts
import { createConfig, http } from 'wagmi'
import { monadTestnet } from 'viem/chains'

const config = createConfig({
  chains: [monadTestnet],
  transports: { [monadTestnet.id]: http() },
})
```

## Funding (faucet)

Agent faucet (no browser needed):

```bash
curl -X POST https://agents.devnads.com/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"chainId": 10143, "address": "0xYOUR_ADDRESS"}'
```

Official faucet fallback: https://faucet.monad.xyz · see [`faucet.md`](./faucet.md).

## Verification (one call, all explorers)

Use the verification API (verifies on MonadVision + Socialscan + Monadscan at once):
`POST https://agents.devnads.com/v1/verify`. Details in [`deploy-foundry.md`](./deploy-foundry.md).

## What's unique about Monad (build ideas around this)

- High throughput + fast, cheap transactions → makes **fully on-chain, real-time** apps viable
  (real-time games, CLOB order books, per-second micropayments, high-frequency agent swarms).
- **EVM-equivalent**: zero relearning, port any Ethereum dApp directly.
- **Execution Events**: a low-latency stream of execution data — accelerate indexers / live UIs
  (see `raw/llms-full.txt`, "Execution Events").
- **ERC-8004 (Trustless Agents)** and **x402** endpoints are documented first-class — agent-friendly.

> For anything not here, grep [`raw/llms-full.txt`](./raw/llms-full.txt) or browse the index
> [`raw/llms.txt`](./raw/llms.txt). Source: https://docs.monad.xyz (extracted 2026-05-30).
