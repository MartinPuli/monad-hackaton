"use client";

// Host-side hook: live earnings dashboard for someone sharing their GPU.
// Reads pendingWithdrawals (what's claimable), tracks live income from FpsReported
// events on the host's rigs, lets the host register a rig and withdraw earnings.
// All on-chain — the host's connected wallet IS the payout wallet (rig.host).

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther, type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
} from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS } from "./ghostrig";

export interface HostEarnings {
  /** Funds credited and ready to withdraw (wei). */
  claimable: bigint;
  /** Income observed live this session via FpsReported (wei, cumulative display). */
  liveAccrued: bigint;
  /** Latest reported FPS across the host's active sessions. */
  lastFps: number;
  /** rigIds owned by the connected wallet. */
  myRigIds: bigint[];
}

export function useHostEarnings() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [liveAccrued, setLiveAccrued] = useState(0n);
  const [lastFps, setLastFps] = useState(0);
  const [myRigIds, setMyRigIds] = useState<bigint[]>([]);
  const lastAccruedPerSession = useRef<Map<string, bigint>>(new Map());

  // Claimable balance for the connected wallet.
  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: GHOSTRIG_ADDRESS as Address,
    abi: ghostRigAbi,
    functionName: "pendingWithdrawals",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && GHOSTRIG_ADDRESS), refetchInterval: 4000 },
  });

  // Discover which rigs belong to the connected wallet (scan rigCount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address || !publicClient || !GHOSTRIG_ADDRESS) return;
      const count = (await publicClient.readContract({
        address: GHOSTRIG_ADDRESS as Address,
        abi: ghostRigAbi,
        functionName: "rigCount",
      })) as bigint;
      const mine: bigint[] = [];
      for (let i = 0n; i < count; i++) {
        const rig = (await publicClient.readContract({
          address: GHOSTRIG_ADDRESS as Address,
          abi: ghostRigAbi,
          functionName: "rigs",
          args: [i],
        })) as readonly [Address, bigint, boolean];
        if (rig[0].toLowerCase() === address.toLowerCase()) mine.push(i);
      }
      if (!cancelled) setMyRigIds(mine);
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  // Live income: watch FpsReported, sum per-session deltas of `accrued`.
  useWatchContractEvent({
    address: GHOSTRIG_ADDRESS as Address,
    abi: ghostRigAbi,
    eventName: "FpsReported",
    enabled: Boolean(GHOSTRIG_ADDRESS && address),
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as unknown as { args: { sessionId: bigint; fps: bigint; accrued: bigint } }).args;
        const key = args.sessionId.toString();
        const prev = lastAccruedPerSession.current.get(key) ?? 0n;
        const delta = args.accrued > prev ? args.accrued - prev : 0n;
        lastAccruedPerSession.current.set(key, args.accrued);
        if (delta > 0n) setLiveAccrued((v) => v + delta);
        setLastFps(Number(args.fps));
      }
    },
  });

  const registerRig = useCallback(
    async (pricePerFpsWei: bigint) => {
      if (!GHOSTRIG_ADDRESS) throw new Error("contract address not set");
      const hash = await writeContractAsync({
        address: GHOSTRIG_ADDRESS as Address,
        abi: ghostRigAbi,
        functionName: "registerRig",
        args: [pricePerFpsWei],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    },
    [publicClient, writeContractAsync],
  );

  const withdraw = useCallback(async () => {
    if (!GHOSTRIG_ADDRESS) return;
    const hash = await writeContractAsync({
      address: GHOSTRIG_ADDRESS as Address,
      abi: ghostRigAbi,
      functionName: "withdraw",
      args: [],
    });
    await publicClient?.waitForTransactionReceipt({ hash });
    await refetchClaimable();
  }, [publicClient, writeContractAsync, refetchClaimable]);

  const earnings: HostEarnings = {
    claimable: (claimable as bigint | undefined) ?? 0n,
    liveAccrued,
    lastFps,
    myRigIds,
  };

  return { earnings, registerRig, withdraw, priceFromMonPerFps: (mon: string) => parseEther(mon || "0") };
}
