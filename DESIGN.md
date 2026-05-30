# DESIGN.md — GhostRig

Register: **product**. Color strategy: **Restrained** — tinted-dark neutrals + one committed
brand accent (Monad Purple). Theme: **dark**. Adaptado de **monad.xyz**.

> Scene sentence (why dark): un jugador de noche, frente a su PC, en una consola de streaming
> sobre la estética de Monad (índigo profundo + morado), mirando su juego y su saldo moverse en
> vivo. La pantalla oscura es el contexto nativo del producto, no una elección "porque queda cool".

## Marca Monad (referencia)
Monad Purple `#836EF9` · Monad Blue `#200052` · Monad Black `#0E100F` · Off-White `#FBFAF9` ·
Berry `#A0055D`.

## Color (OKLCH, tinted toward the brand hue ~286)
Never `#000`/`#fff`. Neutrales índigo (Monad Blue/Black); acento periwinkle (Monad Purple).

| Token | OKLCH | Uso |
|---|---|---|
| `--background` | `oklch(0.16 0.022 288)` | fondo de la app (índigo profundo) |
| `--surface` | `oklch(0.205 0.03 286)` | paneles, nav |
| `--surface-2` | `oklch(0.245 0.034 286)` | inputs, chips |
| `--surface-3` | `oklch(0.29 0.036 286)` | hover de superficies |
| `--border` | `oklch(0.32 0.03 286)` | divisores 1px |
| `--foreground` | `oklch(0.97 0.004 286)` | texto (off-white) |
| `--muted` | `oklch(0.72 0.02 286)` | texto secundario, labels |
| `--accent` (Monad Purple) | `oklch(0.66 0.17 282)` | acento de marca, CTA |
| `--accent-hover` | `oklch(0.72 0.15 282)` | hover del acento |
| `--live` | `oklch(0.62 0.20 22)` | estado cobrando (rojo LIVE) |
| `--online` | `oklch(0.82 0.16 160)` | online / trial / saldo OK |

Reglas:
- El acento Monad es **committed pero contenido**: CTA principal, marca, links. No glow, no
  gradiente de texto, no fondos morados brillantes.
- Rojo = solo "LIVE / cobrando". Verde = solo "online / gratis / saldo sano". No decorativos.

## Typography
- **Geist** (sans) + **Geist Mono**. Sin serif (es UI de producto). Sin Inter.
- Todos los **números** (MON, FPS, segundos, hashes) en `font-mono` con `tabular-nums`.
- Jerarquía por peso + escala, ratio ≥1.25. Headers `tracking-tight`. Nada de H1 gigante.
- Labels de sección: `text-xs uppercase tracking-wide text-muted font-semibold`.

## Elevation & materiality
- Cards solo cuando la elevación comunica jerarquía. Preferir divisores 1px (`border`,
  `divide-y`) y espacio negativo. Nunca cards anidadas.
- Sombra (si va): tintada al fondo, difusa y sutil. Sin glows.
- Radio: `rounded-lg` (paneles), `rounded-md` (botones/inputs), `rounded-full` (badges/dots).

## Motion (intensity media)
- Transiciones CSS `ease-out` exponencial (`cubic-bezier(0.16,1,0.3,1)`), ~200–300ms.
- Animar solo `transform`/`opacity`. Nunca layout props.
- Feedback táctil: `active:scale-[0.98]` o `active:translate-y-[1px]` en lo clickeable.
- Elemento "vivo": dot pulsante en LIVE/online; números que transicionan suave.
- Sin bounce, sin elastic, sin neón.

## Iconography
- **@phosphor-icons/react**, `weight="bold"` o `regular`, tamaño consistente.
- **Cero emojis** en UI.

## Components
- **Nav**: barra superior sticky, marca a la izquierda, wallet a la derecha.
- **Player pane**: 16:9, fondo casi negro, badges arriba (LIVE/trial izq, FPS der).
- **Channel header**: avatar inicial + título + estado online (estilo header de canal Twitch).
- **Event stream**: lista monoespaciada, divisores 1px, sin card por fila.
- **Billing panel**: filas label/valor con `divide-y`, números mono, acentos de color por rol.
- **Estados**: vacío (cómo empezar), cobrando, cerrado (resumen pago/reembolso), sin wallet.
