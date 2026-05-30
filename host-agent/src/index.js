// GhostRig host agent.
//
// Watches the contract for sessions opened against THIS host's rig, then once per
// second reports the measured FPS on-chain (reportFps). Billing only kicks in after
// the 10s trial (enforced by the contract). When the deposit is exhausted, the agent
// closes the session. Exposes a tiny HTTP status endpoint for the UI/demo.
//
// Env:
//   HOST_PRIVATE_KEY  (required) wallet that owns the rig
//   RIG_ID            (default 0) which rig to serve
//   GHOSTRIG_ADDRESS  (optional) override contract address
//   FPS_MODE          sim | real  (default sim)
//   PORT              status server port (default 8787)
import http from "node:http";
import { createPublicClient, createWalletClient, http as httpTransport } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  monadTestnet,
  CONTRACT_ADDRESS,
  HOST_PRIVATE_KEY,
  RIG_ID,
  GHOSTRIG_ABI,
} from "./config.js";
import { sampleFps } from "./fps-source.js";

if (!HOST_PRIVATE_KEY) {
  console.error("Set HOST_PRIVATE_KEY in the environment.");
  process.exit(1);
}

const account = privateKeyToAccount(HOST_PRIVATE_KEY);
const pub = createPublicClient({ chain: monadTestnet, transport: httpTransport() });
const wallet = createWalletClient({ account, chain: monadTestnet, transport: httpTransport() });

// Track sessions this agent is actively billing. sessionId(string) -> state.
const active = new Map();
// Latest status, exposed over HTTP for the UI.
const status = { rigId: RIG_ID.toString(), host: account.address, sessions: {} };

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

// Start billing a session: tick reportFps every second.
async function startBilling(sessionId) {
  const key = sessionId.toString();
  if (active.has(key)) return;
  log(`▶ start billing session ${key}`);
  // Manage the nonce locally so back-to-back reportFps txs don't collide
  // (avoids "An existing transaction had higher priority" reverts).
  const nonce = await pub.getTransactionCount({ address: account.address });
  const entry = { nonce };
  active.set(key, entry);
  status.sessions[key] = { fps: 0, accrued: "0", state: "trial" };
  entry.timer = setInterval(() => tick(sessionId), 1000);
}

async function tick(sessionId) {
  const key = sessionId.toString();
  const entry = active.get(key);
  if (!entry) return;

  // Guard against overlapping ticks if a tx is slow.
  if (entry.busy) return;
  entry.busy = true;
  try {
    const fps = sampleFps();
    const hash = await wallet.writeContract({
      address: CONTRACT_ADDRESS,
      abi: GHOSTRIG_ABI,
      functionName: "reportFps",
      args: [sessionId, BigInt(fps)],
      nonce: entry.nonce,
    });
    entry.nonce += 1; // advance our local nonce for the next tick
    // Read the resulting accrued for the status endpoint (cheap view call).
    const s = await pub.readContract({
      address: CONTRACT_ADDRESS,
      abi: GHOSTRIG_ABI,
      functionName: "sessions",
      args: [sessionId],
    });
    // sessions() = [client, rigId, deposit, accrued, pricePerFps, startTime, open]
    const deposit = s[2];
    const accrued = s[3];
    const open = s[6];
    status.sessions[key] = {
      fps,
      accrued: accrued.toString(),
      deposit: deposit.toString(),
      state: accrued >= deposit ? "exhausted" : "billing",
      lastTx: hash,
    };
    log(`session ${key}: ${fps} fps → accrued ${accrued} / ${deposit}`);

    if (!open || accrued >= deposit) {
      await closeSession(sessionId);
    }
  } catch (err) {
    // Most likely: trial not over yet (contract ignores billing) or session closed.
    log(`session ${key} tick warn:`, err.shortMessage || err.message);
  } finally {
    entry.busy = false;
  }
}

async function closeSession(sessionId) {
  const key = sessionId.toString();
  const entry = active.get(key);
  if (entry) {
    clearInterval(entry.timer);
    active.delete(key);
  }
  try {
    // Fetch a fresh nonce — any in-flight reportFps may have advanced it.
    const nonce = await pub.getTransactionCount({ address: account.address });
    const hash = await wallet.writeContract({
      address: CONTRACT_ADDRESS,
      abi: GHOSTRIG_ABI,
      functionName: "closeSession",
      args: [sessionId],
      nonce,
    });
    log(`⏹ closed session ${key} (${hash})`);
    if (status.sessions[key]) status.sessions[key].state = "closed";
  } catch (err) {
    log(`close ${key} warn:`, err.shortMessage || err.message);
  }
}

// On startup, adopt any session already open on our rig (e.g. opened while the
// agent was down, leaving the rig "busy"). Live ones get billed; exhausted ones
// get closed — so the rig is freed and nothing stays stuck. Self-healing.
async function reconcile() {
  for (let i = 0n; ; i++) {
    let s;
    try {
      s = await pub.readContract({
        address: CONTRACT_ADDRESS,
        abi: GHOSTRIG_ABI,
        functionName: "sessions",
        args: [i],
      });
    } catch {
      break; // read past the end of the sessions array → done
    }
    const rigId = s[1];
    const deposit = s[2];
    const accrued = s[3];
    const open = s[6];
    if (!open || rigId !== RIG_ID) continue;
    if (accrued >= deposit) {
      log(`reconcile: session ${i} open but exhausted → closing`);
      await closeSession(i);
    } else {
      log(`reconcile: adopting live session ${i} on rig ${rigId}`);
      startBilling(i);
    }
  }
}

// Listen for new sessions opened against our rig.
function watch() {
  pub.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: GHOSTRIG_ABI,
    eventName: "SessionOpened",
    onLogs: (logs) => {
      for (const l of logs) {
        const { sessionId, rigId } = l.args;
        if (rigId === RIG_ID) {
          log(`new session ${sessionId} on our rig ${rigId}`);
          startBilling(sessionId);
        }
      }
    },
    onError: (e) => log("watch error:", e.shortMessage || e.message),
  });
  log(`watching rig ${RIG_ID} on ${CONTRACT_ADDRESS} as host ${account.address}`);
}

// Tiny status server for the UI/demo.
function serve() {
  const port = Number(process.env.PORT ?? 8787);
  http
    .createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(status));
    })
    .listen(port, () => log(`status server on http://localhost:${port}`));
}

watch();
serve();
reconcile().catch((e) => log("reconcile error:", e.shortMessage || e.message));
