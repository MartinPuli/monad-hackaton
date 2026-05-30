"use client";

// Reads every rig registered in the GhostRig contract so the UI can let the client
// pick which rig to play on (instead of a hard-coded NEXT_PUBLIC_RIG_ID). Each rig is
// { id, host, pricePerFps, active }. Refetches on demand via `refresh()`.

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { ghostRigAbi, GHOSTRIG_ADDRESS } from "./ghostrig";

export type Rig = {
  id: bigint;
  host: Address;
  pricePerFps: bigint;
  active: boolean;
};

export function useRigs() {
  const publicClient = usePublicClient();
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!publicClient || !GHOSTRIG_ADDRESS) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const count = (await publicClient.readContract({
        address: GHOSTRIG_ADDRESS,
        abi: ghostRigAbi,
        functionName: "rigCount",
      })) as bigint;

      const out: Rig[] = [];
      for (let i = 0n; i < count; i++) {
        const r = (await publicClient.readContract({
          address: GHOSTRIG_ADDRESS,
          abi: ghostRigAbi,
          functionName: "rigs",
          args: [i],
        })) as readonly [Address, bigint, boolean];
        out.push({ id: i, host: r[0], pricePerFps: r[1], active: r[2] });
      }
      setRigs(out);
    } catch {
      // Network/contract read failed — keep whatever we had, stop the spinner.
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rigs, loading, refresh: load };
}
