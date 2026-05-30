# Monad Testnet Faucet — getting MON

You need testnet **MON** to pay gas before deploying or interacting.

## Option A — Agent faucet API (no browser)

```bash
curl -X POST https://agents.devnads.com/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"chainId": 10143, "address": "0xYOUR_ADDRESS"}'
```

Response:

```json
{ "txHash": "0x...", "amount": "1000000000000000000", "chain": "Monad Testnet" }
```

`amount` is in wei → `1000000000000000000` = **1 MON**.

## Option B — Official faucet (browser)

https://faucet.monad.xyz

Connect/enter your address and request funds. Use this if the agent API fails or is rate-limited.

> Note: the live faucet page rate-limits automated requests (HTTP 429). For agents, prefer
> Option A; for humans, use Option B in a browser.

## Generate a wallet (if you don't have one)

```bash
cast wallet new
```

⚠️ **Persist it** — save the address + private key to a secure place (e.g. a git-ignored `.env`
or `~/.monad-wallet` with `chmod 600`). You need the key to deploy, interact, and manage funds.
Never commit it.

## Chain reference

- Testnet chain ID: `10143`
- Testnet RPC: `https://testnet-rpc.monad.xyz`
