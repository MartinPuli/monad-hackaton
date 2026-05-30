"use client";

// KNTX left rail — the Twitch signature. A slim, always-present icon column that
// frames the app as a streaming platform: brand mark up top, the two "places"
// you can be (Jugar / Hostear), and a footer chip that the whole thing runs on
// Monad. Active route gets a brand bar + glow. Collapses to a bottom bar on phones.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GameController, Broadcast } from "@phosphor-icons/react";
import { KntxMark } from "@/components/KntxMark";

const NAV = [
  { href: "/", label: "Jugar", icon: GameController },
  { href: "/host", label: "Hostear", icon: Broadcast },
] as const;

export function Rail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 px-2 py-1.5 backdrop-blur-md
                 md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:h-full md:w-[68px] md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:px-0 md:py-4"
    >
      <Link
        href="/"
        aria-label="KNTX"
        className="group mb-0 hidden h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 ease-out-quint hover:scale-105 md:mb-3 md:flex"
      >
        <KntxMark size={26} className="text-accent kntx-glow transition-transform duration-300 ease-out-quint group-hover:rotate-90" />
      </Link>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-200 ease-out-quint md:h-14 md:w-full md:flex-none"
          >
            {/* active brand bar — bottom on mobile, left edge on desktop */}
            <span
              className={`absolute transition-all duration-300 ease-out-quint ${
                active ? "opacity-100" : "opacity-0"
              } inset-x-6 bottom-0 h-0.5 rounded-full bg-accent md:inset-x-auto md:bottom-auto md:left-0 md:top-1/2 md:h-8 md:w-0.5 md:-translate-y-1/2`}
            />
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ease-out-quint ${
                active
                  ? "bg-accent/15 text-accent kntx-glow"
                  : "text-muted group-hover:bg-surface-2 group-hover:text-foreground"
              }`}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
            </span>
            <span className={active ? "text-accent" : "text-muted group-hover:text-foreground"}>
              {label}
            </span>
          </Link>
        );
      })}

      <span
        aria-hidden
        title="Liquidado on-chain en Monad"
        className="mt-auto hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 font-display text-[10px] font-bold tracking-tight text-accent md:flex"
      >
        MON
      </span>
    </nav>
  );
}
