# DESIGN.md — GhostRig

Register: **product**. Color strategy: **Restrained** — tinted-dark neutrals + one committed
brand accent (Twitch purple). Theme: **dark**.

> Scene sentence (why dark): un jugador de noche, frente a su PC, en una consola de streaming
> tipo Twitch, mirando su juego y su saldo moverse en vivo. La pantalla oscura es el contexto
> nativo del producto, no una elección "porque las tools quedan cool oscuras".

## Color (OKLCH, tinted toward the brand hue ~293)
Never `#000`/`#fff`. Every neutral carries a faint purple tint.

| Token | OKLCH | Uso |
|---|---|---|
| `--background` | `oklch(0.165 0.012 293)` | fondo de la app |
| `--surface` | `oklch(0.205 0.014 293)` | paneles, nav |
| `--surface-2` | `oklch(0.245 0.014 293)` | inputs, chips |
| `--surface-3` | `oklch(0.285 0.014 293)` | hover de superficies |
| `--border` | `oklch(0.305 0.012 293)` | divisores 1px |
| `--foreground` | `oklch(0.965 0.004 293)` | texto principal |
| `--muted` | `oklch(0.715 0.012 293)` | texto secundario, labels |
| `--accent` (Twitch) | `oklch(0.585 0.215 293)` | acento de marca, CTA |
| `--accent-hover` | `oklch(0.66 0.20 293)` | hover del acento |
| `--live` | `oklch(0.60 0.20 25)` | estado cobrando (rojo LIVE) |
| `--online` | `oklch(0.80 0.16 158)` | online / trial / saldo OK |

Reglas:
- El acento Twitch es **committed pero contenido**: CTA principal, marca, links. No glow, no
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
