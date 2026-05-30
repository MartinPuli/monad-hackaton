"use client";

// Full-screen embedded game stream + floating payment overlay.
// The game itself is served by the host's WebRTC endpoint (Vibeshine/LuminalShine
// fork of Sunshine exposes `/webrtc`). We embed that page in an <iframe> and float
// the live spend / FPS / exit HUD on top — so the judge plays AND sees the on-chain
// billing in a single page.
//
// Host stream URL comes from NEXT_PUBLIC_STREAM_URL (e.g. http://192.168.112.212:47990/webrtc).

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { SignOut, Lightning, Wallet, Pencil, Monitor } from "@phosphor-icons/react";
import { KntxMark } from "@/components/KntxMark";
import type { SessionState } from "@/lib/useSession";

// Default comes from env, but the host can override it live from the app (saved in
// localStorage). No file edits / restarts needed — paste the /webrtc URL and play.
const ENV_STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL ?? "";
const STORAGE_KEY = "ghostrig.streamUrl";
const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);

export function GameStream({
  state,
  onExit,
}: {
  state: SessionState;
  onExit: () => void;
}) {
  const trial = state.phase === "trial";

  // Stream URL: localStorage (host-set) → env default. Editable from the UI.
  const [streamUrl, setStreamUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const url = saved ?? ENV_STREAM_URL;
    setStreamUrl(url);
    setDraft(url);
    if (!url) setEditing(true); // prompt for it if we have none
  }, []);

  const saveUrl = () => {
    const url = draft.trim();
    setStreamUrl(url);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, url);
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-30 bg-black">
      {/* The game, full screen */}
      {streamUrl && !editing ? (
        <iframe
          src={streamUrl}
          title="Game stream"
          className="h-full w-full border-0"
          allow="gamepad; fullscreen; autoplay; clipboard-read; clipboard-write"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface/90 p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex items-center justify-center gap-2">
              <KntxMark size={18} className="text-accent kntx-glow" />
              <span className="text-sm font-bold tracking-[0.2em] text-foreground">KNTX</span>
            </div>
            <Monitor size={32} weight="duotone" className="mx-auto mb-3 text-accent" />
            <p className="text-lg font-semibold text-foreground">URL del stream del host</p>
            <p className="mt-1 text-sm text-muted">
              Pegá el endpoint <code className="font-mono text-accent">/webrtc</code> del host
              (Vibeshine/LuminalShine). Ej: <code className="font-mono">http://192.168.1.50:47990/webrtc</code>
            </p>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveUrl()}
              placeholder="http://<ip-host>:<puerto>/webrtc"
              className="mt-4 w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors duration-200 ease-out-quint focus:border-accent"
              autoFocus
            />
            <button
              onClick={saveUrl}
              className="mt-3 w-full rounded-md bg-accent px-3 py-2 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:bg-accent-hover active:scale-[0.98]"
            >
              Conectar stream
            </button>
          </div>
        </div>
      )}

      {/* Floating payment HUD */}
      <div className="pointer-events-none absolute right-4 top-4 w-64 select-none">
        <div className="pointer-events-auto rounded-xl border border-border bg-surface/90 p-4 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center gap-1.5 border-b border-border pb-2.5">
            <KntxMark size={13} className="text-accent kntx-glow" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-foreground">KNTX</span>
          </div>
          {trial ? (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-online/15 px-2.5 py-1.5 text-sm font-semibold text-online">
              <Lightning size={16} weight="fill" />
              Prueba gratis · {state.trialRemaining}s
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-accent/15 px-2.5 py-1.5 text-sm font-semibold text-accent">
              <Lightning size={16} weight="fill" className="kntx-pulse" />
              Cobrando en vivo
            </div>
          )}

          <Row label="FPS" value={String(state.fps)} />
          <Row label="Gastado" value={`${fmt(state.accrued)} MON`} />
          <Row label="Saldo" value={`${fmt(state.remaining)} MON`} highlight />

          <button
            onClick={() => setEditing(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition-colors duration-200 ease-out-quint hover:bg-surface-3 hover:text-foreground"
          >
            <Pencil size={13} weight="bold" />
            Cambiar URL del stream
          </button>

          <button
            onClick={onExit}
            className="pointer-events-auto mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-live px-3 py-2 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:opacity-90 active:scale-[0.98]"
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
