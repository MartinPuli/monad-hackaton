// GhostRig contract interface — kept in sync with /interface.md (the agreed ABI).
// While Dev A finishes the real contract, the frontend runs against a mock (see useGhostRigMock).
// When WB3 delivers the deployed address, set NEXT_PUBLIC_GHOSTRIG_ADDRESS and flip MOCK off.

import type { Abi, Address } from "viem";

export const GHOSTRIG_ADDRESS = (process.env.NEXT_PUBLIC_GHOSTRIG_ADDRESS ?? "") as Address | "";

/** Free trial before billing starts. Must match the contract's TRIAL_SECONDS. */
export const TRIAL_SECONDS = 10;

/** True until Dev A's contract is deployed and the address is configured. */
export const MOCK = !GHOSTRIG_ADDRESS;

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
    name: "reportFps",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "fps", type: "uint256" },
    ],
    outputs: [],
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
  {
    type: "function",
    name: "clientTimeout",
    stateMutability: "nonpayable",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [],
  },
  // --- views ---
  {
    type: "function",
    name: "getSession",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [
      { name: "client", type: "address" },
      { name: "rigId", type: "uint256" },
      { name: "deposit", type: "uint256" },
      { name: "accrued", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "lastReport", type: "uint256" },
      { name: "open", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getRig",
    stateMutability: "view",
    inputs: [{ name: "rigId", type: "uint256" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "pricePerFps", type: "uint256" },
      { name: "active", type: "bool" },
    ],
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
      { name: "refundToClient", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;
