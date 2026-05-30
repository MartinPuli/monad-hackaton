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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">👻 GhostRig</h1>
          <p className="text-sm text-neutral-500">
            Rentá una PC gamer. Pagás por FPS, liquidado en vivo sobre Monad.
          </p>
        </div>
        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </button>
        ) : (
          <button
            onClick={() => injected && connect({ connector: injected })}
            disabled={isPending || !injected}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {isPending ? "Conectando…" : "Conectar wallet"}
          </button>
        )}
      </header>

      {MOCK && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
          <strong>MOCK MODE</strong> — simulando <code>reportFps</code> cada segundo
          contra la ABI de <code>interface.md</code>. Configurar{" "}
          <code>NEXT_PUBLIC_GHOSTRIG_ADDRESS</code> tras el deploy (WB3) para usar el contrato real.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Game / stream pane */}
        <section className="flex flex-col gap-4">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 dark:border-neutral-800">
            <StreamView phase={state.phase} fps={state.fps} />
            {state.phase === "trial" && (
              <div className="absolute left-3 top-3 rounded-md bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white">
                PRUEBA GRATIS · {state.trialRemaining}s
              </div>
            )}
            {state.phase === "billing" && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                COBRANDO · {state.fps} FPS
              </div>
            )}
          </div>

          {/* Event log = on-chain reportFps stream */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              Monad · eventos FpsReported (1/seg)
            </div>
            <div className="max-h-52 overflow-y-auto font-mono text-xs">
              {state.ticks.length === 0 ? (
                <p className="px-4 py-6 text-center text-neutral-400">
                  Sin actividad. Abrí una sesión para empezar.
                </p>
              ) : (
                state.ticks.map((t) => (
                  <div
                    key={t.second}
                    className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-1.5 last:border-0 dark:border-neutral-900"
                  >
                    <span className="text-neutral-400">s{t.second}</span>
                    <span className="text-sky-600 dark:text-sky-400">{t.fps} fps</span>
                    <span
                      className={
                        t.trial
                          ? "text-emerald-500"
                          : "text-neutral-600 dark:text-neutral-300"
                      }
                    >
                      {t.trial ? "trial · +0" : `deuda ${fmt(t.accrued)}`}
                    </span>
                    <span
                      className="truncate text-violet-500"
                      title={t.txHash}
                    >
                      {t.txHash.slice(0, 10)}…
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Control / billing pane */}
        <aside className="flex flex-col gap-4">
          <RigCard pricePerMin={pricePerMin} />

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <Stat label="Depósito" value={`${fmt(state.deposit)} MON`} />
            <Stat
              label="Deuda acumulada"
              value={`${fmt(state.accrued)} MON`}
              accent="text-red-500"
            />
            <Stat
              label="Saldo restante"
              value={`${fmt(state.remaining)} MON`}
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <Stat label="Tiempo" value={`${state.elapsed}s`} />
          </div>

          {!isConnected ? (
            <p className="rounded-lg bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-500 dark:bg-neutral-900">
              Conectá tu wallet para jugar.
            </p>
          ) : canPlay ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Depósito (MON)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={() => open(deposit)}
                className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Depositar y jugar →
              </button>
              <p className="text-center text-xs text-neutral-400">
                Primeros {TRIAL_SECONDS}s gratis. No se cobra nada hasta que confirmes que anda.
              </p>
            </div>
          ) : (
            <button
              onClick={close}
              className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
            >
              Terminar sesión
            </button>
          )}

          {state.phase === "closed" && state.deposit > 0n && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Sesión cerrada ✓
              </p>
              <Stat label="Pagado al host" value={`${fmt(state.paidToHost)} MON`} />
              <Stat label="Reembolsado" value={`${fmt(state.refund)} MON`} />
              <button
                onClick={reset}
                className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-white dark:border-neutral-700"
              >
                Nueva sesión
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function StreamView({ phase, fps }: { phase: string; fps: number }) {
  if (phase === "idle" || phase === "closed") {
    return (
      <div className="text-center text-neutral-500">
        <p className="text-4xl">🎮</p>
        <p className="mt-2 text-sm">
          El stream del host aparece acá (Minecraft vía Moonlight)
        </p>
      </div>
    );
  }
  return (
    <div className="text-center text-neutral-300">
      <p className="text-5xl font-bold tabular-nums text-white">{fps}</p>
      <p className="text-xs uppercase tracking-widest text-neutral-400">FPS en vivo</p>
      <p className="mt-3 text-xs text-neutral-500">
        (placeholder — el video real llega por Moonlight, fuera de esta web)
      </p>
    </div>
  );
}

function RigCard({ pricePerMin }: { pricePerMin: bigint }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Rig #1 — RTX 4090</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          ● online · LAN
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        ~{fmt(pricePerMin, 4)} MON / min a 60 FPS · el host fija el precio on-chain
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
      <span className="text-neutral-500">{label}</span>
      <span className={`font-mono font-medium tabular-nums ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
