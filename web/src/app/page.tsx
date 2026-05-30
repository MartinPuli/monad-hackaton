"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { formatEther } from "viem";
import {
  Ghost,
  GameController,
  Wallet,
  Play,
  Stop,
  Lightning,
  Receipt,
  ShieldCheck,
  ArrowSquareOut,
  WarningCircle,
  CircleNotch,
  Info,
  Keyboard,
} from "@phosphor-icons/react";
import { MOCK, TRIAL_SECONDS, EXPLORER_TX } from "@/lib/ghostrig";
import { CHAIN } from "@/lib/wagmi";
import { useSession, DEMO_PRICE_PER_FPS } from "@/lib/useSession";

const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);
const QUICK_AMOUNTS = ["0.05", "0.1", "0.5"];

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { state, open, close, reset } = useSession();
  const [deposit, setDeposit] = useState("0.05");
  const [showHelp, setShowHelp] = useState(false);

  const injected = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors],
  );

  const pricePerMin = DEMO_PRICE_PER_FPS * 60n * 60n;
  const trial = state.phase === "trial";
  const live = state.phase === "billing";
  const inSession = trial || live;
  const showDepositForm = isConnected && state.phase === "idle";
  const wrongNetwork = isConnected && chainId !== CHAIN.id;

  const depositNum = Number(deposit);
  const depositValid = Number.isFinite(depositNum) && depositNum > 0;
  const depositError = deposit.trim() !== "" && !depositValid;
  const pct =
    state.deposit > 0n ? Number((state.remaining * 1000n) / state.deposit) / 10 : 100;

  const startSession = useCallback(() => {
    if (depositValid && !wrongNetwork) open(deposit);
  }, [depositValid, wrongNetwork, open, deposit]);

  // Keyboard accelerators: Esc ends a running session or closes help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showHelp) setShowHelp(false);
      else if (inSession) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inSession, showHelp, close]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Ghost size={24} weight="fill" className="text-accent" />
          <span className="text-lg font-bold tracking-tight">
            Ghost<span className="text-accent">Rig</span>
          </span>
          <span className="ml-2 hidden text-xs text-muted sm:inline">
            rentá FPS, pagás en vivo sobre Monad
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            aria-label="Cómo funciona"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-muted transition-transform duration-200 ease-out-quint hover:bg-surface-3 hover:text-foreground active:scale-[0.98]"
          >
            <Info size={18} weight="bold" />
            <span className="hidden sm:inline">Cómo funciona</span>
          </button>
          {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm font-medium tabular-nums transition-transform duration-200 ease-out-quint hover:bg-surface-3 active:scale-[0.98]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-online" />
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </button>
        ) : (
          <button
            onClick={() => injected && connect({ connector: injected })}
            disabled={isPending || !injected}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-1.5 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? (
              <CircleNotch size={18} weight="bold" className="animate-spin" />
            ) : (
              <Wallet size={18} weight="bold" />
            )}
            {isPending ? "Conectando" : "Conectar wallet"}
          </button>
          )}
        </div>
      </nav>

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:px-5">
        {MOCK && (
          <div className="flex items-center gap-2.5 rounded-md border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-foreground">
            <Lightning size={16} weight="fill" className="shrink-0 text-accent" />
            <span>
              <strong className="font-semibold">Modo demo</strong> — simulando{" "}
              <code className="font-mono text-muted">reportFps</code> cada segundo. Configurá{" "}
              <code className="font-mono text-muted">NEXT_PUBLIC_GHOSTRIG_ADDRESS</code> tras el
              deploy para el contrato real.
            </span>
          </div>
        )}

        {wrongNetwork && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-live/40 bg-live/10 px-4 py-2.5 text-sm">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-live" />
            <span className="flex-1">
              Estás en otra red. GhostRig corre sobre <strong>Monad testnet</strong>.
            </span>
            <button
              onClick={() => switchChain({ chainId: CHAIN.id })}
              disabled={switching}
              className="rounded-md bg-live px-3 py-1.5 text-xs font-bold text-white transition-transform duration-200 ease-out-quint hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {switching ? "Cambiando…" : "Cambiar a Monad"}
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_336px]">
          <section className="flex flex-col gap-3">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-[oklch(0.12_0.02_288)]">
              <StreamView phase={state.phase} fps={state.fps} />
              {trial && (
                <Badge className="left-3 top-3 bg-online text-[oklch(0.2_0.03_160)]">
                  <span className="ghost-pulse h-1.5 w-1.5 rounded-full bg-current" />
                  PRUEBA GRATIS · {state.trialRemaining}s
                </Badge>
              )}
              {live && (
                <Badge className="left-3 top-3 bg-live text-white">
                  <span className="ghost-pulse h-1.5 w-1.5 rounded-full bg-current" />
                  LIVE
                </Badge>
              )}
              {(trial || live) && (
                <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums backdrop-blur-sm">
                  {state.fps} FPS
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white">
                R
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Rig #1 · RTX 4090 — Minecraft</p>
                <p className="font-mono text-xs tabular-nums text-muted">
                  ~{fmt(pricePerMin, 4)} MON/min a 60 FPS · precio fijado on-chain por el host
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-online">
                <span className="ghost-pulse h-2 w-2 rounded-full bg-online" /> online · LAN
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Monad · liquidación en vivo
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {state.ticks.length} tx
                </span>
              </div>
              <div className="max-h-52 divide-y divide-border/60 overflow-y-auto font-mono text-xs">
                {state.ticks.length === 0 ? (
                  <p className="px-4 py-8 text-center text-muted">
                    Sin actividad. Depositá y dale play para empezar.
                  </p>
                ) : (
                  state.ticks.map((t, i) => (
                    <div
                      key={t.second}
                      title="Cada segundo el host registra los FPS reales y la deuda se acumula on-chain."
                      className={`flex items-center justify-between gap-2 px-4 py-1.5 tabular-nums ${i === 0 ? "ghost-tick-in" : ""}`}
                    >
                      <span className="w-9 shrink-0 text-muted">s{t.second}</span>
                      <span className="w-14 text-accent">{t.fps} fps</span>
                      <span className={`flex-1 ${t.trial ? "text-online" : "text-foreground"}`}>
                        {t.trial ? "gratis" : `−${fmt(t.accrued)} MON`}
                      </span>
                      <a
                        href={`${EXPLORER_TX}${t.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        title={MOCK ? "hash simulado (modo demo)" : "ver tx en Monad explorer"}
                        className="flex shrink-0 items-center gap-1 text-muted transition-colors hover:text-accent"
                      >
                        {t.txHash.slice(0, 8)}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-4 py-8 text-center">
                <ShieldCheck size={26} weight="regular" className="text-muted" />
                <p className="text-sm text-muted">Conectá tu wallet para abrir una sesión.</p>
              </div>
            ) : showDepositForm ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                <div>
                  <label htmlFor="deposit" className="text-sm font-medium text-foreground">
                    Depósito
                  </label>
                  <p className="mt-0.5 text-xs text-muted">
                    Se descuenta a medida que jugás: fps × precio por segundo.
                  </p>
                </div>
                <div
                  className={`flex items-center rounded-md border bg-surface-2 ${depositError ? "border-live" : "border-border focus-within:border-accent"}`}
                >
                  <input
                    id="deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startSession()}
                    aria-invalid={depositError}
                    className="w-full bg-transparent px-3 py-2 font-mono text-sm tabular-nums outline-none"
                  />
                  <span className="px-3 text-sm font-medium text-muted">MON</span>
                </div>
                <div className="flex gap-2">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setDeposit(a)}
                      className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-xs tabular-nums transition-transform duration-200 ease-out-quint active:scale-[0.97] ${
                        deposit === a
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-surface-2 text-muted hover:bg-surface-3"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {depositError && (
                  <p className="flex items-center gap-1.5 text-xs text-live">
                    <WarningCircle size={14} weight="fill" /> Ingresá un monto mayor a 0.
                  </p>
                )}
                <button
                  onClick={startSession}
                  disabled={!depositValid || wrongNetwork}
                  className="mt-1 flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={18} weight="fill" /> Depositar y jugar
                </button>
                <p className="flex items-center justify-between text-xs text-muted">
                  <span>Primeros {TRIAL_SECONDS}s gratis. No se cobra hasta que confirmes.</span>
                  <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-surface">
                  <div className="px-4 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Saldo restante
                    </p>
                    <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-online">
                      {fmt(state.remaining, 5)}
                      <span className="ml-1 text-base font-medium text-muted">MON</span>
                    </p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-online transition-[width] duration-500 ease-out-quint"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 divide-y divide-border/60 px-4 pb-2 text-sm">
                    <Stat label="Depósito" value={`${fmt(state.deposit)} MON`} />
                    <Stat
                      label="Deuda acumulada"
                      value={`${fmt(state.accrued)} MON`}
                      accent="text-live"
                    />
                    <Stat label="Tiempo" value={`${state.elapsed}s`} />
                  </div>
                </div>

                {inSession && (
                  <button
                    onClick={close}
                    className="flex items-center justify-center gap-2 rounded-md bg-live px-4 py-3 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:opacity-90 active:scale-[0.98]"
                  >
                    <Stop size={18} weight="fill" /> Terminar sesión
                    <kbd className="rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] font-normal">
                      Esc
                    </kbd>
                  </button>
                )}

                {state.phase === "closed" && (
                  <div className="rounded-lg border border-online/30 bg-online/10 p-4">
                    <div className="flex items-center gap-2">
                      <Receipt size={18} weight="bold" className="text-online" />
                      <p className="text-sm font-semibold text-online">Sesión liquidada</p>
                    </div>
                    <div className="mt-2 divide-y divide-border/60 text-sm">
                      <Stat label="Pagado al host" value={`${fmt(state.paidToHost)} MON`} />
                      <Stat label="Reembolsado" value={`${fmt(state.refund)} MON`} />
                    </div>
                    <button
                      onClick={reset}
                      className="mt-3 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold transition-transform duration-200 ease-out-quint hover:bg-surface-3 active:scale-[0.98]"
                    >
                      Nueva sesión
                    </button>
                  </div>
                )}
              </>
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
      <div className="flex flex-col items-center gap-3 px-6 text-center text-muted">
        <GameController size={40} weight="thin" />
        <p className="max-w-xs text-sm">
          El stream del host llega por Moonlight. Esta pantalla es el control de pago.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="font-mono text-6xl font-bold tabular-nums text-foreground">{fps}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">FPS en vivo</p>
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

const HELP_STEPS = [
  ["Depositás saldo", "Cargás MON en el contrato. Queda en escrow, nadie lo toca hasta que jugás."],
  [`${TRIAL_SECONDS}s gratis`, "Probás el stream sin cargo. Si no anda o es trucho, te vas sin pagar."],
  ["Pagás por FPS", "Cada segundo el host reporta los FPS reales y la deuda se acumula on-chain."],
  ["Cerrás cuando querés", "Se le paga al host lo usado y se te reembolsa el resto, al instante."],
] as const;

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Cómo funciona GhostRig"
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Cómo funciona</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            Cerrar
          </button>
        </div>
        <ol className="mt-3 divide-y divide-border/60">
          {HELP_STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
          <Keyboard size={16} weight="bold" />
          <span>
            Atajos: <kbd className="font-mono text-foreground">Enter</kbd> deposita,{" "}
            <kbd className="font-mono text-foreground">Esc</kbd> termina la sesión.
          </span>
        </div>
      </div>
    </div>
  );
}
