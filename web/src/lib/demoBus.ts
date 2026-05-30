"use client";

// Demo bus — shares the live session and the host's earnings between the PLAYER
// page (/) and the HOST dashboard (/host) WITHOUT going through the contract.
// Backed by localStorage (so it survives reloads) + BroadcastChannel/storage events
// (so an open host tab updates the instant the player accrues).
//
// Scope: same browser, cross-tab/window. For a host on a DIFFERENT machine you'd
// need a shared server (e.g. the host-agent status endpoint) — this only syncs the
// on-screen demo.

export interface DemoLive {
  active: boolean;
  fps: number;
  accrued: string; // wei, as a string (bigint isn't JSON-safe)
  rigId: number;
}

// What the host publishes from their dashboard so the player page can show it.
export interface DemoHost {
  streamUrl: string; // the host's /webrtc (or stream) endpoint
  available: boolean; // host toggled "Disponible"
  game: string; // e.g. "Minecraft"
  gpu: string; // e.g. "RTX 4090"
}

export interface DemoState {
  live: DemoLive | null;
  host: DemoHost | null;
  claimable: string; // wei — accumulates on settle, cleared on withdraw
  totalEarned: string; // wei — lifetime, never cleared
}

const KEY = "kntx.demo.v1";
const DEFAULT: DemoState = { live: null, host: null, claimable: "0", totalEarned: "0" };

const channel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("kntx-demo")
    : null;

function read(): DemoState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<DemoState>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function write(next: DemoState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
  channel?.postMessage(next); // other tabs get it instantly
}

export const demoBus = {
  get: read,

  /** Player publishes the live session each tick (or null to clear). */
  publishLive(live: DemoLive | null) {
    write({ ...read(), live });
  },

  /** Host publishes/updates their stream profile (merged with what's there). */
  publishHost(partial: Partial<DemoHost>) {
    const s = read();
    const base: DemoHost = s.host ?? { streamUrl: "", available: false, game: "", gpu: "" };
    write({ ...s, host: { ...base, ...partial } });
  },

  /** Player settles on exit: move accrued into the host's claimable + lifetime. */
  settle(accruedWei: bigint) {
    const s = read();
    write({
      ...s,
      live: null,
      claimable: (BigInt(s.claimable) + accruedWei).toString(),
      totalEarned: (BigInt(s.totalEarned) + accruedWei).toString(),
    });
  },

  /** Host "withdrew" — zero the claimable counter (funds already landed in-wallet). */
  clearClaimable() {
    write({ ...read(), claimable: "0" });
  },

  reset() {
    write(DEFAULT);
  },

  /** Subscribe to changes coming from other tabs. Returns an unsubscribe fn. */
  subscribe(cb: (s: DemoState) => void) {
    if (typeof window === "undefined") return () => {};
    const onMsg = (e: MessageEvent) => cb(e.data as DemoState);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) cb(read());
    };
    channel?.addEventListener("message", onMsg);
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.removeEventListener("message", onMsg);
      window.removeEventListener("storage", onStorage);
    };
  },
};
