"use client";

// HARDCODED DEMO billing (reliable, no dependency on the host-agent / on-chain
// FpsReported loop). While the player is "in game" we tick locally:
//   - FPS: random 30–60
//   - cost: a flat 0.000001 MON per second, after the free trial
// On exit we settle: the accrued MON is (best-effort) sent on-chain to the rig's
// host wallet, and the host dashboard is updated live via demoBus.
//
// Same interface as before ({ state, open, close, reset }) so page.tsx is untouched.
// Turn the real payout off with NEXT_PUBLIC_DEMO_PAYOUT=off (then it's pure UI).

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount, usePublicClient, useSendTransaction } from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS, TRIAL_SECONDS } from "./ghostrig";
import type { SessionState, FpsTick } from "./useSession";
import { demoBus } from "./demoBus";

const RIG_ID = BigInt(process.env.NEXT_PUBLIC_RIG_ID ?? "0");
// Hardcoded price: 0.000001 MON charged per second (after the trial).
const PRICE_PER_SEC = parseEther("0.000001");
// Optional explicit payout target; otherwise we read the rig's host from chain.
const HOST_ADDRESS_ENV = process.env.NEXT_PUBLIC_HOST_ADDRESS as Address | undefined;
const REAL_PAYOUT = process.env.NEXT_PUBLIC_DEMO_PAYOUT !== "off";
const ZERO = "0x0000000000000000000000000000000000000000";

const randomFps = () => 30 + Math.floor(Math.random() * 31); // 30..60 inclusive
const fakeHash = () =>
  "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

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
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const acc = useRef({ second: 0, accrued: 0n, deposit: 0n, rigId: RIG_ID });
  const settledRef = useRef(false);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  // Settle once: credit the host (demo bus) and best-effort send the real MON.
  const settle = useCallback(
    async (accrued: bigint) => {
      demoBus.settle(accrued); // host panel: claimable += accrued, live cleared
      if (!REAL_PAYOUT || accrued <= 0n || !address) return;
      try {
        let host = HOST_ADDRESS_ENV;
        if (!host && publicClient && GHOSTRIG_ADDRESS) {
          const rig = (await publicClient.readContract({
            address: GHOSTRIG_ADDRESS as Address,
            abi: ghostRigAbi,
            functionName: "rigs",
            args: [acc.current.rigId],
          })) as readonly [Address, bigint, boolean];
          host = rig[0];
        }
        if (host && host.toLowerCase() !== ZERO) {
          await sendTransactionAsync({ to: host, value: accrued });
        }
      } catch (err) {
        // Demo keeps working even if the payout tx is rejected/fails.
        console.error("host payout failed (demo continues):", err);
      }
    },
    [address, publicClient, sendTransactionAsync],
  );

  const open = useCallback(
    (depositMon: string, rigId: bigint = RIG_ID) => {
      stop();
      const deposit = parseEther(depositMon || "0");
      acc.current = { second: 0, accrued: 0n, deposit, rigId };
      settledRef.current = false;
      setState({ ...initial(), phase: "trial", deposit, remaining: deposit });
      demoBus.publishLive({ active: true, fps: 0, accrued: "0", rigId: Number(rigId) });

      timer.current = setInterval(() => {
        const a = acc.current;
        a.second += 1;
        const fps = randomFps();
        const trial = a.second <= TRIAL_SECONDS;
        if (!trial) a.accrued += PRICE_PER_SEC;
        if (a.accrued > a.deposit) a.accrued = a.deposit;
        const remaining = a.deposit > a.accrued ? a.deposit - a.accrued : 0n;
        const exhausted = !trial && remaining === 0n;

        const tick: FpsTick = { second: a.second, fps, accrued: a.accrued, trial, txHash: fakeHash() };

        setState((prev) => ({
          ...prev,
          phase: exhausted ? "closed" : trial ? "trial" : "billing",
          accrued: a.accrued,
          fps,
          elapsed: a.second,
          trialRemaining: Math.max(0, TRIAL_SECONDS - a.second),
          remaining,
          ticks: [tick, ...prev.ticks].slice(0, 40),
          paidToHost: exhausted ? a.accrued : prev.paidToHost,
          refund: exhausted ? a.deposit - a.accrued : prev.refund,
        }));

        demoBus.publishLive({
          active: !exhausted,
          fps,
          accrued: a.accrued.toString(),
          rigId: Number(a.rigId),
        });

        if (exhausted) stop(); // settlement handled by the phase==="closed" effect
      }, 1000);
    },
    [stop],
  );

  const close = useCallback(() => {
    stop();
    setState((prev) => ({
      ...prev,
      phase: "closed",
      paidToHost: prev.accrued,
      refund: prev.deposit - prev.accrued,
    }));
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    settledRef.current = true; // already settled (or never opened) — don't re-fire
    acc.current = { second: 0, accrued: 0n, deposit: 0n, rigId: RIG_ID };
    demoBus.publishLive(null);
    setState(initial());
  }, [stop]);

  // Single settlement point: whenever we land in "closed" and haven't settled yet.
  // Covers both manual exit (close) and auto-exhaust inside the ticker.
  useEffect(() => {
    if (state.phase !== "closed" || settledRef.current) return;
    settledRef.current = true;
    void settle(state.accrued);
  }, [state.phase, state.accrued, settle]);

  useEffect(() => stop, [stop]);

  return { state, open, close, reset };
}
