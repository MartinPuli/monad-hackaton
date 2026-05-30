# Monad — Build Knowledge Base

Reference material for building dapps on the **Monad** blockchain, extracted for this hackathon.

Monad is a Layer-1 blockchain: high performance (high TPS, ~sub-second blocks, fast finality), true decentralization, and full **EVM compatibility** (Ethereum tooling works as-is).

## Contents

| File | What's in it |
|------|--------------|
| [`build-cheatsheet.md`](./build-cheatsheet.md) | **Start here.** Networks, chain IDs, RPCs, explorers, faucet, gotchas. |
| [`deploy-foundry.md`](./deploy-foundry.md) | Deploy + verify with Foundry (recommended). |
| [`deploy-hardhat.md`](./deploy-hardhat.md) | Deploy with Hardhat / Hardhat Ignition. |
| [`deploy-remix.md`](./deploy-remix.md) | Deploy from the browser with Remix IDE. |
| [`faucet.md`](./faucet.md) | Get testnet MON (agent API + official faucet). |
| [`ecosystem-blitz.md`](./ecosystem-blitz.md) | Blitz (devnads) ecosystem/event hub + programs. |
| [`raw/llms.txt`](./raw/llms.txt) | Official Monad docs **index** (every page, with links). |
| [`raw/llms-full.txt`](./raw/llms-full.txt) | **Full raw dump of all Monad docs** (~1.6 MB). The source of truth. |

## The raw build info

`raw/llms-full.txt` is the complete, unedited concatenation of the Monad documentation
(`https://docs.monad.xyz/llms-full.txt`). It is the canonical "raw con la info para buildear".
When something isn't covered in the curated files here, grep that file.

`raw/llms.txt` is the lighter index (`https://docs.monad.xyz/llms-full.txt`'s table of contents)
— use it to find the exact doc page (each entry links to a `.md` you can fetch directly).

## Quick facts

- **Testnet:** chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`
- **Mainnet:** chain ID `143`, RPC `https://rpc.monad.xyz`
- **EVM version:** set `evmVersion: "prague"` (needs Solidity `0.8.27+`)
- **Frontend:** `import { monadTestnet } from "viem/chains"` (don't hand-roll the chain)

See [`build-cheatsheet.md`](./build-cheatsheet.md) for the full reference.

> Source: extracted from https://docs.monad.xyz on 2026-05-30.
