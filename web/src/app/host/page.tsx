"use client";

// KNTX — Host dashboard. Where someone sharing their GPU sees money come in live
// while they host, and withdraws their earnings. The connected wallet is the payout
// wallet (it must be the one that registered the rig).

import { useCallback, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import {
  Wallet,
  Lightning,
  Coins,
  Cpu,
  Plus,
  ArrowDown,
  WarningCircle,
  CircleNotch,
  Broadcast,
} from "@phosphor-icons/react";
import { KntxMark } from "@/components/KntxMark";
import { Rail } from "@/components/Rail";
import { CHAIN } from "@/lib/wagmi";
import { useHostEarnings } from "@/lib/useHostEarnings";

const fmt = (wei: bigint, dp = 6) => Number(formatEther(wei)).toFixed(dp);

export default function HostDashboard() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { earnings, registerRig, withdraw, priceFromMonPerFps } = useHostEarnings();

  const [priceMon, setPriceMon] = useState("0.000001");
  const [busy, setBusy] = useState<"register" | "withdraw" | null>(null);

  const injected = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors],
  );
  const wrongNetwork = isConnected && chainId !== CHAIN.id;

  const onRegister = useCallback(async () => {
    setBusy("register");
    try {
      await registerRig(priceFromMonPerFps(priceMon));
    } finally {
      setBusy(null);
    }
  }, [registerRig, priceFromMonPerFps, priceMon]);

  const onWithdraw = useCallback(async () => {
    setBusy("withdraw");
    try {
      await withdraw();
    } finally {
      setBusy(null);
    }
  }, [withdraw]);

  return (
    <div className="flex min-h-[100dvh] flex-col md:pl-[68px]">
      <Rail />

      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/80 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <KntxMark size={20} className="text-accent kntx-glow md:hidden" />
          <span className="font-display text-lg font-bold tracking-[0.18em] kntx-ink">KNTX</span>
          <span className="ml-2 hidden items-center gap-1.5 border-l border-border pl-3 text-xs text-muted sm:inline-flex">
            <Broadcast size={13} weight="fill" className="text-accent" /> panel del host · cobrá por tu GPU
          </span>
        </div>
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
            {isPending ? <CircleNotch size={18} weight="bold" className="animate-spin" /> : <Wallet size={18} weight="bold" />}
            {isPending ? "Conectando" : "Conectar wallet"}
          </button>
        )}
      </nav>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-24 pt-5 md:px-6 md:pb-6">
        {wrongNetwork && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-live/40 bg-live/10 px-4 py-2.5 text-sm">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-live" />
            <span className="flex-1">Estás en otra red. KNTX corre sobre <strong>Monad testnet</strong>.</span>
            <button
              onClick={() => switchChain({ chainId: CHAIN.id })}
              disabled={switching}
              className="rounded-md bg-live px-3 py-1.5 text-xs font-bold text-white transition-transform duration-200 ease-out-quint hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {switching ? "Cambiando…" : "Cambiar a Monad"}
            </button>
          </div>
        )}

        {!isConnected ? (
          <div className="kntx-rise flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-14 text-center">
            <div className="kntx-ring mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.2_0.03_286)]">
              <Cpu size={28} weight="duotone" className="text-accent kntx-glow" />
            </div>
            <p className="font-display text-lg font-semibold">Conectá tu wallet para hostear</p>
            <p className="max-w-md text-sm text-muted">
              La wallet que conectes es la que <strong className="font-semibold text-foreground">cobra</strong>.
              Registrás tu rig una vez y la plata cae acá mientras alguien juega.
            </p>
            <button
              onClick={() => injected && connect({ connector: injected })}
              disabled={isPending || !injected}
              className="kntx-cta mt-2 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              <Wallet size={16} weight="bold" /> Conectar wallet
            </button>
          </div>
        ) : (
          <>
            {/* Live earnings */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="kntx-rise relative overflow-hidden rounded-xl border border-online/30 bg-surface p-5">
                {/* faint online halo so "en vivo" reads alive, not flat */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-online/10 blur-2xl"
                />
                <div className="relative mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <span className="kntx-pulse flex h-2 w-2 rounded-full bg-online" />
                  Ingreso en vivo
                </div>
                <div className="relative font-display text-4xl font-bold tabular-nums text-online kntx-glow">
                  {fmt(earnings.liveAccrued)}
                  <span className="ml-1.5 text-base font-medium text-muted">MON</span>
                </div>
                <p className="relative mt-1.5 text-xs text-muted">
                  {earnings.lastFps > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Lightning size={12} weight="fill" className="text-online" />
                      <span className="font-mono tabular-nums text-foreground">{earnings.lastFps} FPS</span> · acumulando ahora
                    </span>
                  ) : (
                    "esperando una sesión activa…"
                  )}
                </p>
              </div>
              <div className="kntx-rise flex flex-col rounded-xl border border-border bg-surface p-5">
                <CardHead icon={<Coins size={16} weight="fill" className="text-accent" />} label="Listo para retirar" />
                <div className="font-display text-4xl font-bold tabular-nums text-foreground">
                  {fmt(earnings.claimable)}
                  <span className="ml-1.5 text-base font-medium text-muted">MON</span>
                </div>
                <button
                  onClick={onWithdraw}
                  disabled={earnings.claimable === 0n || busy !== null || wrongNetwork}
                  className="kntx-cta mt-auto flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "withdraw" ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <ArrowDown size={16} weight="bold" />}
                  Retirar a mi wallet
                </button>
              </div>
            </div>

            {/* My rigs */}
            <Card>
              <CardHead icon={<Cpu size={16} weight="fill" className="text-foreground" />} label="Mis rigs" />
              {earnings.myRigIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {earnings.myRigIds.map((id) => (
                    <span
                      key={id.toString()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-sm tabular-nums"
                    >
                      <span className="kntx-pulse h-1.5 w-1.5 rounded-full bg-online" />
                      rig #{id.toString()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Todavía no registraste ningún rig.</p>
              )}
            </Card>

            {/* Register a rig */}
            <Card>
              <CardHead icon={<Plus size={16} weight="bold" className="text-accent" />} label="Registrar un rig" />
              <p className="mb-2 text-sm text-muted">
                Precio por FPS, por segundo (en MON). A ~60 FPS, {priceMon} ≈{" "}
                <span className="font-mono tabular-nums text-foreground">{(Number(priceMon) * 60).toFixed(6)} MON/s</span>.
              </p>
              <div className="flex gap-2">
                <input
                  value={priceMon}
                  onChange={(e) => setPriceMon(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm tabular-nums outline-none transition-colors duration-200 ease-out-quint focus:border-accent"
                  placeholder="0.000001"
                />
                <button
                  onClick={onRegister}
                  disabled={busy !== null || wrongNetwork}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold transition-transform duration-200 ease-out-quint hover:bg-surface-3 active:scale-[0.98] disabled:opacity-40"
                >
                  {busy === "register" ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <Plus size={16} weight="bold" />}
                  Registrar
                </button>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-live" />
                <span>El host-agent (que reporta el FPS) debe correr con la MISMA wallet de este rig.</span>
              </p>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="kntx-rise rounded-xl border border-border bg-surface p-5">{children}</div>;
}

function CardHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {icon}
      {label}
    </div>
  );
}
