// One-time: register this host's rig and print the rigId.
// Usage: HOST_PRIVATE_KEY=0x... PRICE_PER_FPS=16666666666666 node src/register-rig.js
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  monadTestnet,
  CONTRACT_ADDRESS,
  HOST_PRIVATE_KEY,
  GHOSTRIG_ABI,
} from "./config.js";

if (!HOST_PRIVATE_KEY) {
  console.error("Set HOST_PRIVATE_KEY in the environment.");
  process.exit(1);
}

// Default: ~0.001 MON/s at 60 fps. Override with PRICE_PER_FPS (wei).
const pricePerFps = BigInt(process.env.PRICE_PER_FPS ?? "16666666666666");

const account = privateKeyToAccount(HOST_PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: monadTestnet, transport: http() });
const pub = createPublicClient({ chain: monadTestnet, transport: http() });

const hash = await wallet.writeContract({
  address: CONTRACT_ADDRESS,
  abi: GHOSTRIG_ABI,
  functionName: "registerRig",
  args: [pricePerFps],
});
console.log("registerRig tx:", hash);

await pub.waitForTransactionReceipt({ hash });
// rigId = previous rigCount (rigs are appended); robust regardless of log decoding.
const count = await pub.readContract({
  address: CONTRACT_ADDRESS,
  abi: [{ type: "function", name: "rigCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
  functionName: "rigCount",
});
const rigId = count - 1n;
console.log("Rig registered. rigId =", rigId.toString());
console.log("pricePerFps =", pricePerFps.toString(), "wei");
console.log("\nNext: run the agent with  RIG_ID=" + rigId + "  HOST_PRIVATE_KEY=...  npm start");
