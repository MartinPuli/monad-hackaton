# Deploy a Smart Contract on Monad Testnet using Remix IDE

Browser-based deploy, no local toolchain. Good for quick demos.

> Source: https://docs.monad.xyz/guides/deploy-smart-contract/remix (extracted 2026-05-30)

## Prerequisites

- A wallet (e.g. MetaMask) with **Monad Testnet added**:
  - Chain ID: `10143`
  - RPC URL: `https://testnet-rpc.monad.xyz`
  - Currency symbol: `MON`
  - Explorer: `https://testnet.monadscan.com`
- Some testnet MON (see [`faucet.md`](./faucet.md)).

## Steps

### 1. Open Remix

Go to https://remix.ethereum.org/ and start a new project.

### 2. Create the contract file

In the `contracts` folder, create `Gmonad.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Gmonad {
    string public greeting;

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function setGreeting(string calldata _greeting) external {
        greeting = _greeting;
    }
}
```

### 3. Compile

- "Solidity compiler" tab → compiler version **0.8.24** → "Compile Gmonad.sol".
- Wait for the green checkmark.

### 4. Connect wallet

- "Deploy & run transactions" tab → Environment → **Injected Provider** (MetaMask).
- Approve the connection; confirm your address + MON balance appear.

### 5. Deploy

- Enter a greeting in the constructor field → click **Deploy** → confirm in wallet.
- The deployed contract appears under "Deployed Contracts".

### 6. Interact

- `greeting` (blue button) → read the stored message.
- `setGreeting` → enter new text → "transact" → confirm in wallet.
