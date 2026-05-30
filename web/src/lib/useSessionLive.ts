"use client";

// LIVE version of useSession: same interface ({ state, open, close, reset }) but
// wired to the deployed GhostRig contract on Monad testnet. The client opens a real
// session (deposits MON), then we watch `FpsReported` events to drive the live
// spend/FPS display, and `closeSession` settles. Drop-in replacement for useSession
// when NEXT_PUBLIC_GHOSTRIG_ADDRESS is set (MOCK === false).
//
// page.tsx can switch with:  const useGhostRig = MOCK ? useSession : useSessionLive;

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther, type Address, type Hex } from "viem";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWatchContractEvent,
} from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS, TRIAL_SECONDS } from "./ghostrig";
import type { SessionState, FpsTick } from "./useSession";

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
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const sessionIdRef = useRef<bigint | null>(null);
  const depositRef = useRef<bigint>(0n);

  // Watch FpsReported for OUR session → drive the live spend/FPS display.
  useWatchContractEvent({
    address: GHOSTRIG_ADDRESS as Address,
    abi: ghostRigAbi,
    eventName: "FpsReported",
    enabled: Boolean(GHOSTRIG_ADDRESS) && sessionIdRef.current !== null,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as unknown as { args: { sessionId: bigint; fps: bigint; accrued: bigint } }).args;
        if (sessionIdRef.current === null || args.sessionId !== sessionIdRef.current) continue;
        const accrued = args.accrued;
        const fps = Number(args.fps);
        setState((prev) => {
          const second = prev.elapsed + 1;
          const trial = accrued === 0n && second <= TRIAL_SECONDS;
          const remaining = depositRef.current > accrued ? depositRef.current - accrued : 0n;
          const exhausted = remaining === 0n;
          const tick: FpsTick = {
            second,
            fps,
            accrued,
            trial,
            txHash: (log as unknown as { transactionHash: Hex }).transactionHash,
          };
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
            refund: exhausted ? depositRef.current - accrued : prev.refund,
          };
        });
      }
    },
  });

  const open = useCallback(
    async (depositMon: string) => {
      if (!GHOSTRIG_ADDRESS) throw new Error("NEXT_PUBLIC_GHOSTRIG_ADDRESS not set");
      const deposit = parseEther(depositMon || "0");
      depositRef.current = deposit;
      setState({ ...initial(), phase: "trial", deposit });

      const hash = await writeContractAsync({
        address: GHOSTRIG_ADDRESS as Address,
        abi: ghostRigAbi,
        functionName: "openSession",
        args: [RIG_ID],
        value: deposit,
      });
      // Resolve the new sessionId: read sessionCount-1 after the tx confirms.
      await publicClient?.waitForTransactionReceipt({ hash });
      const count = (await publicClient?.readContract({
        address: GHOSTRIG_ADDRESS as Address,
        abi: ghostRigAbi,
        functionName: "sessionCount",
      })) as bigint | undefined;
      if (count !== undefined) sessionIdRef.current = count - 1n;
    },
    [publicClient, writeContractAsync],
  );

  const close = useCallback(async () => {
    if (sessionIdRef.current === null || !GHOSTRIG_ADDRESS) return;
    await writeContractAsync({
      address: GHOSTRIG_ADDRESS as Address,
      abi: ghostRigAbi,
      functionName: "closeSession",
      args: [sessionIdRef.current],
    });
    setState((prev) => ({
      ...prev,
      phase: "closed",
      paidToHost: prev.accrued,
      refund: prev.deposit - prev.accrued,
    }));
  }, [writeContractAsync]);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    depositRef.current = 0n;
    setState(initial());
  }, []);

  // Withdraw funds credited to the connected wallet (refund after close).
  const withdraw = useCallback(async () => {
    if (!GHOSTRIG_ADDRESS || !address) return;
    await writeContractAsync({
      address: GHOSTRIG_ADDRESS as Address,
      abi: ghostRigAbi,
      functionName: "withdraw",
      args: [],
    });
  }, [address, writeContractAsync]);

  useEffect(() => () => reset(), [reset]);

  return { state, open, close, reset, withdraw };
}
