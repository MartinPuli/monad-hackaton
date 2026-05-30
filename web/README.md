# web/ — Frontend / Cliente (WB5)

App donde el jugador conecta su wallet, deposita saldo y juega. **La web es la capa de pago**;
el video del juego llega aparte vía Moonlight (ver `../host-agent/`).

## Stack
- **Next.js 16** (App Router) + **React 19** + **Tailwind v4**
- **wagmi 3 / viem 2** · chain `monadTestnet` desde `viem/chains` (chainId 10143)

## Cómo correr
```bash
cd web
npm install
cp .env.local.example .env.local   # vacío = MOCK MODE
npm run dev                        # http://localhost:3000
```

## MOCK MODE (estado actual)
Mientras Dev A no deploye el contrato (WB3), la app corre en **mock**: simula el evento
`reportFps` cada segundo (FPS 52–60), respeta el **trial de 10 s gratis** y acumula la deuda
`fps × pricePerFps` hasta agotar el depósito. Toda la UX es real; solo falta el contrato.

Banner amarillo "MOCK MODE" visible = no hay address configurado.

## Pasar a contrato real (cuando llegue WB3)
1. Dev A entrega el **address** del contrato deployado + verifica la ABI contra `../interface.md`.
2. Pegar el address en `.env.local`:
   ```
   NEXT_PUBLIC_GHOSTRIG_ADDRESS=0x...
   ```
3. Reemplazar la simulación de `src/lib/useSession.ts` por hooks de wagmi:
   - `openSession` / `closeSession` → `useWriteContract`
   - debt en vivo → `useWatchContractEvent` sobre `FpsReported`
   - La forma de `SessionState` no cambia, así que la UI queda igual.

## Mapa de archivos
| Archivo | Qué hace |
|---|---|
| `src/lib/wagmi.ts` | Config wagmi (Monad testnet, injected connector) |
| `src/lib/ghostrig.ts` | ABI + address + flag MOCK (sync con `../interface.md`) |
| `src/lib/useSession.ts` | Hook del ciclo de sesión (mock de reportFps por segundo) |
| `src/app/providers.tsx` | WagmiProvider + React Query |
| `src/app/page.tsx` | UI: wallet, depósito, trial, deuda en vivo, log de eventos, cierre |

## Estado WB5
- [x] App Next.js + wagmi conectada a Monad testnet
- [x] Conectar wallet (injected / MetaMask)
- [x] Depositar → `openSession` (mock)
- [x] Trial visible (contador 10 s gratis)
- [x] Deuda en vivo + log de eventos `FpsReported` (mock)
- [x] Terminar sesión → `closeSession` + reembolso (mock)
- [ ] Wiring al contrato real (depende de WB3 de Dev A)
- [ ] Embeber/mostrar el stream real de Moonlight (WB6/WB7)
