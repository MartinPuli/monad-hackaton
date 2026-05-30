"use client";

// REAL escrow flow on the deployed GhostRig contract (Monad testnet). Two signatures
// for the player, exactly as the contract is designed:
//
//   open(deposit, rigId) → openSession(rigId) *payable*  → TX 1: deposits MON in escrow.
//   ...the host-agent (same wallet that registered the rig) reports the real FPS each
//      second via reportFps; we watch `FpsReported` to drive the live spend/FPS feed
//      with the REAL reportFps tx hashes (the "chat is the blockchain").
//   close()              → closeSession(sessionId)        → TX 2: credits the host the
//      accrued amount and refunds the unused deposit to the client (pull-payment).
//   withdraw()           → withdraw()                     → pulls your credited funds
//      (the client's refund / the host's earnings) into the wallet.
//
// IMPORTANT: the host-agent MUST be running with the rig's wallet, or `accrued` stays
// 0 — the host earns nothing and the whole deposit is refunded on close.
//
// Same interface as before ({ state, open, close, reset, withdraw }) so page.tsx works.
// demoBus is still fed (best-effort) so a host dashboard open in the SAME browser lights
// up live; cross-machine, the host page should read on-chain (pendingWithdrawals).

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther, parseEventLogs, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS, TRIAL_SECONDS } from "./ghostrig";
import type { SessionState, FpsTick } from "./useSession";
import { demoBus } from "./demoBus";

const RIG_ID = BigInt(process.env.NEXT_PUBLIC_RIG_ID ?? "0");

function initial(): SessionState {
  return {
    phase: "idle",
    deposit: 0n,
    accrued: 0n,
    fps: 0,
    elapsed: 0,
    trialRemaining: TRIAL_SECONDS,
    remaining: 0n,
    ticks: [],
    paidToHost: 0n,
    refund: 0n,
  };
}

export function useSessionLive() {
  const [state, setState] = useState<SessionState>(initial());
  // sessionId lives in STATE (not just a ref) so the watcher effect re-subscribes
  // the moment the session is open.
  const [sessionId, setSessionId] = useState<bigint | null>(null);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const depositRef = useRef<bigint>(0n);
  const accruedRef = useRef<bigint>(0n);
  const rigIdRef = useRef<bigint>(RIG_ID);
  const settledRef = useRef(false);

  // Watch FpsReported for OUR session → live spend/FPS + the real reportFps tx hashes.
  useEffect(() => {
    if (sessionId === null || !publicClient || !GHOSTRIG_ADDRESS) return;
    const unwatch = publicClient.watchContractEvent({
      address: GHOSTRIG_ADDRESS as Address,
      abi: ghostRigAbi,
      eventName: "FpsReported",
      args: { sessionId },
      pollingInterval: 1_000, // ~1 tick/second feel even when the RPC has no WS
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as unknown as { args: { sessionId: bigint; fps: bigint; accrued: bigint } }).args;
          if (args.sessionId !== sessionId) continue;

          const accrued = args.accrued;
          const fps = Number(args.fps);
          const txHash = (log as unknown as { transactionHash: Hex }).transactionHash;
          accruedRef.current = accrued;

          const deposit = depositRef.current;
          const remaining = deposit > accrued ? deposit - accrued : 0n;
          const exhausted = remaining === 0n && accrued > 0n;

          setState((prev) => {
            const second = prev.elapsed + 1;
            const trial = accrued === 0n && second <= TRIAL_SECONDS;
            const tick: FpsTick = { second, fps, accrued, trial, txHash };
            return {
              ...prev,
              phase: exhausted ? "closed" : trial ? "trial" : "billing",
              accrued,
              fps,
              elapsed: second,
              trialRemaining: Math.max(0, TRIAL_SECONDS - second),
              remaining,
              ticks: [tick, ...prev.ticks].slice(0, 40),
              paidToHost: exhausted ? accrued : prev.paidToHost,
              refund: exhausted ? deposit - accrued : prev.refund,
            };
          });

          if (exhausted) {
            // The host-agent will (or already did) closeSession on-chain. Just settle
            // the demo bus once so a same-browser host dashboard reflects it.
            if (!settledRef.current) {
              settledRef.current = true;
              demoBus.settle(accrued);
            }
          } else {
            demoBus.publishLive({ active: true, fps, accrued: accrued.toString(), rigId: Number(rigIdRef.current) });
          }
        }
      },
      onError: () => {
        /* transient RPC hiccup — keep the last good state, the next poll recovers */
      },
    });
    return () => unwatch();
  }, [sessionId, publicClient]);

  // TX 1 — deposit MON into escrow for the selected rig.
  const open = useCallback(
    async (depositMon: string, rigId: bigint = RIG_ID) => {
      if (!GHOSTRIG_ADDRESS) throw new Error("NEXT_PUBLIC_GHOSTRIG_ADDRESS not set");
      const deposit = parseEther(depositMon || "0");
      depositRef.current = deposit;
      accruedRef.current = 0n;
      rigIdRef.current = rigId;
      settledRef.current = false;
      setSessionId(null);
      setState({ ...initial(), phase: "trial", deposit, remaining: deposit });

      try {
        const hash = await writeContractAsync({
          address: GHOSTRIG_ADDRESS as Address,
          abi: ghostRigAbi,
          functionName: "openSession",
          args: [rigId],
          value: deposit,
        });
        const receipt = await publicClient?.waitForTransactionReceipt({ hash });

        // Resolve OUR sessionId from the SessionOpened event in the receipt (exact,
        // not racy like reading sessionCount-1).
        let id: bigint | null = null;
        if (receipt) {
          const events = parseEventLogs({ abi: ghostRigAbi, eventName: "SessionOpened", logs: receipt.logs });
          const mine = events.find(
            (e) => (e.args as { client: Address }).client?.toLowerCase() === address?.toLowerCase(),
          );
          if (mine) id = (mine.args as { sessionId: bigint }).sessionId;
        }
        if (id === null) {
          // Fallback: newest session.
          const count = (await publicClient?.readContract({
            address: GHOSTRIG_ADDRESS as Address,
            abi: ghostRigAbi,
            functionName: "sessionCount",
          })) as bigint | undefined;
          if (count !== undefined) id = count - 1n;
        }
        setSessionId(id);
        demoBus.publishLive({ active: true, fps: 0, accrued: "0", rigId: Number(rigId) });
      } catch (err) {
        // User rejected the deposit, or the tx failed — back to idle so they can retry.
        console.error("openSession failed:", err);
        setState(initial());
        setSessionId(null);
      }
    },
    [address, publicClient, writeContractAsync],
  );

  // TX 2 — settle: pay the host the accrued amount, refund the rest to the client.
  const close = useCallback(async () => {
    const id = sessionId;
    const accrued = accruedRef.current;

    // Optimistic UI: show the receipt immediately.
    setState((prev) => ({
      ...prev,
      phase: "closed",
      paidToHost: accrued,
      refund: prev.deposit > accrued ? prev.deposit - accrued : 0n,
    }));
    if (!settledRef.current) {
      settledRef.current = true;
      demoBus.settle(accrued);
    }

    if (id === null || !GHOSTRIG_ADDRESS) return;
    try {
      const hash = await writeContractAsync({
        address: GHOSTRIG_ADDRESS as Address,
        abi: ghostRigAbi,
        functionName: "closeSession",
        args: [id],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    } catch (err) {
      // If the host-agent already closed it on exhaust, closeSession reverts
      // (SessionNotOpen) — harmless; the settlement already happened on-chain.
      console.error("closeSession warn (may already be closed):", err);
    }
  }, [sessionId, publicClient, writeContractAsync]);

  // Pull your credited funds (client refund / host earnings) into the wallet.
  const withdraw = useCallback(async () => {
    if (!GHOSTRIG_ADDRESS) return;
    const hash = await writeContractAsync({
      address: GHOSTRIG_ADDRESS as Address,
      abi: ghostRigAbi,
      functionName: "withdraw",
      args: [],
    });
    await publicClient?.waitForTransactionReceipt({ hash });
  }, [publicClient, writeContractAsync]);

  const reset = useCallback(() => {
    setSessionId(null);
    depositRef.current = 0n;
    accruedRef.current = 0n;
    settledRef.current = false;
    demoBus.publishLive(null);
    setState(initial());
  }, []);

  return { state, open, close, reset, withdraw };
}
