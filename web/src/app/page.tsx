"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatEther } from "viem";
import { MOCK, TRIAL_SECONDS } from "@/lib/ghostrig";
import { useSession, DEMO_PRICE_PER_FPS } from "@/lib/useSession";

const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { state, open, close, reset } = useSession();
  const [deposit, setDeposit] = useState("0.05");

  const injected = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors],
  );

  const pricePerMin = DEMO_PRICE_PER_FPS * 60n * 60n; // ~60fps * 60s
  const canPlay = state.phase === "idle" || state.phase === "closed";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav — Twitch style */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">👻</span>
          <span className="text-lg font-bold tracking-tight">
            Ghost<span className="text-twitch">Rig</span>
          </span>
          <span className="ml-2 hidden text-xs text-muted sm:inline">
            rentá FPS · pagás en vivo sobre Monad
          </span>
        </div>
        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-surface-3"
          >
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </button>
        ) : (
          <button
            onClick={() => injected && connect({ connector: injected })}
            disabled={isPending || !injected}
            className="rounded-md bg-twitch px-4 py-1.5 text-sm font-bold text-white transition hover:bg-twitch-hover disabled:opacity-50"
          >
            {isPending ? "Conectando…" : "Conectar wallet"}
          </button>
        )}
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-5 py-6">
        {MOCK && (
          <div className="rounded-md border border-twitch/40 bg-twitch/10 px-4 py-2 text-sm text-twitch-hover">
            <strong>MOCK MODE</strong> — simulando <code>reportFps</code> cada segundo
            contra la ABI de <code>interface.md</code>. Configurá{" "}
            <code>NEXT_PUBLIC_GHOSTRIG_ADDRESS</code> tras el deploy (WB3) para el contrato real.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Stream pane */}
          <section className="flex flex-col gap-3">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-black">
              <StreamView phase={state.phase} fps={state.fps} />

              {/* LIVE / trial badge — top left, Twitch style */}
              {state.phase === "trial" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-online px-2 py-0.5 text-xs font-bold uppercase text-black">
                  prueba gratis · {state.trialRemaining}s
                </div>
              )}
              {state.phase === "billing" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-live px-2 py-0.5 text-xs font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  live
                </div>
              )}
              {/* viewer-style fps counter, top right */}
              {(state.phase === "trial" || state.phase === "billing") && (
                <div className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-foreground">
                  {state.fps} FPS
                </div>
              )}
            </div>

            {/* Stream info bar — like a channel header */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-twitch text-lg font-bold text-white">
                R
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">Rig #1 · RTX 4090 — Minecraft</p>
                <p className="text-xs text-muted">
                  host en LAN · ~{fmt(pricePerMin, 4)} MON/min a 60 FPS
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-online">
                <span className="h-2 w-2 rounded-full bg-online" /> online
              </span>
            </div>

            {/* reportFps event stream */}
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">
                Monad · stream de eventos FpsReported (1/seg)
              </div>
              <div className="max-h-48 overflow-y-auto font-mono text-xs">
                {state.ticks.length === 0 ? (
                  <p className="px-4 py-6 text-center text-muted">
                    Sin actividad. Depositá y dale play para empezar.
                  </p>
                ) : (
                  state.ticks.map((t) => (
                    <div
                      key={t.second}
                      className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-1.5 last:border-0"
                    >
                      <span className="text-muted">s{t.second}</span>
                      <span className="text-twitch-hover">{t.fps} fps</span>
                      <span className={t.trial ? "text-online" : "text-foreground"}>
                        {t.trial ? "trial · +0" : `deuda ${fmt(t.accrued)}`}
                      </span>
                      <span className="truncate text-muted" title={t.txHash}>
                        {t.txHash.slice(0, 10)}…
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Control / billing pane */}
          <aside className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                Tu sesión
              </h2>
              <Stat label="Depósito" value={`${fmt(state.deposit)} MON`} />
              <Stat label="Deuda acumulada" value={`${fmt(state.accrued)} MON`} accent="text-live" />
              <Stat
                label="Saldo restante"
                value={`${fmt(state.remaining)} MON`}
                accent="text-online"
              />
              <Stat label="Tiempo" value={`${state.elapsed}s`} />
            </div>

            {!isConnected ? (
              <p className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm text-muted">
                Conectá tu wallet para jugar.
              </p>
            ) : canPlay ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                <label className="text-sm font-medium text-muted">Depósito (MON)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-twitch"
                />
                <button
                  onClick={() => open(deposit)}
                  className="rounded-md bg-twitch px-4 py-3 text-sm font-bold text-white transition hover:bg-twitch-hover"
                >
                  ▶ Depositar y jugar
                </button>
                <p className="text-center text-xs text-muted">
                  Primeros {TRIAL_SECONDS}s gratis. No se cobra hasta que confirmes que anda.
                </p>
              </div>
            ) : (
              <button
                onClick={close}
                className="rounded-md bg-live px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                ■ Terminar sesión
              </button>
            )}

            {state.phase === "closed" && state.deposit > 0n && (
              <div className="rounded-lg border border-online/40 bg-online/10 p-4 text-sm">
                <p className="font-bold text-online">Sesión cerrada ✓</p>
                <Stat label="Pagado al host" value={`${fmt(state.paidToHost)} MON`} />
                <Stat label="Reembolsado" value={`${fmt(state.refund)} MON`} />
                <button
                  onClick={reset}
                  className="mt-2 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold transition hover:bg-surface-3"
                >
                  Nueva sesión
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function StreamView({ phase, fps }: { phase: string; fps: number }) {
  if (phase === "idle" || phase === "closed") {
    return (
      <div className="text-center text-muted">
        <p className="text-4xl">🎮</p>
        <p className="mt-2 text-sm">
          El stream del host aparece acá (Minecraft vía Moonlight)
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-6xl font-bold tabular-nums text-foreground">{fps}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-muted">FPS en vivo</p>
      <p className="mt-3 text-xs text-muted/70">
        (placeholder — el video real llega por Moonlight, fuera de esta web)
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
