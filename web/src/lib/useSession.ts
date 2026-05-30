"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { TRIAL_SECONDS } from "./ghostrig";

// Demo pricing: wei charged per 1 FPS during 1 second.
// 0.000001 MON/fps/s → at ~60 fps ≈ 0.00006 MON/s ≈ 0.0036 MON/min.
export const DEMO_PRICE_PER_FPS = parseEther("0.000001");

export type Phase = "idle" | "trial" | "billing" | "closed";

export interface FpsTick {
  second: number; // session second (1-based)
  fps: number;
  accrued: bigint; // total owed so far (wei)
  trial: boolean; // true while inside the free trial
  txHash: string; // mock tx hash (real reportFps tx hash in live mode)
}

export interface SessionState {
  phase: Phase;
  deposit: bigint;
  accrued: bigint;
  fps: number;
  elapsed: number; // seconds since open
  trialRemaining: number; // seconds of free trial left
  remaining: bigint; // deposit - accrued (never below 0)
  ticks: FpsTick[];
  paidToHost: bigint;
  refund: bigint;
}

const randomFps = () => 52 + Math.floor(Math.random() * 9); // 52–60, "good stream"
const mockHash = () =>
  "0x" +
  Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

/**
 * Drives a GhostRig session. In MOCK mode it simulates the host calling
 * reportFps(fps) once per second: free for the first TRIAL_SECONDS, then the
 * debt accrues fps × pricePerFps until the deposit is exhausted or the client closes.
 *
 * Integration point (Dev A's contract): replace the interval simulation with a
 * useWatchContractEvent on `FpsReported`, and openSession/closeSession with
 * useWriteContract calls. The shape of SessionState stays the same.
 */
export function useSession(pricePerFps: bigint = DEMO_PRICE_PER_FPS) {
  const [state, setState] = useState<SessionState>(initial());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const open = useCallback(
    (depositMon: string) => {
      stop();
      const deposit = parseEther(depositMon || "0");
      let second = 0;
      let accrued = 0n;

      setState({ ...initial(), phase: "trial", deposit });

      timer.current = setInterval(() => {
        second += 1;
        const fps = randomFps();
        const trial = second <= TRIAL_SECONDS;
        if (!trial) accrued += BigInt(fps) * pricePerFps;
        if (accrued > deposit) accrued = deposit;

        const tick: FpsTick = { second, fps, accrued, trial, txHash: mockHash() };

        setState((prev) => {
          const remaining = prev.deposit - accrued;
          const exhausted = remaining <= 0n;
          return {
            ...prev,
            phase: exhausted ? "closed" : trial ? "trial" : "billing",
            accrued,
            fps,
            elapsed: second,
            trialRemaining: Math.max(0, TRIAL_SECONDS - second),
            remaining: remaining > 0n ? remaining : 0n,
            ticks: [tick, ...prev.ticks].slice(0, 40),
            paidToHost: exhausted ? accrued : prev.paidToHost,
            refund: exhausted ? prev.deposit - accrued : prev.refund,
          };
        });

        if (accrued >= deposit) stop();
      }, 1000);
    },
    [pricePerFps, stop],
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
    setState(initial());
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, open, close, reset, pricePerFps };
}

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
