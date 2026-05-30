// GhostRig contract interface — kept in sync with /interface.md (the agreed ABI).
// While Dev A finishes the real contract, the frontend runs against a mock (see useGhostRigMock).
// When WB3 delivers the deployed address, set NEXT_PUBLIC_GHOSTRIG_ADDRESS and flip MOCK off.

import type { Abi, Address } from "viem";

// Deployed & verified GhostRig on Monad testnet. Defaults to the live contract so the
// app is connected for real out of the box (env var can override for a redeploy).
export const GHOSTRIG_ADDRESS = (process.env.NEXT_PUBLIC_GHOSTRIG_ADDRESS ??
  "0x2F9e911f380e03557Ec65F941Dba32c879172b9a") as Address;

/** Free trial before billing starts. Must match the contract's TRIAL_SECONDS. */
export const TRIAL_SECONDS = 10;

/** Monad testnet explorer — base for linking a settlement tx by hash. */
export const EXPLORER_TX = "https://monad-testnet.socialscan.io/tx/";

/** True until Dev A's contract is deployed and the address is configured. */
export const MOCK = !GHOSTRIG_ADDRESS;

// ABI matches the DEPLOYED & VERIFIED contract (0x2F9e...172b9a). Source of truth:
// web/abi/GhostRig.json. Notes for wiring page.tsx in live mode:
//   - reads use the auto-generated getters `sessions(id)` and `rigs(id)` (NOT getSession/getRig)
//   - `sessions(id)` returns: client, rigId, deposit, accrued, pricePerFps, startTime, open
//   - `rigs(id)` returns: host, pricePerFps, active
//   - after closeSession, each party calls `withdraw()` to pull their funds (pull-payment)
//   - there is no clientTimeout; closing is closeSession (callable by client or host)
export const ghostRigAbi = [
  // --- host ---
  {
    type: "function",
    name: "registerRig",
    stateMutability: "nonpayable",
    inputs: [{ name: "pricePerFps", type: "uint256" }],
    outputs: [{ name: "rigId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rigId", type: "uint256" },
      { name: "pricePerFps", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rigId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reportFps",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "fps", type: "uint256" },
    ],
    outputs: [{ name: "exhausted", type: "bool" }],
  },
  // --- client ---
  {
    type: "function",
    name: "openSession",
    stateMutability: "payable",
    inputs: [{ name: "rigId", type: "uint256" }],
    outputs: [{ name: "sessionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "closeSession",
    stateMutability: "nonpayable",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [],
  },
  // --- pull-payment ---
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pendingWithdrawals",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // --- views (auto-generated getters) ---
  {
    type: "function",
    name: "sessions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "client", type: "address" },
      { name: "rigId", type: "uint256" },
      { name: "deposit", type: "uint256" },
      { name: "accrued", type: "uint256" },
      { name: "pricePerFps", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "open", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "rigs",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "pricePerFps", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isBillable",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "sessionCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rigCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "TRIAL_SECONDS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // --- events ---
  {
    type: "event",
    name: "RigRegistered",
    inputs: [
      { name: "rigId", type: "uint256", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "pricePerFps", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SessionOpened",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "rigId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "deposit", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FpsReported",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "fps", type: "uint256", indexed: false },
      { name: "accrued", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SessionClosed",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "paidToHost", type: "uint256", indexed: false },
      { name: "refundedToClient", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;
