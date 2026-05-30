# web/ — Frontend / Cliente (WB5)

App donde el jugador conecta su wallet, deposita saldo y juega.

## Stack
- **Next.js** + **viem/wagmi**
- Chain: `monadTestnet` desde `viem/chains` (no definir chain custom)

## Responsabilidades
- Conectar wallet (MetaMask en red Monad testnet).
- Depositar saldo → llamar `openSession()` del contrato.
- Mostrar la vista de juego (el stream real llega vía Moonlight; ver `host-agent/`).
- **Saldo en vivo:** escuchar eventos `Settled` y mostrar el balance descontándose en tiempo real.
- Botón "Terminar sesión" → `closeSession()` + mostrar reembolso.

## Pendiente
- Dirección + ABI del contrato (se obtienen tras el deploy en WB3).

> Nota: el streaming del juego NO vive dentro de esta web. La web es la capa de pago.
> El jugador juega vía Moonlight (app aparte). Ver la decisión de arquitectura en `../PLAN.md`.
