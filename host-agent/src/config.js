// Shared config for the GhostRig host agent.
import { defineChain } from "viem";

// Monad testnet (chain 10143). We define it explicitly to avoid version drift,
// but viem/chains also exports `monadTestnet`.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
  testnet: true,
});

export const CONTRACT_ADDRESS =
  process.env.GHOSTRIG_ADDRESS || "0x2F9e911f380e03557Ec65F941Dba32c879172b9a";

// HOST_PRIVATE_KEY must be set in the environment (never commit it).
// This is the wallet that owns the rig and signs reportFps / closeSession.
export const HOST_PRIVATE_KEY = process.env.HOST_PRIVATE_KEY;

// Which rig this host serves (set after running register-rig.js).
export const RIG_ID = BigInt(process.env.RIG_ID ?? "0");

// Free trial — must match the contract's TRIAL_SECONDS.
export const TRIAL_SECONDS = 10;

// Minimal ABI: only what the host agent needs.
export const GHOSTRIG_ABI = [
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
    outputs: [{ name: "exhausted", type: "bool" }],
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
    name: "sessions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "client", type: "address" },
      { name: "rigId", type: "uint256" },
      { name: "deposit", type: "uint256" },
      { name: "accrued", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "open", type: "bool" },
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
];
