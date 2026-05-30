"use client";

// Value-proposition hero shown to visitors who haven't connected yet. The Twitch-
// style UI is great once you're in, but a non-technical judge landing cold needs the
// pitch in one glance: what KNTX is, why it's magic (pay-per-second, on-chain, no
// card), and the savings hook (a real RTX 4090 costs a fortune; here you pay cents).
import { Wallet, Lightning, Timer, ShieldCheck, GameController } from "@phosphor-icons/react";

const PERKS = [
  { icon: Lightning, label: "10s gratis", sub: "probás sin pagar" },
  { icon: Timer, label: "Pagás por segundo", sub: "solo lo que jugás" },
  { icon: ShieldCheck, label: "Plata en escrow", sub: "on-chain, no la toca nadie" },
] as const;

export function Hero({
  onConnect,
  connecting,
  canConnect,
}: {
  onConnect: () => void;
  connecting: boolean;
  canConnect: boolean;
}) {
  return (
    <section className="kntx-rise relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/12 via-surface to-surface p-5 md:p-7">
      {/* faint brand glow pinned to the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
      />
      <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
            <GameController size={13} weight="fill" /> Cloud gaming sobre Monad
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
            Jugá en una <span className="kntx-ink">RTX 4090</span> desde cualquier dispositivo.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted md:text-[15px]">
            Alquilás la PC de otra persona y jugás por streaming. Pagás{" "}
            <strong className="font-semibold text-foreground">solo los segundos que jugás</strong> —
            sin tarjeta, sin suscripción. La plata se liquida sola, en vivo, mientras jugás.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PERKS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/60 px-3 py-2"
              >
                <Icon size={18} weight="fill" className="shrink-0 text-accent" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-semibold text-foreground">{label}</p>
                  <p className="truncate text-[11px] text-muted">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onConnect}
            disabled={connecting || !canConnect}
            className="kntx-cta mt-5 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white transition-transform duration-200 ease-out-quint hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <Wallet size={17} weight="bold" /> {connecting ? "Conectando…" : "Conectar y jugar"}
          </button>
        </div>

        {/* Savings card — the hook a non-technical person feels instantly */}
        <div className="w-full shrink-0 rounded-xl border border-border bg-surface/80 p-4 md:w-60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Lo que te ahorrás
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted">Comprar una RTX 4090</p>
              <p className="font-display text-lg font-bold text-foreground line-through decoration-live/70">
                US$2.000+
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted">Con KNTX arrancás desde</p>
            <p className="font-display text-2xl font-bold tabular-nums text-online">
              0.05 <span className="text-sm font-medium text-muted">MON</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted">y te devuelven lo que no usás</p>
          </div>
        </div>
      </div>
    </section>
  );
}
