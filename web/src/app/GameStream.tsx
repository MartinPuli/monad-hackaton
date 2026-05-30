"use client";

// Full-screen embedded game stream + floating payment overlay.
// The game itself is served by the host's WebRTC endpoint (Vibeshine/LuminalShine
// fork of Sunshine exposes `/webrtc`). We embed that page in an <iframe> and float
// the live spend / FPS / exit HUD on top — so the judge plays AND sees the on-chain
// billing in a single page.
//
// Host stream URL comes from NEXT_PUBLIC_STREAM_URL (e.g. http://192.168.112.212:47990/webrtc).

import { formatEther } from "viem";
import { SignOut, Lightning, Wallet } from "@phosphor-icons/react";
import type { SessionState } from "@/lib/useSession";

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL ?? "";
const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);

export function GameStream({
  state,
  onExit,
}: {
  state: SessionState;
  onExit: () => void;
}) {
  const trial = state.phase === "trial";

  return (
    <div className="fixed inset-0 z-30 bg-black">
      {/* The game, full screen */}
      {STREAM_URL ? (
        <iframe
          src={STREAM_URL}
          title="Game stream"
          className="h-full w-full border-0"
          allow="gamepad; fullscreen; autoplay; clipboard-read; clipboard-write"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-center text-muted">
          <div>
            <p className="text-lg font-semibold text-foreground">Esperando el stream del host…</p>
            <p className="mt-2 text-sm">
              Configurá <code className="font-mono text-accent">NEXT_PUBLIC_STREAM_URL</code> con el
              endpoint <code className="font-mono">/webrtc</code> del host.
            </p>
          </div>
        </div>
      )}

      {/* Floating payment HUD */}
      <div className="pointer-events-none absolute right-4 top-4 w-64 select-none">
        <div className="pointer-events-auto rounded-xl border border-border bg-surface/90 p-4 shadow-2xl backdrop-blur-md">
          {trial ? (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold text-emerald-400">
              <Lightning size={16} weight="fill" />
              Prueba gratis · {state.trialRemaining}s
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-accent/15 px-2.5 py-1.5 text-sm font-semibold text-accent">
              <Lightning size={16} weight="fill" />
              Cobrando en vivo
            </div>
          )}

          <Row label="FPS" value={String(state.fps)} />
          <Row label="Gastado" value={`${fmt(state.accrued)} MON`} />
          <Row label="Saldo" value={`${fmt(state.remaining)} MON`} highlight />

          <button
            onClick={onExit}
            className="pointer-events-auto mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:bg-red-500 active:scale-[0.98]"
          >
            <SignOut size={16} weight="bold" />
            Salir y liquidar
          </button>
        </div>

        <p className="mt-2 text-right text-[11px] text-muted">
          <Wallet size={11} weight="fill" className="mr-1 inline" />
          liquidado on-chain en Monad
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? "text-accent" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
