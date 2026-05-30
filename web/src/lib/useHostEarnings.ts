"use client";

// Host-side hook: live earnings dashboard for someone sharing their GPU.
//
// DEMO WIRING: live income + claimable are driven by demoBus (the player page
// publishes the hardcoded session there), so the dashboard fills up the instant
// the player accrues — no dependency on the on-chain FpsReported loop. Rig
// ownership (myRigIds) and registerRig stay real/on-chain.

import { useCallback, useEffect, useState } from "react";
import { parseEther, type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS } from "./ghostrig";
import { demoBus, type DemoState, type DemoHost } from "./demoBus";

export interface HostEarnings {
  /** Funds credited and ready to withdraw (wei). */
  claimable: bigint;
  /** Income observed live this session (wei, cumulative display). */
  liveAccrued: bigint;
  /** Latest reported FPS for the active session. */
  lastFps: number;
  /** rigIds owned by the connected wallet. */
  myRigIds: bigint[];
}

export function useHostEarnings() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [myRigIds, setMyRigIds] = useState<bigint[]>([]);
  // Start from a static default (matches SSR) and hydrate from the bus in an
  // effect — reading localStorage during the initial render would mismatch SSR.
  const [bus, setBus] = useState<DemoState>({
    live: null,
    host: null,
    claimable: "0",
    totalEarned: "0",
  });

  // Subscribe to the demo bus (player session + settled earnings).
  useEffect(() => {
    setBus(demoBus.get());
    return demoBus.subscribe(setBus);
  }, []);

  // Discover which rigs belong to the connected wallet (scan rigCount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address || !publicClient || !GHOSTRIG_ADDRESS) return;
      try {
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
      } catch {
        /* read failures shouldn't break the demo dashboard */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

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

  // The MON already landed in the host wallet on settle (player sent it directly),
  // so "withdraw" here just zeroes the claimable counter on the dashboard.
  const withdraw = useCallback(async () => {
    demoBus.clearClaimable();
  }, []);

  // Publish/update the host's stream profile (URL, game, availability). Mirror the
  // URL into the key GameStream reads, so a same-browser player auto-loads it.
  const publishHost = useCallback((partial: Partial<DemoHost>) => {
    demoBus.publishHost(partial);
    if (typeof window !== "undefined" && typeof partial.streamUrl === "string") {
      localStorage.setItem("ghostrig.streamUrl", partial.streamUrl);
    }
  }, []);

  const live = bus.live;
  const earnings: HostEarnings = {
    claimable: BigInt(bus.claimable),
    liveAccrued: live?.active ? BigInt(live.accrued) : 0n,
    lastFps: live?.active ? live.fps : 0,
    myRigIds,
  };

  return {
    earnings,
    host: bus.host,
    registerRig,
    withdraw,
    publishHost,
    priceFromMonPerFps: (mon: string) => parseEther(mon || "0"),
  };
}
