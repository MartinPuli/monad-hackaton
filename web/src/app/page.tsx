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
  Eye,
  Heart,
  ShareNetwork,
  Cpu,
} from "@phosphor-icons/react";
import { KntxMark } from "@/components/KntxMark";
import { Rail } from "@/components/Rail";
import { Hero } from "@/components/Hero";
import { Confetti } from "@/components/Confetti";
import { MOCK, TRIAL_SECONDS, EXPLORER_TX } from "@/lib/ghostrig";
import { CHAIN } from "@/lib/wagmi";
import { DEMO_PRICE_PER_FPS } from "@/lib/useSession";
import { useSessionLive } from "@/lib/useSessionLive";
import { useRigs, type Rig } from "@/lib/useRigs";
import { demoBus, type DemoHost } from "@/lib/demoBus";
import { GameStream } from "./GameStream";

const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);
const QUICK_AMOUNTS = ["0.05", "0.1", "0.5"];
const TAGS = ["RTX 4090", "Minecraft", "Pay-per-FPS", "LAN · Monad testnet"];

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { state, open, close, reset } = useSessionLive();
  const { rigs, loading: rigsLoading } = useRigs();
  const [selectedRigId, setSelectedRigId] = useState<bigint | null>(null);
  const [deposit, setDeposit] = useState("0.05");
  const [showHelp, setShowHelp] = useState(false);

  // Host stream profile published from the host dashboard (game / GPU / URL /
  // availability). Syncs live across tabs via the demo bus.
  const [hostProfile, setHostProfile] = useState<DemoHost | null>(null);
  useEffect(() => {
    setHostProfile(demoBus.get().host);
    return demoBus.subscribe((s) => setHostProfile(s.host));
  }, []);
  const gameName = hostProfile?.game?.trim() || "Minecraft";
  const gpuName = hostProfile?.gpu?.trim() || "RTX 4090";
  const hostAvailable = hostProfile?.available ?? false;

  // Default the selection to the first active rig (or the first one) once the list
  // loads. The client can then switch rigs from the picker before depositing.
  useEffect(() => {
    if (selectedRigId !== null || rigs.length === 0) return;
    setSelectedRigId((rigs.find((r) => r.active) ?? rigs[0]).id);
  }, [rigs, selectedRigId]);

  const selectedRig = rigs.find((r) => r.id === selectedRigId) ?? null;

  const injected = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors],
  );

  // Price shown reflects the SELECTED rig (falls back to the demo price while loading).
  const pricePerMin = (selectedRig?.pricePerFps ?? DEMO_PRICE_PER_FPS) * 60n * 60n;
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
    if (depositValid && !wrongNetwork && selectedRigId !== null) open(deposit, selectedRigId);
  }, [depositValid, wrongNetwork, open, deposit, selectedRigId]);

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

  // While playing, take over the screen: embedded game + floating payment HUD.
  if (inSession) {
    return <GameStream state={state} onExit={close} streamUrl={hostProfile?.streamUrl} />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col md:pl-[68px]">
      <Rail />

      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/80 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <KntxMark size={20} className="text-accent kntx-glow md:hidden" />
          <span className="font-display text-lg font-bold tracking-[0.18em] kntx-ink">KNTX</span>
          <span className="ml-2 hidden border-l border-border pl-3 text-xs text-muted sm:inline">
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
              className="kntx-cta flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-24 pt-5 md:px-6 md:pb-6">
        {!isConnected && (
          <Hero
            onConnect={() => injected && connect({ connector: injected })}
            connecting={isPending}
            canConnect={!!injected}
          />
        )}

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
              Estás en otra red. KNTX corre sobre <strong>Monad testnet</strong>.
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
          {/* ── Stage + channel + controls (the "broadcast" column) ── */}
          <section className="flex min-w-0 flex-col gap-4">
            {/* Broadcast stage */}
            <div className="kntx-stage kntx-scan kntx-rise relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border shadow-[0_24px_60px_-30px_oklch(0.2_0.1_286/0.9)]">
              <StreamView phase={state.phase} fps={state.fps} />

              {trial && (
                <Badge className="left-3 top-3 bg-online text-[oklch(0.2_0.03_160)]">
                  <span className="kntx-pulse h-1.5 w-1.5 rounded-full bg-current" />
                  PRUEBA GRATIS · {state.trialRemaining}s
                </Badge>
              )}
              {live && (
                <Badge className="left-3 top-3 bg-live text-white shadow-lg shadow-live/30">
                  <span className="kntx-pulse h-1.5 w-1.5 rounded-full bg-current" />
                  LIVE
                </Badge>
              )}

              {/* viewer-style stat chips, bottom-left like a broadcast overlay */}
              {(trial || live) && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <StageChip>
                    <span className="font-mono tabular-nums text-online">{state.fps}</span> fps
                  </StageChip>
                  <StageChip>
                    <Eye size={12} weight="fill" className="text-muted" /> 1
                  </StageChip>
                </div>
              )}
            </div>

            {/* Channel header — the Twitch info bar */}
            <div className="kntx-rise flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="kntx-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[oklch(0.2_0.03_286)] font-display text-lg font-bold text-foreground">
                R
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-display text-base font-bold tracking-tight">
                    Rig #{selectedRig ? selectedRig.id.toString() : "—"} · {gpuName}
                  </h1>
                  {hostAvailable ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-online/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-online">
                      <span className="kntx-pulse h-1.5 w-1.5 rounded-full bg-online" /> disponible
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted" /> offline
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                  <span className="text-accent">jugando {gameName}</span>
                  <span className="text-border">·</span>
                  <span className="font-mono tabular-nums">~{fmt(pricePerMin, 4)} MON/min @ 60 FPS</span>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} weight="fill" /> 1 jugando
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Seguir rig"
                  className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-semibold text-foreground transition-transform duration-200 ease-out-quint hover:bg-surface-3 active:scale-[0.97]"
                >
                  <Heart size={14} weight="fill" className="text-accent" /> Seguir
                </button>
                <button
                  aria-label="Compartir"
                  className="hidden items-center justify-center rounded-md bg-surface-2 p-2 text-muted transition-transform duration-200 ease-out-quint hover:bg-surface-3 hover:text-foreground active:scale-[0.97] sm:flex"
                >
                  <ShareNetwork size={15} weight="bold" />
                </button>
              </div>

              {/* tag pills */}
              <div className="flex w-full flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                {TAGS.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Session control panel — adapts to phase */}
            <div className="kntx-rise">
              {!isConnected ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-10 text-center">
                  <ShieldCheck size={28} weight="regular" className="text-muted" />
                  <p className="text-sm text-muted">
                    Conectá tu wallet para abrir una sesión de juego.
                  </p>
                  <button
                    onClick={() => injected && connect({ connector: injected })}
                    disabled={isPending || !injected}
                    className="kntx-cta mt-1 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Wallet size={16} weight="bold" /> Conectar wallet
                  </button>
                </div>
              ) : showDepositForm ? (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <RigPicker
                    rigs={rigs}
                    loading={rigsLoading}
                    selectedId={selectedRigId}
                    onSelect={setSelectedRigId}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label htmlFor="deposit" className="text-sm font-medium text-foreground">
                        Depósito
                      </label>
                      <p className="mt-0.5 text-xs text-muted">
                        Se descuenta a medida que jugás: fps × precio por segundo.
                      </p>
                      <div
                        className={`mt-2 flex items-center rounded-md border bg-surface-2 ${depositError ? "border-live" : "border-border focus-within:border-accent"}`}
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
                          className="w-full bg-transparent px-3 py-2.5 font-mono text-lg tabular-nums outline-none"
                        />
                        <span className="px-3 text-sm font-medium text-muted">MON</span>
                      </div>
                      <div className="mt-2 flex gap-2">
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
                    </div>
                    <div className="flex flex-col gap-2 sm:w-52">
                      <button
                        onClick={startSession}
                        disabled={!depositValid || wrongNetwork || selectedRigId === null}
                        className="kntx-cta flex items-center justify-center gap-2 rounded-md px-4 py-3.5 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play size={18} weight="fill" /> Depositar y jugar
                      </button>
                      <p className="flex items-center justify-between text-xs text-muted">
                        <span>{TRIAL_SECONDS}s gratis primero</span>
                        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
                          Enter
                        </kbd>
                      </p>
                    </div>
                  </div>
                  {depositError && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-live">
                      <WarningCircle size={14} weight="fill" /> Ingresá un monto mayor a 0.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Saldo restante
                      </p>
                      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-online">
                        {fmt(state.remaining, 5)}
                        <span className="ml-1 text-base font-medium text-muted">MON</span>
                      </p>
                    </div>
                    {state.phase === "closed" ? (
                      <button
                        onClick={reset}
                        className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold transition-transform duration-200 ease-out-quint hover:bg-surface-3 active:scale-[0.98]"
                      >
                        Nueva sesión
                      </button>
                    ) : (
                      <button
                        onClick={close}
                        className="flex items-center gap-2 rounded-md bg-live px-3 py-2 text-xs font-bold text-white transition-transform duration-200 ease-out-quint hover:opacity-90 active:scale-[0.98]"
                      >
                        <Stop size={14} weight="fill" /> Terminar
                      </button>
                    )}
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-online transition-[width] duration-500 ease-out-quint"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <MiniStat label="Depósito" value={`${fmt(state.deposit)}`} />
                    <MiniStat label="Deuda" value={`${fmt(state.accrued)}`} accent="text-live" />
                    <MiniStat label="Tiempo" value={`${state.elapsed}s`} />
                  </div>
                  {state.phase === "closed" && (
                    <div className="rounded-lg border border-online/30 bg-online/10 p-3">
                      <Confetti />
                      <div className="flex items-center gap-2">
                        <Receipt size={16} weight="bold" className="text-online" />
                        <p className="text-sm font-semibold text-online">Sesión liquidada</p>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-3 text-sm">
                        <MiniStat label="Pagado al host" value={`${fmt(state.paidToHost)}`} />
                        <MiniStat label="Reembolsado" value={`${fmt(state.refund)}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── On-chain feed — "the chat is the blockchain" ── */}
          <OnChainFeed ticks={state.ticks} />
        </div>
      </main>
    </div>
  );
}

function RigPicker({
  rigs,
  loading,
  selectedId,
  onSelect,
}: {
  rigs: Rig[];
  loading: boolean;
  selectedId: bigint | null;
  onSelect: (id: bigint) => void;
}) {
  return (
    <div className="mb-3 border-b border-border/60 pb-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Cpu size={15} weight="bold" className="text-accent" />
        <span className="text-sm font-medium text-foreground">Elegí un rig</span>
        {!loading && rigs.length > 0 && (
          <span className="ml-auto font-mono text-[11px] text-muted">
            {rigs.length} disponible{rigs.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="px-1 py-2 text-xs text-muted">Cargando rigs on-chain…</p>
      ) : rigs.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted">No hay rigs registrados todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rigs.map((r) => {
            const selected = selectedId === r.id;
            const perMin = r.pricePerFps * 60n * 60n;
            return (
              <button
                key={r.id.toString()}
                onClick={() => onSelect(r.id)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-transform duration-200 ease-out-quint active:scale-[0.99] ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface-2 hover:bg-surface-3"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${r.active ? "bg-online kntx-pulse" : "bg-muted"}`}
                  title={r.active ? "online" : "offline"}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-foreground">
                    Rig #{r.id.toString()}
                    <span className="font-mono text-[11px] font-normal text-muted">
                      {r.host.slice(0, 6)}…{r.host.slice(-4)}
                    </span>
                  </p>
                  <p className="font-mono text-[11px] tabular-nums text-muted">
                    ~{fmt(perMin, 4)} MON/min @ 60 FPS
                  </p>
                </div>
                {selected && (
                  <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    elegido
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StreamView({ phase, fps }: { phase: string; fps: number }) {
  if (phase === "idle" || phase === "closed") {
    return (
      <div className="flex flex-col items-center gap-3 px-6 text-center text-muted">
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 backdrop-blur-sm">
          <GameController size={36} weight="thin" className="text-accent/80" />
        </div>
        <p className="max-w-xs text-sm">
          El stream del host llega por Moonlight. Esta pantalla es tu control de pago.
        </p>
        <span className="rounded-full border border-border bg-surface/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          esperando que le des play
        </span>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="kntx-glow font-display text-7xl font-bold tabular-nums text-foreground">{fps}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.4em] text-muted">FPS en vivo</p>
    </div>
  );
}

function OnChainFeed({
  ticks,
}: {
  ticks: { second: number; fps: number; accrued: bigint; trial: boolean; txHash: string }[];
}) {
  return (
    <aside className="flex max-h-[78vh] min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border bg-surface lg:sticky lg:top-[4.5rem]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="kntx-pulse h-2 w-2 rounded-full bg-accent" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.15em] text-foreground">
            Feed on-chain
          </span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted">{ticks.length} tx</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 font-mono text-xs">
        {/* pinned system line — sets the "this chat is the chain" frame */}
        <div className="mb-1 rounded-md bg-accent/10 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          <span className="font-bold text-accent">KNTX ·</span> cada segundo el host firma los FPS
          reales y la deuda se acumula on-chain. El chat es la blockchain.
        </div>
        {ticks.length === 0 ? (
          <p className="px-3 py-10 text-center text-muted">
            Sin actividad todavía. Depositá y dale play para empezar a liquidar.
          </p>
        ) : (
          ticks.map((t, i) => (
            <div
              key={t.second}
              title="Cada segundo el host registra los FPS reales y la deuda se acumula on-chain."
              className={`flex items-baseline gap-1.5 rounded-md px-2.5 py-1.5 leading-relaxed tabular-nums hover:bg-surface-2 ${i === 0 ? "kntx-tick-in" : ""}`}
            >
              <span className="shrink-0 text-[10px] text-muted">s{t.second}</span>
              <span className="shrink-0 font-semibold text-accent">{t.fps}fps</span>
              <span className={`flex-1 ${t.trial ? "text-online" : "text-foreground"}`}>
                {t.trial ? "gratis" : `−${fmt(t.accrued)} MON`}
              </span>
              <a
                href={`${EXPLORER_TX}${t.txHash}`}
                target="_blank"
                rel="noreferrer"
                title={MOCK ? "hash simulado (modo demo)" : "ver tx en Monad explorer"}
                className="flex shrink-0 items-center gap-0.5 text-muted transition-colors hover:text-accent"
              >
                {t.txHash.slice(0, 6)}
                <ArrowSquareOut size={11} weight="bold" />
              </a>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[11px] text-muted">
        <Wallet size={12} weight="fill" className="text-accent" />
        liquidado on-chain en Monad testnet
      </div>
    </aside>
  );
}

function StageChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm">
      {children}
    </span>
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

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </p>
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Cómo funciona KNTX"
        className="kntx-rise w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold tracking-tight">Cómo funciona</h2>
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
